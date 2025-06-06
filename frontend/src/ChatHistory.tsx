import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './assets/css/chatHistory.css';

// Funzione di parsing: supponiamo che ogni messaggio inizi con "Assistant:" o con il nome dello studente (es: "Baptiste:")
function parseMessages(chat_history: string, studentName: string) {
  if (!chat_history) return [];
  const lines = chat_history.split(/\n+/).filter(Boolean);
  const messages: { sender: string, content: string, type: 'assistant' | 'student' }[] = [];
  let currentSender = '';
  let currentType: 'assistant' | 'student' = 'assistant';
  let currentContent = '';

  lines.forEach(line => {
    const match = line.match(/^(.*?):\s*(.*)$/);
    if (match) {
      // Salva il messaggio precedente
      if (currentSender && currentContent) {
        messages.push({ sender: currentSender, content: currentContent.trim(), type: currentType });
      }
      // Nuovo messaggio
      currentSender = match[1].trim();
      currentType = (currentSender.toLowerCase() === studentName.toLowerCase()) ? 'student'
                  : (currentSender.toLowerCase().includes('assistant') ? 'assistant' : 'assistant');
      currentContent = match[2].trim();
    } else {
      // Riga di continuazione: aggiungi al messaggio corrente
      currentContent += '\n' + line.trim();
    }
  });
  // Salva l'ultimo messaggio
  if (currentSender && currentContent) {
    messages.push({ sender: currentSender, content: currentContent.trim(), type: currentType });
  }
  return messages;
}

const ChatHistory: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as any;
  if (!state) return <div>Contenuto non trovato.</div>;

  const { name, date, score, chat_history } = state;
  const messages = parseMessages(chat_history, name);

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
                          <span className="pdf-sender">{msg.sender || (msg.type === 'student' ? name : 'Assistant')}</span>
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
      {/* Résumé de la conversation */}
      <div className="progress-comparison">
        <h3>📊 Résumé de la Simulation</h3>
        <div className="progress-chart">
          <div className="chart-info">
            <div className="current-score">
              <span className="score-label">Score Final</span>
              <span className="score-value">{score ? `${score}/100` : '-'}</span>
            </div>
            {/* Placeholder durata e numero messaggi */}
            <div className="progress-indicator">
              <span className="progress-label">Durée</span>
              <span className="progress-value score-style">-</span>
            </div>
            <div className="progress-indicator">
              <span className="progress-label">Messages</span>
              <span className="progress-value score-style">{messages.length} échanges</span>
            </div>
          </div>
          <div className="comparison-text">
            Simulation complète avec un score de {score ? `${score}/100` : '-'} et {messages.length} échanges.
          </div>
        </div>
      </div>
    </main>
  );
};

export default ChatHistory; 