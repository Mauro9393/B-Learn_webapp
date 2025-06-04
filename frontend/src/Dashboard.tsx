import { useEffect, useState } from 'react';
import './assets/css/dashboard.css';
import { useNavigate} from 'react-router-dom';

interface Chatbot {
  id: number;
  name: string;
  storyline_key: string;
  tenant_id: number;
  description: string;
  created_at: string;
  client_name: string;
}

interface UserlistRow {
  user_email: string;
  chatbot_name: string;
}

function Dashboard() {
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [filter, setFilter] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [tenants, setTenants] = useState<{ id: number, name: string }[]>([]);
  const [userlist, setUserlist] = useState<UserlistRow[]>([]);
  const [stats, setStats] = useState({
    totalChatbots: 0,
    totalLearners: 0,
    totalSimulations: 0,
    topChatbot: { name: '', count: 0 }
  });
  const navigate = useNavigate();

  // Recupera l'email dell'utente loggato
  const userRole = localStorage.getItem('userRole');
  const tenantId = localStorage.getItem('tenantId');

  useEffect(() => {
    const fetchChatbots = async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chatbots`);
      const data = await response.json();
      setChatbots(data);
    };
    fetchChatbots();
  }, []);

  useEffect(() => {
    if (userRole === '1') {
      fetch(`${import.meta.env.VITE_API_URL}/api/tenants`)
        .then(res => res.json())
        .then(data => setTenants(data));
    }
  }, [userRole]);

  // Fetch userlist per statistiche
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/userlist?all=1`)
      .then(res => res.json())
      .then((data: UserlistRow[]) => {
        setUserlist(data);
        // Calcolo statistiche globali
        const totalSimulations = data.length;
        const uniqueLearners = new Set(data.map(row => row.user_email)).size;
        // Top chatbot
        const chatbotCount: Record<string, number> = {};
        data.forEach(row => {
          chatbotCount[row.chatbot_name] = (chatbotCount[row.chatbot_name] || 0) + 1;
        });
        let topChatbot = { name: '', count: 0 };
        for (const [name, count] of Object.entries(chatbotCount)) {
          if (count > topChatbot.count) topChatbot = { name, count };
        }
        setStats(s => ({
          ...s,
          totalSimulations,
          totalLearners: uniqueLearners,
          topChatbot
        }));
      });
  }, []);

  useEffect(() => {
    setStats(s => ({ ...s, totalChatbots: chatbots.length }));
  }, [chatbots]);

  const filteredChatbots = (userRole === '1'
    ? chatbots
    : chatbots.filter(bot => String(bot.tenant_id) === tenantId)
  ).filter(bot =>
    (bot.name || '').toLowerCase().includes(filter.toLowerCase()) &&
    (selectedClient === '' || String(bot.tenant_id) === selectedClient)
  );

  // Funzione di logout
  const handleLogout = () => {
    localStorage.removeItem('userEmail');
    navigate('/login');
  };

  // Helpers per learners/simulations per chatbot
  const getLearnersForChatbot = (storyline_key: string) => {
    const emails = new Set(
      userlist.filter(row => row.chatbot_name === storyline_key).map(row => row.user_email)
    );
    return emails.size;
  };
  const getSimulationsForChatbot = (storyline_key: string) =>
    userlist.filter(row => row.chatbot_name === storyline_key).length;

  return (
    <div className="dashboard-container">
      {/* MINI DASHBOARD CARDS */}
      <div className="mini-dashboard-cards">
        <div className="mini-dashboard-card">
          <div className="card-emoji">🤖</div>
          <h3>Chatbots</h3>
          <div className="mini-value">{stats.totalChatbots}</div>
          <div className="card-badge positive">Total</div>
        </div>
        <div className="mini-dashboard-card">
          <div className="card-emoji">👥</div>
          <h3>Learners</h3>
          <div className="mini-value">{stats.totalLearners}</div>
          <div className="card-badge positive">Total</div>
        </div>
        <div className="mini-dashboard-card">
          <div className="card-emoji">🎯</div>
          <h3>Simulations</h3>
          <div className="mini-value">{stats.totalSimulations}</div>
          <div className="card-badge positive">Total</div>
        </div>
        <div className="mini-dashboard-card">
          <div className="card-emoji">⭐</div>
          <h3>Top Chatbots</h3>
          <div className="mini-value">{stats.topChatbot.count}</div>
          <div className="top-chatbots-names">
            {stats.topChatbot.name && (
              <div className="chatbot-name-small">👑 {stats.topChatbot.name}</div>
            )}
          </div>
        </div>
      </div>

      <header className="dashboard-header">
        <h1>Dashboard</h1>
        <div className="user-icon">👤</div>
        {userRole === '1' && (
          <>
            <button
              style={{ marginLeft: '20px', padding: '8px 16px', borderRadius: '4px', background: '#1976d2', color: '#fff', border: 'none', cursor: 'pointer' }}
              onClick={() => navigate('/admin')}
            >
              Ajouter un utilisateur
            </button>
            <button
              style={{ marginLeft: '10px', padding: '8px 16px', borderRadius: '4px', background: '#43a047', color: '#fff', border: 'none', cursor: 'pointer' }}
              onClick={() => navigate('/create-chatbot')}
            >
              Ajouter un chatbot
            </button>
          </>
        )}
        <button
          style={{ marginLeft: '10px', padding: '8px 16px', borderRadius: '4px', background: '#ff9800', color: '#fff', border: 'none', cursor: 'pointer' }}
          onClick={() => navigate('/add-partner')}
        >
          Ajouter un partenaire
        </button>
        <button
          style={{ marginLeft: '20px', padding: '8px 16px', borderRadius: '4px', background: '#e53935', color: '#fff', border: 'none', cursor: 'pointer' }}
          onClick={handleLogout}
        >
          Déconnexion
        </button>
      </header>
      <div className="filter-section">
        <input
          type="text"
          placeholder="Rechercher par nom de chatbot"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
        {userRole === '1' && (
          <select
            value={selectedClient}
            onChange={e => setSelectedClient(e.target.value)}
            style={{ marginLeft: '10px' }}
          >
            <option value="">Tous les clients</option>
            {tenants.map(tenant => (
              <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
            ))}
          </select>
        )}
      </div>
      <div className="content-grid">
        {filteredChatbots.map(bot => (
          <div
            key={bot.id}
            className="card"
            data-name={userRole === '1' ? bot.name : undefined}
            data-client={userRole === '1' ? bot.client_name : undefined}
          >
            <div className="chatbot-id">ID: {bot.storyline_key}</div>
            <h2>{bot.name}</h2>
            <p>{bot.description}</p>
            <div className="chatbot-meta">
              {getLearnersForChatbot(bot.storyline_key)} learners &bull; {getSimulationsForChatbot(bot.storyline_key)} simulations
            </div>
            <button
              className="btn"
              style={{ width: '100%', marginTop: 'auto' }}
              onClick={() => navigate(`/list?chatbot_name=${encodeURIComponent(bot.storyline_key)}`)}
            >
              Voir le détail
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;