import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './assets/css/confirmation.css';

const Confirmation = () => {
  const navigate = useNavigate();

  const handleOK = () => {
    navigate('/login');
  };

  return (
    <div className="confirmation-page">
      <div className="confirmation-container">
        <div className="confirmation-icon">✓</div>
        <h1 className="confirmation-title">Compte confirmé !</h1>
        <p className="confirmation-message">
          Votre compte a été confirmé avec succès. Vous pouvez maintenant vous connecter à la plateforme B-Learn.
        </p>
        <button className="confirmation-button" onClick={handleOK}>
          OK
        </button>
      </div>
    </div>
  );
};

export default Confirmation; 