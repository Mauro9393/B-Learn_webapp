import React, { useState } from 'react';

function Admin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [message, setMessage] = useState('');

  // Sostituisci avec votre email admin
  const userRole = localStorage.getItem('userRole');
  console.log('userRole', userRole);

  if (userRole !== '1') {
    return <div>Accès refusé</div>;
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
        setMessage("Compte admin créé avec succès !");
        setEmail('');
        setPassword('');
        setFullName('');
        setCompany('');
      } else {
        setMessage('Erreur lors de la création du compte : ' + (result.message || ''));
      }
    } catch (error) {
      setMessage('Erreur lors de la création du compte');
    }
  };

  return (
    <div>
      <h1>Admin - Créer un compte admin</h1>
      <form onSubmit={handleCreateAccount}>
        <input
          type="text"
          placeholder="Nom complet"
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Entreprise"
          value={company}
          onChange={e => setCompany(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="Entrez l'email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Entrez le mot de passe"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button type="submit">Créer le compte admin</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
}

export default Admin;
