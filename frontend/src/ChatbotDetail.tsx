import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './assets/css/chatbotDetail.css';
import { useBreadcrumbContext } from './BreadcrumbContext';

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
}

const ChatbotDetail: React.FC = () => {
  const { storyline_key } = useParams<{ storyline_key: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ChatbotDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSims, setLoadingSims] = useState(true);
  const { addBreadcrumb } = useBreadcrumbContext();

  // Statistiche mensili
  const [monthStats, setMonthStats] = useState({
    simulations: 0,
    avgScore: 0,
    learners: 0,
    bestLearners: [] as { name: string; user_email: string; score: number }[],
  });

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
      } catch (e) {
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [storyline_key]);

  useEffect(() => {
    const fetchSimulations = async () => {
      setLoadingSims(true);
      try {
        // Nuova fetch: solo simulazioni del mese corrente per questo chatbot
        const res = await fetch(`/api/userlist/month?chatbot_name=${storyline_key}`);
        const sims = await res.json();
        // learners unici mese
        const learnersSet = new Set(sims.map((s: Simulation) => s.user_email));
        const learnersThisMonth = learnersSet.size;
        const simulationsThisMonth = sims.length;
        const avgScoreThisMonth = sims.length > 0 ? Math.round(sims.reduce((sum: number, s: Simulation) => sum + (typeof s.score === 'number' ? s.score : 0), 0) / sims.length) : 0;
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
      } finally {
        setLoadingSims(false);
      }
    };
    if (storyline_key) fetchSimulations();
  }, [storyline_key]);

  if (loading) return <div className="chatbot-detail-bg"><div className="chatbot-detail-main">Charging...</div></div>;
  if (!data) return <div className="chatbot-detail-bg"><div className="chatbot-detail-main">Chatbot not found.</div></div>;

  return (
    <div className="">
      <main className="chatbot-detail-main">
        {/* Card principale */}
        <div className="chatbot-card">
          <div className="chatbot-header">
            <div className="chatbot-id-detail">ID: {data.storyline_key}</div>
            <br />
            <h1 className="chatbot-name">🤖 {data.name}</h1>
            <div className="manager-info">
              <span className="manager-label">👤 Manager référent :</span>
              <span className="manager-email">{data.manager_email}</span>
            </div>
          </div>
        </div>
        {/* Breadcrumb 
        <div className="breadcrumb">
          <span className="breadcrumb-link" onClick={() => navigate('/dashboard')}>Dashboard</span> &gt;  
          <span className="current">{data.name}</span>
        </div>*/}
        {/* Statistiche principali */}
        <div className="chatbot-main-stats">
          <div className="main-stat-card">
            <span className="main-stat-label">🎯 Simulations réalisées :</span>
            <span className="main-stat-value">{data.simulations}</span>
            <br />
            <span className="stat-green-small">
              Simulations ce mois-ci : {monthStats.simulations}
            </span>
          </div>
          <div className="main-stat-card">
            <span className="main-stat-label">👑 Best Learners:</span>
            {loadingSims ? (
              <span className="main-stat-value">Caricamento...</span>
            ) : monthStats.bestLearners.length === 0 ? (
              <span className="main-stat-value">0 <br /> <span style={{fontSize:'0.8rem', color:'#00cc00'}}>Ce mois-ci</span></span>
            ) : (
              <ul className="best-learners-list">
                {monthStats.bestLearners.map((l, i) => {
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
        </div>
        {/* Statistiche secondarie */}
        <div className="chatbot-secondary-stats">
          <div className="secondary-stat-card">
            <span className="secondary-stat-label">⭐ Score moyen :</span>
            <span className="secondary-stat-value">{data.avg_score}</span>
            <br />
            <span className="stat-green-small">
              Score moyen ce mois-ci : {monthStats.avgScore}
            </span>
          </div>
          <div className="secondary-stat-card">
            <span className="secondary-stat-label">👥 Learners :</span>
            <span className="secondary-stat-value">{data.learners}</span>
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
            navigate(`/list?chatbot_name=${encodeURIComponent(data.storyline_key)}`);
          }}>
            Voir la liste des simulations
          </button>
          <button className="action-btn primary" onClick={() => {
            addBreadcrumb({ label: 'Learners', path: `/chatbot/${data.storyline_key}/learners` });
            navigate(`/chatbot/${data.storyline_key}/learners`, { 
              state: { 
                tenant_name: data.tenant_name || 'Client inconnu',
                storyline_key: data.storyline_key
              } 
            });
          }}>
            Voir la liste des learners
          </button>
        </div>
      </main>
    </div>
  );
};

export default ChatbotDetail; 