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

        // 1. Vérifie le token d'invitation
        const inviteRes = await pool.query(
            'SELECT * FROM invitations WHERE token = $1 AND used = false AND expires_at > NOW()', [token]
        );
        if (inviteRes.rows.length === 0) {
            return res.status(400).json({ success: false, message: "Token d'invitation invalide ou expiré." });
        }
        const invite = inviteRes.rows[0];

        // 2. Vérifie si l'utilisateur existe déjà
        let userRes = await pool.query('SELECT id FROM users WHERE user_mail = $1', [email]);
        if (userRes.rows.length > 0) {
            // L'utilisateur existe déjà : ajoute le nouveau droit chatbot
            const userId = userRes.rows[0].id;
            if (invite.chatbot_id) {
                await pool.query(
                    'INSERT INTO user_chatbots (user_id, chatbot_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, invite.chatbot_id]
                );
            }
            // Marque l'invitation comme utilisée
            await pool.query('UPDATE invitations SET used = true WHERE id = $1', [invite.id]);
            return res.json({ success: true, message: "Vous avez déjà un compte, l'accès à ce chatbot a été ajouté ! Connectez-vous normalement." });
        }

        // 3. Hash du mot de passe
        const hashedPw = await bcrypt.hash(password, 10);

        // 4. Crée l'utilisateur
        const userInsertRes = await pool.query(
            'INSERT INTO users (user_mail, user_pw, full_name, tenant_id, role_id, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id', [email, hashedPw, full_name, invite.tenant_id, invite.role_id]
        );
        const userId = userInsertRes.rows[0].id;

        // 5. Marque l'invitation comme utilisée
        await pool.query('UPDATE invitations SET used = true WHERE id = $1', [invite.id]);

        // 5b. Si l'invitation a un chatbot_id, relie l'utilisateur a ce chatbot
        if (invite.chatbot_id) {
            await pool.query(
                'INSERT INTO user_chatbots (user_id, chatbot_id) VALUES ($1, $2)', [userId, invite.chatbot_id]
            );
        }

        // 6. (Étape 3) Génère un token de confirmation email et envoie l'email de confirmation
        const confirmationToken = uuidv4();
        await pool.query(
            'INSERT INTO email_confirmations (user_id, token, type) VALUES ($1, $2, $3)', [userId, confirmationToken, 'confirm']
        );
        // Envoie l'email de confirmation
        const confirmLink = `http://163.172.159.116:3000/api/confirm?token=${confirmationToken}`;
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Confirmez votre inscription sur B-Learn',
            html: `<p>Confirmez votre inscription en cliquant ici : <a href="${confirmLink}">${confirmLink}</a></p>`
        });

        res.status(201).json({ success: true, message: "Inscription réussie ! Vérifiez votre email pour confirmer." });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.post('/login', async(req, res) => {
    console.log('Login request received:', { email: req.body.email, hasPassword: !!req.body.password });
    const { email, password } = req.body;
    try {
        console.log('Attempting database query for user:', email);
        const { rows } = await pool.query(`
            SELECT u.id, u.user_mail, u.user_pw, u.active,
                   u.role_id, r.name AS role_name, u.tenant_id, u.must_change_password
            FROM users u
            JOIN roles r     ON u.role_id = r.id
            WHERE u.user_mail = $1
        `, [email]);
        console.log('Database query completed, rows found:', rows.length);

        const user = rows[0];
        if (user && await bcrypt.compare(password, user.user_pw)) {
            console.log('Password verification successful for user:', email);
            // Si c'est un user, il doit être actif
            if (user.role_name === 'user' && !user.active) {
                console.log('User not active:', email);
                return res.json({ success: false, message: "Vous devez confirmer votre email avant de vous connecter." });
            }
            // Connexion réussie pour admin/superadmin même si non actifs
            console.log('Login successful for user:', email, 'role:', user.role_name);
            return res.json({
                success: true,
                role: user.role_id,
                user: {
                    id: user.id,
                    email: user.user_mail,
                    role_name: user.role_name,
                    tenant_id: user.tenant_id,
                    must_change_password: user.must_change_password
                }
            });
        } else {
            // Connexion échouée
            console.log('Login failed - invalid credentials for:', email);
            res.json({ success: false, message: "Email ou mot de passe incorrect." });
        }
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/admins', async(req, res) => {
    try {
        const { email, password, full_name, company } = req.body;

        // 1. Récupère ou crée le tenant
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

        // 2. Prend l'id du rôle admin
        const roleRes = await pool.query("SELECT id FROM roles WHERE name = 'admin'");
        const roleId = roleRes.rows[0].id;

        // 3. Hash du mot de passe
        const hashedPw = await bcrypt.hash(password, 10);

        // 4. Crée l'utilisateur admin
        await pool.query(
            'INSERT INTO users (user_mail, user_pw, full_name, tenant_id, role_id, created_at, must_change_password) VALUES ($1, $2, $3, $4, $5, NOW(), true)', [email, hashedPw, full_name, tenantId, roleId]
        );

        // (Optionnel) envoie un mail de bienvenue

        res.status(201).json({ success: true, message: 'Admin créé avec succès !' });
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
        console.log("Requête reçue:", req.body);
        const { emails, tenantName, managerName, chatbotId } = req.body; // aggiunto chatbotId
        if (!emails || !Array.isArray(emails) || emails.length === 0) {
            return res.status(400).json({ success: false, message: "Aucun email fourni." });
        }
        if (!chatbotId) {
            return res.status(400).json({ success: false, message: "Aucun chatbot sélectionné." });
        }

        // Récupère tenant_id
        const tenantRes = await pool.query('SELECT id FROM tenants WHERE name = $1', [tenantName]);
        if (tenantRes.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'Tenant non trouvé.' });
        }
        const tenantId = tenantRes.rows[0].id;

        // Prend l'id du rôle user
        const roleRes = await pool.query("SELECT id FROM roles WHERE name = 'user'");
        const roleId = roleRes.rows[0].id;

        for (const email of emails) {
            const token = uuidv4();
            // Sauvegarde l'invitation con chatbot_id
            await pool.query(
                'INSERT INTO invitations (email, token, tenant_id, role_id, chatbot_id, expires_at, used, created_at) VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL \'2 days\', false, NOW())', [email, token, tenantId, roleId, chatbotId]
            );
            // Envoie l'email
            const link = `http://163.172.159.116:8080/inscription?token=${token}`;
            const salutation = managerName ? `Bonjour ${managerName},` : 'Bonjour,';
            await transporter.sendMail({
                from: 'noreplyblearn@gmail.com',
                to: email,
                subject: 'Invitation à vous inscrire sur B-Learn',
                html: `<p>${salutation}<br><br>
            Vous avez été invité à vous inscrire sur B-Learn.<br>
            Cliquez ici pour compléter votre inscription : <br> <br>
             <a href="${link}">${link}</a></p>`
            });
        }

        res.json({ success: true, message: 'Invitations envoyées !' });
    } catch (error) {
        console.error("Erreur dans /invite-partner:", error);
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
    // Reindirizza alla pagina di conferma del frontend
    res.redirect(`${process.env.FRONTEND_URL}/confirmation`);
});

