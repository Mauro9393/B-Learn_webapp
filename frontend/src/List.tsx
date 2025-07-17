import './assets/css/list.css';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
// @ts-ignore
import jsPDF from 'jspdf';
import { useBreadcrumbContext } from './BreadcrumbContext';

// Definisci un'interfaccia per i dati
interface DataItem {
  id: number;
  user_email: string;
  chatbot_name: string;
  name: string;
  score: number;
  chat_history: string;
  chat_analysis: string;
  created_at?: string; // aggiunta per la data
  usergroup?: string; // aggiunta per il gruppo
  temp?: string; // aggiunta per il tempo formattato dal backend
}

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

// Frecce unicode
const UP_ARROW = '↑';
const DOWN_ARROW = '↓';

function List() {
  const [data, setData] = useState<DataItem[]>([]);
  const [modalContent, setModalContent] = useState<string | null>(null);
  const [modalTitle, setModalTitle] = useState<string>('');
  const query = useQuery();
  const chatbotName = query.get('chatbot_name');
  const location = useLocation();
  const [filter, setFilter] = useState('');
  const [scoreFilter, setScoreFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [showAllLaunches, setShowAllLaunches] = useState(false);
  const [filteredData, setFilteredData] = useState<DataItem[]>([]);
  // Stato per ordinamento
  const [sortColumn, setSortColumn] = useState<'name' | 'created_at' | 'score'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const navigate = useNavigate();
  // Stato per la paginazione mobile
  const [currentPage, setCurrentPage] = useState(1);
  const cardsPerPage = 5;
  const totalPages = Math.ceil(filteredData.length / cardsPerPage);
  // Calcola le card da mostrare in base alla pagina
  const paginatedCards = filteredData.slice((currentPage - 1) * cardsPerPage, currentPage * cardsPerPage);
  const { addBreadcrumb } = useBreadcrumbContext();

  // Salva le informazioni del tenant nel localStorage quando arrivano dallo stato
  if (location.state?.tenant_name) {
    localStorage.setItem(`tenant_${chatbotName}`, location.state.tenant_name);
    localStorage.setItem(`storyline_${chatbotName}`, location.state.storyline_key);
  }
  
  // Recupera le informazioni dal localStorage o dallo stato
  const tenant_name = location.state?.tenant_name || 
                     localStorage.getItem(`tenant_${chatbotName}`) || 
                     'Client inconnu';
  const storyline_key_from_state = location.state?.storyline_key || 
                                  localStorage.getItem(`storyline_${chatbotName}`) || 
                                  chatbotName;

  useEffect(() => {
    const fetchData = async () => {
      let url = `/api/userlist`;
      if (chatbotName) {
        url += `?chatbot_name=${encodeURIComponent(chatbotName)}`;
      }
      const response = await fetch(url);
      const data = await response.json();
      setData(data || []);
      setFilteredData(data || []);
    };
    fetchData();
  }, [chatbotName]);

  useEffect(() => {
    setFilteredData(
      data.filter(item => {
        // Filtro per score -1 (solo se showAllLaunches è true)
        if (!showAllLaunches && item.score === -1) {
          return false;
        }
        
        // Filtro par nom
        const matchesName = item.name.toLowerCase().includes(filter.toLowerCase());
        // Filtro per range di punteggio
        const matchesScore = scoreFilter ? (() => {
          const score = item.score;
          switch(scoreFilter) {
            case '0-20': return score >= 0 && score <= 20;
            case '20-40': return score >= 20 && score <= 40;
            case '40-60': return score >= 40 && score <= 60;
            case '60-80': return score >= 60 && score <= 80;
            case '80-100': return score >= 80 && score <= 100;
            default: return true;
          }
        })() : true;
        // Filtro per anno
        let matchesYear = true;
        if (yearFilter && item.created_at) {
          matchesYear = item.created_at.startsWith(yearFilter);
        }
        // Filtro per mese
        let matchesMonth = true;
        if (monthFilter && item.created_at) {
          const month = item.created_at.substring(5, 7); // Estrae MM da YYYY-MM-DD
          matchesMonth = month === monthFilter;
        }
        return matchesName && matchesScore && matchesYear && matchesMonth;
      })
    );
  }, [filter, scoreFilter, yearFilter, monthFilter, showAllLaunches, data]);

  // Ordina i dati filtrati in base a sortColumn e sortDirection
  const sortedData = [...filteredData].sort((a, b) => {
    if (sortColumn === 'name') {
      if (a.name.toLowerCase() < b.name.toLowerCase()) return sortDirection === 'asc' ? -1 : 1;
      if (a.name.toLowerCase() > b.name.toLowerCase()) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    } else if (sortColumn === 'created_at') {
      // Plus récent = date plus grande
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    } else if (sortColumn === 'score') {
      return sortDirection === 'asc' ? a.score - b.score : b.score - a.score;
    }
    return 0;
  });

  // Gestori per la paginazione
  const goToPrevPage = () => setCurrentPage(p => Math.max(1, p - 1));
  const goToNextPage = () => setCurrentPage(p => Math.min(totalPages, p + 1));
  useEffect(() => { setCurrentPage(1); }, [filteredData]); // resetta pagina se cambia filtro

  const closeModal = () => {
    setModalContent(null);
    setModalTitle('');
  };

  const renderModalContent = () => {
    if (modalTitle === 'Rapport' && modalContent) {
      // Evidenzia tutte le occorrenze di 'Question X' in grassetto
      const parts = modalContent.split(/(Question \d+)/g);
      return (
        <div style={{ whiteSpace: 'pre-wrap', textAlign: 'left' }}>
          {parts.map((part, idx) =>
            /^Question \d+$/.test(part) ? <strong key={idx}>{part}</strong> : part
          )}
        </div>
      );
    }
    return <div style={{ whiteSpace: 'pre-wrap', textAlign: 'left' }}>{modalContent}</div>;
  };

  // Funzione per formattare la data (YYYY-MM-DD -> DD/MM/YYYY)
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('fr-FR');
  };

  // Gestione click sulle colonne
  const handleSort = (column: 'name' | 'created_at' | 'score') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      // Default: name = asc, created_at = desc, score = desc
      if (column === 'name') setSortDirection('asc');
      else setSortDirection('desc');
    }
  };

  // Freccia da mostrare accanto alla colonna ordinata
  const getArrow = (column: 'name' | 'created_at' | 'score') => {
    if (sortColumn !== column) return <span className="sort-arrow">⇅</span>;
    return <span className="sort-arrow">{sortDirection === 'asc' ? UP_ARROW : DOWN_ARROW}</span>;
  };

  // Funzione per scaricare PDF
  const downloadPDF = (title: string, content: string, filename: string) => {
    if (!content) return;
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text(title, 10, 18);
      doc.setFontSize(12);
      // Gestione testo multilinea
      const lines = doc.splitTextToSize(content, 180);
      doc.text(lines, 10, 30);
      doc.save(filename);
    } catch (e) {
      // Fallback: scarica come txt
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
    <div className="list-container">
      <h1>Liste des Simulations</h1>
      <div className="client-info">
        <span className="client-name">{tenant_name}</span>
        <span className="storyline-key">ID: {storyline_key_from_state}</span>
      </div>
      {/* Breadcrumb 
      <div className="breadcrumb">
        <span className="breadcrumb-link" onClick={() => navigate('/dashboard')}>Dashboard</span> &gt;
        <span
          className="breadcrumb-link"
          onClick={() => navigate(`/chatbot/${chatbotName || ''}`)}
        >
          Chatbot
        </span> &gt;
        <span className='current'>Liste des simulations</span>
      </div>*/}
      {/* Filtri comme in simulations-list.html */}
      <div className="filters">
        <input
          type="text"
          id="student-filter"
          placeholder="Rechercher un apprenant..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
        <select id="score-filter" value={scoreFilter} onChange={e => setScoreFilter(e.target.value)}>
          <option value="">Tous les scores</option>
          <option value="0-20">Score 0-20</option>
          <option value="20-40">Score 20-40</option>
          <option value="40-60">Score 40-60</option>
          <option value="60-80">Score 60-80</option>
          <option value="80-100">Score 80-100</option>
        </select>
        <select id="month-filter" value={monthFilter} onChange={e => setMonthFilter(e.target.value)}>
          <option value="">Tous les mois</option>
          <option value="01">Janvier</option>
          <option value="02">Février</option>
          <option value="03">Mars</option>
          <option value="04">Avril</option>
          <option value="05">Mai</option>
          <option value="06">Juin</option>
          <option value="07">Juillet</option>
          <option value="08">Août</option>
          <option value="09">Septembre</option>
          <option value="10">Octobre</option>
          <option value="11">Novembre</option>
          <option value="12">Décembre</option>
        </select>
        <select id="year-filter" value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
          <option value="">Toutes les années</option>
          {/* Opzioni dinamiche pour les années trouvées dans les données */}
          {[...new Set(data.map(item => item.created_at ? item.created_at.substring(0,4) : ''))]
            .filter(y => y)
            .sort((a, b) => b.localeCompare(a))
            .map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
        </select>
        <div className="toggle-container">
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={showAllLaunches}
              onChange={(e) => setShowAllLaunches(e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
          <span className="toggle-label">Tous les lancements</span>
        </div>
      </div>
      
      {/* Etichetta Lancement */}
      <div className="lancement-label-container">
        <div className="lancement-label">
          {showAllLaunches ? 'Formations terminées / non terminées' : 'Formations terminées'} : {showAllLaunches ? data.length : data.filter(item => item.score >= 0).length}
        </div>
      </div>
      <div className="simulations-container">
        <table className="simulations-table" id="simulations-table">
          <thead>
            <tr>
              <th className="sortable-header" onClick={() => handleSort('name')}>Nom {getArrow('name')}</th>
              <th className="sortable-header" onClick={() => handleSort('created_at')}>Date simulation {getArrow('created_at')}</th>
              <th>Groupe</th>
              <th className="sortable-header" onClick={() => handleSort('score')}>Score {getArrow('score')}</th>
              <th>Temps</th>
              <th>Historique chat</th>
              <th>Analyse chat</th>
            </tr>
          </thead>
          <tbody id="simulationTableBody">
            {sortedData.map(item => (
              <tr key={item.id} data-student={item.name} data-date={item.created_at || ''} data-score={item.score}>
                <td>
                  <span 
                    className="clickable-name"
                    onClick={() => {
                      addBreadcrumb({ label: item.name, path: `/chatbot/${encodeURIComponent(chatbotName || '')}/learners/${encodeURIComponent(item.user_email)}` });
                      navigate(`/chatbot/${encodeURIComponent(chatbotName || '')}/learners/${encodeURIComponent(item.user_email)}`, { 
                        state: { 
                          from: 'simulations-list',
                          tenant_name: tenant_name,
                          storyline_key: storyline_key_from_state
                        } 
                      });
                    }}
                    title="Voir le profil"
                  >
                    {item.name}
                  </span>
                </td>
                <td className="date-cell">{formatDate(item.created_at)}</td>
                <td>{item.usergroup || 'Groupe par défaut'}</td>
                <td>
                  {item.score === -1 ? (
                    <span>N/A</span>
                  ) : (
                    <span className={`score-badge ${item.score >= 90 ? 'score-high' : item.score >= 80 ? 'score-medium' : 'score-low'}`}>{item.score}</span>
                  )}
                </td>
                <td>{item.temp || '-'}</td>
                <td>
                  <div className="card-buttons">
                    <button
                      className="btn-small btn-download"
                      title="Télécharger"
                      onClick={() => downloadPDF('Historique chat', item.chat_history, `historique_${item.name}.pdf`)}
                      disabled={!item.chat_history}
                    >
                      {/* Icona download */}
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </button>
                    <button
                      className="btn-small btn-view"
                      title="Visualiser"
                      onClick={() => {
                        addBreadcrumb({ label: 'Historique', path: '/chat-history' });
                        navigate('/chat-history', { state: { name: item.name, date: item.created_at, score: item.score, chat_history: item.chat_history, chat_analysis: item.chat_analysis, temp: item.temp, show: 'analysis', from: 'simulations-list', storyline_key: chatbotName } });
                      }}
                      disabled={!item.chat_history}
                    >
                      {/* Icona occhio */}
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                  </div>
                </td>
                <td>
                  <div className="card-buttons">
                    <button
                      className={`btn-small btn-download ${!item.chat_analysis ? 'btn-disabled' : ''}`}
                      title="Télécharger"
                      onClick={() => downloadPDF('Rapport', item.chat_analysis, `rapport_${item.name}.pdf`)}
                      disabled={!item.chat_analysis}
                    >
                      {/* Icona download */}
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </button>
                    <button
                      className={`btn-small btn-view ${!item.chat_analysis ? 'btn-disabled' : ''}`}
                      title="Visualiser"
                      onClick={() => {
                        addBreadcrumb({ label: 'Analyse de Performance', path: '/analysis' });
                        navigate('/analysis', { state: { name: item.name, date: item.created_at, score: item.score, chat_analysis: item.chat_analysis, chat_history: item.chat_history, from: 'simulations-list', storyline_key: chatbotName } });
                      }}
                      disabled={!item.chat_analysis}
                    >
                      {/* Icona occhio */}
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="simulations-cards">
        {paginatedCards.map(item => (
          <div className="simulation-card" key={item.id}>
            <div>
              <strong>Nom:</strong> 
              <span 
                className="clickable-name"
                onClick={() => {
                  addBreadcrumb({ label: item.name, path: `/chatbot/${encodeURIComponent(chatbotName || '')}/learners/${encodeURIComponent(item.user_email)}` });
                  navigate(`/chatbot/${encodeURIComponent(chatbotName || '')}/learners/${encodeURIComponent(item.user_email)}`, { 
                    state: { 
                      from: 'simulations-list',
                      tenant_name: tenant_name,
                      storyline_key: storyline_key_from_state
                    } 
                  });
                }}
                title="Voir le profil"
              >
                {item.name}
              </span>
            </div>
            <div><strong>Date simulation:</strong> {formatDate(item.created_at)}</div>
            <div><strong>Group:</strong> {item.usergroup || 'Groupe par défaut'}</div>
            <div>
              <strong>Score:</strong>
              {item.score === -1 ? (
                <span>N/A</span>
              ) : (
                <span className={`score-badge ${item.score >= 90 ? 'score-high' : item.score >= 80 ? 'score-medium' : 'score-low'}`}>{item.score}</span>
              )}
            </div>
            <div><strong>Temp:</strong> {item.temp || '-'}</div>
            <div>
              <strong>Historique chat:</strong>
              <div className="card-buttons">
                <button className="btn-small btn-download" title="Télécharger"
                  onClick={() => downloadPDF('Historique chat', item.chat_history, `historique_${item.name}.pdf`)}
                  disabled={!item.chat_history}>
                  {/* Icona download */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </button>
                <button className="btn-small btn-view" title="Visualiser"
                  onClick={() => {
                    addBreadcrumb({ label: 'Historique', path: '/chat-history' });
                    navigate('/chat-history', { state: { name: item.name, date: item.created_at, score: item.score, chat_history: item.chat_history, chat_analysis: item.chat_analysis, temp: item.temp, show: 'analysis', from: 'simulations-list', storyline_key: chatbotName } });
                  }}
                  disabled={!item.chat_history}>
                  {/* Icona occhio */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
              </div>
            </div>
                          <div>
                <strong>Analyse chat:</strong>
                <div className="card-buttons">
                  <button className={`btn-small btn-download ${!item.chat_analysis ? 'btn-disabled' : ''}`} title="Télécharger"
                    onClick={() => downloadPDF('Rapport', item.chat_analysis, `rapport_${item.name}.pdf`)}
                    disabled={!item.chat_analysis}>
                    {/* Icona download */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  </button>
                  <button
                        className={`btn-small btn-view ${!item.chat_analysis ? 'btn-disabled' : ''}`}
                        title="Visualiser"
                        onClick={() => {
                          addBreadcrumb({ label: 'Analyse de Performance', path: '/analysis' });
                          navigate('/analysis', { state: { name: item.name, date: item.created_at, score: item.score, chat_analysis: item.chat_analysis, chat_history: item.chat_history, from: 'simulations-list', storyline_key: chatbotName } });
                        }}
                        disabled={!item.chat_analysis}
                      >
                        {/* Icona occhio */}
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                </div>
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
      {modalContent !== null && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>
              &times;
            </button>
            <h2>{modalTitle}</h2>
            {renderModalContent()}
          </div>
        </div>
      )}
    </div>
  );
}

export default List; 