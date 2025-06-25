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
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [showAttemptsWarning, setShowAttemptsWarning] = useState(false);
  const [attemptsMessage, setAttemptsMessage] = useState('');

  useEffect(() => {
    document.body.classList.add('login-page');
    
    // Recupera i tentativi di login dal localStorage
    const savedAttempts = localStorage.getItem('loginAttempts');
    const savedEmail = localStorage.getItem('failedLoginEmail');
    const lastAttemptTime = localStorage.getItem('lastLoginAttemptTime');
    
    if (savedAttempts && savedEmail && lastAttemptTime) {
      const attempts = parseInt(savedAttempts);
      const lastTime = parseInt(lastAttemptTime);
      const now = Date.now();
      
      // Se sono passati più di 30 minuti, resetta i tentativi
      if (now - lastTime > 30 * 60 * 1000) {
        localStorage.removeItem('loginAttempts');
        localStorage.removeItem('failedLoginEmail');
        localStorage.removeItem('lastLoginAttemptTime');
      } else {
        setLoginAttempts(attempts);
        setEmail(savedEmail);
        
        // Se ha già fatto 4 tentativi, redirect automatico
        if (attempts >= 4) {
          navigate('/forgot-password');
          return;
        }
        
        // Mostra avviso se ha già fatto tentativi
        if (attempts > 0) {
          const remainingAttempts = 4 - attempts;
          const message = remainingAttempts === 1 
            ? 'Il vous reste 1 tentative avant le blocage du compte.'
            : `Il vous reste ${remainingAttempts} tentatives avant le blocage du compte.`;
          setAttemptsMessage(message);
          setShowAttemptsWarning(true);
        }
      }
    }
    
    return () => {
      document.body.classList.remove('login-page');
    };
  }, [navigate]);

  const showPopupMessage = (title: string, message: string, icon: string = '🔒') => {
    setPopupData({ title, message, icon });
    setShowPopup(true);
  };

  const closePopup = () => {
    setShowPopup(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Se ha già fatto 4 tentativi, redirect automatico
    if (loginAttempts >= 4) {
      navigate('/forgot-password');
      return;
    }
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const result = await response.json();
      
      if (result.success) {
        // Login riuscito, resetta i tentativi
        localStorage.removeItem('loginAttempts');
        localStorage.removeItem('failedLoginEmail');
        localStorage.removeItem('lastLoginAttemptTime');
        
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
        // Login fallito, incrementa i tentativi
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);
        
        // Salva i tentativi nel localStorage
        localStorage.setItem('loginAttempts', newAttempts.toString());
        localStorage.setItem('failedLoginEmail', email);
        localStorage.setItem('lastLoginAttemptTime', Date.now().toString());
        
        if (newAttempts >= 4) {
          // Dopo 4 tentativi, redirect automatico
          showPopupMessage('Compte bloqué', 'Trop de tentatives échouées. Vous avez été redirigé vers la page de récupération de mot de passe.', '🔒');
          setTimeout(() => {
            navigate('/forgot-password');
          }, 2000);
        } else {
          // Mostra solo la scritta rossa per i primi 3 tentativi (senza popup)
          const remainingAttempts = 4 - newAttempts;
          const message = remainingAttempts === 1 
            ? 'Il vous reste 1 tentative avant le blocage du compte.'
            : `Il vous reste ${remainingAttempts} tentatives avant le blocage du compte.`;
          setAttemptsMessage(message);
          setShowAttemptsWarning(true);
        }
      }
    } catch (err) {
      // Errore di connessione, incrementa i tentativi
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);
      
      localStorage.setItem('loginAttempts', newAttempts.toString());
      localStorage.setItem('failedLoginEmail', email);
      localStorage.setItem('lastLoginAttemptTime', Date.now().toString());
      
      if (newAttempts >= 4) {
        showPopupMessage('Compte bloqué', 'Trop de tentatives échouées. Vous avez été redirigé vers la page de récupération de mot de passe.', '🔒');
        setTimeout(() => {
          navigate('/forgot-password');
        }, 2000);
      } else {
        // Mostra solo la scritta rossa per i primi 3 tentativi (senza popup)
        const remainingAttempts = 4 - newAttempts;
        const message = remainingAttempts === 1 
          ? 'Il vous reste 1 tentative avant le blocage du compte.'
          : `Il vous reste ${remainingAttempts} tentatives avant le blocage du compte.`;
        setAttemptsMessage(message);
        setShowAttemptsWarning(true);
      }
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
          
          {/* Avviso tentativi rimanenti */}
          {showAttemptsWarning && loginAttempts > 0 && loginAttempts < 4 && (
            <div style={{
              color: '#dc3545',
              fontSize: '14px',
              textAlign: 'center',
              marginTop: '10px',
              fontWeight: 'bold'
            }}>
              ⚠️ {attemptsMessage}
            </div>
          )}
          
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