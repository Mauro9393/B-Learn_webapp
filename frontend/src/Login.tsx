import React, { useState, useEffect } from 'react';
import './assets/css/login.css';
import { useNavigate } from 'react-router-dom';
import logoBlearn from './assets/logo-blearn.png';

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    document.body.classList.add('login-page');
    return () => {
      document.body.classList.remove('login-page');
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    // console.log('handleLogin appelé');
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const result = await response.json();
      // console.log('Réponse login:', result);
      if (result.success) {
        localStorage.setItem('userEmail', email);
        localStorage.setItem('userRole', String(result.role));
        localStorage.setItem('tenantId', result.user.tenant_id);
        fetch(`${import.meta.env.VITE_API_URL}/api/tenants`)
        .then(res => res.json())
        .then((tenants: { id: number|string, name: string }[]) => {
          const tenant = tenants.find(t => String(t.id) === String(result.user.tenant_id));
          if (tenant) {
            localStorage.setItem('tenantName', tenant.name);
          }
          navigate('/dashboard');
        });
        // console.log('Enregistré dans localStorage:', {
        //   userEmail: localStorage.getItem('userEmail'),
        //   userRole: localStorage.getItem('userRole'),
        //   tenantId: localStorage.getItem('tenantId')
        // });
        navigate('/dashboard');
      } else {
        setError(result.message || 'Email ou mot de passe incorrect');
      }
    } catch (err) {
      setError('Erreur de connexion');
    }
  };

  return (
    <main className="login-main-centered">
      <div className="animated-bg">
        {[...Array(12)].map((_, i) => (
          <div className="sphere" key={i}></div>
        ))}
      </div>
      <div className="login-container">
        <img src={logoBlearn} alt="B-learn Logo" className="login-logo" />
        <h1>Connexion</h1>
        <p className="login-subtitle">Accédez à votre espace B-learn</p>
        <form className="login-form" onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <button type="submit">Se connecter</button>
        </form>
        {error && <p style={{color: 'red'}}>{error}</p>}
      </div>
    </main>
  );
}

export default Login;