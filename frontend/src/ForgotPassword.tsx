import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './assets/css/login.css';
import logoBlearn from './assets/logo-blearn.png';

function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
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
    if (popupData.title === 'Email envoyé') {
      navigate('/login');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      showPopupMessage('Erreur', 'Veuillez saisir votre adresse email', '❌');
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const result = await response.json();
      
      if (result.success) {
        showPopupMessage('Email envoyé', result.message, '✅');
      } else {
        showPopupMessage('Erreur', result.message || 'Erreur lors de l\'envoi de l\'email', '❌');
      }
    } catch (err) {
      showPopupMessage('Erreur', 'Erreur de connexion', '❌');
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
          <h1>Mot de passe oublié</h1>
          <p className="login-subtitle">Entrez votre adresse email pour recevoir un lien de réinitialisation</p>
          <form className="login-form" onSubmit={handleForgotPassword} autoComplete="off">
            <input
              type="email"
              placeholder="Adresse email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <button type="submit">Envoyer le lien de réinitialisation</button>
          </form>
          <button 
            onClick={() => navigate('/login')} 
            style={{ 
              marginTop: '20px', 
              background: 'transparent', 
              border: '1px solid #007bff', 
              color: '#007bff',
              cursor: 'pointer',
              padding: '10px 20px',
              borderRadius: '5px',
              fontSize: '14px'
            }}
          >
            Retour à la connexion
          </button>
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

export default ForgotPassword; 