const pool = require('../../config/db');

function isSuperAdmin(req) {
    const user = req.user || {};
    return String(user.role_id) === '1' || String(user.role_name).toLowerCase() === 'superadmin';
}

async function fetchChatbotById(chatbotId) {
    const r = await pool.query('SELECT id, tenant_id, storyline_key FROM chatbots WHERE id = $1', [chatbotId]);
    return r.rows[0] || null;
}

async function fetchChatbotByStorylineKey(storylineKey) {
    const r = await pool.query('SELECT id, tenant_id, storyline_key FROM chatbots WHERE storyline_key = $1', [storylineKey]);
    return r.rows[0] || null;
}

// Verifica che il chatbot identificato da :id o da chatbot_id appartenga al tenant dell'utente (salvo superadmin)
async function ensureChatbotBelongsToTenant(req, res, next) {
    try {
        if (isSuperAdmin(req)) return next();
        const tenantId = String((req.user && req.user.tenant_id) || '');
        const chatbotId = String((req.params && req.params.id) || (req.body && req.body.chatbot_id) || (req.query && req.query.chatbot_id) || '').trim();
        if (!chatbotId) {
            return res.status(400).json({ success: false, message: 'chatbot_id manquant.' });
        }
        const chatbot = await fetchChatbotById(chatbotId);
        if (!chatbot) {
            return res.status(404).json({ success: false, message: 'Chatbot non trouvé.' });
        }
        if (String(chatbot.tenant_id) !== tenantId) {
            return res.status(403).json({ success: false, message: 'Accesso negato al chatbot richiesto.' });
        }
        // attach for downstream use if needed
        req.chatbot = chatbot;
        next();
    } catch (e) {
        return res.status(500).json({ success: false, message: e.message });
    }
}

// Verifica che lo storyline_key/chatbot_name appartenga al tenant dell'utente (salvo superadmin)
async function ensureStorylineBelongsToTenant(req, res, next) {
    try {
        if (isSuperAdmin(req)) return next();
        const tenantId = String((req.user && req.user.tenant_id) || '');
        const storylineKey = String(
            (req.params && (req.params.storyline_key || req.params.chatbot_name)) ||
            (req.query && (req.query.storyline_key || req.query.chatbot_name)) ||
            (req.body && (req.body.storyline_key || req.body.chatbot_name)) ||
            ''
        ).trim();
        if (!storylineKey) {
            return res.status(400).json({ success: false, message: 'storyline_key mancante.' });
        }
        const chatbot = await fetchChatbotByStorylineKey(storylineKey);
        if (!chatbot) {
            return res.status(404).json({ success: false, message: 'Chatbot non trouvé.' });
        }
        if (String(chatbot.tenant_id) !== tenantId) {
            return res.status(403).json({ success: false, message: 'Accesso negato alle risorse del chatbot richiesto.' });
        }
        req.chatbot = chatbot;
        next();
    } catch (e) {
        return res.status(500).json({ success: false, message: e.message });
    }
}

module.exports = {
    isSuperAdmin,
    ensureChatbotBelongsToTenant,
    ensureStorylineBelongsToTenant
};