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
        localStorage.setItem('userId', String(result.user.id));
        if (result.user.must_change_password) {
          navigate('/choose-password');
          return;
        }
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
        <div className="login-card">
          <div className="login-header">
            <img src={logoBlearn} alt="B-learn Logo" className="login-logo" />
            <h1 className="login-title">Connexion</h1>
            <p className="login-subtitle">Accédez à votre espace B-learn</p>
          </div>
          <form className="login-form" onSubmit={handleLogin} autoComplete="off">
            <div className="form-group">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Mot de passe</label>
              <input
                id="password"
                type="password"
                placeholder="Mot de passe"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <button type="submit" className="login-button">Se connecter</button>
          </form>
          {error && <p style={{color: 'red', marginTop: '1rem'}}>{error}</p>}
        </div>
      </div>
    </main>
  );
}

export default Login;