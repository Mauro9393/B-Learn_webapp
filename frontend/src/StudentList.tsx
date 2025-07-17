import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import './assets/css/studentList.css';
import { useBreadcrumbContext } from './BreadcrumbContext';

interface StudentRow {
  name: string;
  email: string;
  usergroup: string;
  simulations: number;
  score: number;
  last_date: string;
  chat_analysis: boolean;
}

const StudentList: React.FC = () => {
  const { storyline_key } = useParams<{ storyline_key: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Salva le informazioni del tenant nel localStorage quando arrivano dallo stato
  if (location.state?.tenant_name) {
    localStorage.setItem(`tenant_${storyline_key}`, location.state.tenant_name);
    localStorage.setItem(`storyline_${storyline_key}`, location.state.storyline_key);
  }
  
  // Recupera le informazioni dal localStorage o dallo stato
  const tenant_name = location.state?.tenant_name || 
                     localStorage.getItem(`tenant_${storyline_key}`) || 
                     'Client inconnu';
  const storyline_key_from_state = location.state?.storyline_key || 
                                  localStorage.getItem(`storyline_${storyline_key}`) || 
                                  storyline_key;
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [minScore, setMinScore] = useState('');
  const [minSimulations, setMinSimulations] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  // Stato per la paginazione mobile
  const [currentPage, setCurrentPage] = useState(1);
  const cardsPerPage = 5;
  const totalPages = Math.ceil((Array.isArray(students) ? students.length : 0) / cardsPerPage);
  const paginatedCards = Array.isArray(students) ? students.slice((currentPage - 1) * cardsPerPage, currentPage * cardsPerPage) : [];
  const goToPrevPage = () => setCurrentPage(p => Math.max(1, p - 1));
  const goToNextPage = () => setCurrentPage(p => Math.min(totalPages, p + 1));
  useEffect(() => { setCurrentPage(1); }, [students]);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const { addBreadcrumb } = useBreadcrumbContext();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/learners-list-maxscore?storyline_key=${storyline_key}`);
        const data = await res.json();
        setStudents(data);
      } catch (e) {
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [storyline_key]);

  const filteredStudents = (Array.isArray(students) ? students : []).filter(stu => {
    // Filtre pour la recherche de texte (nom ou email)
    const matchesSearch =
      stu.name.toLowerCase().includes(search.toLowerCase()) ||
      stu.email.toLowerCase().includes(search.toLowerCase());

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

    // Filtro per anno (se last_date è nel formato YYYY-MM-DD)
    let matchesYear = true;
    if (yearFilter && stu.last_date) {
      const dateParts = stu.last_date.split(/[\/\-]/);
      if (dateParts.length >= 3) {
        const year = dateParts[2] || dateParts[0]; // Supporta sia DD/MM/YYYY che YYYY-MM-DD
        matchesYear = year === yearFilter;
      }
    }

    // Filtro per mese (se last_date è nel formato YYYY-MM-DD)
    let matchesMonth = true;
    if (monthFilter && stu.last_date) {
      const dateParts = stu.last_date.split(/[\/\-]/);
      if (dateParts.length >= 3) {
        const month = dateParts[1]; // Il mese è sempre nella posizione 1
        matchesMonth = month === monthFilter;
      }
    }

    // Filtro per gruppo
    const matchesGroup = groupFilter ? stu.usergroup.toLowerCase().includes(groupFilter.toLowerCase()) : true;

    return matchesSearch && matchesScore && matchesSimulations && matchesYear && matchesMonth && matchesGroup;
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
        if (sortConfig.key === 'name' || sortConfig.key === 'usergroup') {
          aValue = String(aValue).toLowerCase();
          bValue = String(bValue).toLowerCase();
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

  return (
    <div className="">
      <main className="student-list-main">
        {/* Card centrale titolo */}
        <div className="student-list-title-card">
          <h1>Liste des learners</h1>
          <div className="client-info">
            <span className="client-name">{tenant_name}</span>
            <span className="storyline-key">ID: {storyline_key_from_state}</span>
          </div>
        </div>
        {/* Breadcrumb 
        <div className="breadcrumb">
          <span className="breadcrumb-link" onClick={() => navigate('/dashboard')}>Dashboard</span> &gt;
          <span className="breadcrumb-link" onClick={() => navigate(`/chatbot/${storyline_key}`)}>Chatbot</span> &gt;
          <span className="current">Liste des learners</span>
        </div>*/}
        {/* Statistiche generali learners (placeholder, puoi aggiungere dati reali) */}
        {/* <div className="student-list-stats">
          <div className="stat-card"><span className="stat-icon">👥</span> <span className="stat-label">Total learners :</span> <span className="stat-value">{students.length}</span></div>
        </div> */}
        {/* Tabella learners */}
        <div className="student-list-table-card">
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
            <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)}>
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
            <select value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
              <option value="">Toutes les années</option>
              {/* Opzioni dinamiche pour les années trouvées dans les données */}
              {[...new Set(students.map(stu => {
                if (stu.last_date) {
                  const dateParts = stu.last_date.split(/[\/\-]/);
                  if (dateParts.length >= 3) {
                    return dateParts[2] || dateParts[0]; // Supporta sia DD/MM/YYYY che YYYY-MM-DD
                  }
                }
                return '';
              }))]
                .filter(y => y)
                .sort((a, b) => b.localeCompare(a))
                .map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
            </select>
            <input
              type="text"
              placeholder="Filtrer par groupe..."
              value={groupFilter}
              onChange={e => setGroupFilter(e.target.value)}
            />
          </div>
          {/* Tabella desktop/tablet */}
          <table className="student-table styled-table no-vertical-lines">
            <thead>
              <tr>
                <th className="th-name" onClick={() => requestSort('name')} style={{ cursor: 'pointer' }}>
                  Nom <span className="sort-arrow">{sortConfig?.key === 'name' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                </th>
                <th className="th-group" onClick={() => requestSort('usergroup')} style={{ cursor: 'pointer' }}>
                  Groupe <span className="sort-arrow">{sortConfig?.key === 'usergroup' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
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
                <tr><td colSpan={7}>Chargement...</td></tr>
              ) : sortedStudents.length === 0 ? (
                <tr><td colSpan={7}>Nothing found.</td></tr>
              ) : (
                sortedStudents.map(stu => (
                  <tr key={stu.email}>
                    <td className="td-name" title={stu.name}>{stu.name}</td>
                    <td className="td-group">{stu.usergroup}</td>
                    <td className="td-simulations">{stu.simulations}</td>
                    <td className="td-score">
                      <span className={`score-badge score-badge-table ${stu.score >= 90 ? 'score-high' : stu.score >= 80 ? 'score-medium' : 'score-low'}`}>{stu.score}</span>
                    </td>
                    <td className="td-date">
                      <span className="date-badge">{stu.last_date}</span>
                    </td>
                    <td className="td-details">
                      <button className="btn btn-voir" onClick={() => {
                        addBreadcrumb({ label: stu.name, path: `/chatbot/${storyline_key}/learners/${encodeURIComponent(stu.email)}` });
                        navigate(`/chatbot/${storyline_key}/learners/${encodeURIComponent(stu.email)}`, { 
                          state: { 
                            from: 'student-list',
                            tenant_name: tenant_name,
                            storyline_key: storyline_key_from_state
                          } 
                        });
                      }}>Voir</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {/* Card mobile */}
          <div className="student-cards">
            {paginatedCards.map(stu => (
              <div className="student-card" key={stu.email}>
                <div><strong>Nom:</strong> {stu.name}</div>
                <div><strong>Groupe:</strong> {stu.usergroup}</div>
                <div><strong>Simulations:</strong> {stu.simulations}</div>
                <div>
                  <strong>Score max:</strong>
                  <span className={`score-badge score-badge-table ${stu.score >= 90 ? 'score-high' : stu.score >= 80 ? 'score-medium' : 'score-low'}`}>{stu.score}</span>
                </div>
                <div><strong>Dernière simulation:</strong> <span className="date-badge">{stu.last_date}</span></div>
                <div className="card-buttons">
                  <button className="btn btn-voir" onClick={() => {
                    addBreadcrumb({ label: stu.name, path: `/chatbot/${storyline_key}/learners/${encodeURIComponent(stu.email)}` });
                    navigate(`/chatbot/${storyline_key}/learners/${encodeURIComponent(stu.email)}`, { 
                      state: { 
                        from: 'student-list',
                        tenant_name: tenant_name,
                        storyline_key: storyline_key_from_state
                      } 
                    });
                  }}>Voir</button>
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

export default StudentList; 