const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const authRoutes = require('./src/routes/authRoutes');
const app = express();
const PORT = process.env.PORT || 3000;

// Hardening base
app.disable('x-powered-by');
app.use(helmet({
    contentSecurityPolicy: false // Configura CSP separatamente se necessario
}));

// Configurazione CORS parametrizzata da env
// Esempio: CORS_ORIGINS=http://localhost:5173,http://localhost:5174
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174,http://localhost:3000')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

app.use(cors({
    origin: function(origin, callback) {
        if (!origin) return callback(null, true); // allow non-browser clients
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept']
}));

app.use(cookieParser());

// Rate limiting su endpoint sensibili
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false
});

app.use(express.json());
app.use('/api/login', authLimiter);
app.use('/api', authRoutes);

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend listening on http://0.0.0.0:${PORT}`);
});