import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './assets/css/login.css';
import logoBlearn from './assets/logo-blearn.png';

function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [popupData, setPopupData] = useState({
    title: '',
    message: '',
    icon: '🔒'
  });
  const [isValidToken, setIsValidToken] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const token = searchParams.get('token');

  useEffect(() => {
    document.body.classList.add('login-page');
    return () => {
      document.body.classList.remove('login-page');
    };
  }, []);

  useEffect(() => {
    if (token) {
      verifyToken();
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const verifyToken = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/verify-reset-token?token=${token}`, {
        headers: {
          'Accept': 'application/json'
        }
      });
      const result = await response.json();
      setIsValidToken(result.success);
    } catch (error) {
      setIsValidToken(false);
    } finally {
      setIsLoading(false);
    }
  };

  const showPopupMessage = (title: string, message: string, icon: string = '🔒') => {
    setPopupData({ title, message, icon });
    setShowPopup(true);
  };

  const closePopup = () => {
    setShowPopup(false);
    if (popupData.title === 'Succès') {
      navigate('/login');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      showPopupMessage('Erreur', 'Les mots de passe ne correspondent pas', '❌');
      return;
    }

    if (password.length < 6) {
      showPopupMessage('Erreur', 'Le mot de passe doit contenir au moins 6 caractères', '❌');
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Reset dei tentativi di login quando la password viene cambiata con successo
        localStorage.removeItem('loginAttempts');
        localStorage.removeItem('failedLoginEmail');
        localStorage.removeItem('lastLoginAttemptTime');
        
        showPopupMessage('Succès', 'Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.', '✅');
      } else {
        showPopupMessage('Erreur', result.message || 'Erreur lors de la réinitialisation du mot de passe', '❌');
      }
    } catch (err) {
      showPopupMessage('Erreur', 'Erreur de connexion', '❌');
    }
  };

  if (isLoading) {
    return (
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
          <h1>Vérification...</h1>
        </div>
      </main>
    );
  }

  if (!token || !isValidToken) {
    return (
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
          <h1>Lien invalide</h1>
          <p className="login-subtitle">Ce lien de réinitialisation est invalide ou a expiré.</p>
          <button onClick={() => navigate('/login')} style={{ marginTop: '20px' }}>
            Retour à la connexion
          </button>
        </div>
      </main>
    );
  }

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
          <h1>Nouveau mot de passe</h1>
          <p className="login-subtitle">Définissez votre nouveau mot de passe</p>
          <form className="login-form" onSubmit={handleResetPassword} autoComplete="off">
            <input
              type="password"
              placeholder="Nouveau mot de passe"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            <input
              type="password"
              placeholder="Confirmez le mot de passe"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            <button type="submit">Réinitialiser le mot de passe</button>
          </form>
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

export default ResetPassword; 