import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './assets/css/CreateChatbot.css';

interface Tenant {
  id: number;
  name: string;
}

function generateChatbotId(name: string) {
  // Genera un id alfanumerico unico basato sul nome e un random
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
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/tenants`)
      .then(res => res.json())
      .then(data => setTenants(data));
  }, []);

  const handleGenerateId = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      setError('Inserisci il nome del chatbot');
      return;
    }
    setChatbotId(generateChatbotId(name));
    setError('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!name || !description || !chatbotId) {
      setError("Compila tutti i campi e genera l'ID");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chatbots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          storyline_key: chatbotId,
          tenant_id: selectedTenantId
        })
      });
      const result = await response.json();
      if (result.success) {
        // Recupera la mappa esistente o crea una nuova
        const namesMap = JSON.parse(localStorage.getItem('chatbotNamesMap') || '{}');
        namesMap[chatbotId] = name;
        localStorage.setItem('chatbotNamesMap', JSON.stringify(namesMap));

        setSuccess('Chatbot creato con successo!');
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        setError(result.message || 'Errore durante la creazione');
      }
    } catch (err) {
      setError('Errore di connessione');
    }
    setLoading(false);
  };

  return (
    <main>
      <h1>Crea un Chatbot</h1>
      <div className="manager-form-container">
        <form className="manager-form" onSubmit={chatbotId ? handleSave : handleGenerateId}>
          <div className="form-group">
            <label htmlFor="chatbot-name">Nome del Chatbot</label>
            <input
              type="text"
              id="chatbot-name"
              placeholder="Inserisci il nome del chatbot"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="chatbot-description">Descrizione</label>
            <textarea
              id="chatbot-description"
              placeholder="Inserisci una descrizione del chatbot"
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
              style={{ minHeight: '80px' }}
            />
          </div>
          <div className="form-group">
            <label htmlFor="chatbot-client">Cliente</label>
            <select
              id="chatbot-client"
              value={selectedTenantId}
              onChange={e => setSelectedTenantId(e.target.value)}
              required
            >
              <option value="">Seleziona cliente</option>
              {tenants.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="chatbot-manager">Manager</label>
            <select id="chatbot-manager" disabled>
              <option value="">Seleziona manager</option>
              <option value="jean-dupont">Jean Dupont</option>
              <option value="marie-martin">Marie Martin</option>
              <option value="pierre-bernard">Pierre Bernard</option>
              <option value="sophie-durand">Sophie Durand</option>
              <option value="lucas-moreau">Lucas Moreau</option>
              <option value="emma-petit">Emma Petit</option>
            </select>
          </div>
          {chatbotId && (
            <div className="form-group">
              <label htmlFor="chatbot-id">ID Chatbot</label>
              <input
                type="text"
                id="chatbot-id"
                value={chatbotId}
                readOnly
                style={{ fontWeight: 'bold', background: '#f5f5f5' }}
              />
            </div>
          )}
          <button
            type="submit"
            className="btn-manager"
            style={{ marginTop: '10px' }}
            disabled={chatbotId ? loading : false}
          >
            <span className="btn-icon">🤖</span>
            {!chatbotId ? 'Genera ID Chatbot' : loading ? 'Attendi...' : 'Crea il Chatbot'}
          </button>
        </form>
        {error && <p style={{ color: 'red', textAlign: 'center', marginTop: '1rem' }}>{error}</p>}
        {success && <p style={{ color: 'green', textAlign: 'center', marginTop: '1rem' }}>{success}</p>}
      </div>
    </main>
  );
};

export default CreateChatbot; 