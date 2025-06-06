import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './assets/css/chatHistory.css';

const ChatHistory: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as any;
  if (!state) return <div>Contenuto non trovato.</div>;

  const { name, date, score, chat_history, chat_analysis, show } = state;
  const content = show === 'analysis' ? chat_analysis : chat_history;

  return (
    <main className="student-detail-main">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <span className="breadcrumb-link" onClick={() => navigate(-2)}>Dashboard</span> &gt; 
        <span className="breadcrumb-link" onClick={() => navigate(-1)}>Simulations</span> &gt; 
        <span className="current">{name}</span>
      </div>
      {/* Header info */}
      <div className="chat-header">
        <div className="chat-info">
          <h1>{show === 'analysis' ? 'Rapport de Simulation' : 'Historique de Chat'}</h1>
          <div className="simulation-meta">
            <div className="student-info">
              <div className="student-avatar">
                <div className="avatar-circle">
                  <span>👤</span>
                </div>
              </div>
              <div className="student-details">
                <h2 className="student-name">{name}</h2>
                <div className="simulation-date">Date : {date ? new Date(date).toLocaleDateString('fr-FR') : ''}</div>
                <div className="simulation-score">
                  <span className="score-badge score-high">Score : {score}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Contenuto principale */}
      <div className="pdf-container">
        <div className="pdf-viewer">
          <div className="pdf-header">
            <h3>{show === 'analysis' ? 'Rapport de Simulation' : 'Historique de Conversation'}</h3>
          </div>
          <div className="pdf-content">
            <div className="pdf-page">
              <div className="pdf-document">
                <div className="pdf-title">{show === 'analysis' ? 'RAPPORT DE SIMULATION' : 'HISTORIQUE DE CONVERSATION'}</div>
                <div className="pdf-subtitle">{name}</div>
                <div className="pdf-date">Date : {date ? new Date(date).toLocaleDateString('fr-FR') : ''}</div>
                <div className="pdf-section">
                  <div className="pdf-section-title">{show === 'analysis' ? '📝 Rapport' : '💬 Transcript de conversation'}</div>
                  <div style={{whiteSpace: 'pre-wrap', fontSize: '1rem', color: '#333'}}>{content}</div>
                </div>
                <div className="pdf-footer">
                  <div className="pdf-footer-text">
                    Généré par B-Learn - Plateforme de formation IA
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ChatHistory; 