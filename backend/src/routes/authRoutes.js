const express = require('express');
const { registerUser, authenticateUser } = require('../auth');
const router = express.Router();

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
    try {
        const { email, password } = req.body;
        const { token } = await authenticateUser(email, password);
        res.json({ token });
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
});

module.exports = router;