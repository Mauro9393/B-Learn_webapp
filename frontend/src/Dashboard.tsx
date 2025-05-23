import React, { useEffect, useState } from 'react';
import './assets/css/dashboard.css';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

function Dashboard() {
  const [clientNames, setClientNames] = useState<string[]>([]);
  const navigate = useNavigate();

  // Recupera l'email dell'utente loggato
  const currentUserEmail = localStorage.getItem('userEmail');
  const adminEmail = "admin@blearn.fr";

  useEffect(() => {
    const fetchClientNames = async () => {
      const { data, error } = await supabase
        .from('userlist')
        .select('client_name');
      if (error) {
        console.error('Errore nel recupero dei client_name:', error);
      } else {
        let uniqueNames = Array.from(new Set((data || []).map(item => item.client_name)));
        // Estrai la parte prima della chiocciola
        const userPrefix = currentUserEmail ? currentUserEmail.split('@')[0].toLowerCase() : '';
        // Se non sei admin, filtra i risultati
        if (currentUserEmail && currentUserEmail !== adminEmail) {
          uniqueNames = uniqueNames.filter(name => {
            // Normalizza: tutto minuscolo e senza spazi
            const normalizedClient = name.toLowerCase().replace(/\s+/g, '');
            const normalizedPrefix = userPrefix.toLowerCase().replace(/\s+/g, '');
            return normalizedClient.includes(normalizedPrefix);
          });
        }
        setClientNames(uniqueNames);
      }
    };
    fetchClientNames();
  }, [currentUserEmail]);

  // Funzione di logout
  const handleLogout = () => {
    localStorage.removeItem('userEmail');
    navigate('/login');
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Lorem ipsum</h1>
        <div className="user-icon">👤</div>
        {currentUserEmail === adminEmail && (
          <button
            style={{ marginLeft: '20px', padding: '8px 16px', borderRadius: '4px', background: '#1976d2', color: '#fff', border: 'none', cursor: 'pointer' }}
            onClick={() => navigate('/admin')}
          >
            Add user
          </button>
        )}
        <button
          style={{ marginLeft: '20px', padding: '8px 16px', borderRadius: '4px', background: '#e53935', color: '#fff', border: 'none', cursor: 'pointer' }}
          onClick={handleLogout}
        >
          Logout
        </button>
      </header>
      <div className="filter-section">
        <input type="text" placeholder="Lorem ipsum" />
        <button>Filter</button>
      </div>
      <div className="content-grid">
        {clientNames.map((client, idx) => (
          <div
            key={client}
            className="card"
            onClick={() => navigate(`/list?client_name=${encodeURIComponent(client)}`)}
            style={{ cursor: 'pointer', margin: '10px', padding: '20px', border: '1px solid #ccc' }}
          >
            <h2>{client}</h2>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard; 