const express = require('express');
const cors = require('cors');
const authRoutes = require('./src/routes/authRoutes');
const app = express();
const PORT = process.env.PORT || 3000;

// Configurazione CORS più specifica
app.use(cors({
    origin: ['http://localhost:5174', 'http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept']
}));

app.use(express.json());
app.use('/api', authRoutes);

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend listening on http://0.0.0.0:${PORT}`);
});