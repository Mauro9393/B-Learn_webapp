import React, { useState } from 'react';
import { supabase } from './supabaseLogin';
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
    const { data, error } = await supabase
      .from('useraccount')
      .insert([{ user_mail :email, user_pw: hashedPassword }]);
    if (error) {
      setMessage('Errore nella creazione account'+ JSON.stringify(error));
    } else {
      setMessage('Account creato con successo!');
      setEmail('');
      setPassword('');
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
