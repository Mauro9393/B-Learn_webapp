import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './assets/css/chatHistory.css';

// Funzione di parsing: solo "Moi" è studente, tutto il resto assistant
function parseMessages(chat_history: string) {
  if (!chat_history) return [];
  const lines = chat_history.split(/\n+/).filter(Boolean);
  return lines.map(line => {
    const match = line.match(/^(.*?):\s*(.*)$/);
    if (match) {
      const sender = match[1].trim();
      const content = match[2].trim();
      let type: 'assistant' | 'student' = 'assistant';
      if (sender.toLowerCase() === 'moi') type = 'student';
      return { sender, content, type };
    }
    // fallback: tutto come messaggio assistant
    return { sender: '', content: line, type: 'assistant' };
  });
}

const ChatHistory: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as any;
  if (!state) return <div>Contenuto non trovato.</div>;

  const { name, date, score, chat_history } = state;
  const messages = parseMessages(chat_history);

  return (
    <main className="student-detail-main">
      {/* Header info */}
      <div className="chat-header">
        <div className="chat-info">
          <h1>Historique de Chat</h1>
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
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <span className="breadcrumb-link" onClick={() => navigate(-3)}>Dashboard</span> &gt; 
        <span className="breadcrumb-link" onClick={() => navigate(-2)}>Chatbot</span> &gt; 
        <span className="breadcrumb-link" onClick={() => navigate(-1)}>Liste des simulations</span> &gt; 
        <span className="current">{name}</span>
      </div>
      {/* Contenuto principale */}
      <div className="pdf-container">
        <div className="pdf-viewer">
          <div className="pdf-header">
            <h3>Historique de Conversation</h3>
          </div>
          <div className="pdf-content">
            <div className="pdf-page">
              <div className="pdf-document">
                <div className="pdf-title">HISTORIQUE DE CONVERSATION</div>
                <div className="pdf-subtitle">{name}</div>
                <div className="pdf-date">Date : {date ? new Date(date).toLocaleDateString('fr-FR') : ''}</div>
                <div className="pdf-section">
                  <div className="pdf-section-title">💬 Transcript de conversation</div>
                  {/* Messaggi separati */}
                  {messages.length === 0 ? (
                    <div style={{color: '#888'}}>Nessun messaggio disponibile.</div>
                  ) : (
                    messages.map((msg, idx) => (
                      <div key={idx} className={`pdf-message ${msg.type}`}>
                        <div className="pdf-message-header">
                          <span className="pdf-sender">{msg.sender || (msg.type === 'student' ? 'Moi' : 'Assistant')}</span>
                        </div>
                        <div className="pdf-message-content">{msg.content}</div>
                      </div>
                    ))
                  )}
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