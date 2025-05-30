const express = require('express');
const cors = require('cors');
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: 'http://163.172.159.116',
    credentials: true
}));
app.use(express.json());
app.use('/api', userRoutes);
app.use('/api', authRoutes);

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend listening on http://0.0.0.0:${PORT}`);
});