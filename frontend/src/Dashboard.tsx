import { useEffect, useState } from 'react';
import './assets/css/dashboard.css';
import { useNavigate, useLocation } from 'react-router-dom';

interface Chatbot {
  id: number;
  name: string;
  storyline_key: string;
  tenant_id: number;
  description: string;
  created_at: string;
}

function Dashboard() {
  const [clientNames, setClientNames] = useState<string[]>([]);
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const lastCreatedChatbotName = location.state?.lastCreatedChatbotName;
  const lastCreatedChatbotKey = location.state?.lastCreatedChatbotKey;

  // Recupera l'email dell'utente loggato
  const currentUserEmail = (localStorage.getItem('userEmail') || '').toLowerCase().trim();
  const adminEmail = "m.dicarlo@baberlearning.fr";
  const userRole = localStorage.getItem('userRole');

  const namesMap = JSON.parse(localStorage.getItem('chatbotNamesMap') || '{}');

  useEffect(() => {
    const fetchClientNames = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/userlist`);
        const data: { client_name: string }[] = await response.json();
        let uniqueNames = Array.from(new Set((data || []).map(item => item.client_name)));
        // Estrai la parte prima della chiocciola
        const userPrefix = currentUserEmail ? currentUserEmail.split('@')[0].toLowerCase() : '';
        // Se non sei admin, filtra i risultati
        if (currentUserEmail && currentUserEmail !== adminEmail) {
          uniqueNames = uniqueNames.filter((name: string) => {
            // Normalizza: tutto minuscolo e senza spazi
            const normalizedClient = name.toLowerCase().replace(/\s+/g, '');
            const normalizedPrefix = userPrefix.toLowerCase().replace(/\s+/g, '');
            return normalizedClient.includes(normalizedPrefix);
          });
        }
        setClientNames(uniqueNames);
      } catch (error) {
        console.error('Errore nel recupero dei client_name:', error);
      }
    };
    fetchClientNames();
  }, [currentUserEmail]);

  useEffect(() => {
    const fetchChatbots = async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chatbots`);
      const data = await response.json();
      setChatbots(data);
    };
    fetchChatbots();
  }, []);

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
        {userRole === '1' && (
          <>
            <button
              style={{ marginLeft: '20px', padding: '8px 16px', borderRadius: '4px', background: '#1976d2', color: '#fff', border: 'none', cursor: 'pointer' }}
              onClick={() => navigate('/admin')}
            >
              Add user
            </button>
            <button
              style={{ marginLeft: '10px', padding: '8px 16px', borderRadius: '4px', background: '#43a047', color: '#fff', border: 'none', cursor: 'pointer' }}
              onClick={() => navigate('/create-chatbot')}
            >
              Add chatbot
            </button>
          </>
        )}
        <button
          style={{ marginLeft: '10px', padding: '8px 16px', borderRadius: '4px', background: '#ff9800', color: '#fff', border: 'none', cursor: 'pointer' }}
          onClick={() => navigate('/add-partner')}
        >
          Add partner
        </button>
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
        {clientNames.map((client) => (
          <div
            key={client}
            className="card"
            onClick={() => navigate(`/list?client_name=${encodeURIComponent(client)}`)}
            style={{ cursor: 'pointer', margin: '10px', padding: '20px', border: '1px solid #ccc' }}
          >
            <h2>{client}</h2>
          </div>
        ))}
        {chatbots.map(bot => (
          <div
            key={bot.id}
            className="card"
            onClick={() => navigate(`/list?client_name=${encodeURIComponent(bot.storyline_key)}`)}
            style={{ cursor: 'pointer', margin: '10px', padding: '20px', border: '1px solid #ccc' }}
          >
            <h2>{bot.name}</h2>
            <p>{bot.description}</p>
            <p style={{ fontWeight: 'bold', color: '#888', fontSize: '0.95em' }}>ID Chatbot : {bot.storyline_key}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;