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

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const validEmails = emails.filter(email => email.trim() !== '');
    if (validEmails.length === 0) {
      setError('Inserisci almeno una email.');
      return;
    }
    // Qui andrebbe la chiamata backend per inviare le email
    setSuccess('Inviti inviati (simulato, solo frontend)!');
    setEmails(['', '', '']);
    setTimeout(() => navigate('/dashboard'), 2000);
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
            required={idx < 3}
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