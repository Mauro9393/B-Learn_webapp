import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './assets/css/studentList.css';
import { useBreadcrumbContext } from './BreadcrumbContext';

interface StudentRow {
  id: number;
  name: string;
  email: string;
  group?: string;
  simulations: number;
  score: number;
  last_date: string;
  chatbot_name: string;
  chat_analysis?: string;
}

const AllStudentList: React.FC = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [minScore, setMinScore] = useState('');
  const [minSimulations, setMinSimulations] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const { addBreadcrumb } = useBreadcrumbContext();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const res = await fetch(`${apiUrl}/api/all-users`);
        const data = await res.json();
        setStudents(data);
      } catch (e) {
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Ottieni lista clienti unici
  const clientList = Array.from(new Set(students.map(stu => stu.chatbot_name))).filter(Boolean);

  const filteredStudents = students.filter(stu => {
    // Filtre pour la recherche de texte (nom ou email)
    const matchesSearch =
      (stu.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (stu.email?.toLowerCase() || '').includes(search.toLowerCase());
    // Filtro per range di punteggio
    const matchesScore = minScore ? (() => {
      const score = stu.score;
      switch(minScore) {
        case '0-20': return score >= 0 && score <= 20;
        case '20-40': return score >= 20 && score <= 40;
        case '40-60': return score >= 40 && score <= 60;
        case '60-80': return score >= 60 && score <= 80;
        case '80-100': return score >= 80 && score <= 100;
        default: return true;
      }
    })() : true;
    // Filtro per simulazioni minime
    const matchesSimulations = minSimulations ? stu.simulations >= parseInt(minSimulations) : true;
    // Filtro per cliente
    const matchesClient = clientFilter ? stu.chatbot_name === clientFilter : true;
    return matchesSearch && matchesScore && matchesSimulations && matchesClient;
  });

  // Funzione per parsing data formato giorno/mese/anno
  function parseDMY(dateStr: string) {
    if (!dateStr) return null;
    const [day, month, year] = dateStr.split(/[\/\-]/).map(Number);
    if (!day || !month || !year) return null;
    return new Date(year, month - 1, day);
  }

  // Funzione per ordinare gli studenti
  const sortedStudents = React.useMemo(() => {
    let sortable = [...filteredStudents];
    if (sortConfig !== null) {
      sortable.sort((a, b) => {
        let aValue = a[sortConfig.key as keyof StudentRow];
        let bValue = b[sortConfig.key as keyof StudentRow];
        // Gestione speciale per le colonne
        if (sortConfig.key === 'name' || sortConfig.key === 'chatbot_name' || sortConfig.key === 'group') {
          aValue = String(aValue || '').toLowerCase();
          bValue = String(bValue || '').toLowerCase();
          if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
          if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        }
        if (sortConfig.key === 'score' || sortConfig.key === 'simulations') {
          return sortConfig.direction === 'asc'
            ? Number(aValue) - Number(bValue)
            : Number(bValue) - Number(aValue);
        }
        if (sortConfig.key === 'last_date') {
          const aDate = parseDMY(String(aValue));
          const bDate = parseDMY(String(bValue));
          const aTime = aDate ? aDate.getTime() : (sortConfig.direction === 'asc' ? Infinity : -Infinity);
          const bTime = bDate ? bDate.getTime() : (sortConfig.direction === 'asc' ? Infinity : -Infinity);
          return sortConfig.direction === 'asc'
            ? aTime - bTime
            : bTime - aTime;
        }
        return 0;
      });
    }
    return sortable;
  }, [filteredStudents, sortConfig]);

  // Funzione per cambiare ordinamento
  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Stato per la paginazione mobile
  const [currentPage, setCurrentPage] = useState(1);
  const cardsPerPage = 5;
  const totalPages = Math.ceil(filteredStudents.length / cardsPerPage);
  const paginatedCards = filteredStudents.slice((currentPage - 1) * cardsPerPage, currentPage * cardsPerPage);
  const goToPrevPage = () => setCurrentPage(p => Math.max(1, p - 1));
  const goToNextPage = () => setCurrentPage(p => Math.min(totalPages, p + 1));
  useEffect(() => { setCurrentPage(1); }, [filteredStudents]);

  return (
    <div className="">
      <main className="student-list-main">
        {/* Card centrale titolo */}
        <div className="student-list-title-card">
          <h1>Liste de tous les learners</h1>
        </div>
        {/* Breadcrumb 
        <div className="breadcrumb">
          <span className="breadcrumb-link" onClick={() => navigate('/dashboard')}>Dashboard</span> &gt;
          <span className="current">Tous les utilisateurs</span>
        </div>*/}
        {/* Filtri */}
        <div className="filters">
          <input
            type="text"
            placeholder="Rechercher un learner..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select value={minScore} onChange={e => setMinScore(e.target.value)}>
            <option value="">Tous les scores</option>
            <option value="0-20">Score 0-20</option>
            <option value="20-40">Score 20-40</option>
            <option value="40-60">Score 40-60</option>
            <option value="60-80">Score 60-80</option>
            <option value="80-100">Score 80-100</option>
          </select>
          <select value={minSimulations} onChange={e => setMinSimulations(e.target.value)}>
            <option value="">Toutes les simulations</option>
            <option value="3">≥ 3 simulations</option>
            <option value="5">≥ 5 simulations</option>
            <option value="10">≥ 10 simulations</option>
          </select>
          <select value={clientFilter} onChange={e => setClientFilter(e.target.value)}>
            <option value="">Tous les clients</option>
            {clientList.map(client => (
              <option key={client} value={client}>{client}</option>
            ))}
          </select>
        </div>
        <div className="student-list-table-card">
          <table className="student-table styled-table no-vertical-lines">
            <thead>
              <tr>
                <th className="th-name" onClick={() => requestSort('name')} style={{ cursor: 'pointer' }}>
                  Nom <span className="sort-arrow">{sortConfig?.key === 'name' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                </th>
                <th className="th-client" onClick={() => requestSort('chatbot_name')} style={{ cursor: 'pointer' }}>
                  Client <span className="sort-arrow">{sortConfig?.key === 'chatbot_name' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                </th>
                <th className="th-group">
                  Groupe <span className="sort-arrow">⇅</span>
                </th>
                <th className="th-simulations">Simulations</th>
                <th className="th-score" onClick={() => requestSort('score')} style={{ cursor: 'pointer' }}>
                  Score max <span className="sort-arrow">{sortConfig?.key === 'score' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                </th>
                <th className="th-date" onClick={() => requestSort('last_date')} style={{ cursor: 'pointer' }}>
                  Dernière simulation <span className="sort-arrow">{sortConfig?.key === 'last_date' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                </th>
                <th className="th-details">Détails</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7}>Caricamento...</td></tr>
              ) : sortedStudents.length === 0 ? (
                <tr><td colSpan={7}>Vide.</td></tr>
              ) : (
                sortedStudents.map(stu => (
                  <tr key={stu.id}>
                    <td className="td-name">{stu.name || 'N/A'}</td>
                    <td className="td-client">{stu.chatbot_name || 'N/A'}</td>
                    <td className="td-group">{stu.group || '-'}</td>
                    <td className="td-simulations">{stu.simulations}</td>
                    <td className="td-score">
                      <span className={`score-badge score-badge-table ${stu.score >= 90 ? 'score-high' : stu.score >= 80 ? 'score-medium' : 'score-low'}`}>{stu.score}</span>
                    </td>
                    <td className="td-date">
                      <span className="date-badge">{stu.last_date}</span>
                    </td>
                    <td className="td-details">
                      <button 
                        className="btn btn-voir" 
                        onClick={() => {
                          const name = stu.name || 'N/A';
                          const chatbotName = stu.chatbot_name || '';
                          const email = stu.email || '';
                          addBreadcrumb({ label: name, path: `/chatbot/${chatbotName}/learners/${encodeURIComponent(email)}` });
                          navigate(`/chatbot/${chatbotName}/learners/${encodeURIComponent(email)}`, { 
                            state: { 
                              from: 'all-student-list',
                              tenant_name: stu.client_name || 'Client inconnu',
                              storyline_key: chatbotName
                            } 
                          });
                        }}
                        disabled={!stu.name || !stu.chatbot_name || !stu.email}
                      >
                        Voir
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {/* Card mobile */}
          <div className="student-cards">
            {paginatedCards.map(stu => (
              <div className="student-card" key={stu.id}>
                <div><strong>Nom:</strong> {stu.name || 'N/A'}</div>
                <div><strong>Client:</strong> {stu.chatbot_name || 'N/A'}</div>
                <div><strong>Groupe:</strong> {stu.group || '-'}</div>
                <div><strong>Simulations:</strong> {stu.simulations}</div>
                <div>
                  <strong>Score max:</strong>
                  <span className={`score-badge score-badge-table ${stu.score >= 90 ? 'score-high' : stu.score >= 80 ? 'score-medium' : 'score-low'}`}>{stu.score}</span>
                </div>
                <div><strong>Dernière simulation:</strong> <span className="date-badge">{stu.last_date}</span></div>
                <div className="card-buttons">
                  <button 
                    className="btn btn-voir" 
                    onClick={() => {
                      const name = stu.name || 'N/A';
                      const chatbotName = stu.chatbot_name || '';
                      const email = stu.email || '';
                      addBreadcrumb({ label: name, path: `/chatbot/${chatbotName}/learners/${encodeURIComponent(email)}` });
                      navigate(`/chatbot/${chatbotName}/learners/${encodeURIComponent(email)}`, { state: { from: 'all-student-list' } });
                    }}
                    disabled={!stu.name || !stu.chatbot_name || !stu.email}
                  >
                    Voir
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
    </div>
  );
};

export default AllStudentList; 