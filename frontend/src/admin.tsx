import React, { useState } from 'react';
import './assets/css/admin.css';

function Admin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [message, setMessage] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [resendMsg, setResendMsg] = useState('');

  // Gating lato server tramite cookie/token
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  React.useEffect(() => {
    (async () => {
      try {
        const resp = await fetch(`${import.meta.env.VITE_API_URL}/api/verify-auth`, { method: 'POST', credentials: 'include' });
        const data = await resp.json();
        if (resp.ok && data.success && (data.user?.role === 1 || data.user?.role_name === 'superadmin')) {
          setAuthorized(true);
        } else {
          setAuthorized(false);
        }
      } catch {
        setAuthorized(false);
      }
    })();
  }, []);

  if (authorized === null) return <div>Chargement...</div>;
  if (!authorized) return <div>Accès refusé</div>;

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          company
        })
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setMessage("Compte admin créé avec succès !");
        setEmail('');
        setPassword('');
        setFullName('');
        setCompany('');
        setShowPopup(true);
        setCanResend(false);
        setResendMsg('');
      } else {
        const msg = 'Erreur lors de la création du compte : ' + (result.message || '');
        setMessage(msg);
        // Se email déjà enregistrée o mail non inviata → proponi rinvio email
        const lower = (result.message || '').toLowerCase();
        if (response.status === 409 || lower.includes('email déjà') || lower.includes('deja') || lower.includes("n'a pas pu être envoyée")) {
          setCanResend(true);
        } else {
          setCanResend(false);
        }
      }
    } catch (error) {
      setMessage('Erreur lors de la création du compte');
      setCanResend(false);
    }
  };

  const handleResend = async () => {
    try {
      setResendMsg('');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (res.ok && (data.success === undefined || data.success === true)) {
        setResendMsg('Email de connexion renvoyée. Vérifiez votre boîte mail.');
      } else {
        setResendMsg("Échec du renvoi de l'email.");
      }
    } catch (e) {
      setResendMsg("Échec du renvoi de l'email.");
    }
  };

  const closePopup = () => {
    setShowPopup(false);
  };

  return (
    <div className="manager-form-container">
      <h1>Créer un compte admin</h1>
      <p className="login-subtitle">Ajoutez un nouvel administrateur à votre tenant</p>
      <form className="manager-form" onSubmit={handleCreateAccount}>
        <div className="form-group">
          <label htmlFor="full-name">Nom complet</label>
          <input
            id="full-name"
            type="text"
            placeholder="Entrez le nom complet"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="company">Entreprise</label>
          <input
            id="company"
            type="text"
            placeholder="Entrez le nom de l'entreprise"
            value={company}
            onChange={e => setCompany(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            placeholder="Entrez l'email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Mot de passe provisoire</label>
          <input
            id="password"
            type="password"
            placeholder="Entrez le mot de passe"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn-manager">
          <span className="btn-icon">👨‍💼</span>
          Créer le compte admin
        </button>
      </form>
      {message && <p style={{ color: message.includes('succès') ? 'green' : 'red' }}>{message}</p>}
      {canResend && (
        <p style={{ marginTop: '6px' }}>
          <button type="button" onClick={handleResend} style={{ background: 'none', border: 'none', padding: 0, color: '#1e90ff', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.95rem' }}>
            Renvoyer l’email de connexion
          </button>
          {resendMsg && (
            <span style={{ marginLeft: 8, color: resendMsg.includes('renvoyée') ? 'green' : 'red' }}>{resendMsg}</span>
          )}
        </p>
      )}
      
      {/* Popup de confirmation - Stile originale da add-admin.html */}
      {showPopup && (
        <div className="popup-overlay show">
          <div className="popup-content">
            <div className="popup-icon">📧</div>
            <h3 className="popup-title">Email envoyé !</h3>
            <p className="popup-message">
              Un email vient d'être envoyé sur l'email de l'administrateur pour l'inviter à rejoindre la plateforme B-Learn.
            </p>
            <button className="popup-button" onClick={closePopup}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Admin;
