import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import './assets/css/studentDetail.css';
// @ts-ignore
import jsPDF from 'jspdf';
import { useBreadcrumbContext } from './BreadcrumbContext';
import { useSettings } from './SettingsContext';

interface Simulation {
  id: number;
  user_email: string;
  chatbot_name: string;
  score: number;
  chat_history: string;
  chat_analysis: string;
  created_at: string;
  name: string;
  usergroup?: string;
  temp?: string; // aggiunta per il tempo formattato dal backend
}

//interface StudentStats {
//  name: string;
//  email: string;
//  avatar: string;
//  simulations: number;
//  best_score: number;
//  avg_score: number;
//  simulationHistory: Simulation[];
//}

const getInitials = (name: string) => {
  if (!name) return '';
  const parts = name.split(/\s|,|-/).filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('fr-FR');
};

// Funzione per calcolare il numero di scambi (versione semplificata)
const calculateExchanges = (chat_history: string, studentName: string) => {
  if (!chat_history || chat_history.trim() === '') return 0;
  
  // Usa la stessa logica di parsing di ChatHistory.tsx
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
  
  return messages.length;
};

// Trie les simulations par champ et direction
const sortSimulations = (sims: Simulation[], field: 'created_at' | 'score', direction: 'asc' | 'desc') => {
  return [...sims].sort((a, b) => {
    if (field === 'created_at') {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return direction === 'asc' ? da - db : db - da;
    } else if (field === 'score') {
      return direction === 'asc' ? a.score - b.score : b.score - a.score;
    }
    return 0;
  });
};

