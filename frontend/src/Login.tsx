import React, { useState } from 'react';
import './assets/css/login.css';
import { useNavigate } from 'react-router-dom';

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('handleLogin chiamato');
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const result = await response.json();
      console.log('Risposta login:', result);
      if (result.success) {
        localStorage.setItem('userEmail', email);
        localStorage.setItem('userRole', String(result.role));
        localStorage.setItem('tenantId', result.user.tenant_id);
        console.log('Salvato in localStorage:', {
          userEmail: localStorage.getItem('userEmail'),
          userRole: localStorage.getItem('userRole'),
          tenantId: localStorage.getItem('tenantId')
        });
        navigate('/dashboard');
      } else {
        setError(result.message || 'Email o password errati');
      }
    } catch (err) {
      setError('Errore di connessione');
    }
  };

  return (
    <div className="login-container">
      <h1>Login</h1>
      <form onSubmit={handleLogin}>
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
        <button type="submit">Log in</button>
        
      </form>
      {error && <p style={{color: 'red'}}>{error}</p>}
    </div>
  );
}

export default Login;