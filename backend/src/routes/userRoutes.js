const express = require('express');
const pool = require('../../config/db');
console.log('Modulo db caricato:', pool);
const router = express.Router();

router.get('/users', async(req, res) => {
    try {
        const result = await pool.query('SELECT * FROM userlist');
        res.json(result.rows);
    } catch (error) {
        console.error('Errore nella query:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;