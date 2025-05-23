const express = require('express');
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/auth', authRoutes);
app.use('/api', userRoutes);
app.use('/api', authRoutes);

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend listening on http://0.0.0.0:${PORT}`);
});