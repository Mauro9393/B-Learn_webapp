console.log("authRoutes.js caricato! VERSIONE AGGIORNATA -", new Date().toISOString());
const express = require('express');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { verifyToken, requireRole } = require('../middleware/auth');
const { ensureChatbotBelongsToTenant, ensureStorylineBelongsToTenant, isSuperAdmin } = require('../middleware/tenant');
const router = express.Router();

const pool = require('../../config/db');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const fs = require('fs');
const handlebars = require('handlebars');
require('dotenv').config();
const { encryptSecret, decryptSecret } = require('../utils/crypto');
// Node >= 18 a fetch global; si non disponibile, décommentez la ligne ci-dessous et ajoutez node-fetch
// const fetch = require('node-fetch');

// Clients SSE par ID de chatbot
const sseClientsByChatbotId = new Map(); // key: chatbot id (string), value: Set<res>

function broadcastChatbotStatus(chatbotId, payload) {
    const key = String(chatbotId);
    const clients = sseClientsByChatbotId.get(key);
    if (!clients) return;
    const data = `data: ${JSON.stringify(payload)}\n\n`;
    for (const res of clients) {
        try { res.write(data); } catch (_) { /* ignore broken pipes */ }
    }
}

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
        const confirmLink = `${process.env.PROD_URL}/api/confirm?token=${confirmationToken}`;
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
        // Validation des entrées
        const schema = Joi.object({
            email: Joi.string().email().required(),
            password: Joi.string().min(6).max(128).required()
        });
        const { error: vErr } = schema.validate({ email, password });
        if (vErr) {
            return res.status(400).json({ success: false, message: 'Parametri non validi' });
        }

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

            // Génère le JWT et définit le cookie HttpOnly
            const secret = process.env.JWT_SECRET;
            if (!secret) {
                return res.status(500).json({ success: false, message: 'JWT non configurato' });
            }
            const token = jwt.sign({
                id: user.id,
                email: user.user_mail,
                role_id: user.role_id,
                role_name: user.role_name,
                tenant_id: user.tenant_id
            }, secret, { expiresIn: '8h' });

            const isProd = process.env.NODE_ENV === 'production';
            res.cookie('auth', token, {
                httpOnly: true,
                secure: isProd,
                sameSite: isProd ? 'strict' : 'lax',
                maxAge: 8 * 60 * 60 * 1000
            });

            return res.json({
                success: true,
                user: {
                    id: user.id,
                    email: user.user_mail,
                    role_name: user.role_name,
                    role_id: user.role_id,
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

// Seul le superadmin peut créer des admins
router.post('/admins', verifyToken, requireRole(['superadmin', 1]), async(req, res) => {
    try {
        const { email, password, full_name, company } = req.body;
        const schema = Joi.object({
            email: Joi.string().email().required(),
            password: Joi.string().min(8).max(128).required(),
            full_name: Joi.string().min(1).max(200).allow(''),
            company: Joi.string().min(1).max(200).required()
        });
        const { error: vErr } = schema.validate({ email, password, full_name, company });
        if (vErr) return res.status(400).json({ success: false, message: 'MDP dois contenir au moins 8 caractéres' });

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

        // 2b. Évite les doublons par e-mail
        const dupCheck = await pool.query('SELECT id FROM users WHERE user_mail = $1', [email]);
        if (dupCheck.rows.length > 0) {
            return res.status(409).json({ success: false, message: 'Email déjà enregistrée.' });
        }

        // 3. Hash du mot de passe
        const hashedPw = await bcrypt.hash(password, 10);

        // 4. Crée l'utilisateur admin
        await pool.query(
            'INSERT INTO users (user_mail, user_pw, full_name, tenant_id, role_id, created_at, must_change_password, active) VALUES ($1, $2, $3, $4, $5, NOW(), true, true)', [email, hashedPw, full_name, tenantId, roleId]
        );

        // Envoie un email de bienvenue avec lien de connexion
        try {
            const loginUrl = `${process.env.FRONTEND_URL || process.env.PROD_URL || ''}/login`;
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Votre accès admin B-Learn',
                html: `<p>Bonjour ${full_name || ''},</p>
                       <p>Un compte administrateur a été créé pour vous sur B-Learn.</p>
                       <p>Connectez-vous ici: <a href="${loginUrl}">${loginUrl}</a></p>
                       <p>Email: <b>${email}</b><br/>Mot de passe provisoire: <b>${password}</b></p>
                       <p>Pour des raisons de sécurité, vous devrez changer le mot de passe à la première connexion.</p>`
            });
        } catch (mailErr) {
            console.error('Erreur envoi email admin:', mailErr);
            return res.status(500).json({ success: false, message: "Compte créé mais l'email n'a pas pu être envoyée." });
        }

        res.status(201).json({ success: true, message: 'Admin créé avec succès et email envoyée.' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// Configure le transport d’e-mails (exemple avec Gmail, vous pouvez utiliser d’autres fournisseurs)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

router.post('/invite-partner', verifyToken, requireRole(['superadmin', 'admin', 1, 2]), async(req, res) => {
    try {
        console.log("Requête reçue:", req.body);
        const { emails, tenantName, managerName, chatbotId } = req.body; // ajouté chatbotId
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
            // Sauvegarde l’invitation avec chatbot_id
            await pool.query(
                'INSERT INTO invitations (email, token, tenant_id, role_id, chatbot_id, expires_at, used, created_at) VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL \'2 days\', false, NOW())', [email, token, tenantId, roleId, chatbotId]
            );
            // Envoie l'email
            const link = `${process.env.PROD_URL}/inscription?token=${token}`;
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
    // Recherche le jeton valide et non utilisé
    const confRes = await pool.query(
        'SELECT * FROM email_confirmations WHERE token = $1 AND used = false AND expires_at > NOW()', [token]
    );
    if (confRes.rows.length === 0) {
        return res.status(400).send('Token non valido o scaduto.');
    }
    const confirmation = confRes.rows[0];
    // Active l’utilisateur
    await pool.query('UPDATE users SET active = true WHERE id = $1', [confirmation.user_id]);
    // Marque le jeton comme utilisé
    await pool.query('UPDATE email_confirmations SET used = true WHERE id = $1', [confirmation.id]);
    // Redirige vers la page de confirmation du frontend
    res.redirect(`${process.env.FRONTEND_URL}/confirmation`);
});

console.log("Sto per registrare la route /chatbots");
router.post('/chatbots', verifyToken, requireRole(['superadmin', 'admin', 1, 2]), async(req, res) => {
    try {
        const { name, storyline_key, description } = req.body;
        // Admin può creare solo nel proprio tenant; superadmin può specificare tenant_id
        const effectiveTenantId = (String(req.user.role_id) === '1' || String(req.user.role_name).toLowerCase() === 'superadmin') ?
            req.body.tenant_id :
            req.user.tenant_id;
        if (!effectiveTenantId) {
            return res.status(400).json({ success: false, message: 'Tenant non specificato.' });
        }
        console.log("Reçu du frontend:", req.body);
        await pool.query(
            'INSERT INTO chatbots (name, storyline_key, tenant_id, description, created_at) VALUES ($1, $2, $3, $4, NOW())', [name, storyline_key, effectiveTenantId, description]
        );
        res.json({ success: true, message: 'Chatbot créé avec succès !' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.get('/chatbots', verifyToken, async(req, res) => {
    try {
        // Recupera dal token
        const userId = String(req.user.id);
        const userRole = String(req.user.role_id); // '1' = superadmin, '2' = admin, '3' = user
        const tenantId = String(req.user.tenant_id);

        let result;
        if (userRole === '1') {
            // Super admin : tous les chatbots
            result = await pool.query('SELECT * FROM chatbots');
        } else if (userRole === '2') {
            // Admin : seulement les chatbots de son tenant
            result = await pool.query('SELECT * FROM chatbots WHERE tenant_id = $1', [tenantId]);
        } else if (userRole === '3') {
            // Utilisateur : seulement les chatbots liés via user_chatbots
            result = await pool.query(`
                SELECT c.* FROM chatbots c
                JOIN user_chatbots uc ON c.id = uc.chatbot_id
                WHERE uc.user_id = $1
            `, [userId]);
        } else {
            // Par défaut : aucun chatbot
            result = { rows: [] };
        }
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// État ON/OFF pour SPA (ID numérique)
router.get('/chatbots/:id/enabled', verifyToken, async(req, res) => {
    try {
        const { id } = req.params;
        // Se non superadmin, il chatbot deve appartenere al tenant dell'utente
        let r;
        if (String(req.user.role_id) === '1' || String(req.user.role_name).toLowerCase() === 'superadmin') {
            r = await pool.query('SELECT id, enabled, updated_at FROM chatbots WHERE id = $1', [id]);
        } else {
            r = await pool.query('SELECT id, enabled, updated_at FROM chatbots WHERE id = $1 AND tenant_id = $2', [id, req.user.tenant_id]);
        }
        if (r.rows.length === 0) return res.status(404).json({ message: 'Chatbot non trouvé' });
        res.json({ id: Number(id), enabled: r.rows[0].enabled, updated_at: r.rows[0].updated_at });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// SSE : abonnement à l’état enabled d’un chatbot pour des mises à jour en direct
router.get('/chatbots/:id/enabled/stream', async(req, res) => {
    const { id } = req.params;
    console.log(`[SSE] New subscriber for chatbot ${id}`);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    // CORS ouvert pour le flux (utile pour file:// ou des domaines externes)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders && res.flushHeaders();

    const key = String(id);
    if (!sseClientsByChatbotId.has(key)) sseClientsByChatbotId.set(key, new Set());
    const clients = sseClientsByChatbotId.get(key);
    clients.add(res);

    // envoie l’état initial
    try {
        const r = await pool.query('SELECT id, enabled, updated_at, updated_by FROM chatbots WHERE id = $1', [id]);
        if (r.rows.length > 0) {
            res.write(`data: ${JSON.stringify({ id: Number(id), enabled: r.rows[0].enabled, updated_at: r.rows[0].updated_at, updated_by: r.rows[0].updated_by })}\n\n`);
        }
    } catch (_) {}

    // heartbeat pour garder la connexion ouverte
    const heartbeat = setInterval(() => {
        try { res.write(': keepalive\n\n'); } catch (_) {}
    }, 25000);

    req.on('close', () => {
        const set = sseClientsByChatbotId.get(key);
        if (set) {
            set.delete(res);
            if (set.size === 0) sseClientsByChatbotId.delete(key);
        }
        clearInterval(heartbeat);
        console.log(`[SSE] Subscriber closed for chatbot ${id}`);
        res.end();
    });
});

// Bascule ON/OFF (utilisée par le bouton sur la carte)
router.patch('/chatbots/:id/enabled', verifyToken, requireRole(['superadmin', 'admin', 1, 2]), ensureChatbotBelongsToTenant, async(req, res) => {
    try {
        const { id } = req.params;
        const enabled = !!req.body.enabled;
        const role = String(req.user.role_id);
        const updatedByBase = 'dashboard';
        const updatedBy = role === '1' ? `superadmin:${updatedByBase}` : role === '2' ? `admin:${updatedByBase}` : updatedByBase;

        // Règle : si le chatbot est actuellement désactivé par un superadmin, un admin ne peut pas le modifier
        const curr = await pool.query('SELECT enabled, updated_by FROM chatbots WHERE id = $1', [id]);
        if (curr.rows.length === 0) return res.status(404).json({ message: 'Chatbot non trouvé' });
        const current = curr.rows[0];
        if (role !== '1' && current.enabled === false && current.updated_by && String(current.updated_by).startsWith('superadmin')) {
            return res.status(403).json({ message: 'Blocked: chatbot disables by super admin.' });
        }

        const r = await pool.query(
            `UPDATE chatbots
             SET enabled = $1, updated_at = NOW(), updated_by = $2
             WHERE id = $3
             RETURNING id, enabled, updated_at`, [enabled, updatedBy, id]
        );
        if (r.rows.length === 0) return res.status(404).json({ message: 'Chatbot non trouvé' });
        const payload = { id: Number(id), enabled: r.rows[0].enabled, updated_at: r.rows[0].updated_at, updated_by: updatedBy };
        // Diffusion SSE aux abonnés
        broadcastChatbotStatus(id, payload);
        res.json(payload);
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// Modifier le nom de la carte du chatbot

router.put('/chatbots/:id', verifyToken, requireRole(['superadmin', 'admin', 1, 2]), ensureChatbotBelongsToTenant, async(req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        // Validation
        if (!name || name.trim() === '') {
            return res.status(400).json({ success: false, message: 'Le cham' });
        }

        // Vérifie que le chatbot existe
        const checkResult = await pool.query('SELECT id FROM chatbots WHERE id = $1', [id]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Chatbot non trouvé' });
        }

        await pool.query(
            'UPDATE chatbots SET name = $1 WHERE id = $2', [name.trim(), id]
        );

        res.json({ success: true, message: 'Chatbot aggiornato con successo!' });
    } catch (error) {
        console.error('Errore aggiornamento chatbot:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Modifier le tenant de la carte du chatbot (seulement pour super admin)
router.put('/chatbots/:id/tenant', verifyToken, requireRole(['superadmin', 1]), async(req, res) => {
    try {
        const { id } = req.params;
        const { tenant_id } = req.body;

        // Validation
        if (!tenant_id || isNaN(tenant_id)) {
            return res.status(400).json({ success: false, message: 'Tenant ID non valido' });
        }

        // Vérifie que le chatbot existe
        const checkResult = await pool.query('SELECT id FROM chatbots WHERE id = $1', [id]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Chatbot non trouvé' });
        }

        // Vérifie que le tenant existe
        const tenantCheck = await pool.query('SELECT id FROM tenants WHERE id = $1', [tenant_id]);
        if (tenantCheck.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Tenant non trouvé' });
        }

        await pool.query(
            'UPDATE chatbots SET tenant_id = $1 WHERE id = $2', [tenant_id, id]
        );

        // Ajoute automatiquement tous les utilisateurs du nouveau tenant à la table user_chatbots
        const usersInTenant = await pool.query(
            'SELECT id FROM users WHERE tenant_id = $1', [tenant_id]
        );

        console.log(`Aggiungendo ${usersInTenant.rows.length} utenti del tenant ${tenant_id} al chatbot ${id}`);

        for (const user of usersInTenant.rows) {
            await pool.query(
                'INSERT INTO user_chatbots (user_id, chatbot_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [user.id, id]
            );
            console.log(`Utente ${user.id} aggiunto al chatbot ${id}`);
        }

        res.json({ success: true, message: 'Tenant del chatbot aggiornato con successo!' });
    } catch (error) {
        console.error('Errore aggiornamento tenant chatbot:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/tenants', verifyToken, async(req, res) => {
    try {
        const result = await pool.query('SELECT id, name FROM tenants');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/userlist', verifyToken, async(req, res) => {
    try {
        const chatbotName = req.query.chatbot_name;
        console.log("Filtro chatbot_name:", chatbotName);
        // Costruisce query con join a chatbots per filtrare per tenant (non superadmin)
        let base = `
            SELECT 
                ul.id, ul.user_email, ul.chatbot_name, ul.name, ul.score, 
                ul.chat_history, ul.chat_analysis, ul.created_at, ul.usergroup,
                ul.stars, ul.review,
                CASE 
                    WHEN ul.timesession IS NULL OR ul.timesession = '00:00:00' THEN '-'
                    WHEN EXTRACT(HOUR FROM ul.timesession) = 0 THEN 
                        CONCAT(
                            LPAD(EXTRACT(MINUTE FROM ul.timesession)::text, 2, '0'), ':', 
                            LPAD(EXTRACT(SECOND FROM ul.timesession)::text, 2, '0')
                        )
                    ELSE 
                        CONCAT(
                            LPAD(EXTRACT(HOUR FROM ul.timesession)::text, 2, '0'), ':', 
                            LPAD(EXTRACT(MINUTE FROM ul.timesession)::text, 2, '0'), ':', 
                            LPAD(EXTRACT(SECOND FROM ul.timesession)::text, 2, '0')
                        )
                END AS temp
            FROM userlist ul
            JOIN chatbots c ON c.storyline_key = ul.chatbot_name
        `;
        const params = [];
        const clauses = [];
        const superadmin = (String(req.user.role_id) === '1' || String(req.user.role_name).toLowerCase() === 'superadmin');
        if (!superadmin) {
            clauses.push(`c.tenant_id = $${params.length + 1}`);
            params.push(req.user.tenant_id);
        }
        if (chatbotName) {
            clauses.push(`ul.chatbot_name = $${params.length + 1}`);
            params.push(chatbotName);
        } else if (!req.query.all) {
            return res.status(200).json([]);
        }
        const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
        const query = base + where;
        console.log("Query eseguita:", query, params);
        const result = await pool.query(query, params);
        console.log("Risultati trovati:", result.rows.length);
        res.status(200).json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Endpoint pour supprimer plusieurs simulations
router.delete('/userlist/delete', verifyToken, requireRole(['superadmin', 'admin', 1, 2]), ensureStorylineBelongsToTenant, async(req, res) => {
    try {
        const { ids, chatbot_name } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'IDs mancanti o non validi' });
        }

        if (!chatbot_name) {
            return res.status(400).json({ error: 'chatbot_name mancante' });
        }

        // Supprime les simulations sélectionnées (scoped au tenant per non superadmin)
        const superadmin = (String(req.user.role_id) === '1' || String(req.user.role_name).toLowerCase() === 'superadmin');
        const idPlaceholders = ids.map((_, index) => `$${index + 3}`).join(',');
        let query = `
            DELETE FROM userlist ul USING chatbots c
            WHERE ul.chatbot_name = $1
              AND ul.id IN (${idPlaceholders})
              AND c.storyline_key = ul.chatbot_name
        `;
        const params = [chatbot_name, null, ...ids]; // placeholder per eventuale tenant
        if (!superadmin) {
            query += ` AND c.tenant_id = $2`;
            params[1] = req.user.tenant_id;
        } else {
            // rimuovi il placeholder $2 se superadmin
            params.splice(1, 1);
        }
        const result = await pool.query(query, params);

        console.log(`Eliminate ${result.rowCount} simulazioni per il chatbot ${chatbot_name}`);

        res.status(200).json({
            success: true,
            message: `${result.rowCount} simulazione/i eliminate con successo`,
            deletedCount: result.rowCount
        });
    } catch (err) {
        console.error('Errore eliminazione simulazioni:', err);
        res.status(500).json({ error: err.message });
    }
});

// Route pour obtenir les simulations du mois en cours pour un chatbot
router.get('/userlist/month', verifyToken, async(req, res) => {
    try {
        const chatbotName = req.query.chatbot_name;
        console.log("=== DEBUG /userlist/month ===");
        console.log("chatbot_name ricevuto:", chatbotName);
        console.log("Tipo di chatbot_name:", typeof chatbotName);

        if (!chatbotName) {
            return res.status(400).json({ message: 'chatbot_name mancante' });
        }

        // Calcule le début et la fin du mois en cours
        const now = new Date();
        const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

        console.log("Data corrente:", now);
        console.log("Inizio mese:", startMonth);
        console.log("Fine mese:", endMonth);

        // D’abord, on vérifie s’il existe des données pour ce chatbot (filtrate per tenant se non superadmin)
        const superadmin = (String(req.user.role_id) === '1' || String(req.user.role_name).toLowerCase() === 'superadmin');
        const checkResult = superadmin ?
            await pool.query(`SELECT COUNT(*) as total FROM userlist WHERE chatbot_name = $1`, [chatbotName]) :
            await pool.query(`
                SELECT COUNT(*) as total
                FROM userlist ul
                JOIN chatbots c ON c.storyline_key = ul.chatbot_name
                WHERE ul.chatbot_name = $1 AND c.tenant_id = $2
            `, [chatbotName, req.user.tenant_id]);
        console.log("Totale record per questo chatbot (senza filtro date):", checkResult.rows[0].total);

        // Maintenant, on vérifie tous les chatbot_name disponibles (scoped se non superadmin)
        const allChatbots = superadmin ?
            await pool.query(`SELECT DISTINCT chatbot_name FROM userlist`) :
            await pool.query(`
                SELECT DISTINCT ul.chatbot_name
                FROM userlist ul
                JOIN chatbots c ON c.storyline_key = ul.chatbot_name
                WHERE c.tenant_id = $1
            `, [req.user.tenant_id]);
        console.log("Tutti i chatbot_name disponibili:", allChatbots.rows.map(r => r.chatbot_name));

        // Requête pour filtrer par chatbot_name et created_at dans le mois en cours
        const result = superadmin ?
            await pool.query(`SELECT * FROM userlist WHERE chatbot_name = $1 AND created_at >= $2 AND created_at < $3`, [chatbotName, startMonth, endMonth]) :
            await pool.query(`
                SELECT ul.*
                FROM userlist ul
                JOIN chatbots c ON c.storyline_key = ul.chatbot_name
                WHERE ul.chatbot_name = $1
                  AND ul.created_at >= $2 AND ul.created_at < $3
                  AND c.tenant_id = $4
            `, [chatbotName, startMonth, endMonth, req.user.tenant_id]);

        // console.log("Query eseguita con parametri:", [chatbotName, startMonth, endMonth]);
        //  console.log("Risultati trovati per il mese:", result.rows.length);
        //  console.log("Primi 3 risultati:", result.rows.slice(0, 3));
        //  console.log("=== FINE DEBUG ===");

        res.json(result.rows);
    } catch (err) {
        console.error("Errore in /userlist/month:", err);
        res.status(500).json({ error: err.message });
    }
});

// Retourne un chatbot par storyline_key avec les stats learners/simulations/avg_score
router.get('/chatbots/storyline/:storyline_key', async(req, res) => {
    try {
        const { storyline_key } = req.params;
        // Prendi il chatbot con il nome del tenant
        const chatbotRes = await pool.query(`
            SELECT c.*, t.name AS tenant_name 
            FROM chatbots c
            LEFT JOIN tenants t ON c.tenant_id = t.id
            WHERE c.storyline_key = $1
        `, [storyline_key]);
        if (chatbotRes.rows.length === 0) {
            return res.status(404).json({ message: 'Chatbot non trouvé' });
        }
        const chatbot = chatbotRes.rows[0];
        // Prends les statistiques depuis la liste des utilisateurs – simulations terminées pour la moyenne des scores, tous les apprenants pour le comptage.
        const statsRes = await pool.query(`
            SELECT 
                COUNT(CASE WHEN score >= 0 THEN 1 END) AS simulations,
                COUNT(DISTINCT user_email) AS learners,
                COALESCE(AVG(CASE WHEN score >= 0 THEN score END),0) AS avg_score
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

// Prévol CORS pour la route d’état (ouvert)
router.options('/chatbots/storyline/:storyline_key/status', (req, res) => {
    res.set({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.sendStatus(204);
});

// Endpoint que Storyline peut lire via storyline_key, avec CORS ouvert et no-cache
router.get(
    '/chatbots/storyline/:storyline_key/status',
    (req, res, next) => {
        res.set({
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-store'
        });
        next();
    },
    async(req, res) => {
        try {
            const { storyline_key } = req.params;
            const r = await pool.query('SELECT enabled, updated_at FROM chatbots WHERE storyline_key = $1', [storyline_key]);
            if (r.rows.length === 0) {
                // Repli « fail-open » : s’il n’y a pas d’enregistrement, on considère enabled=true
                return res.json({ chatbot: storyline_key, enabled: true });
            }
            res.json({ chatbot: storyline_key, enabled: r.rows[0].enabled, updated_at: r.rows[0].updated_at });
        } catch (e) {
            res.status(500).json({ message: e.message });
        }
    }
);

// Retourne la liste des apprenants uniques pour un chatbot_name spécifique (storyline_key)
router.get('/learners-list', verifyToken, ensureStorylineBelongsToTenant, async(req, res) => {
    try {
        const { storyline_key } = req.query;
        if (!storyline_key) {
            return res.status(400).json({ message: 'storyline_key mancante' });
        }
        const result = await pool.query(`
            SELECT 
                user_email AS email,
                MAX(name) AS name,
                COALESCE(MAX(usergroup), 'Groupe par défaut') AS usergroup,
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

// Nouvelle route : retourne la liste des apprenants uniques pour un chatbot_name spécifique (storyline_key) avec le score maximum
router.get('/learners-list-maxscore', verifyToken, ensureStorylineBelongsToTenant, async(req, res) => {
    try {
        const { storyline_key } = req.query;
        if (!storyline_key) {
            return res.status(400).json({ message: 'storyline_key not found' });
        }

        console.log('Learners list request for storyline_key:', storyline_key);

        const result = await pool.query(`
            SELECT 
                user_email AS email,
                MAX(name) AS name,
                COALESCE(MAX(usergroup), 'Groupe par défaut') AS usergroup,
                COUNT(*) AS simulations,
                COALESCE(MAX(score),0) AS score,
                TO_CHAR(MAX(created_at), 'DD/MM/YYYY') AS last_date
            FROM userlist
            WHERE chatbot_name = $1
            GROUP BY user_email
            ORDER BY last_date DESC
        `, [storyline_key]);

        console.log('Learners list result:', {
            totalLearners: result.rows.length,
            sampleEmails: result.rows.slice(0, 3).map(r => ({ email: r.email, name: r.name }))
        });

        res.json(result.rows);
    } catch (error) {
        console.error('Error on /learners-list-maxscore:', error);
        res.status(500).json({ message: error.message });
    }
});

// Endpoint pour supprimer plusieurs apprenants
router.delete('/learners/delete', verifyToken, requireRole(['superadmin', 'admin', 1, 2]), ensureStorylineBelongsToTenant, async(req, res) => {
    try {
        const { emails, storyline_key } = req.body;

        if (!emails || !Array.isArray(emails) || emails.length === 0) {
            return res.status(400).json({ error: 'Not emails providers' });
        }

        if (!storyline_key) {
            return res.status(400).json({ error: 'storyline_key not found' });
        }

        // Supprime tous les enregistrements des apprenants sélectionnés pour ce chatbot
        const superadmin = (String(req.user.role_id) === '1' || String(req.user.role_name).toLowerCase() === 'superadmin');
        const emailPlaceholders = emails.map((_, index) => `$${index + 3}`).join(',');
        let query = `
            DELETE FROM userlist ul USING chatbots c
            WHERE ul.chatbot_name = $1
              AND ul.user_email IN (${emailPlaceholders})
              AND c.storyline_key = ul.chatbot_name
        `;
        const params = [storyline_key, null, ...emails];
        if (!superadmin) {
            query += ` AND c.tenant_id = $2`;
            params[1] = req.user.tenant_id;
        } else {
            params.splice(1, 1);
        }
        const result = await pool.query(query, params);

        console.log(`Deleted ${result.rowCount} records for learners of chatbot ${storyline_key}`);

        res.status(200).json({
            success: true,
            message: `${result.rowCount} records deleted succesfully`,
            deletedCount: result.rowCount
        });
    } catch (err) {
        console.error('Error deleting learners:', err);
        res.status(500).json({ error: err.message });
    }
});

router.get('/learner-detail', verifyToken, ensureStorylineBelongsToTenant, async(req, res) => {
    const { storyline_key, email } = req.query;
    if (!storyline_key || !email) {
        return res.status(400).json({ message: 'Parametres manquants' });
    }
    try {
        console.log('Learner detail request:', { storyline_key, email });

        // On vérifie d’abord toutes les données pour ce chatbot
        const allData = await pool.query(`
            SELECT user_email, name, COUNT(*) as count
            FROM userlist
            WHERE chatbot_name = $1
            GROUP BY user_email, name
            ORDER BY count DESC
            LIMIT 10
        `, [storyline_key]);

        console.log('All data for chatbot:', {
            totalRows: allData.rows.length,
            sampleData: allData.rows
        });

        // Nous recherchons spécifiquement l’e-mail "review@baberlearning.fr"
        const reviewEmailCheck = await pool.query(`
            SELECT user_email, name, COUNT(*) as count
            FROM userlist
            WHERE chatbot_name = $1 AND user_email LIKE '%review%'
            GROUP BY user_email, name
        `, [storyline_key]);

        console.log('Review email check:', {
            found: reviewEmailCheck.rows.length,
            data: reviewEmailCheck.rows
        });

        // Nous essayons à la fois l’e-mail originale et la version encodée
        let result = await pool.query(`
            SELECT 
                *,
                CASE 
                    WHEN timesession IS NULL OR timesession = '00:00:00' THEN '-'
                    WHEN EXTRACT(HOUR FROM timesession) = 0 THEN 
                        CONCAT(
                            LPAD(EXTRACT(MINUTE FROM timesession)::text, 2, '0'), ':', 
                            LPAD(EXTRACT(SECOND FROM timesession)::text, 2, '0')
                        )
                    ELSE 
                        CONCAT(
                            LPAD(EXTRACT(HOUR FROM timesession)::text, 2, '0'), ':', 
                            LPAD(EXTRACT(MINUTE FROM timesession)::text, 2, '0'), ':', 
                            LPAD(EXTRACT(SECOND FROM timesession)::text, 2, '0')
                        )
                END AS temp
            FROM userlist
            WHERE chatbot_name = $1 AND user_email = $2
            ORDER BY created_at DESC
        `, [storyline_key, email]);

        // Si nous ne trouvons rien, nous essayons avec la version encodée
        if (result.rows.length === 0) {
            const encodedEmail = encodeURIComponent(email);
            console.log('Trying with encoded email:', encodedEmail);

            result = await pool.query(`
                SELECT 
                    *,
                    CASE 
                        WHEN timesession IS NULL OR timesession = '00:00:00' THEN '-'
                        WHEN EXTRACT(HOUR FROM timesession) = 0 THEN 
                            CONCAT(
                                LPAD(EXTRACT(MINUTE FROM timesession)::text, 2, '0'), ':', 
                                LPAD(EXTRACT(SECOND FROM timesession)::text, 2, '0')
                            )
                        ELSE 
                            CONCAT(
                                LPAD(EXTRACT(HOUR FROM timesession)::text, 2, '0'), ':', 
                                LPAD(EXTRACT(MINUTE FROM timesession)::text, 2, '0'), ':', 
                                LPAD(EXTRACT(SECOND FROM timesession)::text, 2, '0')
                            )
                    END AS temp
                FROM userlist
                WHERE chatbot_name = $1 AND user_email = $2
                ORDER BY created_at DESC
            `, [storyline_key, encodedEmail]);
        }

        console.log('Query result:', { rows: result.rows.length, firstRow: result.rows[0] });

        res.json(result.rows);
    } catch (error) {
        console.error('Errore in /learner-detail:', error);
        res.status(500).json({ message: error.message });
    }
});

// Route pour obtenir tous les utilisateurs uniques de tous les chatbots (pour super admin)
router.get('/all-users', verifyToken, requireRole(['superadmin', 1]), async(req, res) => {
    try {
        console.log('🔍 DEBUG: Eseguendo query /all-users... VERSIONE AGGIORNATA');
        console.log('🔍 DEBUG: Timestamp:', new Date().toISOString());
        const result = await pool.query(`
            SELECT 
                MIN(ul.id) AS id,
                ul.user_email AS email,
                MAX(ul.name) AS name,
                ul.chatbot_name,
                COALESCE(t.name, 'Client inconnu') AS client_name,
                COALESCE(MAX(ul.usergroup), 'Groupe par défaut') AS usergroup,
                COUNT(*) AS simulations,
                COALESCE(MAX(ul.score), 0) AS score,
                TO_CHAR(MAX(ul.created_at), 'DD/MM/YYYY') AS last_date,
                MAX(ul.created_at) AS last_date_raw
            FROM userlist ul
            LEFT JOIN chatbots c ON ul.chatbot_name = c.storyline_key
            LEFT JOIN tenants t ON c.tenant_id = t.id
            GROUP BY ul.user_email, ul.chatbot_name, t.name
            ORDER BY last_date_raw DESC
        `);
        // J’adapte les données pour le frontend (j’ajoute id, email, name, chatbot_name, group, simulations, score, last_date)
        const users = result.rows.map(row => ({
            id: row.id,
            email: row.email,
            name: row.name,
            chatbot_name: row.chatbot_name,
            client_name: row.client_name,
            group: row.usergroup,
            simulations: Number(row.simulations),
            score: Number(row.score),
            last_date: row.last_date
        }));
        res.json(users);
    } catch (error) {
        console.error('/all-users error:', error);
        res.status(500).json({ message: error.message });
    }
});

router.post('/change-password', verifyToken, async(req, res) => {
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

// Routes de réinitialisation du mot de passe
router.post('/forgot-password', async(req, res) => {
    try {
        const { email } = req.body;
        console.log('Forgot password request for email:', email);

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email manquante.' });
        }

        // Vérifie la configuration de PROD_URL
        if (!process.env.PROD_URL) {
            console.error('❌ PROD_URL not configured!');
            return res.status(500).json({ success: false, message: 'Erreur de configuration du serveur.' });
        }

        console.log('✅ PROD_URL configured:', process.env.PROD_URL);

        // Vérifie si l’utilisateur existe
        const userRes = await pool.query('SELECT id, user_mail, full_name, reset_password_token, reset_password_expires FROM users WHERE user_mail = $1', [email]);
        console.log('User found:', userRes.rows.length > 0);

        if (userRes.rows.length === 0) {
            return res.json({ success: true, message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.' });
        }

        const user = userRes.rows[0];

        // Vérifie s’il existe déjà un jeton valide
        if (user.reset_password_token && user.reset_password_expires && new Date(user.reset_password_expires) > new Date()) {
            console.log('User already has a valid reset token, sending existing link');

            // Envoie l’e-mail avec le jeton existant
            const templateSource = fs.readFileSync(__dirname + '/../../templates/reset-password.html', 'utf8');
            const template = handlebars.compile(templateSource);

            const resetLink = `${process.env.PROD_URL}/api/verify-reset-token?token=${user.reset_password_token}`;
            console.log('Using existing token, reset link:', resetLink);

            const html = template({
                full_name: user.full_name,
                resetLink: resetLink
            });

            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Réinitialisation de votre mot de passe B-Learn',
                html
            });

            return res.json({ success: true, message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.' });
        }

        // Genera un nuovo token
        const resetToken = uuidv4();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 ore

        console.log('Generated new reset token for user:', user.id);

        const resetLink = `${process.env.PROD_URL}/api/verify-reset-token?token=${resetToken}`;
        console.log('Reset URL will be:', resetLink);

        // Enregistre le jeton dans la base de données
        await pool.query(
            'UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE id = $3', [resetToken, expiresAt, user.id]
        );
        console.log('Token saved to database');

        // Vérifie que le modèle existe
        const templatePath = __dirname + '/../../templates/reset-password.html';
        if (!fs.existsSync(templatePath)) {
            console.error('Template file not found:', templatePath);
            return res.status(500).json({ success: false, message: 'Erreur de configuration du serveur.' });
        }

        // Charge le modèle HTML
        const templateSource = fs.readFileSync(templatePath, 'utf8');
        const template = handlebars.compile(templateSource);

        // Compile le modèle avec des données dynamiques
        const html = template({
            full_name: user.full_name,
            resetLink: resetLink
        });

        console.log('Sending email to:', email);
        console.log('From email:', process.env.EMAIL_USER);

        // Envoie l’e-mail
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Réinitialisation de votre mot de passe B-Learn',
            html
        });

        console.log('Email sent successfully');
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

        // Vérifie le jeton
        const userRes = await pool.query(
            'SELECT id FROM users WHERE reset_password_token = $1 AND reset_password_expires > NOW()', [token]
        );

        if (userRes.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'Token invalide ou expiré.' });
        }

        const userId = userRes.rows[0].id;
        const hashedPw = await bcrypt.hash(password, 10);

        // Met à jour le mot de passe et supprime le jeton
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
        console.log('Verifying reset token:', token ? token.substring(0, 8) + '...' : 'null');
        console.log('Headers:', req.headers);
        console.log('Accept header:', req.headers.accept);

        if (!token) {
            return res.status(400).json({ success: false, message: 'Token manquant.' });
        }

        const userRes = await pool.query(
            'SELECT id FROM users WHERE reset_password_token = $1 AND reset_password_expires > NOW()', [token]
        );

        if (userRes.rows.length === 0) {
            console.log('Token invalid or expired');
            return res.json({ success: false, message: 'Token invalide ou expiré.' });
        }

        console.log('Token valid');

        // Si la requête provient du frontend (AJAX), renvoie du JSON
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            console.log('Returning JSON response for AJAX request');
            return res.json({ success: true, message: 'Token valide.' });
        }

        // Sinon redirige (pour les liens directs dans l’e-mail)
        console.log('Redirecting to frontend');
        res.redirect(`${process.env.FRONTEND_URL || process.env.PROD_URL}/reset-password?token=${token}`);
    } catch (error) {
        console.error('Error verifying reset token:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la vérification du token.' });
    }
});

// Enregistre/met à jour la clé pour utilisateur + fournisseur + chatbot_id
router.post('/keys', verifyToken, ensureChatbotBelongsToTenant, async(req, res) => {
    try {
        const { provider = 'openai', apiKey } = req.body || {};
        const chatbot_id = String(((req && req.body && req.body.chatbot_id) || '')).trim();
        if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 8) {
            return res.status(400).json({ success: false, message: 'Clé API invalide.' });
        }
        if (!chatbot_id) {
            return res.status(400).json({ success: false, message: 'chatbot_id manquant.' });
        }

        const enc = encryptSecret(apiKey.trim());
        await pool.query(`
            INSERT INTO api_keys (user_id, provider, chatbot_id, enc_key, created_at, updated_at)
            VALUES ($1, $2, $3, $4, NOW(), NOW())
            ON CONFLICT (user_id, provider, chatbot_id)
            DO UPDATE SET enc_key = EXCLUDED.enc_key, updated_at = NOW()
        `, [req.user.id, provider, chatbot_id, enc]);

        res.json({ success: true, last4: apiKey.trim().slice(-4) });
    } catch (e) {
        console.error('POST /keys error', e);
        res.status(500).json({ success: false, message: 'Erreur enregistrement clé.' });
    }
});

// État de la clé (ne renvoie pas la clé)
router.get('/keys/status', verifyToken, ensureChatbotBelongsToTenant, async(req, res) => {
    try {
        const provider = req.query.provider || 'openai';
        const chatbot_id = String((req.query.chatbot_id || '')).trim();
        if (!chatbot_id) return res.json({ hasKey: false });

        const r = await pool.query(`
            SELECT enc_key FROM api_keys
            WHERE user_id = $1 AND provider = $2 AND chatbot_id = $3
            LIMIT 1
        `, [req.user.id, provider, chatbot_id]);

        if (r.rows.length === 0) return res.json({ hasKey: false });
        let last4 = '';
        try { last4 = decryptSecret(r.rows[0].enc_key).slice(-4); } catch {}
        res.json({ hasKey: true, last4 });
    } catch {
        res.status(500).json({ hasKey: false });
    }
});

// Supprime la clé pour utilisateur + fournisseur + chatbot_id (chaîne)
router.delete('/keys', verifyToken, ensureChatbotBelongsToTenant, async(req, res) => {
    try {
        const provider = (req.query.provider || (req && req.body && req.body.provider) || 'openai').toString();
        const chatbot_id = String(((req.query.chatbot_id || (req && req.body && req.body.chatbot_id) || ''))).trim();
        if (!chatbot_id) return res.status(400).json({ success: false, message: 'chatbot_id manquant.' });

        const del = await pool.query(`
            DELETE FROM api_keys
            WHERE user_id = $1 AND provider = $2 AND chatbot_id = $3
        `, [req.user.id, provider, chatbot_id]);

        return res.json({ success: true, deleted: del.rowCount || 0 });
    } catch (e) {
        console.error('DELETE /keys error', e);
        res.status(500).json({ success: false });
    }
});

// Endpoint pour vérifier l’authentification de l’utilisateur
router.post('/verify-auth', verifyToken, async(req, res) => {
    try {
        // Dati dal token
        const user = {
            id: req.user.id,
            email: req.user.email,
            role: req.user.role_id,
            role_name: req.user.role_name,
            tenant_id: req.user.tenant_id
        };
        res.json({ success: true, message: 'Authentification valide.', user });
    } catch (error) {
        console.error('Errore verify-auth:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la vérification de l\'authentification.' });
    }
});

// Logout : invalide le cookie
router.post('/logout', (req, res) => {
    res.clearCookie('auth', { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });
    res.json({ success: true });
});
module.exports = router;