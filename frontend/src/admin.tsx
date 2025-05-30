import React, { useState } from 'react';

function Admin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [message, setMessage] = useState('');

  // Sostituisci con la tua email admin
  const userRole = localStorage.getItem('userRole');

  if (userRole !== '1') {
    return <div>Accesso negato</div>;
  }

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          company
        })
      });
      const result = await response.json();
      if (result.success) {
        setMessage('Account admin creato con successo!');
        setEmail('');
        setPassword('');
        setFullName('');
        setCompany('');
      } else {
        setMessage('Errore nella creazione account: ' + (result.message || ''));
      }
    } catch (error) {
      setMessage('Errore nella creazione account');
    }
  };

  return (
    <div>
      <h1>Admin - Crea Account Admin</h1>
      <form onSubmit={handleCreateAccount}>
        <input
          type="text"
          placeholder="Nome completo"
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Azienda"
          value={company}
          onChange={e => setCompany(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="Inserisci email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Inserisci password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button type="submit">Crea account admin</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
}

export default Admin;
