const crypto = require('crypto');

const ALGO = 'aes-256-gcm';

// Lazy init della chiave per evitare crash all'avvio quando non si usano le funzioni
let KEY = null;

function getKey() {
    if (KEY) return KEY;
    const raw = process.env.API_KEYS_MASTER_KEY || '';
    if (!raw) {
        throw new Error('API_KEYS_MASTER_KEY non configurata.');
    }
    let buf;
    try {
        buf = Buffer.from(raw, 'base64');
    } catch (_) {
        throw new Error('API_KEYS_MASTER_KEY non è base64 valida.');
    }
    if (buf.length !== 32) {
        throw new Error('API_KEYS_MASTER_KEY invalida: servono 32 bytes (base64).');
    }
    KEY = buf;
    return KEY;
}

function encryptSecret(plain) {
    const key = getKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGO, key, iv);
    const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

function decryptSecret(b64) {
    const key = getKey();
    const buf = Buffer.from(b64, 'base64');
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const ct = buf.subarray(28);
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(ct), decipher.final()]);
    return plain.toString('utf8');
}

module.exports = { encryptSecret, decryptSecret };