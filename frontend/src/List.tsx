import './assets/css/list.css';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
// @ts-ignore
import jsPDF from 'jspdf';

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
  const [filter, setFilter] = useState('');
  const [scoreFilter, setScoreFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [filteredData, setFilteredData] = useState<DataItem[]>([]);
  // Stato per ordinamento
  const [sortColumn, setSortColumn] = useState<'name' | 'created_at' | 'score'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchData = async () => {
      let url = `${import.meta.env.VITE_API_URL}/api/userlist`;
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
        // Filtro par nom
        const matchesName = item.name.toLowerCase().includes(filter.toLowerCase());
        // Filtro per score
        const matchesScore = scoreFilter ? item.score >= parseInt(scoreFilter) : true;
        // Filtro per data (YYYY-MM-DD)
        let matchesDate = true;
        if (dateFilter && item.created_at) {
          matchesDate = item.created_at.includes(dateFilter);
        }
        return matchesName && matchesScore && matchesDate;
      })
    );
  }, [filter, scoreFilter, dateFilter, data]);

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
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <span className="breadcrumb-link" onClick={() => navigate('/dashboard')}>Dashboard</span> &gt;
        <span
          className="breadcrumb-link"
          onClick={() => navigate(`/chatbot/${chatbotName || ''}`)}
        >
          Chatbot
        </span> &gt;
        <span className='current'>Liste des simulations</span>
      </div>
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
          <option value="90">Score ≥ 90</option>
          <option value="80">Score ≥ 80</option>
          <option value="70">Score ≥ 70</option>
        </select>
        <select id="date-filter" value={dateFilter} onChange={e => setDateFilter(e.target.value)}>
          <option value="">Toutes les dates</option>
          {/* Opzioni dinamiche pour les années trouvées dans les données */}
          {[...new Set(data.map(item => item.created_at ? item.created_at.substring(0,4) : ''))]
            .filter(y => y)
            .sort((a, b) => b.localeCompare(a))
            .map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
        </select>
      </div>
      <div className="simulations-container">
        <table className="simulations-table" id="simulations-table">
          <thead>
            <tr>
              <th className="sortable-header" onClick={() => handleSort('name')}>Nom {getArrow('name')}</th>
              <th className="sortable-header" onClick={() => handleSort('created_at')}>Date simulation {getArrow('created_at')}</th>
              <th className="sortable-header" onClick={() => handleSort('score')}>Score {getArrow('score')}</th>
              <th>Historique chat</th>
              <th>Analyse chat</th>
            </tr>
          </thead>
          <tbody id="simulationTableBody">
            {sortedData.map(item => (
              <tr key={item.id} data-student={item.name} data-date={item.created_at || ''} data-score={item.score}>
                <td>{item.name}</td>
                <td className="date-cell">{formatDate(item.created_at)}</td>
                <td><span className={`score-badge ${item.score >= 90 ? 'score-high' : item.score >= 80 ? 'score-medium' : 'score-low'}`}>{item.score}</span></td>
                <td>
                  <button
                    className="btn-small btn-download"
                    title="Télécharger"
                    onClick={() => downloadPDF('Historique chat', item.chat_history, `historique_${item.name}.pdf`)}
                    disabled={!item.chat_history}
                    style={{ marginRight: 4 }}
                  >
                    {/* Icona download */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  </button>
                  <button
                    className="btn-small btn-view"
                    title="Visualiser"
                    onClick={() => navigate('/chat-history', { state: { name: item.name, date: item.created_at, score: item.score, chat_history: item.chat_history, chat_analysis: item.chat_analysis, show: 'analysis', from: 'simulations-list', storyline_key: chatbotName } })}
                    disabled={!item.chat_analysis}
                  >
                    {/* Icona occhio */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                </td>
                <td>
                  <button
                    className="btn-small btn-download"
                    title="Télécharger"
                    onClick={() => downloadPDF('Rapport', item.chat_analysis, `rapport_${item.name}.pdf`)}
                    disabled={!item.chat_analysis}
                    style={{ marginRight: 4 }}
                  >
                    {/* Icona download */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  </button>
                  <button
                    className="btn-small btn-view"
                    title="Visualiser"
                    onClick={() => navigate('/analysis', { state: { name: item.name, date: item.created_at, score: item.score, chat_analysis: item.chat_analysis, from: 'simulations-list', storyline_key: chatbotName } })}
                    disabled={!item.chat_analysis}
                  >
                    {/* Icona occhio */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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