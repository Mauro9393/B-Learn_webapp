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
      setError('Compila tutti i campi e genera l\'ID');
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
    <div className="create-chatbot-container">
      <h1>Crea Chatbot</h1>
      <form onSubmit={chatbotId ? handleSave : handleGenerateId}>
        <input
          type="text"
          placeholder="Chatbot Name"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
        <textarea
          placeholder="Description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          required
          style={{ minHeight: '80px', marginTop: '10px' }}
        />
        <select
          value={selectedTenantId}
          onChange={e => setSelectedTenantId(e.target.value)}
          required
        >
          <option value="">Seleziona cliente</option>
          {tenants.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        {chatbotId && (
          <input
            type="text"
            value={chatbotId}
            readOnly
            style={{ marginTop: '10px', fontWeight: 'bold', background: '#f5f5f5' }}
          />
        )}
        {!chatbotId ? (
          <button type="submit" style={{ marginTop: '10px' }}>Generate id Chatbot</button>
        ) : (
          <button type="submit" style={{ marginTop: '10px' }} disabled={loading}>{loading ? 'Attendi...' : 'Save'}</button>
        )}
      </form>
      {error && <p style={{color: 'red'}}>{error}</p>}
      {success && <p style={{color: 'green'}}>{success}</p>}
    </div>
  );
};

export default CreateChatbot; 