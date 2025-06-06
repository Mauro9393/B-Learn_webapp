import './assets/css/list.css';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

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
        // Filtro per nome
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

  const openModal = (title: string, content: string) => {
    setModalTitle(title);
    setModalContent(content);
  };

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

  return (
    <div className="list-container">
      <h1>Liste des Simulations</h1>
      {/* Filtri come in simulations-list.html */}
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
          {/* Opzioni dinamiche per gli anni trovati nei dati */}
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
              <th>Nom</th>
              <th>Date simulation</th>
              <th>Score</th>
              <th>Historique chat</th>
              <th>Analyse chat</th>
            </tr>
          </thead>
          <tbody id="simulationTableBody">
            {filteredData.map(item => (
              <tr key={item.id} data-student={item.name} data-date={item.created_at || ''} data-score={item.score}>
                <td>{item.name}</td>
                <td className="date-cell">{formatDate(item.created_at)}</td>
                <td><span className={`score-badge ${item.score >= 90 ? 'score-high' : item.score >= 80 ? 'score-medium' : 'score-low'}`}>{item.score}</span></td>
                <td>
                  <button
                    className="btn-small btn-view"
                    title="Visualiser"
                    onClick={() => openModal('Historique', item.chat_history)}
                    disabled={!item.chat_history}
                  >
                    Visualiser
                  </button>
                </td>
                <td>
                  <button
                    className="btn-small btn-view"
                    title="Visualiser"
                    onClick={() => openModal('Rapport', item.chat_analysis)}
                    disabled={!item.chat_analysis}
                  >
                    Visualiser
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