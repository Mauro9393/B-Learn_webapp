import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './assets/css/analysis.css';
// @ts-ignore
import jsPDF from 'jspdf';
import { useBreadcrumbContext } from './BreadcrumbContext';

const Analysis: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { addBreadcrumb } = useBreadcrumbContext();
  const pdfContentRef = React.useRef<HTMLDivElement>(null);
  const state = location.state as any;
  
  // Recupera lo stato dal localStorage se non è presente nel location.state
  const getAnalysisState = () => {
    if (state) {
      // Salva tutti i dati originali nel localStorage
      localStorage.setItem('originalData', JSON.stringify(state));
      localStorage.setItem('analysisState', JSON.stringify(state));
      return state;
    }
    
    // Prova a recuperare dal localStorage
    const savedState = localStorage.getItem('analysisState');
    if (savedState) {
      try {
        return JSON.parse(savedState);
      } catch (e) {
        console.error('Errore nel parsing dello stato salvato:', e);
      }
    }
    
    return null;
  };

  const analysisState = getAnalysisState();
  
  if (!analysisState) {
    return (
      <main className="student-detail-main">
        <div className="breadcrumb">
          <span className="breadcrumb-link" onClick={() => navigate('/dashboard')}>Dashboard</span> &gt;
          <span className="current">Analyse de Performance</span>
        </div>
        <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
          <h2>Contenuto non trovato</h2>
          <p>I dati dell'analisi non sono più disponibili.</p>
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

  const { name, date, score, chat_analysis } = analysisState;

  // Funzione per parsare l'analisi e separare le domande e il riepilogo
  const parseAnalysis = (analysis: string) => {
    if (!analysis) return { questions: [], summary: '' };
    let cleaned = analysis.replace(/^Analyse IA\s*/i, '');
    const summaryMatch = cleaned.match(/(La somme de tes notes obtenues est de[\s\S]*)/i);
    let summary = '';
    if (summaryMatch) {
      summary = summaryMatch[1].trim();
      cleaned = cleaned.replace(summaryMatch[1], '').trim();
    }
    // Dividi per 'Question n°1,' o 'Question n°2,' ecc.
    const blocks = cleaned.split(/(?=Question\s*n[°ºo]?\s*\d+,?)/gi).filter(Boolean);
    // Estrai titolo e contenuto
    const questions = blocks.map(block => {
      const match = block.match(/^(Question\s*n[°ºo]?\s*\d+,?)([\s\S]*)/i);
      if (match) {
        return {
          title: match[1].trim(),
          content: match[2].trim()
        };
      } else {
        return { title: '', content: block.trim() };
      }
    });
    return { questions, summary };
  };

  const { questions, summary } = parseAnalysis(chat_analysis);

  // Funzione per schermo intero (identica a ChatHistory, ref su pdf-content)
  const handleFullscreen = () => {
    if (pdfContentRef.current) {
      if (pdfContentRef.current.requestFullscreen) {
        pdfContentRef.current.requestFullscreen();
      } else if ((pdfContentRef.current as any).webkitRequestFullscreen) {
        (pdfContentRef.current as any).webkitRequestFullscreen();
      } else if ((pdfContentRef.current as any).msRequestFullscreen) {
        (pdfContentRef.current as any).msRequestFullscreen();
      }
    }
  };

  // Funzione per scaricare PDF
  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Rapport d'Analyse", 10, 18);
    doc.setFontSize(12);
    doc.text(`Nom: ${name}`, 10, 28);
    doc.text(`Date: ${date ? new Date(date).toLocaleDateString('fr-FR') : ''}`, 10, 36);
    doc.text(`Score: ${score ? `${score}/100` : '-'}`, 10, 44);
    let y = 54;
    const lineHeight = 7; // Altezza di una riga
    const pageHeight = doc.internal.pageSize.getHeight();
    const bottomMargin = 20;
    const lines = doc.splitTextToSize(chat_analysis || '', 180);
    lines.forEach((line: string) => {
      if (y + lineHeight > pageHeight - bottomMargin) {
        doc.addPage();
        y = 20; // margine superiore per la nuova pagina
      }
      doc.text(line, 10, y);
      y += lineHeight;
    });
    doc.save(`rapport_${name}.pdf`);
  };

  // Funzione per formattare un blocco di analisi in React, senza dangerouslySetInnerHTML
  const formatAnalysisBlock = (block: string) => {
    const patterns = [
      { label: 'La question de Christophe:', className: 'analysis-label analysis-label-blue', clean: /^(La question de Christophe:|question de Christophe:|question:)/i },
      { label: 'Ma réponse:', className: 'analysis-label analysis-label-blue', clean: /^(Ma réponse:|réponse:)/i },
      { label: 'La réponse idéale:', className: 'analysis-label analysis-label-green', clean: /^(La réponse idéale:|réponse idéale:|idéale:)/i },
      { label: 'Corrections apportées:', className: 'analysis-label analysis-label-orange', clean: /^(Corrections apportées:|apportées:|portées:)/i },
      { label: 'Note:', className: '', clean: /^(Note:)/i },
    ];

    const lines = block.split(/\n+/).filter(Boolean);
    const result: React.ReactNode[] = [];

    lines.forEach((line, idx) => {
      // Gestione Note ovunque nella riga
      const noteMatch = line.match(/Note\s*:\s*(\d+)\s*\/10/i);
      if (noteMatch) {
        const n = parseInt(noteMatch[1].replace(/[^0-9]/g, ''), 10);
        let colorClass = 'analysis-note-num-red';
        if (n >= 8) colorClass = 'analysis-note-num-green';
        else if (n >= 5) colorClass = 'analysis-note-num-yellow';
        result.push(
          <div key={idx} className="analysis-block-content-indent" style={{marginBottom: 2}}>
            <span className={colorClass}>
              Note: {n}/10
            </span>
          </div>
        );
        // Rimuovi la nota dal resto della riga, se c'è altro testo
        line = line.replace(/Note\s*:\s*\d+\s*\/10,?\s*/i, '').trim();
        if (!line) return;
        // Se c'è altro testo dopo la nota, continua a processare la riga
      }
      // Gestione altre label
      const pattern = patterns.find(p => line.trim().startsWith(p.label));
      if (pattern) {
        const labelLen = pattern.label.length;
        let content = line.slice(labelLen).trim();
        // Rimuovi eventuali ripetizioni della label all'inizio del contenuto
        if (pattern.clean) {
          content = content.replace(pattern.clean, '').trim();
        }
        result.push(
          <div key={idx} className="analysis-block-content-indent" style={{marginBottom: 2}}>
            <span className={pattern.className}>{pattern.label}</span>
            {content ? ' ' + content : ''}
          </div>
        );
      } else if (line) {
        // Riga normale
        result.push(
          <div key={idx} className="analysis-block-content-indent" style={{marginBottom: 2}}>
            {line}
          </div>
        );
      }
    });
    return result;
  };

  // Funzione per determinare la classe della pillola score
  const getScoreBadgeClass = (score: number) => {
    if (score >= 80) return 'score-badge score-green';
    if (score >= 50) return 'score-badge score-yellow';
    return 'score-badge score-red';
  };

  return (
    <main className="student-detail-main">
      {/* Breadcrumb 
      <div className="breadcrumb">
        <span className="breadcrumb-link" onClick={() => navigate('/dashboard')}>Dashboard</span> &gt;
        {from === 'simulations-list' ? (
          <>
            <span className="breadcrumb-link" onClick={() => navigate(`/chatbot/${analysisState.storyline_key}`)}>Chatbot</span> &gt;
            <span className="breadcrumb-link" onClick={() => navigate(`/list?chatbot_name=${analysisState.storyline_key}`)}>Simulations</span> &gt;
            <span className="current">Analyse</span>
          </>
        ) : from === 'all-student-list' ? (
          <>
            <span className="breadcrumb-link" onClick={() => navigate('/all-student-list')}>Tous les utilisateurs</span> &gt;
            <span className="breadcrumb-link" onClick={() => navigate(-1)}>{name}</span> &gt;
            <span className="current">Analyse</span>
          </>
        ) : from === 'student-list' ? (
          <>
            <span className="breadcrumb-link" onClick={() => navigate(-3)}>Chatbot</span> &gt;
            <span className="breadcrumb-link" onClick={() => navigate(-2)}>Learners</span> &gt;
            <span className="breadcrumb-link" onClick={() => navigate(-1)}>{name}</span> &gt;
            <span className="current">Analyse</span>
          </>
        ) : (
          <>
            <span className="breadcrumb-link" onClick={() => navigate(-3)}>Chatbot</span> &gt;
            <span className="breadcrumb-link" onClick={() => navigate(-2)}>Simulations</span> &gt;
            <span className="breadcrumb-link" onClick={() => navigate(-1)}>{name}</span> &gt;
            <span className="current">Analyse</span>
          </>
        )}
      </div>*/}
      {/* Header info */}
      <div className="analysis-header">
        <div className="analysis-info">
          <h1>Analyse de Performance</h1>
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
                  <span className={getScoreBadgeClass(Number(score))}>Score Final : {score}/100</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Visualiseur PDF */}
      <div className="pdf-container">
        <div className="pdf-viewer">
          <div className="pdf-header">
            <h3>Rapport d'Analyse</h3>
            <div className="pdf-controls">
              <button className="btn-small btn-secondary" title="Plein écran" onClick={handleFullscreen}>
                {/* Icona fullscreen */}
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                </svg>
                <span className='btn-text'>Plein écran</span>
              </button>
              <button className="btn-small btn-primary" title="Télécharger PDF" onClick={handleDownloadPDF}>
                {/* Icona download */}
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span className='btn-text'>Télécharger PDF</span>
              </button>
              <button 
                className="btn-small btn-secondary" 
                title="Voir l'historique" 
                onClick={() => {
                  // Usa sempre i dati originali salvati
                  const originalData = localStorage.getItem('originalData');
                  if (originalData) {
                    try {
                      const chatHistoryData = JSON.parse(originalData);
                      
                      // Aggiorna il breadcrumb
                      addBreadcrumb({ label: 'Historique', path: '/chat-history' });
                      // Naviga verso ChatHistory passando tutti i dati originali
                      navigate('/chat-history', { state: chatHistoryData });
                    } catch (e) {
                      console.error('Errore nel parsing dei dati originali:', e);
                      // Fallback: usa i dati correnti
                      const fallbackData = {
                        name, 
                        date, 
                        score, 
                        chat_history: analysisState.chat_history || '',
                        from: analysisState.from,
                        storyline_key: analysisState.storyline_key 
                      };
                      addBreadcrumb({ label: 'Historique', path: '/chat-history' });
                      navigate('/chat-history', { state: fallbackData });
                    }
                  } else {
                    // Se non ci sono dati originali, usa i dati correnti
                    const fallbackData = {
                      name, 
                      date, 
                      score, 
                      chat_history: analysisState.chat_history || '',
                      from: analysisState.from,
                      storyline_key: analysisState.storyline_key 
                    };
                    addBreadcrumb({ label: 'Historique', path: '/chat-history' });
                    navigate('/chat-history', { state: fallbackData });
                  }
                }}
              >
                {/* Icona chat */}
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <span className='btn-text'>Historique</span>
              </button>
            </div>
          </div>
          <div className="pdf-content" ref={pdfContentRef}>
            <div className="pdf-page">
              <div className="pdf-document">
                <div className="pdf-title">RAPPORT D'ANALYSE DE PERFORMANCE</div>
                <div className="pdf-subtitle">{name}</div>
                <div className="pdf-date">Date : {date ? new Date(date).toLocaleDateString('fr-FR') : ''}</div>
                <div className="pdf-section">
                  <div className="pdf-section-title">💬 Analyse</div>
                  {/* Contenuto analisi in formato messaggi separati */}
                  {questions.length > 0 ? (
                    <>
                      {questions.map((question, idx) => (
                        <div key={idx} className="pdf-message assistant">
                          {question.title && (
                            <div className="analysis-question-title">{question.title}</div>
                          )}
                          <div className="analysis-block-content-indent pdf-message-content" style={{whiteSpace: 'pre-wrap', textAlign: 'left'}}>
                            {formatAnalysisBlock(question.content)}
                          </div>
                        </div>
                      ))}
                      {summary && (
                        <div className="pdf-message summary">
                          <div className="pdf-message-content" style={{whiteSpace: 'pre-wrap', textAlign: 'left'}}>
                            {summary}
                          </div>
                        </div>
                      )}
                    </>
                  ) : chat_analysis ? (
                    // Fallback: se non riesce a parsare, mostra tutto il contenuto
                    <div className="pdf-message assistant">
                      <div className="pdf-message-content" style={{whiteSpace: 'pre-wrap', textAlign: 'left'}}>{chat_analysis}</div>
                    </div>
                  ) : (
                    <div style={{color: '#888', textAlign: 'center', padding: '2rem'}}>Nessuna analisi disponibile.</div>
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
              <span className="progress-value score-style">{(chat_analysis && chat_analysis.match(/Question/g)?.length) || 1} échanges</span>
            </div>
          </div>
          <div className="comparison-text">
            Simulation complète avec un score de {score ? `${score}/100` : '-'} et {(chat_analysis && chat_analysis.match(/Question/g)?.length) || 1} échanges.
          </div>
        </div>
      </div>
    </main>
  );
};

export default Analysis; 