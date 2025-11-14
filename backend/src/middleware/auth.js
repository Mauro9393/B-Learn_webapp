const jwt = require('jsonwebtoken');

function getTokenFromRequest(req) {
    const cookieToken = req.cookies && req.cookies.auth;
    if (cookieToken) return cookieToken;
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }
    return null;
}

function verifyToken(req, res, next) {
    const token = getTokenFromRequest(req);
    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            return res.status(500).json({ success: false, message: 'JWT not configured' });
        }
        const payload = jwt.verify(token, secret);
        req.user = payload;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Token not valid' });
    }
}

function requireRole(rolesAllowed) {
    return (req, res, next) => {
        const u = req.user || {};
        const roleName = u.role_name;
        const roleId = u.role_id;
        const allowed = rolesAllowed.some(r => r === roleName || r === roleId);
        if (!allowed) {
            return res.status(403).json({ success: false, message: 'Denied access' });
        }
        next();
    };
}

module.exports = { verifyToken, requireRole };