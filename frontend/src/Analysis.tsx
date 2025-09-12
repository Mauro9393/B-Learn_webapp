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

  // Normalizza spazi/punteggiatura "strani" (francese) e slash Unicode
  const normalizeForParsing = (s: string = '') => {
    return s
      // compat: converte i fullwidth (es. "：" ) in ASCII
      .normalize('NFKC')
      // NBSP, narrow-NBSP, figure space, thin space, zero-width → spazio normale
      .replace(/[\u00A0\u202F\u2007\u2009\u200A\u200B]+/g, ' ')
      // varianti di slash Unicode → /
      .replace(/[⁄∕⧸⟋]/g, '/')
      // varianti di colon Unicode → :
      .replace(/[：﹕꞉︓]/g, ':')
      // bug sorgente: a volte va a capo prima dei due punti
      .replace(/\n\s*:\s*/g, ' : ');
  };

  // Porta qualsiasi "Note: X/10" a "Note: X/100" (senza cambiare X)
  // + normalizza punteggiatura/spazi prima
  const cleanAnalysisText = (text: string) => {
    if (!text) return text;
    let t = normalizeForParsing(text);

    // accetta "Note: 50/10", "Note : 50 / 10", "NOTE : 50⁄10", ecc.
    t = t.replace(/Note\s*[ :]\s*(\d+)\s*\/\s*10(?!\d)/giu, 'Note: $1/100');

    return t;
  };

  const analysisClean = cleanAnalysisText(chat_analysis || '');

  // Funzione per parsare l'analisi e separare le domande e il riepilogo
  const parseAnalysis = (analysis: string) => {
    if (!analysis) return { questions: [], summary: '' };
    let cleaned = analysis.replace(/^Analyse IA\s*/i, '');

    // eventuale riassunto finale
    const summaryMatch = cleaned.match(/(La somme de tes notes obtenues est de[\s\S]*)/i);
    let summary = '';
    if (summaryMatch) {
      summary = summaryMatch[1].trim();
      cleaned = cleaned.replace(summaryMatch[1], '').trim();
    }

    // Split sia su "Question n°..." sia su "Critère n°..."
    const blocks = cleaned
      .split(/(?=(?:Question|Crit[eè]re)\s*n[°ºo]?\s*\d+[,:\-]?\s*)/gi)
      .filter(Boolean);

    // titolo = intestazione completa (es: "Critère n°1 : Détection et démarche commerciale")
    const questions = blocks.map(block => {
      const match = block.match(/^((?:Question|Crit[eè]re)\s*n[°ºo]?\s*\d+[,:\-]?\s*[^\n]*?)\s*\n?([\s\S]*)/i);
      if (match) {
        return { title: match[1].trim(), content: match[2].trim() };
      } else {
        return { title: '', content: block.trim() };
      }
    });

    return { questions, summary };
  };



  const { questions, summary } = parseAnalysis(analysisClean);

  // Funzione per parsare i criteri dal testo dell'analisi (etichetta sulla stessa riga)
  const parseCriteres = (analysis: string) => {
    if (!analysis) return [];

    const headerRegex = /Crit[eè]re\s*n[°ºo]?\s*(\d+)/gi;
    const matches = Array.from(analysis.matchAll(headerRegex));

    const criteres: Array<{ name: string; description: string; note: number; maxNote: number; fullNote: string }>=[];

    for (let i = 0; i < matches.length; i++) {
      const headerMatch = matches[i];
      const num = headerMatch[1];
      const start = headerMatch.index ?? 0;
      const end = i < matches.length - 1 ? (matches[i + 1].index ?? analysis.length) : analysis.length;
      const block = analysis.slice(start, end);

      // Estrai la nota nel blocco
      const noteMatch = block.match(/Note\s*[ :]\s*(\d+)\s*\/\s*(10|100)\b/i);
      if (!noteMatch) continue;
      const raw = parseInt(noteMatch[1], 10);
      const denom = parseInt(noteMatch[2], 10);
      const note = denom === 100 ? raw : (raw <= 10 ? raw * 10 : raw);

      // Descrizione: priorità alla stessa riga dell'header dopo separatore
      const headerLine = block.split(/\n/)[0] || '';
      let description = '';
      const sameLineRegex = new RegExp(`Crit[eè]re\\s*n[°ºo]?\\s*${num}\\s*[ ,:—–-]*\\s*(.+)$`, 'i');
      const sameLineMatch = headerLine.match(sameLineRegex);
      if (sameLineMatch && sameLineMatch[1]) {
        description = sameLineMatch[1].trim();
      }
      // Fallback: prima riga utile dopo l'header
      if (!description) {
        const afterHeader = block.replace(/^.*?\n/, '');
        const firstUsefulLine = (afterHeader.split(/\n+/).find(l => l.trim() && !/^Note\b/i.test(l.trim())) || '').trim();
        description = firstUsefulLine.replace(/^[—–\-]\s*/, '').replace(/\s*:\s*$/, '');
      }

      criteres.push({
        name: `Critère n°${num}`,
        description,
        note,
        maxNote: 100,
        fullNote: `${note}/100`
      });
    }

    return criteres;
  };

  // Funzione per determinare la classe CSS del criterio in base al punteggio
  const getCritereClass = (note: number) => {
    // Per note su 100: rosso 0-49, giallo 50-79, verde 80-100
    // Usa le stesse soglie delle note per coerenza visiva
    if (note < 50) return 'critere-red';
    if (note < 80) return 'critere-yellow';
    return 'critere-green';
  };

  const criteres = parseCriteres(analysisClean);

  // Restituisce solo la prima parola della descrizione seguita da "..."
  const getCritereShortLabel = (description: string) => {
    const d = (description || '').trim();
    if (!d) return '';
    const firstWord = d
      .replace(/^[:\-\s]+/, '')
      .split(/\s+/)[0]
      .replace(/[.,;:!?)]*$/, '');
    return firstWord ? `${firstWord}...` : '';
  };

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
    
    // Usa il testo pulito con le note su 100
    const lines = doc.splitTextToSize(analysisClean, 180);
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
    block = cleanAnalysisText(block);
    const lines = block.split(/\n+/).filter(Boolean);
    const result: React.ReactNode[] = [];

    lines.forEach((line, idx) => {
      // 1) Evidenzia la nota, ovunque compaia nella riga
      const noteMatch = line.match(/Note\s*[ :]\s*(\d+)\s*\/\s*(10|100)\b/iu);
      if (noteMatch) {
        const n = parseInt(noteMatch[1].replace(/[^0-9]/g, ''), 10);
        const maxNote = parseInt(noteMatch[2], 10);
        let colorClass = 'analysis-note-num-red';
        if (maxNote === 100) {
          if (n >= 80) colorClass = 'analysis-note-num-green';
          else if (n >= 50 && n < 80) colorClass = 'analysis-note-num-yellow';
          else colorClass = 'analysis-note-num-red';
        }
        result.push(
          <div key={`${idx}-note`} className="analysis-block-content-indent" style={{marginBottom: 2}}>
            <span className={colorClass}>Note: {n}/{maxNote}</span>
          </div>
        );
        // Rimuovi la parte "Note" e continua a processare eventuale testo residuo
        line = line.replace(/Note\s*[: ]\s*\d+\s*\/\s*(?:10|100)\s*,?\s*/i, '').trim();
        if (!line) return;
      }

      // 1b) Ignora righe isolate che sono solo numeri (es. "0", "0%", "0/100")
      if (/^\s*\d{1,3}(?:\s*(?:%|\/\s*\d{2,3}))?\s*$/.test(line)) {
        return;
      }

      // 2) Evidenzia dinamicamente qualsiasi etichetta seguita da due punti
      //    Accetta varianti di ":" (incluso fullwidth)
      const labelMatch = line.match(/^\s*(?:[—–\-]\s*)?([^：:]{1,80}?)\s*[：:]\s*(.*)$/);
      if (labelMatch) {
        const rawLabel = labelMatch[1].trim();
        const content = labelMatch[2].trim();
        const lower = rawLabel.toLowerCase();
        let className = 'analysis-label analysis-label-blue';
        if (/id[ée]ale/.test(lower)) className = 'analysis-label analysis-label-green';
        else if (/correction|am[ée]liorat/.test(lower)) className = 'analysis-label analysis-label-orange';

        result.push(
          <div key={`${idx}-label`} className="analysis-block-content-indent" style={{marginBottom: 2}}>
            <span className={className}>{rawLabel}:</span>
            {content ? ' ' + content : ''}
          </div>
        );
        return;
      }

      // 3) Riga normale
      if (line) {
        result.push(
          <div key={`${idx}-text`} className="analysis-block-content-indent" style={{marginBottom: 2}}>
            {line}
          </div>
        );
      }
    });
    return result;
  };

  // Funzione per determinare la classe della pillola score
  const getScoreBadgeClass = (score: number) => {
    // Usa le stesse soglie dei criteri per coerenza visiva
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
              <button className="btn-small btn-secondary btn-plein-ecran" title="Plein écran" onClick={handleFullscreen}>
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
                                               <div className="pdf-message-content" style={{whiteSpace: 'pre-wrap', textAlign: 'left'}}>
                          {analysisClean}
                        </div>
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
            {/* Card dei criteri se presenti */}
            {criteres.map((critere, index) => (
              <div key={index} className="progress-indicator">
                <span className="progress-label-critere">{critere.name}</span>
                {critere.description && (
                  <div 
                    className="critere-description" 
                    title={critere.description}
                    style={{ cursor: 'help' }}
                  >
                    {getCritereShortLabel(critere.description)}
                  </div>
                )}
                <span className={`progress-value score-style ${getCritereClass(critere.note)}`}>
                  {critere.note}/{critere.maxNote}
                </span>
                
              </div>
            ))}
          </div>
          <div className="comparison-text">
            Simulation complète avec un score de {score ? `${score}/100` : '-'} et {(chat_analysis && chat_analysis.match(/Question/g)?.length) || 1} échanges.
            {criteres.length > 0 && (
              <span> Évaluée selon {criteres.length} critère{criteres.length > 1 ? 's' : ''}.</span>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

export default Analysis; 