import React, { useState, useEffect } from 'react';
import './assets/css/login.css';
import { useNavigate } from 'react-router-dom';
import logoBlearn from './assets/logo-blearn.png';

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [popupData, setPopupData] = useState({
    title: '',
    message: '',
    icon: '🔒'
  });

  useEffect(() => {
    document.body.classList.add('login-page');
    return () => {
      document.body.classList.remove('login-page');
    };
  }, []);

  const showPopupMessage = (title: string, message: string, icon: string = '🔒') => {
    setPopupData({ title, message, icon });
    setShowPopup(true);
  };

  const closePopup = () => {
    setShowPopup(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const result = await response.json();
      
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
        
        navigate('/dashboard');
      } else {
        showPopupMessage('Erreur de connexion', result.message || 'Email ou mot de passe incorrect', '❌');
      }
    } catch (err) {
      showPopupMessage('Erreur de connexion', 'Erreur de connexion', '❌');
    }
  };

  return (
    <>
      <main className="login-main-centered">
        <div className="animated-bg">
          {[...Array(12)].map((_, i) => (
            <div className="sphere" key={i}></div>
          ))}
        </div>
        <div className="login-container">
          <div className="login-logo">
            <img src={logoBlearn} alt="B-learn Logo" />
          </div>
          <h1>Connexion</h1>
          <p className="login-subtitle">Accédez à votre espace B-learn</p>
          <form className="login-form" onSubmit={handleLogin} autoComplete="off">
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="username"
            />
            <input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <button type="submit">Se connecter</button>
          </form>
          <div style={{ 
            textAlign: 'center', 
            marginTop: '20px',
            fontSize: '14px'
          }}>
            <a 
              href="/forgot-password" 
              style={{ 
                color: '#007bff', 
                textDecoration: 'none',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => (e.target as HTMLElement).style.textDecoration = 'underline'}
              onMouseLeave={(e) => (e.target as HTMLElement).style.textDecoration = 'none'}
            >
              Mot de passe oublié ?
            </a>
          </div>
        </div>
      </main>

      {/* Popup di notifica */}
      <div className={`popup-overlay ${showPopup ? 'show' : ''}`} onClick={closePopup}>
        <div className="popup-content" onClick={(e) => e.stopPropagation()}>
          <div className="popup-icon">{popupData.icon}</div>
          <h3 className="popup-title">{popupData.title}</h3>
          <p className="popup-message">{popupData.message}</p>
          <div className="popup-buttons">
            <button className="popup-button secondary" onClick={closePopup}>
              Fermer
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default Login;