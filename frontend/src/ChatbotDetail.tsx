import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './assets/css/chatbotDetail.css';
import { useBreadcrumbContext } from './BreadcrumbContext';
import { useSettings } from './SettingsContext';

interface ChatbotDetailData {
  id: number;
  name: string;
  manager_email: string;
  simulations: number;
  avg_score: number;
  learners: number;
  storyline_key: string;
  tenant_id?: number;
  tenant_name?: string;
}

interface Simulation {
  id: number;
  name: string;
  user_email: string;
  score: number;
  created_at: string;
  usergroup?: string;
}

// Interfaccia per le impostazioni
interface Settings {
  showGroups: boolean;
  showRanking: boolean;
}

const ChatbotDetail: React.FC = () => {
  const { storyline_key } = useParams<{ storyline_key: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ChatbotDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSims, setLoadingSims] = useState(true);
  const { addBreadcrumb } = useBreadcrumbContext();

  // Stato per le impostazioni
  const { settings, updateSettings } = useSettings();
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Statistiche mensili
  const [monthStats, setMonthStats] = useState({
    simulations: 0,
    avgScore: 0,
    learners: 0,
    bestLearners: [] as { name: string; user_email: string; score: number }[],
  });

  // Stato per i gruppi e il filtro
  const [groups, setGroups] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [filteredData, setFilteredData] = useState<ChatbotDetailData | null>(null);
  const [filteredBestLearners, setFilteredBestLearners] = useState<{ name: string; user_email: string; score: number }[]>([]);
  
  // Stato per le nuove statistiche
  const [completionRate, setCompletionRate] = useState<number>(0);
  const [engagementRate, setEngagementRate] = useState<number>(0);
  const [totalSimulations, setTotalSimulations] = useState<number>(0);

  // Funzione per gestire il cambio delle impostazioni
  const handleSettingChange = (setting: keyof Settings) => {
    updateSettings({ [setting]: !settings[setting] });
  };

  // Funzione per chiudere il modal
  const closeSettingsModal = () => {
    setShowSettingsModal(false);
  };

  // Funzione per gestire il cambio di gruppo
  const handleGroupChange = (group: string) => {
    setSelectedGroup(group);
    // Salva il gruppo selezionato nel localStorage
    localStorage.setItem(`selectedGroup_${storyline_key}`, group);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/chatbots/storyline/${storyline_key}`);
        const chatbot = await res.json();
        setData({
          id: chatbot.id,
          name: chatbot.name,
          manager_email: chatbot.manager_email || 'manager1@gmail.com',
          simulations: chatbot.simulations || 0,
          avg_score: chatbot.avg_score || 0,
          learners: chatbot.learners || 0,
          storyline_key: chatbot.storyline_key,
          tenant_id: chatbot.tenant_id,
          tenant_name: chatbot.tenant_name,
        });
        
        // Fetch tutte le simulazioni per calcolare le statistiche
        try {
          const allSimsRes = await fetch(`/api/userlist?chatbot_name=${storyline_key}`);
          const allSims = await allSimsRes.json();
          
          const totalSims = allSims.length;
          const completedSims = allSims.filter((s: Simulation) => typeof s.score === 'number' && s.score >= 0).length;
          const totalLearners = new Set(allSims.map((s: Simulation) => s.user_email)).size;
          
          setTotalSimulations(totalSims);
          setCompletionRate(totalSims > 0 ? Math.round((completedSims / totalSims) * 100) : 0);
          setEngagementRate(totalLearners > 0 ? Math.round((completedSims / totalLearners) * 10) / 10 : 0);
        } catch (e) {
          console.error('Errore nel calcolo delle statistiche:', e);
        }
      } catch (e) {
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [storyline_key]);

  // Carica il gruppo selezionato dal localStorage quando il componente si monta
  useEffect(() => {
    const savedGroup = localStorage.getItem(`selectedGroup_${storyline_key}`);
    if (savedGroup) {
      setSelectedGroup(savedGroup);
    }
  }, [storyline_key]);

  useEffect(() => {
    const fetchSimulations = async () => {
      setLoadingSims(true);
      try {
        // Nuova fetch: solo simulazioni del mese corrente per questo chatbot
        const res = await fetch(`/api/userlist/month?chatbot_name=${storyline_key}`);
        const sims = await res.json();
        
        // Estrai i gruppi unici dalle simulazioni
        const uniqueGroups = Array.from(new Set(sims.map((s: Simulation) => s.usergroup || 'Groupe par défaut'))) as string[];
        setGroups(uniqueGroups);
        
        // learners unici mese
        const learnersSet = new Set(sims.map((s: Simulation) => s.user_email));
        const learnersThisMonth = learnersSet.size;
        // Filtra solo simulazioni con score >= 0
        const completedSims = sims.filter((s: Simulation) => typeof s.score === 'number' && s.score >= 0);
        const simulationsThisMonth = completedSims.length;
        const avgScoreThisMonth = completedSims.length > 0 ? Math.round(completedSims.reduce((sum: number, s: Simulation) => sum + s.score, 0) / completedSims.length) : 0;
        // Best learners mese
        const bestLearners = (Array.from(sims.reduce((acc: Map<string, { name: string; user_email: string; score: number }>, s: Simulation) => {
          if (!acc.has(s.user_email) || acc.get(s.user_email)!.score < s.score) {
            acc.set(s.user_email, { name: s.name, user_email: s.user_email, score: s.score });
          }
          return acc;
        }, new Map()).values()) as { name: string; user_email: string; score: number }[])
          .sort((a, b) => b.score - a.score)
          .slice(0, 3);
        setMonthStats({
          simulations: simulationsThisMonth,
          avgScore: avgScoreThisMonth,
          learners: learnersThisMonth,
          bestLearners,
        });
      } catch (e) {
        setMonthStats({ simulations: 0, avgScore: 0, learners: 0, bestLearners: [] });
        setGroups([]);
      } finally {
        setLoadingSims(false);
      }
    };
    if (storyline_key) fetchSimulations();
  }, [storyline_key]);

  // Funzione per filtrare i dati in base al gruppo selezionato
  const filterDataByGroup = async (group: string) => {
    if (group === 'all') {
      setFilteredData(data);
      setFilteredBestLearners(monthStats.bestLearners);
      // Ripristina le statistiche globali
      const allSimsRes = await fetch(`/api/userlist?chatbot_name=${storyline_key}`);
      const allSims = await allSimsRes.json();
      const totalSims = allSims.length;
      const completedSims = allSims.filter((s: Simulation) => typeof s.score === 'number' && s.score >= 0).length;
      const totalLearners = new Set(allSims.map((s: Simulation) => s.user_email)).size;
      
      setTotalSimulations(totalSims);
      setCompletionRate(totalSims > 0 ? Math.round((completedSims / totalSims) * 100) : 0);
      setEngagementRate(totalLearners > 0 ? Math.round((completedSims / totalLearners) * 10) / 10 : 0);
      return;
    }

    try {
      // Fetch tutte le simulazioni per questo chatbot
      const res = await fetch(`/api/userlist?chatbot_name=${storyline_key}`);
      const allSims = await res.json();
      
      // Filtra per gruppo
      const groupSims = allSims.filter((s: Simulation) => 
        (s.usergroup || 'Groupe par défaut') === group
      );
      
      // Filtra per gruppo e score >= 0
      const filteredSims = groupSims.filter((s: Simulation) => 
        typeof s.score === 'number' && 
        s.score >= 0
      );

      // Calcola le statistiche filtrate
      const simulations = filteredSims.length;
      const learners = new Set(filteredSims.map((s: Simulation) => s.user_email)).size;
      const avgScore = filteredSims.length > 0 
        ? Math.round(filteredSims.reduce((sum: number, s: Simulation) => sum + s.score, 0) / filteredSims.length)
        : 0;

      // Calcola le nuove statistiche per il gruppo
      const totalSimsGroup = groupSims.length; // Tutte le simulazioni del gruppo
      const completedSimsGroup = filteredSims.length; // Solo simulazioni completate del gruppo
      const totalLearnersGroup = new Set(groupSims.map((s: Simulation) => s.user_email)).size; // Solo learners del gruppo
      
      const completionRateGroup = totalSimsGroup > 0 ? Math.round((completedSimsGroup / totalSimsGroup) * 100) : 0;
      const engagementRateGroup = totalLearnersGroup > 0 ? Math.round((completedSimsGroup / totalLearnersGroup) * 10) / 10 : 0;

      // Calcola i best learners filtrati per gruppo
      const bestLearnersFiltered = (Array.from(filteredSims.reduce((acc: Map<string, { name: string; user_email: string; score: number }>, s: Simulation) => {
        if (!acc.has(s.user_email) || acc.get(s.user_email)!.score < s.score) {
          acc.set(s.user_email, { name: s.name, user_email: s.user_email, score: s.score });
        }
        return acc;
      }, new Map()).values()) as { name: string; user_email: string; score: number }[])
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      setFilteredData({
        ...data!,
        simulations,
        learners,
        avg_score: avgScore,
      });
      setFilteredBestLearners(bestLearnersFiltered);
      
      // Aggiorna le nuove statistiche per il gruppo
      setTotalSimulations(totalSimsGroup); // Aggiorna il totale per mostrare solo le simulazioni del gruppo
      setCompletionRate(completionRateGroup);
      setEngagementRate(engagementRateGroup);
    } catch (e) {
      console.error('Errore nel filtraggio per gruppo:', e);
    }
  };

  // Effetto per aggiornare i dati quando cambia il gruppo selezionato
  useEffect(() => {
    if (data) {
      filterDataByGroup(selectedGroup);
    }
  }, [selectedGroup, data]);

  if (loading) return <div className="chatbot-detail-bg"><div className="chatbot-detail-main">Charging...</div></div>;
  if (!data) return <div className="chatbot-detail-bg"><div className="chatbot-detail-main">Chatbot not found.</div></div>;

  return (
    <div className="">
      <main className="chatbot-detail-main">
        {/* Card principale */}
        <div className="chatbot-card">
          <div className="chatbot-header">
            <div className="chatbot-header-top">
              <div className="chatbot-id-detail">ID: {data.storyline_key}</div>
              <button 
                className="settings-button"
                onClick={() => setShowSettingsModal(true)}
                title="Paramètres"
              >
                ⚙️
              </button>
            </div>
            <br />
            <h1 className="chatbot-name">🤖 {data.name}</h1>
            <div className="manager-info">
              <span className="manager-label">👤 Manager référent :</span>
              <span className="manager-email">{data.manager_email}</span>
            </div>
            {/* Etichette gruppi */}
            {settings.showGroups && groups.length > 0 && (
              <div className="groups-container">
                <div 
                  className={`group-tag all-groups ${selectedGroup === 'all' ? 'active' : ''}`}
                  onClick={() => handleGroupChange('all')}
                >
                  Tous les groupes
                </div>
                {groups.map((group, index) => (
                  <div 
                    key={group}
                    className={`group-tag group-${index % 10} ${selectedGroup === group ? 'active' : ''}`}
                    onClick={() => handleGroupChange(group)}
                  >
                    {group}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* Breadcrumb 
        <div className="breadcrumb">
          <span className="breadcrumb-link" onClick={() => navigate('/dashboard')}>Dashboard</span> &gt;  
          <span className="current">{data.name}</span>
        </div>*/}
        {/* Statistiche principali */}
        <div className="chatbot-main-stats">
          <div className={`main-stat-card ${!settings.showRanking ? 'expanded' : ''}`}>
            <span className="main-stat-label">🎯 Simulations Terminées :</span>
            <span className="main-stat-value">{filteredData ? filteredData.simulations : data.simulations}</span>
            <br />
            <span className="stat-green-small">
              Simulations ce mois-ci : {monthStats.simulations}
            </span>
          </div>
          {settings.showRanking && (
            <div className="main-stat-card">
              <span className="main-stat-label">👑 Best Learners:</span>
              {loadingSims ? (
                <span className="main-stat-value">Caricamento...</span>
              ) : (selectedGroup === 'all' ? monthStats.bestLearners : filteredBestLearners).length === 0 ? (
                <span className="main-stat-value">0 <br /> <span style={{fontSize:'0.8rem', color:'#00cc00'}}>Ce mois-ci</span></span>
              ) : (
                <ul className="best-learners-list">
                  {(selectedGroup === 'all' ? monthStats.bestLearners : filteredBestLearners).map((l, i) => {
                    let icon = '';
                    if (i === 0) icon = '🥇';
                    else if (i === 1) icon = '🥈';
                    else if (i === 2) icon = '🥉';
                    return (
                      <li key={l.user_email} className={`best-learner-item best-learner-${i}`}>
                        <span className="learner-icon">{icon}</span>
                        <span className="learner-name">
                          {l.name}
                        </span>
                        <span className="learner-score">
                          Score: {l.score}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
          <div className="main-stat-card">
            <span className="main-stat-label">📊 Taux de complétion :</span>
            <span className="main-stat-value">{completionRate}%</span>
            <br />
            <span className="stat-green-small">
              {filteredData ? filteredData.simulations : data.simulations}/{totalSimulations} simulations
            </span>
          </div>
          <div className="main-stat-card">
            <span className="main-stat-label">🎯 Taux d'engagement :</span>
            <span className="main-stat-value">{engagementRate}</span>
            <br />
            <span className="stat-green-small">
              simulations/learner
            </span>
          </div>
        </div>
        {/* Statistiche secondarie */}
        <div className="chatbot-secondary-stats">
          <div className="main-stat-card">
            <span className="secondary-stat-label">⭐ Score moyen :</span>
            <span className="secondary-stat-value">{filteredData ? filteredData.avg_score : data.avg_score}</span>
            <br />
            <span className="stat-green-small">
              Score moyen ce mois-ci : {monthStats.avgScore}
            </span>
          </div>
          <div className="main-stat-card">
            <span className="secondary-stat-label">👥 Learners :</span>
            <span className="secondary-stat-value">{filteredData ? filteredData.learners : data.learners}</span>
            <br />
            <span className="stat-green-small">
              Nouveaux learners ce mois-ci : {monthStats.learners}
            </span>
          </div>
        </div>
        {/* Bottoni azione */}
        <div className="action-buttons">
          <button className="action-btn primary" onClick={() => {
            addBreadcrumb({ label: 'Simulations', path: `/list?chatbot_name=${encodeURIComponent(data.storyline_key)}` });
            navigate(`/list?chatbot_name=${encodeURIComponent(data.storyline_key)}`, {
              state: {
                selectedGroup: selectedGroup,
                tenant_name: data.tenant_name || 'Client inconnu',
                storyline_key: data.storyline_key
              }
            });
          }}>
            Voir la liste des simulations
          </button>
          <button className="action-btn primary" onClick={() => {
            addBreadcrumb({ label: 'Learners', path: `/chatbot/${data.storyline_key}/learners` });
            navigate(`/chatbot/${data.storyline_key}/learners`, { 
              state: { 
                selectedGroup: selectedGroup,
                tenant_name: data.tenant_name || 'Client inconnu',
                storyline_key: data.storyline_key
              } 
            });
          }}>
            Voir la liste des learners
          </button>
        </div>
      </main>

      {/* Modal delle impostazioni */}
      {showSettingsModal && (
        <div className="settings-modal-overlay" onClick={closeSettingsModal}>
          <div className="settings-modal-content" onClick={e => e.stopPropagation()}>
            <div className="settings-modal-header">
              <h2>Paramètres</h2>
              <button className="settings-modal-close" onClick={closeSettingsModal}>
                ×
              </button>
            </div>
            <div className="settings-modal-body">
              <div className="setting-item">
                <span className="setting-label">Suivi par groupes d'apprenantes</span>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.showGroups}
                    onChange={() => handleSettingChange('showGroups')}
                  />
                  <span className={`toggle-slider ${settings.showGroups ? 'active' : 'inactive'}`}></span>
                </label>
              </div>
              <div className="setting-item">
                <span className="setting-label">Vue classement</span>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.showRanking}
                    onChange={() => handleSettingChange('showRanking')}
                  />
                  <span className={`toggle-slider ${settings.showRanking ? 'active' : 'inactive'}`}></span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatbotDetail; 