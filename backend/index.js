const express = require('express');
const cors = require('cors');
const authRoutes = require('./src/routes/authRoutes');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json());
app.use('/api', authRoutes);

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend listening on http://0.0.0.0:${PORT}`);
});