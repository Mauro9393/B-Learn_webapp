import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './assets/css/AddPartner.css';

const AddPartner = () => {
  const [managerName, setManagerName] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [chatbots, setChatbots] = useState<{ id: number, name: string }[]>([]);
  const [selectedChatbotId, setSelectedChatbotId] = useState('');
  const [error, setError] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Recupera i chatbot della propria azienda
    const tenantId = localStorage.getItem('tenantId');
    if (!tenantId) return;
    fetch(`${import.meta.env.VITE_API_URL}/api/chatbots`)
      .then(res => res.json())
      .then(data => {
        // Filtra solo quelli del tenant
        const filtered = data.filter((cb: any) => String(cb.tenant_id) === String(tenantId));
        setChatbots(filtered);
      });
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const tenantName = localStorage.getItem('tenantName');
    if (!tenantName) {
      setError('Tenant introuvable. Veuillez réessayer après connexion.');
      return;
    }
    if (!selectedChatbotId) {
      setError('Veuillez sélectionner un chatbot.');
      return;
    }
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/invite-partner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails: [managerEmail],
          tenantName: tenantName,
          managerName: managerName,
          chatbotId: selectedChatbotId
        })
      });
      const result = await response.json();
      if (result.success) {
        setManagerName('');
        setManagerEmail('');
        setSelectedChatbotId('');
        setShowPopup(true);
      } else {
        setError(result.message || 'Erreur lors de l\'envoi de l\'invitation.');
      }
    } catch (err) {
      setError('Erreur de connexion au serveur.');
    }
  };

  const closePopup = () => {
    setShowPopup(false);
    navigate('/dashboard');
  };

  return (
    <div className="add-partner-container">
      <h1>Ajouter un manager</h1>
      <form onSubmit={handleSend}>
        <div className="form-group">
          <label htmlFor="manager-name">Nom du manager</label>
          <input
            id="manager-name"
            type="text"
            placeholder="Entrez le nom du manager"
            value={managerName}
            onChange={e => setManagerName(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="manager-email">Email du manager</label>
          <input
            id="manager-email"
            type="email"
            placeholder="Entrez l'email du manager"
            value={managerEmail}
            onChange={e => setManagerEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="chatbot-select">Chatbot</label>
          <select
            id="chatbot-select"
            value={selectedChatbotId}
            onChange={e => setSelectedChatbotId(e.target.value)}
            required
          >
            <option value="">Sélectionnez un chatbot</option>
            {chatbots.map(cb => (
              <option key={cb.id} value={cb.id}>{cb.name}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-manager">
          <span className="btn-icon">👤</span>
          Ajouter le manager
        </button>
      </form>
      {error && <p style={{color: 'red'}}>{error}</p>}
      {/* Popup de confirmation */}
      {showPopup && (
        <div className="popup-overlay show">
          <div className="popup-content">
            <div className="popup-icon">📧</div>
            <h3 className="popup-title">Email envoyé !</h3>
            <p className="popup-message">
              Un email vient d'être envoyé à <b>{managerEmail}</b> pour inviter <b>{managerName}</b> à rejoindre la plateforme B-Learn.
            </p>
            <button className="popup-button" onClick={closePopup}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddPartner; 