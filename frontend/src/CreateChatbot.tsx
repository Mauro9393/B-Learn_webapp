import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './assets/css/CreateChatbot.css';

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
  const navigate = useNavigate();

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
      const tenant_id = localStorage.getItem('tenantId');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chatbots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, storyline_key: chatbotId, tenant_id })
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