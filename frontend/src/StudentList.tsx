import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './assets/css/studentList.css';

interface StudentRow {
  name: string;
  email: string;
  group: string;
  simulations: number;
  score: number;
  last_date: string;
  chat_analysis: boolean;
}

const StudentList: React.FC = () => {
  const { storyline_key } = useParams<{ storyline_key: string }>();
  const navigate = useNavigate();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [minScore, setMinScore] = useState('');
  const [minSimulations, setMinSimulations] = useState('');
  // Stato per la paginazione mobile
  const [currentPage, setCurrentPage] = useState(1);
  const cardsPerPage = 5;
  const totalPages = Math.ceil(students.length / cardsPerPage);
  const paginatedCards = students.slice((currentPage - 1) * cardsPerPage, currentPage * cardsPerPage);
  const goToPrevPage = () => setCurrentPage(p => Math.max(1, p - 1));
  const goToNextPage = () => setCurrentPage(p => Math.min(totalPages, p + 1));
  useEffect(() => { setCurrentPage(1); }, [students]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/learners-list-maxscore?storyline_key=${storyline_key}`);
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

  const filteredStudents = students.filter(stu => {
    // Filtre pour la recherche de texte (nom ou email)
    const matchesSearch =
      stu.name.toLowerCase().includes(search.toLowerCase()) ||
      stu.email.toLowerCase().includes(search.toLowerCase());

    // Filtro per punteggio minimo
    const matchesScore = minScore ? stu.score >= parseInt(minScore) : true;

    // Filtro per simulazioni minime
    const matchesSimulations = minSimulations ? stu.simulations >= parseInt(minSimulations) : true;

    return matchesSearch && matchesScore && matchesSimulations;
  });

  return (
    <div className="">
      <main className="student-list-main">
        {/* Card centrale titolo */}
        <div className="student-list-title-card">
          <h1>Liste des learners</h1>
        </div>
        {/* Breadcrumb */}
        <div className="breadcrumb">
          <span className="breadcrumb-link" onClick={() => navigate('/dashboard')}>Dashboard</span> &gt;
          <span className="breadcrumb-link" onClick={() => navigate(`/chatbot/${storyline_key}`)}>Chatbot</span> &gt;
          <span className="current">Liste des learners</span>
        </div>
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
              <option value="90">Score ≥ 90</option>
              <option value="80">Score ≥ 80</option>
              <option value="70">Score ≥ 70</option>
            </select>
            <select value={minSimulations} onChange={e => setMinSimulations(e.target.value)}>
              <option value="">Toutes les simulations</option>
              <option value="10">≥ 10 simulations</option>
              <option value="5">≥ 5 simulations</option>
            </select>
          </div>
          {/* Tabella desktop/tablet */}
          <table className="student-table styled-table no-vertical-lines">
            <thead>
              <tr>
                <th className="th-name">Nom <span className="sort-arrow">⇅</span></th>
                <th className="th-group">Groupe <span className="sort-arrow">⇅</span></th>
                <th className="th-simulations">Simulations</th>
                <th className="th-score">Score max<span className="sort-arrow">⇅</span></th>
                <th className="th-date">Dernière simulation <span className="sort-arrow">⇅</span></th>
                <th className="th-details">Détails</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6}>Caricamento...</td></tr>
              ) : filteredStudents.length === 0 ? (
                <tr><td colSpan={6}>Nessun learner trovato.</td></tr>
              ) : (
                filteredStudents.map(stu => (
                  <tr key={stu.email}>
                    <td className="td-name">{stu.name}</td>
                    <td className="td-group">{stu.group}</td>
                    <td className="td-simulations">{stu.simulations}</td>
                    <td className="td-score">
                      <span className={`score-badge score-badge-table ${stu.score >= 90 ? 'score-high' : stu.score >= 80 ? 'score-medium' : 'score-low'}`}>{stu.score}</span>
                    </td>
                    <td className="td-date">
                      <span className="date-badge">{stu.last_date}</span>
                    </td>
                    <td className="td-details">
                      <button className="btn btn-voir" onClick={() => navigate(`/chatbot/${storyline_key}/learners/${encodeURIComponent(stu.email)}`, { state: { from: 'student-list' } })}>Voir</button>
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
                <div><strong>Groupe:</strong> {stu.group}</div>
                <div><strong>Simulations:</strong> {stu.simulations}</div>
                <div>
                  <strong>Score max:</strong>
                  <span className={`score-badge score-badge-table ${stu.score >= 90 ? 'score-high' : stu.score >= 80 ? 'score-medium' : 'score-low'}`}>{stu.score}</span>
                </div>
                <div><strong>Dernière simulation:</strong> <span className="date-badge">{stu.last_date}</span></div>
                <div className="card-buttons">
                  <button className="btn btn-voir" onClick={() => navigate(`/chatbot/${storyline_key}/learners/${encodeURIComponent(stu.email)}`, { state: { from: 'student-list' } })}>Voir</button>
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