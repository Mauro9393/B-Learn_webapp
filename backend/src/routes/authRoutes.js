const express = require('express');
const { registerUser, authenticateUser } = require('../auth');
const router = express.Router();
const pool = require('../config/db'); // Assicurati che punti al tuo db.js
const bcrypt = require('bcrypt');

router.post('/register', async(req, res) => {
    try {
        const { email, password } = req.body;
        const user = await registerUser(email, password);
        res.status(201).json(user);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.post('/login', async(req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM useraccount WHERE user_mail = $1', [email]);
        const user = result.rows[0];
        if (user && await bcrypt.compare(password, user.user_pw)) {
            // Login riuscito
            res.json({ success: true });
        } else {
            // Login fallito
            res.json({ success: false });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;