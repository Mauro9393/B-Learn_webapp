import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './assets/css/AddPartner.css';

const MAX_EMAILS = 5;

const AddPartner = () => {
  const [emails, setEmails] = useState(['', '', '']);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleEmailChange = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
  };

  const handleAddField = () => {
    if (emails.length < MAX_EMAILS) {
      setEmails([...emails, '']);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const validEmails = emails.filter(email => email.trim() !== '');
    if (validEmails.length === 0) {
      setError('Inserisci almeno una email.');
      return;
    }

    // Recupera il nome del tenant da localStorage
    const tenantName = localStorage.getItem('tenantName');
    if (!tenantName) {
      setError('Tenant non trovato. Riprova dopo aver effettuato il login.');
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/invite-partner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails: validEmails,
          tenantName: tenantName
        })
      });
      const result = await response.json();
      if (result.success) {
        setSuccess('Inviti inviati con successo!');
        setEmails(['', '', '']);
        setTimeout(() => navigate('/dashboard'), 2000);
      } else {
        setError(result.message || 'Errore durante l\'invio degli inviti.');
      }
    } catch (err) {
      setError('Errore di connessione con il server.');
    }
  };

  return (
    <div className="add-partner-container">
      <h1>Invita Partner</h1>
      <form onSubmit={handleSend}>
        <button
          type="button"
          onClick={handleAddField}
          disabled={emails.length >= MAX_EMAILS}
          style={{ marginBottom: '10px', background: '#1976d2', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
        >
          + Aggiungi campo email
        </button>
        {emails.map((email, idx) => (
          <input
            key={idx}
            type="email"
            placeholder={`Email partner ${idx + 1}`}
            value={email}
            onChange={e => handleEmailChange(idx, e.target.value)}
            required={idx === 0}
            style={{ display: 'block', marginBottom: '8px' }}
          />
        ))}
        <button
          type="submit"
          style={{ marginTop: '10px', background: '#43a047', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
        >
          Send to partner
        </button>
      </form>
      {error && <p style={{color: 'red'}}>{error}</p>}
      {success && <p style={{color: 'green'}}>{success}</p>}
    </div>
  );
};

export default AddPartner; 