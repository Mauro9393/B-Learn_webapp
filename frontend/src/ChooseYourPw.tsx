import React, { useState } from 'react';
import './assets/css/login.css';
import { useNavigate } from 'react-router-dom';
import logoBlearn from './assets/logo-blearn.png';

function ChooseYourPw() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const userId = localStorage.getItem('userId');

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!password || !confirmPassword) {
      setError('Tous les champs sont obligatoires');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, password })
      });
      const result = await response.json();
      if (result.success) {
        setSuccess('Mot de passe changé avec succès !');
        setTimeout(() => navigate('/dashboard'), 2000);
      } else {
        setError(result.message || 'Erreur lors du changement de mot de passe');
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
        <h1>Choisissez votre mot de passe</h1>
        <p className="login-subtitle">Vous devez choisir un nouveau mot de passe pour continuer.</p>
        <form className="login-form" onSubmit={handleChangePassword}>
          <input
            type="password"
            placeholder="Nouveau mot de passe"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Confirmez le mot de passe"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
          />
          <button type="submit">Valider</button>
        </form>
        {error && <p style={{color: 'red'}}>{error}</p>}
        {success && <p style={{color: 'green'}}>{success}</p>}
      </div>
    </main>
  );
}

export default ChooseYourPw; 