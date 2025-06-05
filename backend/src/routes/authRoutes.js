console.log("authRoutes.js caricato!");
const express = require('express');
const { registerUser, authenticateUser } = require('../auth');
const router = express.Router();
const pool = require('../../config/db');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
require('dotenv').config();

router.post('/register', async(req, res) => {
    try {
        const { token, email, password, full_name } = req.body;

        // 1. Verifica token invito
        const inviteRes = await pool.query(
            'SELECT * FROM invitations WHERE token = $1 AND used = false AND expires_at > NOW()', [token]
        );
        if (inviteRes.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'Token di invito non valido o scaduto.' });
        }
        const invite = inviteRes.rows[0];

        // 2. Controlla che l'email corrisponda
        if (invite.email !== email) {
            return res.status(400).json({ success: false, message: 'Email non corrispondente all\'invito.' });
        }

        // 3. Hash password
        const hashedPw = await bcrypt.hash(password, 10);

        // 4. Crea utente
        const userRes = await pool.query(
            'INSERT INTO users (user_mail, user_pw, full_name, tenant_id, role_id, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id', [email, hashedPw, full_name, invite.tenant_id, invite.role_id]
        );
        const userId = userRes.rows[0].id;

        // 5. Segna invito come usato
        await pool.query('UPDATE invitations SET used = true WHERE id = $1', [invite.id]);

        // 6. (Step 3) Genera token di conferma email e invia email di conferma
        const confirmationToken = uuidv4();
        await pool.query(
            'INSERT INTO email_confirmations (user_id, token, type) VALUES ($1, $2, $3)', [userId, confirmationToken, 'confirm']
        );
        // Invia email di conferma
        const confirmLink = `http://163.172.159.116:3000/api/confirm?token=${confirmationToken}`;
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Conferma la tua registrazione su B-Learn',
            html: `<p>Conferma la tua registrazione cliccando qui: <a href="${confirmLink}">${confirmLink}</a></p>`
        });

        res.status(201).json({ success: true, message: 'Registrazione avvenuta! Controlla la tua email per confermare.' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.post('/login', async(req, res) => {
    const { email, password } = req.body;
    try {
        const { rows } = await pool.query(`
            SELECT u.id, u.user_mail, u.user_pw, u.active,
                   u.role_id, r.name AS role_name, u.tenant_id
            FROM users u
            JOIN roles r     ON u.role_id = r.id
            WHERE u.user_mail = $1
        `, [email]);
        const user = rows[0];
        if (user && await bcrypt.compare(password, user.user_pw)) {
            // Se è user, deve essere attivo
            if (user.role_name === 'user' && !user.active) {
                return res.json({ success: false, message: 'Devi confermare la tua email prima di accedere.' });
            }
            // Login riuscito per admin/superadmin anche se non attivi
            return res.json({
                success: true,
                role: user.role_id,
                user: {
                    id: user.id,
                    email: user.user_mail,
                    role_name: user.role_name,
                    tenant_id: user.tenant_id
                }
            });
        } else {
            // Login fallito
            res.json({ success: false, message: 'Email o password errati.' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/admins', async(req, res) => {
    try {
        const { email, password, full_name, company } = req.body;

        // 1. Recupera o crea il tenant
        let tenant = await pool.query('SELECT id FROM tenants WHERE name = $1', [company]);
        let tenantId;
        if (tenant.rows.length === 0) {
            const newTenant = await pool.query(
                'INSERT INTO tenants (name) VALUES ($1) RETURNING id', [company]
            );
            tenantId = newTenant.rows[0].id;
        } else {
            tenantId = tenant.rows[0].id;
        }

        // 2. Prendi id ruolo admin
        const roleRes = await pool.query("SELECT id FROM roles WHERE name = 'admin'");
        const roleId = roleRes.rows[0].id;

        // 3. Hash password
        const hashedPw = await bcrypt.hash(password, 10);

        // 4. Crea utente admin
        await pool.query(
            'INSERT INTO users (user_mail, user_pw, full_name, tenant_id, role_id, created_at) VALUES ($1, $2, $3, $4, $5, NOW())', [email, hashedPw, full_name, tenantId, roleId]
        );

        // (Opzionale) invia una mail di benvenuto

        res.status(201).json({ success: true, message: 'Admin creato con successo!' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// Configura il trasporto email (esempio con Gmail, puoi usare anche altri provider)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

router.post('/invite-partner', async(req, res) => {
    try {
        console.log("Ricevuta richiesta:", req.body);
        const { emails, tenantName } = req.body; // emails: array di email, tenantName: nome azienda
        if (!emails || !Array.isArray(emails) || emails.length === 0) {
            return res.status(400).json({ success: false, message: 'Nessuna email fornita.' });
        }

        // Recupera tenant_id
        const tenantRes = await pool.query('SELECT id FROM tenants WHERE name = $1', [tenantName]);
        if (tenantRes.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'Tenant non trovato.' });
        }
        const tenantId = tenantRes.rows[0].id;

        // Prendi id ruolo user
        const roleRes = await pool.query("SELECT id FROM roles WHERE name = 'user'");
        const roleId = roleRes.rows[0].id;

        for (const email of emails) {
            const token = uuidv4();
            // Salva invito
            await pool.query(
                'INSERT INTO invitations (email, token, tenant_id, role_id, expires_at, used, created_at) VALUES ($1, $2, $3, $4, NOW() + INTERVAL \'2 days\', false, NOW())', [email, token, tenantId, roleId]
            );
            // Invia email
            const link = `http://163.172.159.116:3001/inscription?token=${token}`;
            await transporter.sendMail({
                from: 'noreplyblearn@gmail.com',
                to: email,
                subject: 'Invitation à vous inscrire sur B-Lear',
                html: `<p>Vous avez été invité à vous inscrire sur B-Learn. <br>
                       Cliquez ici pour compléter votre inscription : <a href="${link}">${link}</a></p>`
            });
        }

        res.json({ success: true, message: 'Inviti inviati!' });
    } catch (error) {
        console.error("Errore in /invite-partner:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/confirm', async(req, res) => {
    const { token } = req.query;
    if (!token) {
        return res.status(400).send('Token mancante.');
    }
    // Cerca il token valido e non usato
    const confRes = await pool.query(
        'SELECT * FROM email_confirmations WHERE token = $1 AND used = false AND expires_at > NOW()', [token]
    );
    if (confRes.rows.length === 0) {
        return res.status(400).send('Token non valido o scaduto.');
    }
    const confirmation = confRes.rows[0];
    // Attiva l'utente
    await pool.query('UPDATE users SET active = true WHERE id = $1', [confirmation.user_id]);
    // Segna il token come usato
    await pool.query('UPDATE email_confirmations SET used = true WHERE id = $1', [confirmation.id]);
    // Mostra messaggio di successo
    res.send('Account confermato! Ora puoi effettuare il login.');
});

console.log("Sto per registrare la route /chatbots");
router.post('/chatbots', async(req, res) => {
    try {
        const { name, storyline_key, description, tenant_id } = req.body;
        console.log("Ricevuto dal frontend:", req.body);
        await pool.query(
            'INSERT INTO chatbots (name, storyline_key, tenant_id, description, created_at) VALUES ($1, $2, $3, $4, NOW())', [name, storyline_key, tenant_id, description]
        );
        res.json({ success: true, message: 'Chatbot creato con successo!' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.get('/chatbots', async(req, res) => {
    try {
        const result = await pool.query('SELECT * FROM chatbots');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/tenants', async(req, res) => {
    try {
        const result = await pool.query('SELECT id, name FROM tenants');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/userlist', async(req, res) => {
    try {
        const chatbotName = req.query.chatbot_name;
        console.log("Filtro chatbot_name:", chatbotName);
        let query = "SELECT * FROM userlist";
        let params = [];
        if (chatbotName) {
            query += " WHERE chatbot_name = $1";
            params.push(chatbotName);
        } else if (!req.query.all) {
            return res.status(200).json([]);
        }
        console.log("Query eseguita:", query, params);
        const result = await pool.query(query, params);
        console.log("Risultati trovati:", result.rows.length);
        res.status(200).json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Restituisce un chatbot tramite storyline_key con stats learners/simulations/avg_score
router.get('/chatbots/storyline/:storyline_key', async(req, res) => {
    try {
        const { storyline_key } = req.params;
        // Prendi il chatbot
        const chatbotRes = await pool.query('SELECT * FROM chatbots WHERE storyline_key = $1', [storyline_key]);
        if (chatbotRes.rows.length === 0) {
            return res.status(404).json({ message: 'Chatbot non trovato' });
        }
        const chatbot = chatbotRes.rows[0];
        // Prendi stats da userlist
        const statsRes = await pool.query(`
            SELECT 
                COUNT(*) AS simulations,
                COUNT(DISTINCT user_email) AS learners,
                COALESCE(AVG(score),0) AS avg_score
            FROM userlist
            WHERE chatbot_name = $1
        `, [storyline_key]);
        const stats = statsRes.rows[0];
        chatbot.simulations = parseInt(stats.simulations, 10);
        chatbot.learners = parseInt(stats.learners, 10);
        chatbot.avg_score = Math.round(Number(stats.avg_score));
        res.json(chatbot);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Restituisce la lista degli studenti unici per uno specifico chatbot_name (storyline_key)
router.get('/learners-list', async(req, res) => {
    try {
        const { storyline_key } = req.query;
        if (!storyline_key) {
            return res.status(400).json({ message: 'storyline_key mancante' });
        }
        const result = await pool.query(`
            SELECT 
                user_email AS email,
                MAX(name) AS name,
                '' AS group,
                COUNT(*) AS simulations,
                COALESCE(ROUND(AVG(score)),0) AS score,
                TO_CHAR(MAX(created_at), 'DD/MM/YYYY') AS last_date
            FROM userlist
            WHERE chatbot_name = $1
            GROUP BY user_email
            ORDER BY last_date DESC
        `, [storyline_key]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;