console.log("Sto per registrare la route /chatbots");
router.post('/chatbots', async(req, res) => {
    try {
        const { name, storyline_key, description, tenant_id } = req.body;
        console.log("Reçu du frontend:", req.body);
        await pool.query(
            'INSERT INTO chatbots (name, storyline_key, tenant_id, description, created_at) VALUES ($1, $2, $3, $4, NOW())', [name, storyline_key, tenant_id, description]
        );
        res.json({ success: true, message: 'Chatbot créé avec succès !' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.get('/chatbots', async(req, res) => {
    try {
        // Recupera user id, ruolo e tenant id dai parametri query (o sessione/autenticazione reale in produzione)
        const userId = req.query.user_id;
        const userRole = req.query.user_role; // '1' = superadmin, '2' = admin, '3' = user
        const tenantId = req.query.tenant_id;

        let result;
        if (userRole === '1') {
            // Super admin: tutti i chatbot
            result = await pool.query('SELECT * FROM chatbots');
        } else if (userRole === '2') {
            // Admin: solo i chatbot del proprio tenant
            result = await pool.query('SELECT * FROM chatbots WHERE tenant_id = $1', [tenantId]);
        } else if (userRole === '3') {
            // User normale: solo i chatbot collegati tramite user_chatbots
            result = await pool.query(`
                SELECT c.* FROM chatbots c
                JOIN user_chatbots uc ON c.id = uc.chatbot_id
                WHERE uc.user_id = $1
            `, [userId]);
        } else {
            // Default: nessun chatbot
            result = { rows: [] };
        }
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

// Nuova rotta: restituisce la lista degli studenti unici per uno specifico chatbot_name (storyline_key) con lo score massimo
router.get('/learners-list-maxscore', async(req, res) => {
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
                COALESCE(MAX(score),0) AS score,
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

router.get('/learner-detail', async(req, res) => {
    const { storyline_key, email } = req.query;
    if (!storyline_key || !email) {
        return res.status(400).json({ message: 'Parametri mancanti' });
    }
    try {
        const result = await pool.query(`
            SELECT *
            FROM userlist
            WHERE chatbot_name = $1 AND user_email = $2
            ORDER BY created_at DESC
        `, [storyline_key, email]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Rotta per ottenere tutti gli utenti unici di tutti i chatbot (per super admin)
router.get('/all-users', async(req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                MIN(id) AS id,
                user_email AS email,
                MAX(name) AS name,
                chatbot_name,
                '' AS group,
                COUNT(*) AS simulations,
                COALESCE(MAX(score),0) AS score,
                TO_CHAR(MAX(created_at), 'DD/MM/YYYY') AS last_date
            FROM userlist
            GROUP BY user_email, chatbot_name
            ORDER BY last_date DESC
        `);
        // Adatto i dati per il frontend (aggiungo id, email, name, chatbot_name, group, simulations, score, last_date)
        const users = result.rows.map(row => ({
            id: row.id,
            email: row.email,
            name: row.name,
            chatbot_name: row.chatbot_name,
            group: row.group,
            simulations: Number(row.simulations),
            score: Number(row.score),
            last_date: row.last_date
        }));
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/change-password', async(req, res) => {
    const { userId, password } = req.body;
    if (!userId || !password) {
        return res.status(400).json({ success: false, message: 'Paramètres manquants.' });
    }
    try {
        const hashedPw = await bcrypt.hash(password, 10);
        await pool.query(
            'UPDATE users SET user_pw = $1, must_change_password = false WHERE id = $2', [hashedPw, userId]
        );
        res.json({ success: true, message: 'Mot de passe changé avec succès.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Rotte per il reset password
router.post('/forgot-password', async(req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email manquante.' });
        }

        // Verifica se l'utente esiste
        const userRes = await pool.query('SELECT id, user_mail, full_name FROM users WHERE user_mail = $1', [email]);
        if (userRes.rows.length === 0) {
            return res.json({ success: true, message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.' });
        }

        const user = userRes.rows[0];
        const resetToken = uuidv4();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 ore

        // Salva il token nel database
        await pool.query(
            'UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE id = $3', [resetToken, expiresAt, user.id]
        );

        // Invia l'email di reset
        const resetLink = `http://163.172.159.116:8080/reset-password?token=${resetToken}`;
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Réinitialisation de votre mot de passe B-Learn',
            html: `
                <p>Bonjour ${user.full_name},</p>
                <p>Vous avez demandé la réinitialisation de votre mot de passe sur B-Learn.</p>
                <p>Cliquez sur le lien suivant pour définir un nouveau mot de passe :</p>
                <p><a href="${resetLink}">${resetLink}</a></p>
                <p>Ce lien expire dans 24 heures.</p>
                <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
            `
        });

        res.json({ success: true, message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.' });
    } catch (error) {
        console.error('Errore forgot-password:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de l\'envoi de l\'email de réinitialisation.' });
    }
});

router.post('/reset-password', async(req, res) => {
    try {
        const { token, password } = req.body;
        if (!token || !password) {
            return res.status(400).json({ success: false, message: 'Token et mot de passe requis.' });
        }

        // Verifica il token
        const userRes = await pool.query(
            'SELECT id FROM users WHERE reset_password_token = $1 AND reset_password_expires > NOW()', [token]
        );

        if (userRes.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'Token invalide ou expiré.' });
        }

        const userId = userRes.rows[0].id;
        const hashedPw = await bcrypt.hash(password, 10);

        // Aggiorna la password e cancella il token
        await pool.query(
            'UPDATE users SET user_pw = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE id = $2', [hashedPw, userId]
        );

        res.json({ success: true, message: 'Mot de passe réinitialisé avec succès.' });
    } catch (error) {
        console.error('Errore reset-password:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la réinitialisation du mot de passe.' });
    }
});

router.get('/verify-reset-token', async(req, res) => {
    try {
        const { token } = req.query;
        if (!token) {
            return res.status(400).json({ success: false, message: 'Token manquant.' });
        }

        const userRes = await pool.query(
            'SELECT id FROM users WHERE reset_password_token = $1 AND reset_password_expires > NOW()', [token]
        );

        if (userRes.rows.length === 0) {
            return res.json({ success: false, message: 'Token invalide ou expiré.' });
        }

        res.json({ success: true, message: 'Token valide.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erreur lors de la vérification du token.' });
    }
});

module.exports = router;