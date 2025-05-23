import React, { useState } from 'react';
import bcrypt from 'bcryptjs';

function Admin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  // Sostituisci con la tua email admin
  const adminEmail = "admin@blearn.fr";
  const currentUserEmail = localStorage.getItem('userEmail'); // O come gestisci la sessione

  if (currentUserEmail !== adminEmail) {
    return <div>Accesso negato</div>;
  }

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    // Hash della password
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/useraccount`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: hashedPassword })
      });
      const result = await response.json();
      if (result.success) {
        setMessage('Account creato con successo!');
        setEmail('');
        setPassword('');
      } else {
        setMessage('Errore nella creazione account');
      }
    } catch (error) {
      setMessage('Errore nella creazione account');
    }
  };

  return (
    <div>
      <h1>Admin - Crea Account</h1>
      <form onSubmit={handleCreateAccount}>
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
        <button type="submit">Crea account</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
}

export default Admin;
