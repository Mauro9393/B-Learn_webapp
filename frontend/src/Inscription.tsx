import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './assets/css/Inscription.css';

function Inscription() {
  const navigate = useNavigate();
  const location = useLocation();
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Estrai il token dalla query string
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const t = params.get('token');
    if (t) setToken(t);
  }, [location.search]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!email || !password || !confirmPassword || !fullName) {
      setError('Tutti i campi sono obbligatori');
      return;
    }
    if (password !== confirmPassword) {
      setError('Le password non coincidono');
      return;
    }
    if (!token) {
      setError('Token di invito mancante o non valido.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email, password, full_name: fullName })
      });
      const result = await response.json();
      if (result.success) {
        setSuccess('Registrazione avvenuta! Controlla la tua email per confermare.');
        setEmail(''); setPassword(''); setConfirmPassword(''); setFullName('');
        setTimeout(() => navigate('/login'), 3000);
      } else {
        setError(result.message || 'Errore durante la registrazione');
      }
    } catch (err) {
      setError('Errore di connessione');
    }
    setLoading(false);
  };

  return (
    <div className="inscription-container">
      <h1>Registrazione</h1>
      <form onSubmit={handleSignUp}>
        <input
          type="text"
          placeholder="Nome completo"
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="e-mail"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>{loading ? 'Attendi...' : 'Sign up'}</button>
      </form>
      {error && <p style={{color: 'red'}}>{error}</p>}
      {success && <p style={{color: 'green'}}>{success}</p>}
    </div>
  );
}

export default Inscription; 