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
  const [showSummaryDetails, setShowSummaryDetails] = useState(false);

  const [copied, setCopied] = useState<string | null>(null);

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

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/userlist?all=1`)
      .then(res => res.json())
      .then((data: UserlistRow[]) => {
        setUserlist(data);
      });
  }, []);

  // Calcolo statistiche filtrate per ruolo (incluso totalChatbots)
  useEffect(() => {
    // Calcola le statistiche filtrate in base al ruolo
    const tenantChatbots = userRole === '1'
      ? chatbots
      : chatbots.filter(bot => String(bot.tenant_id) === tenantId);

    const tenantStorylineKeys = tenantChatbots.map(bot => bot.storyline_key);

    const tenantUserlist = userRole === '1'
      ? userlist
      : userlist.filter(row => tenantStorylineKeys.includes(row.chatbot_name));

    const totalSimulations = tenantUserlist.length;
    const uniqueLearners = new Set(tenantUserlist.map(row => row.user_email)).size;
    const totalChatbots = tenantChatbots.length;

    // Top chatbot
    const chatbotCount: Record<string, number> = {};
    tenantUserlist.forEach(row => {
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
      totalChatbots,
      topChatbot
    }));
  }, [userlist, chatbots, userRole, tenantId]);

  const filteredChatbots = (userRole === '1'
    ? chatbots
    : chatbots.filter(bot => String(bot.tenant_id) === tenantId)
  ).filter(bot =>
    (bot.name || '').toLowerCase().includes(filter.toLowerCase()) &&
    (selectedClient === '' || String(bot.tenant_id) === selectedClient)
  );

  // PAGINAZIONE
  const itemsPerPage = 6;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filteredChatbots.length / itemsPerPage));
  const paginatedChatbots = filteredChatbots.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };
  useEffect(() => { setCurrentPage(1); }, [filter, selectedClient, filteredChatbots.length]);

  // Helpers per learners/simulations per chatbot
  const getLearnersForChatbot = (storyline_key: string) => {
    const emails = new Set(
      userlist.filter(row => row.chatbot_name === storyline_key).map(row => row.user_email)
    );
    return emails.size;
  };
  const getSimulationsForChatbot = (storyline_key: string) =>
    userlist.filter(row => row.chatbot_name === storyline_key).length;

  // Recupero il nome del chatbot top (non il tenant)
  let topChatbotName = '';
  if (stats.topChatbot.name) {
    const topChatbot = chatbots.find(bot => bot.storyline_key === stats.topChatbot.name);
    if (topChatbot) {
      topChatbotName = topChatbot.name;
    }
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Dashboard</h1>
      </header>

      {/* MINI DASHBOARD CARDS + BOTTONE GAMIFICATO + SEZIONE DETTAGLIATA */}
      <section className="summary-section">
        <div className="mini-dashboard-cards">
          <div className="mini-dashboard-card">
            <div className="card-emoji">🤖</div>
            <h3>Chatbots</h3>
            <div className="mini-value">{stats.totalChatbots}</div>
            <div className="card-badge positive">+2 ce mois-ci</div>
          </div>
          <div className="mini-dashboard-card">
            <div className="card-emoji">👥</div>
            <h3>Learners</h3>
            <div className="mini-value">{stats.totalLearners}</div>
            <div className="card-badge positive">+12 learners</div>
          </div>
          <div className="mini-dashboard-card">
            <div className="card-emoji">🎯</div>
            <h3>Simulations</h3>
            <div className="mini-value">{stats.totalSimulations}</div>
            <div className="card-badge positive">+56 simulations</div>
          </div>
          <div className="mini-dashboard-card">
            <div className="card-emoji">⭐</div>
            <h3>Top Chatbots</h3>
            <div className="mini-value">{stats.topChatbot.count}</div>
            <div className="top-chatbots-names">
              {stats.topChatbot.name && (
                <div className="chatbot-name-small">👑 {topChatbotName}</div>
              )}
            </div>
          </div>
        </div>
        {/* Bottone gamificato */}
        <div className="expand-section">
          <button
            className="expand-btn gamified"
            onClick={() => setShowSummaryDetails(v => !v)}
            id="expandBtn"
          >
            <span className="btn-icon">🎲</span>
            <span id="expandText">{showSummaryDetails ? 'Masquer les stats' : 'Découvrir les stats'}</span>
            <span className="expand-icon" id="expandIcon" style={{transform: showSummaryDetails ? 'rotate(180deg)' : 'rotate(0deg)'}}>{showSummaryDetails ? '▲' : '▼'}</span>
            <div className="btn-glow"></div>
          </button>
        </div>
        {/* Sezione dettagliata (espandibile) */}
        {showSummaryDetails && (
          <div className="summary-details" id="summaryDetails" style={{display: 'flex'}}>
            {/* Top 5 Simulations (statico) */}
            <div className="summary-widget gamified">
              <h3 className="widget-title">🏆 Hall of Fame - Top Simulations</h3>
              <div className="top-simulations">
                <div className="simulation-item rank-1">
                  <span className="simulation-rank gold">👑 #1</span>
                  <span className="simulation-name">Vente Retail</span>
                  <span className="simulation-count">58 <small>runs</small></span>
                  <div className="achievement-badge">🥇 Champion</div>
                </div>
                <div className="simulation-item rank-2">
                  <span className="simulation-rank silver">🥈 #2</span>
                  <span className="simulation-name">Formation Sécurité</span>
                  <span className="simulation-count">45 <small>runs</small></span>
                  <div className="achievement-badge">🔥 Hot</div>
                </div>
                <div className="simulation-item rank-3">
                  <span className="simulation-rank bronze">🥉 #3</span>
                  <span className="simulation-name">Relation Client</span>
                  <span className="simulation-count">41 <small>runs</small></span>
                  <div className="achievement-badge">⭐ Star</div>
                </div>
                <div className="simulation-item">
                  <span className="simulation-rank">#4</span>
                  <span className="simulation-name">Onboarding RH</span>
                  <span className="simulation-count">34 <small>runs</small></span>
                </div>
                <div className="simulation-item">
                  <span className="simulation-rank">#5</span>
                  <span className="simulation-name">Négociation</span>
                  <span className="simulation-count">28 <small>runs</small></span>
                </div>
              </div>
            </div>
            {/* Statistiche evolutive (statico) */}
            <div className="summary-widget gamified">
              <h3 className="widget-title">📊 Mes stats</h3>
              <div className="evolution-stats">
                <div className="evolution-item streak">
                  <div className="evolution-icon">🚀</div>
                  <div className="evolution-label">Nouvelles simulations</div>
                  <div className="evolution-value positive">+120</div>
                </div>
                <div className="evolution-item level-up">
                  <div className="evolution-icon">👑</div>
                  <div className="evolution-label">Nouveaux learners</div>
                  <div className="evolution-value positive">+12</div>
                </div>
                <div className="evolution-item achievement">
                  <div className="evolution-icon">🎯</div>
                  <div className="evolution-label">Score moyen</div>
                  <div className="evolution-value positive">+3.2</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* NUOVA SEZIONE HEADER E FILTRI */}
      <div className="dashboard-section-header-new">
        <div className="dashboard-pages-left">
          <span style={{color:'#7F53F5',fontWeight:600,fontSize:'0.95rem'}}>Page {currentPage}/{totalPages}</span>
        </div>
        <div className="dashboard-filters-center">
          <div className="dashboard-filters-fields">
            <input
              type="text"
              placeholder="Rechercher par nom de chatbot"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              style={{marginRight: userRole === '1' ? '10px' : 0, minWidth: 220}}
            />
            {userRole === '1' && (
              <select
                value={selectedClient}
                onChange={e => setSelectedClient(e.target.value)}
                style={{ minWidth: 180 }}
              >
                <option value="">Tous les clients</option>
                {tenants.map(tenant => (
                  <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                ))}
              </select>
            )}
          </div>
          <div className="dashboard-chatbots-count" style={{marginTop:'1.1rem', textAlign:'center', color:'#7F53F5', fontWeight:700, fontSize:'1.08rem'}}>
            {filteredChatbots.length} chatbots trouvés
          </div>
        </div>
      </div>

      <div className="content-grid paginated-grid">
        {paginatedChatbots.map(bot => {
          const tenant = tenants.find(t => String(t.id) === String(bot.tenant_id));
          return (
            <div
              key={bot.id}
              className="card"
              data-name={userRole === '1' ? bot.name : undefined}
              data-client={userRole === '1' ? tenant?.name : undefined}
            >
              {tenant && (
                <div className="chatbot-client">{tenant.name}</div>
              )}
              <div className="chatbot-id">
                <span
                  className="chatbot-id-text"
                  title={bot.storyline_key}
                >
                  ID: {bot.storyline_key}
                </span>
                <span
                  className="copy-id-icon"
                  title="Copia ID"
                  onClick={e => {
                    e.stopPropagation();
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                      navigator.clipboard.writeText(bot.storyline_key)
                        .then(() => {
                          setCopied(bot.storyline_key);
                          setTimeout(() => setCopied(null), 2000);
                        })
                        .catch(err => {
                          // Fallback se la Clipboard API fallisce
                          const textarea = document.createElement('textarea');
                          textarea.value = bot.storyline_key;
                          document.body.appendChild(textarea);
                          textarea.select();
                          document.execCommand('copy');
                          document.body.removeChild(textarea);
                          setCopied(bot.storyline_key);
                          setTimeout(() => setCopied(null), 2000);
                          console.error('Errore copia negli appunti:', err);
                        });
                    } else {
                      // Fallback se la Clipboard API non esiste
                      const textarea = document.createElement('textarea');
                      textarea.value = bot.storyline_key;
                      document.body.appendChild(textarea);
                      textarea.select();
                      document.execCommand('copy');
                      document.body.removeChild(textarea);
                      setCopied(bot.storyline_key);
                      setTimeout(() => setCopied(null), 2000);
                    }
                  }}
                >
                  {/* SVG icona due quadrati */}
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="5" y="5" width="10" height="10" rx="2" fill="#7F53F5" fillOpacity="0.18" stroke="#7F53F5" strokeWidth="1.2"/>
                    <rect x="8" y="8" width="7" height="7" rx="1.5" fill="#7F53F5" stroke="#7F53F5" strokeWidth="1.2"/>
                  </svg>
                  {copied === bot.storyline_key && (
                    <span className="copied-message">Copié</span>
                  )}
                </span>
              </div>
              <br /><br />
              <h2>{bot.name}</h2>
              <p>{bot.description}</p>
              <div className="chatbot-meta">
                {getLearnersForChatbot(bot.storyline_key)} learners &bull; {getSimulationsForChatbot(bot.storyline_key)} simulations
              </div>
              <button
                className="btn"
                style={{ minWidth: '120px', maxWidth: '160px', padding: '0.6rem 1.2rem', fontSize: '1rem', marginTop: '0.5rem', alignSelf: 'flex-start' }}
                onClick={() => navigate(`/chatbot/${bot.storyline_key}`)}
              >
                Voir le détail
              </button>
            </div>
          );
        })}
      </div>
      {/* PAGINAZIONE BOTTONI */}
      <div style={{display:'flex',justifyContent:'center',alignItems:'center',gap:'1rem',margin:'2rem 0 1rem 0'}}>
        <button className="pagination-btn" onClick={()=>goToPage(currentPage-1)} disabled={currentPage===1} style={{padding:'0.6rem 1.2rem',borderRadius:'8px',fontWeight:600,fontSize:'0.9rem',background:'#fff',color:'#7F53F5',border:'1px solid #e0e0e0',cursor:currentPage===1?'not-allowed':'pointer',opacity:currentPage===1?0.5:1}}>← Précédent</button>
        <span className="pagination-pages">
          {[...Array(totalPages)].map((_,i)=>(
            <button key={i+1} className={`page-btn${currentPage===i+1?' active':''}`} onClick={()=>goToPage(i+1)} style={{background:currentPage===i+1?'linear-gradient(90deg,#5B6DF6 0%,#7F53F5 100%)':'#fff',color:currentPage===i+1?'#fff':'#7F53F5',border:'1px solid #e0e0e0',borderRadius:'6px',padding:'0.5rem 0.8rem',fontSize:'0.9rem',fontWeight:600,margin:'0 2px',minWidth:'35px',cursor:'pointer'}}>{i+1}</button>
          ))}
        </span>
        <button className="pagination-btn" onClick={()=>goToPage(currentPage+1)} disabled={currentPage===totalPages} style={{padding:'0.6rem 1.2rem',borderRadius:'8px',fontWeight:600,fontSize:'0.9rem',background:'#fff',color:'#7F53F5',border:'1px solid #e0e0e0',cursor:currentPage===totalPages?'not-allowed':'pointer',opacity:currentPage===totalPages?0.5:1}}>Suivant →</button>
      </div>
    </div>
  );
}

export default Dashboard;