const StudentDetail: React.FC = () => {
  const { storyline_key, email } = useParams<{ storyline_key: string; email: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<'created_at' | 'score'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showAllLaunches, setShowAllLaunches] = useState(false);
  const from = location.state?.from;
  
  // Stato per mostrare i criteri
  const [showCriteres, setShowCriteres] = useState(false);

  // Stato per il numero massimo di criteri
  const [maxCriteres, setMaxCriteres] = useState(0);

  // Recupera le informazioni del tenant dallo stato di navigazione
  const tenant_name = location.state?.tenant_name || 'Client inconnu';
  const storyline_key_from_state = location.state?.storyline_key || storyline_key;
  
  // Filtra le simulazioni in base al toggle
  const filteredSimulations = showAllLaunches 
    ? simulations 
    : simulations.filter(sim => typeof sim.score === 'number' && sim.score >= 0);

  // Calcola il numero massimo di criteri quando cambiano le simulazioni filtrate
  useEffect(() => {
    let max = 0;
    filteredSimulations.forEach(sim => {
      if (sim.chat_analysis) {
        const criteres = parseCriteres(sim.chat_analysis);
        max = Math.max(max, criteres.length);
      }
    });
    setMaxCriteres(max);
  }, [filteredSimulations]);
  
  // Ordina le simulazioni filtrate secondo lo stato
  const sortedSimulations = sortSimulations(filteredSimulations, sortField, sortDirection);
  
  // Stato per la paginazione mobile
  const [currentPage, setCurrentPage] = useState(1);
  const cardsPerPage = 5;
  const totalPages = Math.ceil(sortedSimulations.length / cardsPerPage);
  const paginatedCards = sortedSimulations.slice((currentPage - 1) * cardsPerPage, currentPage * cardsPerPage);
  const goToPrevPage = () => setCurrentPage(p => Math.max(1, p - 1));
  const goToNextPage = () => setCurrentPage(p => Math.min(totalPages, p + 1));
  useEffect(() => { setCurrentPage(1); }, [sortedSimulations]);
  const { addBreadcrumb } = useBreadcrumbContext();
  const { settings } = useSettings();

  // Funzione per parsare i criteri dal testo dell'analisi (identica a Analysis.tsx e List.tsx)
  const parseCriteres = (analysis: string) => {
    if (!analysis) return [];
    
    const criterePattern = /Critère\s*n[°ºo]?\s*(\d+)\s*:\s*([^\n]+)(?:[\s\S]*?)Note\s*:\s*(\d+)\s*\/\s*20/gi;
    const criteres = [];
    let match;
    
    while ((match = criterePattern.exec(analysis)) !== null) {
      const critereNumber = match[1];
      const description = match[2]?.trim();
      const note = match[3] ? parseInt(match[3]) : null;
      
      if (note !== null) {
        criteres.push({
          name: `Critère n°${critereNumber}`,
          description: description,
          note: note,
          fullMatch: match[0]
        });
      }
    }
    
    return criteres;
  };

  // Funzione per calcolare le medie dei criteri per questo studente
  const calculateCriteresAverages = () => {
    const criteresMap = new Map<string, number[]>();
    
    // Raccogli tutti i criteri da tutte le simulazioni
    simulations.forEach(sim => {
      if (sim.chat_analysis) {
        const criteres = parseCriteres(sim.chat_analysis);
        criteres.forEach(critere => {
          if (!criteresMap.has(critere.name)) {
            criteresMap.set(critere.name, []);
          }
          criteresMap.get(critere.name)!.push(critere.note);
        });
      }
    });
    
    // Calcola la media per ogni criterio
    const averages: { name: string; average: number; count: number }[] = [];
    criteresMap.forEach((notes, name) => {
      const average = Math.round((notes.reduce((sum, note) => sum + note, 0) / notes.length) * 10) / 10;
      averages.push({
        name,
        average,
        count: notes.length
      });
    });
    
    // Ordina per numero di criterio
    return averages.sort((a, b) => {
      const numA = parseInt(a.name.match(/\d+/)?.[0] || '0');
      const numB = parseInt(b.name.match(/\d+/)?.[0] || '0');
      return numA - numB;
    });
  };

  // Funzione per determinare la classe CSS del criterio in base al punteggio
  const getCritereClass = (average: number) => {
    if (average <= 10) return 'critere-red';
    if (average <= 15) return 'critere-yellow';
    return 'critere-green';
  };

  const criteresAverages = calculateCriteresAverages();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Decodifica l'email se è stata codificata nell'URL
        const decodedEmail = decodeURIComponent(email || '');
        
        const url = `/api/learner-detail?storyline_key=${storyline_key}&email=${encodeURIComponent(decodedEmail)}`;
        
        const res = await fetch(url, { credentials: 'include' });
        const data = await res.json();
        
        setSimulations(data);
      } catch (e) {
        console.error('Errore nel caricamento dei dati del learner:', e);
        setSimulations([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [storyline_key, email]);

  if (loading) return <div className="student-detail-main">Caricamento...</div>;
  if (!simulations.length) return <div className="student-detail-main">Learner non trovato.</div>;

  const learner = simulations[0];
  const initials = getInitials(learner.name);
  const completedSimulations = simulations.filter(sim => typeof sim.score === 'number' && sim.score >= 0);
  const numSimulations = showAllLaunches ? simulations.length : completedSimulations.length;
  const bestScore = showAllLaunches ? Math.max(...simulations.map(s => s.score)) : Math.max(...completedSimulations.map(s => s.score));
  const avgScore = showAllLaunches 
    ? Math.round(simulations.reduce((acc, s) => acc + s.score, 0) / simulations.length)
    : Math.round(completedSimulations.reduce((acc, s) => acc + s.score, 0) / completedSimulations.length);
  
  // Calcolo del taux de complétion
  const completionRate = simulations.length > 0 
    ? Math.round((completedSimulations.length / simulations.length) * 100) 
    : 0;

  // Gestione click sulle colonne
  const handleSort = (field: 'created_at' | 'score') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'created_at' ? 'desc' : 'asc'); // default: date desc, score asc
    }
  };

  // Freccia per l'ordinamento
  const getSortArrow = (field: 'created_at' | 'score') => {
    if (sortField !== field) return <span className="sort-arrow">⇅</span>;
    return <span className="sort-arrow">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  // Funzione per scaricare PDF (presa da List.tsx)
  const downloadPDF = (title: string, content: string, filename: string) => {
    if (!content) return;
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text(title, 10, 18);
      doc.setFontSize(12);
      const lines = doc.splitTextToSize(content, 180);
      doc.text(lines, 10, 30);
      doc.save(filename);
    } catch (e) {
      const blob = new Blob([content], { type: 'text/plain' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename.replace(/\.pdf$/, '.txt');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <main className="student-detail-main">
      {/* Profilo */}
      <div className="student-profile">
        <div className="profile-content" style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
          <div className="profile-avatar" style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
            <div className="avatar-circle">{initials}</div>
          </div>
          <h1 className="student-name" style={{textAlign: 'center', marginTop: '12px'}}>{learner.name}</h1>
          {settings.showGroups && (
            <div className="student-group" style={{textAlign: 'center', marginTop: '8px', color: '#6a6af6', fontSize: '1.1rem', fontWeight: '600'}}>
              {learner.usergroup || 'Groupe par défaut'}
            </div>
          )}
          {/* Informazioni del cliente */}
          <div className="client-info">
            <span className="client-name">{tenant_name}</span>
            <span className="storyline-key">ID: {storyline_key_from_state}</span>
          </div>
        </div>
      </div>
      {/* Breadcrumb 
      <div className="breadcrumb">
        <span className="breadcrumb-link" onClick={() => navigate('/dashboard')}>Dashboard</span> &gt;
        {from === 'all-student-list' ? (
          <>
            <span className="breadcrumb-link" onClick={() => navigate('/all-student-list')}>Tous les utilisateurs</span> &gt;
            <span className="current">{learner.name}</span>
          </>
        ) : (
          <>
            <span className="breadcrumb-link" onClick={() => navigate(`/chatbot/${storyline_key}`)}>Chatbot</span> &gt;
            <span className="breadcrumb-link" onClick={() => navigate(`/chatbot/${storyline_key}/learners`)}>Learners</span> &gt;
            <span className="current">{learner.name}</span>
          </>
        )}
      </div>*/}
      {/* Statistiche */}
      <div className="student-stats">
        <div className="stat-card">
          <span className="stat-icon">🎯</span>
          <span className="stat-label">Simulations terminées :</span>
          <span className="stat-value">{numSimulations}</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">📊</span>
          <span className="stat-label">Taux de complétion :</span>
          <span className="stat-value completion-rate">{completionRate}%</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🏆</span>
          <span className="stat-label">Meilleur score :</span>
          <span className="stat-value best-score">{bestScore}</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">📊</span>
          <span className="stat-label">Score moyen :</span>
          <span className="stat-value average-score">{avgScore}</span>
        </div>
      </div>
      
      {/* Etichette dei criteri (medie) */}
      {criteresAverages.length > 0 && (
        <div className="criteres-container">
          <div className="criteres-label">Moyennes des critères :</div>
          <div className="criteres-tags">
            {criteresAverages.map((critere) => (
              <div 
                key={critere.name}
                className={`critere-tag ${getCritereClass(critere.average)}`}
                title={`${critere.count} simulation${critere.count > 1 ? 's' : ''} évaluée${critere.count > 1 ? 's' : ''}`}
              >
                {critere.name}: {critere.average}/20
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Toggle "Simulations terminées" */}
      <div className="toggle-container" style={{display: 'flex', justifyContent: 'center', marginBottom: '20px'}}>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={showAllLaunches}
            onChange={(e) => setShowAllLaunches(e.target.checked)}
          />
          <span className="toggle-slider"></span>
        </label>
        <span className="toggle-label">Tous les lancements</span>
        {maxCriteres > 0 && (
          <>
            <label className="toggle-switch" style={{marginLeft: '20px'}}>
              <input
                type="checkbox"
                checked={showCriteres}
                onChange={(e) => setShowCriteres(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
            <span className="toggle-label">Afficher les critères</span>
          </>
        )}
      </div>
      
      {/* Etichetta Lancement */}
      <div style={{display: 'flex', justifyContent: 'center', marginBottom: '20px'}}>
        <div style={{
          backgroundColor: '#f8f9ff',
          border: '2px solid #6a6af6',
          borderRadius: '6px',
          padding: '8px 16px',
          fontSize: '14px',
          fontWeight: '600',
          color: '#6a6af6'
        }}>
          {showAllLaunches ? 'Toutes les simulations' : 'Simulations terminées'} : {showAllLaunches ? simulations.length : simulations.filter(sim => typeof sim.score === 'number' && sim.score >= 0).length}
        </div>
      </div>
      
      {/* Storico simulazioni */}
      <div className="simulations-history">
        {/* Tabella desktop/tablet */}
        <table className="simulations-table">
          <thead>
            <tr>
              <th style={{cursor: 'pointer'}} onClick={() => handleSort('created_at')}>
                Date simulation {getSortArrow('created_at')}
              </th>
              <th>N. echanges</th>
              <th>Temps</th>
              {showCriteres && maxCriteres > 0 && Array.from({ length: maxCriteres }, (_, i) => (
                <th key={`critere-${i + 1}`}>Critère n°{i + 1}</th>
              ))}
              <th>Historique conversation</th>
              <th>Analyse conversation</th>
              <th style={{cursor: 'pointer'}} onClick={() => handleSort('score')}>
                Score {getSortArrow('score')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedSimulations.map(sim => (
              <tr key={sim.id}>
                <td>{formatDate(sim.created_at)}</td>
                <td>{calculateExchanges(sim.chat_history, sim.name)}</td>
                <td>{sim.temp || '-'}</td>
                {showCriteres && maxCriteres > 0 && (() => {
                  const criteres = parseCriteres(sim.chat_analysis);
                  return Array.from({ length: maxCriteres }, (_, i) => {
                    const critere = criteres.find(c => c.name === `Critère n°${i + 1}`);
                    return (
                      <td key={`critere-${i + 1}`} className="critere-cell">
                        {critere ? (
                          <span className={`critere-note ${getCritereClass(critere.note)}`} title={critere.description}>
                            {critere.note}/20
                          </span>
                        ) : (
                          <span className="critere-empty">-</span>
                        )}
                      </td>
                    );
                  });
                })()}
                <td>
                  {/* Pulsante download PDF storico chat */}
                  <button
                    className={`btn-small btn-download ${calculateExchanges(sim.chat_history, sim.name) === 0 ? 'btn-disabled' : ''}`}
                    title="Télécharger"
                    onClick={() => downloadPDF('Historique chat', sim.chat_history, `historique_${sim.name}.pdf`)}
                    disabled={calculateExchanges(sim.chat_history, sim.name) === 0}
                    style={{ marginRight: 2 }}
                  >
                    {/* Icona download */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  </button>
                  {/* Pulsante visualizza chat history */}
                  <button
                    className={`btn-small btn-view ${calculateExchanges(sim.chat_history, sim.name) === 0 ? 'btn-disabled' : ''}`}
                    title="Visualiser"
                    onClick={() => {
                      addBreadcrumb({ label: 'Historique', path: '/chat-history' });
                      navigate('/chat-history', { state: { name: sim.name, date: sim.created_at, score: sim.score, chat_history: sim.chat_history, chat_analysis: sim.chat_analysis, temp: sim.temp, show: 'analysis', from } });
                    }}
                    disabled={calculateExchanges(sim.chat_history, sim.name) === 0}
                  >
                    {/* Icona occhio */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                </td>
                <td>
                  {/* Pulsante download PDF analisi chat */}
                  <button
                    className={`btn-small btn-download ${!sim.chat_analysis ? 'btn-disabled' : ''}`}
                    title="Télécharger"
                    onClick={() => downloadPDF('Rapport', sim.chat_analysis, `rapport_${sim.name}.pdf`)}
                    disabled={!sim.chat_analysis}
                    style={{ marginRight: 2 }}
                  >
                    {/* Icona download */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  </button>
                  {/* Pulsante visualizzazione analisi (non collegato) */}
                  <button
                    className={`btn-small btn-view ${!sim.chat_analysis ? 'btn-disabled' : ''}`}
                    title="Visualiser"
                    onClick={() => {
                      addBreadcrumb({ label: 'Analyse de Performance', path: '/analysis' });
                      navigate('/analysis', { state: { name: sim.name, date: sim.created_at, score: sim.score, chat_analysis: sim.chat_analysis, chat_history: sim.chat_history, from } });
                    }}
                    disabled={!sim.chat_analysis}
                  >
                    {/* Icona occhio */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                </td>
                <td>
                  {sim.score === -1 ? (
                    <span>N/A</span>
                  ) : (
                    <span className={`score-badge ${sim.score >= 90 ? 'score-high' : sim.score >= 75 ? 'score-medium' : 'score-low'}`}>{sim.score}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Card mobile */}
        <div className="simulations-cards">
          {paginatedCards.map(sim => (
            <div className="simulation-card" key={sim.id}>
              <div><strong>Date simulation:</strong> {formatDate(sim.created_at)}</div>
              <div><strong>N. echanges:</strong> {calculateExchanges(sim.chat_history, sim.name)}</div>
              <div><strong>Temp:</strong> {sim.temp || '-'}</div>
              <div><strong>ID simulation:</strong> {sim.id}</div>
              <div>
                <strong>Score:</strong>
                {sim.score === -1 ? (
                  <span>N/A</span>
                ) : (
                  <span className={`score-badge ${sim.score >= 90 ? 'score-high' : sim.score >= 75 ? 'score-medium' : 'score-low'}`}>{sim.score}</span>
                )}
              </div>
              <div><strong>Historique conversation:</strong></div>
              <div className="card-buttons">
                <button className={`btn-small btn-download ${calculateExchanges(sim.chat_history, sim.name) === 0 ? 'btn-disabled' : ''}`} title="Télécharger"
                  onClick={() => downloadPDF('Historique chat', sim.chat_history, `historique_${sim.name}.pdf`)}
                  disabled={calculateExchanges(sim.chat_history, sim.name) === 0}>
                  {/* Icona download */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </button>
                <button className={`btn-small btn-view ${calculateExchanges(sim.chat_history, sim.name) === 0 ? 'btn-disabled' : ''}`} title="Visualiser"
                  onClick={() => {
                    addBreadcrumb({ label: 'Historique', path: '/chat-history' });
                    navigate('/chat-history', { state: { name: sim.name, date: sim.created_at, score: sim.score, chat_history: sim.chat_history, chat_analysis: sim.chat_analysis, temp: sim.temp, show: 'analysis', from } });
                  }}
                  disabled={calculateExchanges(sim.chat_history, sim.name) === 0}>
                  {/* Icona occhio */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
              </div>
              <div><strong>Analyse conversation:</strong></div>
              <div className="card-buttons">
                <button className={`btn-small btn-download ${!sim.chat_analysis ? 'btn-disabled' : ''}`} title="Télécharger"
                  onClick={() => downloadPDF('Rapport', sim.chat_analysis, `rapport_${sim.name}.pdf`)}
                  disabled={!sim.chat_analysis}>
                  {/* Icona download */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </button>
                <button className={`btn-small btn-view ${!sim.chat_analysis ? 'btn-disabled' : ''}`} title="Visualiser"
                  onClick={() => {
                    addBreadcrumb({ label: 'Analyse de Performance', path: '/analysis' });
                    navigate('/analysis', { state: { name: sim.name, date: sim.created_at, score: sim.score, chat_analysis: sim.chat_analysis, chat_history: sim.chat_history, from } });
                  }}
                  disabled={!sim.chat_analysis}>
                  {/* Icona occhio */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
              </div>
            </div>
          ))}
          {/* Paginazione mobile */}
          {totalPages > 1 && (
            <div className="mobile-pagination">
              <button className="page-btn" onClick={goToPrevPage} disabled={currentPage === 1} aria-label="Pagina precedente">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <span className="page-indicator">{currentPage} / {totalPages}</span>
              <button className="page-btn" onClick={goToNextPage} disabled={currentPage === totalPages} aria-label="Pagina successiva">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default StudentDetail; 