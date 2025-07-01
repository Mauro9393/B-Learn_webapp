import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './assets/css/chatHistory.css';
// @ts-ignore
import jsPDF from 'jspdf';
import { useBreadcrumbContext } from './BreadcrumbContext';

// Fonction de parsing : supposons que chaque message commence par "Assistant:" ou par le nom de l'étudiant (ex : "Baptiste:")
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
      // Ligne de continuation : ajoute à l'actuel message
      currentContent += '\n' + line.trim();
    }
  });
  // Salva l'ultimo messaggio
  if (currentSender && currentContent) {
    messages.push({ sender: currentSender, content: currentContent.trim(), type: currentType });
  }
  return messages;
}

// Funzione per determinare la classe della pillola score
const getScoreBadgeClass = (score: number) => {
  if (score >= 80) return 'score-badge score-green';
  if (score >= 50) return 'score-badge score-yellow';
  return 'score-badge score-red';
};

const ChatHistory: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { addBreadcrumb } = useBreadcrumbContext();
  const state = location.state as any;
  const messagesRef = React.useRef<HTMLDivElement>(null);
  
  // Recupera lo stato dal localStorage se non è presente nel location.state
  const getChatHistoryState = () => {
    if (state) {
      // Salva tutti i dati originali nel localStorage
      localStorage.setItem('originalData', JSON.stringify(state));
      localStorage.setItem('chatHistoryState', JSON.stringify(state));
      return state;
    }
    
    // Prova a recuperare dal localStorage
    const savedState = localStorage.getItem('chatHistoryState');
    if (savedState) {
      try {
        return JSON.parse(savedState);
      } catch (e) {
        console.error('Errore nel parsing dello stato salvato:', e);
      }
    }
    
    return null;
  };

  const chatHistoryState = getChatHistoryState();
  
  if (!chatHistoryState) {
    return (
      <main className="student-detail-main">
        <div className="breadcrumb">
          <span className="breadcrumb-link" onClick={() => navigate('/dashboard')}>Dashboard</span> &gt;
          <span className="current">Historique de Chat</span>
        </div>
        <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
          <h2>Contenuto non trovato</h2>
          <p>I dati dell'historique non sono più disponibili.</p>
          <button 
            onClick={() => navigate('/dashboard')}
            style={{
              background: '#6C63FF',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              cursor: 'pointer',
              marginTop: '1rem'
            }}
          >
            Torna alla Dashboard
          </button>
        </div>
      </main>
    );
  }

  const { name, date, score, chat_history } = chatHistoryState;
  const messages = parseMessages(chat_history, name);

  // Funzione per schermo intero
  const handleFullscreen = () => {
    if (messagesRef.current) {
      if (messagesRef.current.requestFullscreen) {
        messagesRef.current.requestFullscreen();
      } else if ((messagesRef.current as any).webkitRequestFullscreen) {
        (messagesRef.current as any).webkitRequestFullscreen();
      } else if ((messagesRef.current as any).msRequestFullscreen) {
        (messagesRef.current as any).msRequestFullscreen();
      }
    }
  };

  // Funzione per scaricare PDF
  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Historique de Conversation', 10, 18);
    doc.setFontSize(12);
    doc.text(`Nom: ${name}`, 10, 28);
    doc.text(`Date: ${date ? new Date(date).toLocaleDateString('fr-FR') : ''}`, 10, 36);
    doc.text(`Score: ${score ? `${score}/100` : '-'}`, 10, 44);
    let y = 54;
    messages.forEach((msg) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFont('helvetica', 'bold');
      doc.text(`${msg.sender || (msg.type === 'student' ? name : 'Assistant')}:`, 10, y);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(msg.content, 180);
      doc.text(lines, 20, y + 6);
      y += 6 + lines.length * 7;
    });
    doc.save(`historique_${name}.pdf`);
  };

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
                  <span className={getScoreBadgeClass(Number(score))}>Score : {score}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Breadcrumb 
      <div className="breadcrumb">
        <span className="breadcrumb-link" onClick={() => navigate('/dashboard')}>Dashboard</span> &gt;
        {from === 'simulations-list' ? (
          <>
            <span className="breadcrumb-link" onClick={() => navigate(`/chatbot/${chatHistoryState.storyline_key}`)}>Chatbot</span> &gt;
            <span className="breadcrumb-link" onClick={() => navigate(`/list?chatbot_name=${chatHistoryState.storyline_key}`)}>Simulations</span> &gt;
            <span className="current">Historique</span>
          </>
        ) : from === 'all-student-list' ? (
          <>
            <span className="breadcrumb-link" onClick={() => navigate('/all-student-list')}>Tous les utilisateurs</span> &gt;
            <span className="breadcrumb-link" onClick={() => navigate(-1)}>{name}</span> &gt;
            <span className="current">Historique</span>
          </>
        ) : from === 'student-list' ? (
          <>
            <span className="breadcrumb-link" onClick={() => navigate(-3)}>Chatbot</span> &gt;
            <span className="breadcrumb-link" onClick={() => navigate(-2)}>Learners</span> &gt;
            <span className="breadcrumb-link" onClick={() => navigate(-1)}>{name}</span> &gt;
            <span className="current">Historique</span>
          </>
        ) : (
          <>
            <span className="breadcrumb-link" onClick={() => navigate(-3)}>Chatbot</span> &gt;
            <span className="breadcrumb-link" onClick={() => navigate(-2)}>Simulations</span> &gt;
            <span className="breadcrumb-link" onClick={() => navigate(-1)}>{name}</span> &gt;
            <span className="current">Historique</span>
          </>
        )}
      </div>*/}
      {/* Contenuto principale */}
      <div className="pdf-container">
        <div className="pdf-viewer">
          <div className="pdf-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <h3 style={{margin: 0}}>Historique de Conversation</h3>
            <div style={{display: 'flex', gap: '0.5rem'}}>
              <button className="btn-small btn-secondary btn-plein-ecran" title="Plein écran" onClick={handleFullscreen}>
                {/* Icona fullscreen */}
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                </svg>
                <span className='btn-text'>Plein écran</span>
              </button>
              <button className="btn-small btn-primary" title="Télécharger PDF" onClick={handleDownloadPDF}>
                {/* Icona download */}
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span className='btn-text'>Télécharger PDF</span>
              </button>
              <button 
                className="btn-small btn-secondary" 
                title="Voir l'analyse" 
                onClick={() => {
                  // Usa sempre i dati originali salvati
                  const originalData = localStorage.getItem('originalData');
                  if (originalData) {
                    try {
                      const analysisData = JSON.parse(originalData);
                      
                      // Aggiorna il breadcrumb
                      addBreadcrumb({ label: 'Analyse de Performance', path: '/analysis' });
                      // Naviga verso Analysis passando tutti i dati originali
                      navigate('/analysis', { state: analysisData });
                    } catch (e) {
                      console.error('Errore nel parsing dei dati originali:', e);
                      // Fallback: usa i dati correnti
                      const fallbackData = {
                        name, 
                        date, 
                        score, 
                        chat_analysis: chatHistoryState.chat_analysis || '',
                        from: chatHistoryState.from,
                        storyline_key: chatHistoryState.storyline_key 
                      };
                      addBreadcrumb({ label: 'Analyse de Performance', path: '/analysis' });
                      navigate('/analysis', { state: fallbackData });
                    }
                  } else {
                    // Se non ci sono dati originali, usa i dati correnti
                    const fallbackData = {
                      name, 
                      date, 
                      score, 
                      chat_analysis: chatHistoryState.chat_analysis || '',
                      from: chatHistoryState.from,
                      storyline_key: chatHistoryState.storyline_key 
                    };
                    addBreadcrumb({ label: 'Analyse de Performance', path: '/analysis' });
                    navigate('/analysis', { state: fallbackData });
                  }
                }}
              >
                {/* Icona analisi */}
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3v18h18"/>
                  <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/>
                </svg>
                <span className='btn-text'>Analysis</span>
              </button>
            </div>
          </div>
          <div className="pdf-content" ref={messagesRef}>
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