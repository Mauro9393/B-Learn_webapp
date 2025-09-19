import { useEffect, useState } from 'react';
import './assets/css/dashboard.css';
import { useNavigate} from 'react-router-dom';
import { useBreadcrumbContext } from './BreadcrumbContext';

interface Chatbot {
  id: number;
  name: string;
  storyline_key: string;
  tenant_id: number;
  description: string;
  created_at: string;
  client_name: string;
  enabled: boolean;
}

interface UserlistRow {
  user_email: string;
  chatbot_name: string;
  created_at: string;
  score: number;
  stars?: number;
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
    topChatbot: { name: '', count: 0 },
    chatbotsThisMonth: 0,
    newLearnersThisMonth: 0,
    simulationsThisMonth: 0,
    topChatbotsThisMonth: [] as { name: string; storylineKey: string; count: number; rank: number }[],
    newSimulationsThisMonth: 0,
    newLearnersThisMonthStats: 0,
    averageScoreThisMonth: 0
  });
  const [showSummaryDetails, setShowSummaryDetails] = useState(false);

  const [copied, setCopied] = useState<string | null>(null);

  const navigate = useNavigate();
  const { addBreadcrumb } = useBreadcrumbContext();

  // Récupère l'email de l'utilisateur connecté
  const userRole = localStorage.getItem('userRole');
  const tenantId = localStorage.getItem('tenantId');

  const [editingChatbot, setEditingChatbot] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');

  // Stato per editing del tenant
  const [editingTenant, setEditingTenant] = useState<number | null>(null);
  const [editingTenantId, setEditingTenantId] = useState<number>(0);

  const [savingId, setSavingId] = useState<number | null>(null);

  const toggleEnabled = async (botId: number, newVal: boolean): Promise<void> => {
    try {
      setSavingId(botId);
      // UI ottimistica
      setChatbots(prev => prev.map(b => b.id === botId ? { ...b, enabled: newVal } : b));

      const r = await fetch(`/api/chatbots/${botId}/enabled`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: newVal,
          updated_by: localStorage.getItem('userMail') || 'dashboard'
        })
      });
      if (!r.ok) throw new Error('PATCH failed');
    } catch (e) {
      // rollback
      setChatbots(prev => prev.map(b => b.id === botId ? { ...b, enabled: !newVal } : b));
      alert('Errore nel salvataggio dello stato ON/OFF.');
    } finally {
      setSavingId(null);
    }
  };

  const saveChatbotName = async (chatbotId: number, newName: string) => {
    try {
        const response = await fetch(`/api/chatbots/${chatbotId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName })
        });
        
        if (response.ok) {
            // Aggiorna lo stato locale
            setChatbots(prev => prev.map(bot => 
                bot.id === chatbotId ? { ...bot, name: newName } : bot
            ));
            setEditingChatbot(null);
        }
    } catch (error) {
        console.error('Errore aggiornamento nome:', error);
    }
  };

  const saveChatbotTenant = async (chatbotId: number, newTenantId: number) => {
    try {
        const response = await fetch(`/api/chatbots/${chatbotId}/tenant`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenant_id: newTenantId })
        });
        
        if (response.ok) {
            // Ricarica i dati dal server per assicurarsi che tutto sia sincronizzato
            const userId = localStorage.getItem('userId');
            const userRole = localStorage.getItem('userRole');
            const tenantId = localStorage.getItem('tenantId');
            let url = `/api/chatbots`;
            if (userId && userRole && tenantId) {
                url += `?user_id=${encodeURIComponent(userId)}&user_role=${encodeURIComponent(userRole)}&tenant_id=${encodeURIComponent(tenantId)}`;
            }
            const refreshResponse = await fetch(url);
            const refreshData = await refreshResponse.json();
            setChatbots(refreshData);
            
            setEditingTenant(null);
            
            // Feedback per l'utente
            alert('Chatbot assigned to new client successfully!');
        }
    } catch (error) {
        console.error('Errore aggiornamento tenant:', error);
        alert('Error assigning chatbot to new client.');
    }
  };

  useEffect(() => {
    const fetchChatbots = async () => {
      const userId = localStorage.getItem('userId');
      const userRole = localStorage.getItem('userRole');
      const tenantId = localStorage.getItem('tenantId');
      let url = `/api/chatbots`;
      if (userId && userRole && tenantId) {
        url += `?user_id=${encodeURIComponent(userId)}&user_role=${encodeURIComponent(userRole)}&tenant_id=${encodeURIComponent(tenantId)}`;
      }
      const response = await fetch(url);
      const data = await response.json();
      setChatbots(data);
    };
    fetchChatbots();
  }, [selectedClient]); // Ricarica quando cambia il cliente selezionato

  useEffect(() => {
    if (userRole === '1') {
      fetch(`/api/tenants`)
        .then(res => res.json())
        .then(data => setTenants(data));
    }
  }, [userRole]);

  useEffect(() => {
    fetch(`/api/userlist?all=1`)
      .then(res => res.json())
      .then((data: UserlistRow[]) => {
        setUserlist(data);
      });
  }, []);

  // Calcolo statistiche filtrate per ruolo e per cliente selezionato
  useEffect(() => {
    // Filtra i chatbot in base al ruolo e al cliente selezionato
    const tenantChatbots = userRole === '1'
      ? chatbots.filter(bot => selectedClient === '' || String(bot.tenant_id) === selectedClient)
      : chatbots.filter(bot => String(bot.tenant_id) === tenantId);

    const tenantStorylineKeys = tenantChatbots.map(bot => bot.storyline_key);

    const tenantUserlist = userRole === '1'
      ? userlist.filter(row => tenantStorylineKeys.includes(row.chatbot_name))
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

    // Limiti del mese corrente
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const parseDate = (s: string) => {
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    };

    // Chatbot creati nel mese corrente (tra quelli visibili all'utente)
    const chatbotsThisMonth = tenantChatbots.filter(bot => {
      const d = parseDate(bot.created_at);
      return d && d >= monthStart && d < nextMonthStart;
    }).length;

    // Dati del mese corrente
    const monthlyUserlist = tenantUserlist.filter(row => {
      const d = parseDate(row.created_at);
      return d && d >= monthStart && d < nextMonthStart;
    });

    const simulationsThisMonth = monthlyUserlist.length;
    const newLearnersThisMonth = new Set(monthlyUserlist.map(r => r.user_email)).size;

    // Media punteggio del mese corrente (considera solo score validi >= 0)
    const validMonthlyScores = monthlyUserlist.map(r => r.score).filter(s => typeof s === 'number' && s >= 0);
    const averageScoreThisMonth = validMonthlyScores.length > 0
      ? Math.round(validMonthlyScores.reduce((a, b) => a + b, 0) / validMonthlyScores.length)
      : 0;

    // Top chatbot del mese corrente (per numero di simulazioni)
    const countsPerChatbot: Record<string, number> = {};
    monthlyUserlist.forEach(r => { countsPerChatbot[r.chatbot_name] = (countsPerChatbot[r.chatbot_name] || 0) + 1; });
    const topChatbotsThisMonth = Object.entries(countsPerChatbot)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([storylineKey, count], idx) => {
        const bot = tenantChatbots.find(b => b.storyline_key === storylineKey);
        return {
          name: bot ? bot.name : storylineKey,
          storylineKey,
          count,
          rank: idx + 1,
        } as { name: string; storylineKey: string; count: number; rank: number };
      });

    // Valore mostrato nel widget "Nouvelles simulations"
    const newSimulationsThisMonth = simulationsThisMonth;

    setStats(s => ({
      ...s,
      totalSimulations,
      totalLearners: uniqueLearners,
      totalChatbots,
      topChatbot,
      chatbotsThisMonth,
      newLearnersThisMonth,
      simulationsThisMonth,
      topChatbotsThisMonth,
      newSimulationsThisMonth,
      newLearnersThisMonthStats: newLearnersThisMonth,
      averageScoreThisMonth
    }));
  }, [userlist, chatbots, userRole, tenantId, selectedClient]);

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

  // Media stelle per chatbot, arrotondata al mezzo punto
  const getAvgStarsForChatbot = (storyline_key: string) => {
    const values = userlist
      .filter(row => row.chatbot_name === storyline_key)
      .map((r: any) => Number(r.stars))
      .filter((n: number) => !isNaN(n) && isFinite(n) && n > 0);
    if (values.length === 0) return 0;
    const avg = values.reduce((a: number, b: number) => a + b, 0) / values.length;
    return Math.round(avg * 2) / 2;
  };

  // Render stelle con overlay parziale, versione mini
  const renderAverageStarsMini = (value: number) => {
    const clamped = Math.max(0, Math.min(5, value));
    const widthPercent = (clamped / 5) * 100;
    return (
      <span className="stars-avg-mini" aria-label={`${clamped.toFixed(1)} su 5`} title={`${clamped.toFixed(1)} / 5`}>
        <span className="stars-base-mini">★★★★★</span>
        <span className="stars-fill-mini" style={{ width: `${widthPercent}%` }}>★★★★★</span>
      </span>
    );
  };

  // Recupero il nome du chatbot top (non le tenant)
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
            <div className="card-badge positive">+{stats.chatbotsThisMonth} ce mois-ci</div>
          </div>
          <div className="mini-dashboard-card">
            <div className="card-emoji">👥</div>
            <h3>Learners</h3>
            <div className="mini-value">{stats.totalLearners}</div>
            <div className="card-badge positive">+{stats.newLearnersThisMonth} ce mois-ci</div>
          </div>
          <div className="mini-dashboard-card">
            <div className="card-emoji">🎯</div>
            <h3>Simulations</h3>
            <div className="mini-value">{stats.totalSimulations}</div>
            <div className="card-badge positive">+{stats.simulationsThisMonth} ce mois-ci</div>
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
            {/* Top 5 Simulations (dinamico) */}
            <div className="summary-widget gamified">
              <h3 className="widget-title">🏆 Hall of Fame - Top Simulations</h3>
              <div className="top-simulations">
                {stats.topChatbotsThisMonth && stats.topChatbotsThisMonth.length > 0 ? (
                  stats.topChatbotsThisMonth.map((chatbot, index) => {
                    const rankClass = index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : '';
                    const rankIcon = index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
                    const achievementBadge = index === 0 ? '🥇 Champion' : index === 1 ? '🔥 Hot' : index === 2 ? '⭐ Star' : '';
                    
                    return (
                      <div key={chatbot.storylineKey} className={`simulation-item ${rankClass}`}>
                        <span className="simulation-rank">
                          {rankIcon} #{chatbot.rank}
                        </span>
                        <span className="simulation-name">{chatbot.name}</span>
                        <span className="simulation-count">{chatbot.count} <small>runs</small></span>
                        {achievementBadge && (
                          <div className="achievement-badge">{achievementBadge}</div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="no-data-message">
                    <span>📊 Aucune simulation ce mois-ci</span>
                  </div>
                )}
              </div>
            </div>
            {/* Statistiche evolutive (dinamico) */}
            <div className="summary-widget gamified">
              <h3 className="widget-title">📊 Mes stats du mois</h3>
              <div className="evolution-stats">
                <div className="evolution-item streak">
                  <div className="evolution-icon">🚀</div>
                  <div className="evolution-label">Nouvelles simulations</div>
                  <div className="evolution-value positive">+{stats.newSimulationsThisMonth}</div>
                </div>
                <div className="evolution-item level-up">
                  <div className="evolution-icon">👑</div>
                  <div className="evolution-label">Nouveaux learners</div>
                  <div className="evolution-value positive">+{stats.newLearnersThisMonthStats}</div>
                </div>
                <div className="evolution-item achievement">
                  <div className="evolution-icon">🎯</div>
                  <div className="evolution-label">Score moyen</div>
                  <div className="evolution-value positive">+{stats.averageScoreThisMonth}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="section-divider"></div>

      {/* NUOVA SEZIONE HEADER E FILTRI */}
      <div className="dashboard-section-header-new">
        <div className="dashboard-pages-left">
          <span style={{color:'#7F53F5',fontWeight:600,fontSize:'0.95rem'}}>Page {currentPage}/{totalPages}</span>
        </div>
        <div className="dashboard-filters-center">
          <div className="dashboard-filters-fields">
            <div className="input-icon-wrapper">
              {/*<span className="input-search-icon" role="img" aria-label="search">🔍</span>*/}
              <input
                type="text"
                placeholder="Rechercher un chatbot..."
                value={filter}
                onChange={e => setFilter(e.target.value)}
                style={{minWidth: 220}}
              />
            </div>
            {userRole === '1' && (
              <select
                value={selectedClient}
                onChange={e => setSelectedClient(e.target.value)}
                className="select-client"
                style={{ minWidth: 180 }}
              >
                <option value="">Tous les clients</option>
                {tenants.map(tenant => (
                  <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                ))}
              </select>
            )}
          </div>
          <div className="dashboard-chatbots-count-badge">
            {filteredChatbots.length} chatbots trouvés
          </div>
        </div>
      </div>

      <div className="content-grid paginated-grid">
        {paginatedChatbots.map(bot => {
          const tenant = tenants.find(t => String(t.id) === String(bot.tenant_id));
          const avgStars = getAvgStarsForChatbot(bot.storyline_key);
          return (
            <div
              key={bot.id}
              className="card"
              data-name={userRole === '1' ? bot.name : undefined}
              data-client={userRole === '1' ? tenant?.name : undefined}
            >
              {tenant && (
                <div className="chatbot-client">
                  {userRole === '1' && editingTenant === bot.id ? (
                    <select
                      value={editingTenantId}
                      onChange={(e) => setEditingTenantId(Number(e.target.value))}
                      onBlur={() => saveChatbotTenant(bot.id, editingTenantId)}
                      onKeyPress={(e) => e.key === 'Enter' && saveChatbotTenant(bot.id, editingTenantId)}
                      autoFocus
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'inherit',
                        fontSize: 'inherit',
                        fontWeight: 'inherit',
                        cursor: 'pointer',
                        outline: 'none'
                      }}
                    >
                      {tenants.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  ) : (
                    <span 
                      onClick={() => {
                        if (userRole === '1') {
                          setEditingTenant(bot.id);
                          setEditingTenantId(bot.tenant_id);
                        }
                      }}
                      style={{ cursor: userRole === '1' ? 'pointer' : 'default' }}
                      title={userRole === '1' ? 'Clicca per modificare il cliente' : ''}
                    >
                      {tenant.name}
                      {userRole === '1' && <span style={{ marginLeft: '4px', fontSize: '0.8em' }}>✏️</span>}
                    </span>
                  )}
                </div>
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
                    <rect x="5" y="5" width="10" height="10" rx="2" fill="#fff" fillOpacity="0.18" stroke="#fff" strokeWidth="1.2"/>
                    <rect x="8" y="8" width="7" height="7" rx="1.5" fill="#fff" stroke="#fff" strokeWidth="1.2"/>
                  </svg>
                  {copied === bot.storyline_key && (
                    <span className="copied-message">Copié</span>
                  )}
                </span>
              </div>
              <br /><br />
              <h2>
                {editingChatbot === bot.id ? (
                    <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => saveChatbotName(bot.id, editingName)}
                        onKeyPress={(e) => e.key === 'Enter' && saveChatbotName(bot.id, editingName)}
                        autoFocus
                    />
                ) : (
                    <>
                        {bot.name}
                        <span 
                            className="edit-icon" 
                            onClick={() => {
                                setEditingChatbot(bot.id);
                                setEditingName(bot.name);
                            }}
                        >
                            ✏️
                        </span>
                    </>
                )}
              </h2>
              <p>{bot.description}</p>
              {(userRole === '1' || userRole === '2') && (
                <div className="card-toggle" style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label className="switch" title={bot.enabled ? 'Désactiver le chatbot' : 'Activer le chatbot'}>
                    <input
                      type="checkbox"
                      checked={!!bot.enabled}
                      onChange={() => toggleEnabled(bot.id, !bot.enabled)}
                      disabled={savingId === bot.id}
                    />
                    <span className="slider" />
                  </label>
                  <span className="toggle-label">{bot.enabled ? 'Activé' : 'Désactivé'}</span>
                </div>
              )}
              <div className="chatbot-meta">
                {getLearnersForChatbot(bot.storyline_key)} learners &bull; {getSimulationsForChatbot(bot.storyline_key)} simulations
              </div>
              <div className="chatbot-stars">
                <span className="stars-label">Étoiles:&nbsp;</span>
                {renderAverageStarsMini(avgStars)}
                <span className="stars-value-mini">{avgStars.toFixed(1)} / 5</span>
              </div>
              <button
                className="btn"
                style={{ minWidth: '120px', maxWidth: '160px', padding: '0.6rem 1.2rem', fontSize: '1rem', marginTop: '0.5rem', alignSelf: 'flex-start' }}
                onClick={() => {
                  addBreadcrumb({ label: bot.name, path: `/chatbot/${bot.storyline_key}` });
                  navigate(`/chatbot/${bot.storyline_key}`);
                }}
              >
                Voir le détail
              </button>
            </div>
          );
        })}
      </div>
      {/* PAGINAZIONE BOTTONI */}
      <div className="dashboard-pagination">
        {/* Mobile pagination */}
        <div className="mobile-pagination">
          <button className="page-btn" onClick={()=>goToPage(currentPage-1)} disabled={currentPage===1} aria-label="Pagina precedente">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span className="page-indicator">{currentPage} / {totalPages}</span>
          <button className="page-btn" onClick={()=>goToPage(currentPage+1)} disabled={currentPage===totalPages} aria-label="Pagina successiva">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
        {/* Desktop/tablet pagination */}
        <div className="desktop-pagination">
          <button className="pagination-btn" onClick={()=>goToPage(currentPage-1)} disabled={currentPage===1}>← Précédent</button>
          <span className="pagination-pages">
            {[...Array(totalPages)].map((_,i)=>(
              <button key={i+1} className={`page-btn${currentPage===i+1?' active':''}`} onClick={()=>goToPage(i+1)}>{i+1}</button>
            ))}
          </span>
          <button className="pagination-btn" onClick={()=>goToPage(currentPage+1)} disabled={currentPage===totalPages}>Suivant →</button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;