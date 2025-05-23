const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const registerUser = async(email, password) => {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
        'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *', [email, hashedPassword]
    );
    return result.rows[0];
};

const authenticateUser = async(email, password) => {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (user && await bcrypt.compare(password, user.password)) {
        const token = jwt.sign({ id: user.id, email: user.email }, 'your_jwt_secret', { expiresIn: '1h' });
        return { token };
    }
    throw new Error('Invalid credentials');
};

module.exports = { registerUser, authenticateUser };