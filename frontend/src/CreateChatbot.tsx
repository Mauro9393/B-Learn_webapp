import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './assets/css/CreateChatbot.css';

interface Tenant {
  id: number;
  name: string;
}

const MANAGER_OPTIONS = [
  { value: 'jean-dupont', label: 'Jean Dupont' },
  { value: 'marie-martin', label: 'Marie Martin' },
  { value: 'pierre-bernard', label: 'Pierre Bernard' },
  { value: 'sophie-durand', label: 'Sophie Durand' },
  { value: 'lucas-moreau', label: 'Lucas Moreau' },
  { value: 'emma-petit', label: 'Emma Petit' },
];

function generateChatbotId(name: string) {
  const random = Math.random().toString(36).substring(2, 8);
  return (
    name.trim().toLowerCase().replace(/\s+/g, '-') + '-' + random
  );
}

const CreateChatbot = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [chatbotId, setChatbotId] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/tenants`)
      .then(res => res.json())
      .then(data => setTenants(data));
  }, []);

  // Manager selezionato (finto, sempre il primo)
  const selectedManager = MANAGER_OPTIONS[0];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!name || !description || !selectedTenantId) {
      setError("Compila tutti i campi");
      return;
    }
    setLoading(true);
    const generatedId = generateChatbotId(name);
    setChatbotId(generatedId);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chatbots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          storyline_key: generatedId,
          tenant_id: selectedTenantId
        })
      });
      const result = await response.json();
      if (result.success) {
        const namesMap = JSON.parse(localStorage.getItem('chatbotNamesMap') || '{}');
        namesMap[generatedId] = name;
        localStorage.setItem('chatbotNamesMap', JSON.stringify(namesMap));
        setSuccess('Chatbot creato con successo!');
        setShowSummary(true);
      } else {
        setError(result.message || 'Errore durante la creazione');
      }
    } catch (err) {
      setError('Errore di connessione');
    }
    setLoading(false);
  };

  const handleCopyId = () => {
    if (navigator.clipboard && chatbotId) {
      navigator.clipboard.writeText(chatbotId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const selectedTenant = tenants.find(t => String(t.id) === selectedTenantId);

  return (
    <main>
      <h1>Créer un Chatbot</h1>
      {!showSummary ? (
        <div className="manager-form-container">
          <form className="manager-form" onSubmit={handleSave}>
            <div className="form-group">
              <label htmlFor="chatbot-name">Nom du Chatbot</label>
              <input
                type="text"
                id="chatbot-name"
                placeholder="Entrez le nom du chatbot"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="chatbot-description">Description</label>
              <textarea
                id="chatbot-description"
                placeholder="Entrez une description du chatbot"
                value={description}
                onChange={e => setDescription(e.target.value)}
                required
                style={{ minHeight: '80px' }}
              />
            </div>
            <div className="form-group">
              <label htmlFor="chatbot-client">Client</label>
              <select
                id="chatbot-client"
                value={selectedTenantId}
                onChange={e => setSelectedTenantId(e.target.value)}
                required
              >
                <option value="">Sélectionnez un client</option>
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="chatbot-manager">Manager</label>
              <select id="chatbot-manager" disabled>
                <option value="">Sélectionnez un manager</option>
                {MANAGER_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="btn-manager"
              style={{ marginTop: '10px' }}
              disabled={loading}
            >
              <span className="btn-icon">🤖</span>
              {loading ? 'Attendi...' : 'Créer le Chatbot'}
            </button>
          </form>
          {error && <p className="create-chatbot-message error">{error}</p>}
          {success && <p className="create-chatbot-message success">{success}</p>}
        </div>
      ) : (
        <div id="chatbot-summary" style={{ padding: '2rem', textAlign: 'center', background: '#f8f9ff', borderRadius: '12px', border: '2px solid #e8ebff', maxWidth: 500, margin: '0 auto' }}>
          <div style={{ fontSize: '1.4rem', color: '#5B6DF6', fontWeight: 700, marginBottom: '1.5rem' }}>🤖 Chatbot crée avec succés!</div>
          <div style={{ display: 'grid', gap: '1rem', maxWidth: '400px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <span style={{ fontWeight: 600, color: '#666' }}>Nom:</span>
              <span style={{ color: '#5B6DF6', fontWeight: 700 }}>{name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <span style={{ fontWeight: 600, color: '#666' }}>Client:</span>
              <span style={{ color: '#7F53F5', fontWeight: 700 }}>{selectedTenant ? selectedTenant.name : ''}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <span style={{ fontWeight: 600, color: '#666' }}>Manager:</span>
              <span style={{ color: '#7F53F5', fontWeight: 700 }}>{selectedManager.label}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <span style={{ fontWeight: 600, color: '#666' }}>ID Chatbot:</span>
              <span id="generatedChatbotId" style={{ color: '#7F53F5', fontWeight: 700 }}>{chatbotId}</span>
              <button
                id="copyIdBtn"
                onClick={handleCopyId}
                style={{ marginLeft: '0.5rem', padding: '0.3rem 1rem', borderRadius: '6px', border: 'none', background: 'linear-gradient(90deg,#5B6DF6,#7F53F5)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
              >
                {copied ? 'Copiato!' : 'Copia'}
              </button>
            </div>
          </div>
          <button
            className="btn-manager"
            style={{ marginTop: '2.5rem', width: '100%' }}
            onClick={() => navigate('/dashboard')}
          >
            Revenir au dashboard
          </button>
        </div>
      )}
    </main>
  );
};

export default CreateChatbot; 