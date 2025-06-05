import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './assets/css/chatbotDetail.css';

interface ChatbotDetailData {
  id: number;
  name: string;
  manager_email: string;
  simulations: number;
  avg_score: number;
  learners: number;
  storyline_key: string;
}

const ChatbotDetail: React.FC = () => {
  const { chatbotId } = useParams<{ chatbotId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ChatbotDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Recupera i dettagli del chatbot tramite API
    const fetchData = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/chatbots/${chatbotId}`);
        const chatbot = await res.json();
        // Simulazione dati statistici (da adattare se disponibili via API)
        setData({
          id: chatbot.id,
          name: chatbot.name,
          manager_email: chatbot.manager_email || 'manager1@gmail.com',
          simulations: chatbot.simulations || 0,
          avg_score: chatbot.avg_score || 0,
          learners: chatbot.learners || 0,
          storyline_key: chatbot.storyline_key,
        });
      } catch (e) {
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [chatbotId]);

  if (loading) return <div className="chatbot-detail-main">Caricamento...</div>;
  if (!data) return <div className="chatbot-detail-main">Chatbot non trovato.</div>;

  return (
    <main className="chatbot-detail-main">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <span className="breadcrumb-link" onClick={() => navigate('/dashboard')}>Dashboard</span> &gt; 
        <span className="breadcrumb-link" onClick={() => navigate('/dashboard')}>Chatbots</span> &gt; 
        <span className="current">{data.name}</span>
      </div>

      {/* Header chatbot */}
      <div className="chatbot-header">
        <div className="chatbot-info">
          <div className="chatbot-id-detail">ID: {data.storyline_key}</div>
          <h1 className="chatbot-name">🤖 {data.name}</h1>
          <div className="manager-info">
            <span className="manager-label">👤 Manager référent :</span>
            <span className="manager-email">{data.manager_email}</span>
          </div>
        </div>
      </div>

      {/* Statistiche principali */}
      <div className="chatbot-main-stats">
        <div className="main-stat-card">
          <span className="main-stat-label">🎯 Simulations réalisées :</span>
          <span className="main-stat-value">{data.simulations}</span>
        </div>
      </div>

      {/* Statistiche secondarie */}
      <div className="chatbot-secondary-stats">
        <div className="secondary-stat-card">
          <span className="secondary-stat-label">⭐ Score moyen :</span>
          <span className="secondary-stat-value">{data.avg_score}</span>
        </div>
        <div className="secondary-stat-card">
          <span className="secondary-stat-label">👥 Learners :</span>
          <span className="secondary-stat-value">{data.learners}</span>
        </div>
      </div>

      {/* Bottoni azione */}
      <div className="action-buttons">
        <button className="action-btn primary" onClick={() => navigate(`/list?chatbot_name=${encodeURIComponent(data.storyline_key)}`)}>
          Voir la liste des learners
        </button>
        <button className="action-btn secondary" onClick={() => alert('Funzionalità in arrivo!')}>
          Voir la liste des simulations
        </button>
      </div>
    </main>
  );
};

export default ChatbotDetail; 