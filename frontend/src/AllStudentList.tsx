import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './assets/css/studentList.css';

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/all-users`); // endpoint da creare lato backend
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
    // Filtro per ricerca testo (nome o email)
    const matchesSearch =
      stu.name.toLowerCase().includes(search.toLowerCase()) ||
      stu.email.toLowerCase().includes(search.toLowerCase());
    // Filtro per punteggio minimo
    const matchesScore = minScore ? stu.score >= parseInt(minScore) : true;
    // Filtro per simulazioni minime
    const matchesSimulations = minSimulations ? stu.simulations >= parseInt(minSimulations) : true;
    // Filtro per cliente
    const matchesClient = clientFilter ? stu.chatbot_name === clientFilter : true;
    return matchesSearch && matchesScore && matchesSimulations && matchesClient;
  });

  return (
    <div className="">
      <main className="student-list-main">
        {/* Card centrale titolo */}
        <div className="student-list-title-card">
          <h1>Liste de tous les learners</h1>
        </div>
        {/* Breadcrumb */}
        <div className="breadcrumb">
          <span className="breadcrumb-link" onClick={() => navigate(-1)}>Dashboard</span> &gt; 
          <span className="current">Tous les utilisateurs</span>
        </div>
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
            <option value="90">Score ≥ 90</option>
            <option value="80">Score ≥ 80</option>
            <option value="70">Score ≥ 70</option>
          </select>
          <select value={minSimulations} onChange={e => setMinSimulations(e.target.value)}>
            <option value="">Toutes les simulations</option>
            <option value="10">≥ 10 simulations</option>
            <option value="5">≥ 5 simulations</option>
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
                <th className="th-name">Nom <span className="sort-arrow">⇅</span></th>
                <th className="th-client">Client <span className="sort-arrow">⇅</span></th>
                <th className="th-group">Groupe <span className="sort-arrow">⇅</span></th>
                <th className="th-simulations">Simulations</th>
                <th className="th-score">Score max<span className="sort-arrow">⇅</span></th>
                <th className="th-date">Dernière simulation <span className="sort-arrow">⇅</span></th>
                <th className="th-details">Détails</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7}>Caricamento...</td></tr>
              ) : filteredStudents.length === 0 ? (
                <tr><td colSpan={7}>Nessun learner trovato.</td></tr>
              ) : (
                filteredStudents.map(stu => (
                  <tr key={stu.id}>
                    <td className="td-name">{stu.name}</td>
                    <td className="td-client">{stu.chatbot_name}</td>
                    <td className="td-group">{stu.group || '-'}</td>
                    <td className="td-simulations">{stu.simulations}</td>
                    <td className="td-score">
                      <span className={`score-badge score-badge-table ${stu.score >= 90 ? 'score-high' : stu.score >= 80 ? 'score-medium' : 'score-low'}`}>{stu.score}</span>
                    </td>
                    <td className="td-date">
                      <span className="date-badge">{stu.last_date}</span>
                    </td>
                    <td className="td-details">
                      <button className="btn btn-voir" onClick={() => navigate(`/chatbot/${stu.chatbot_name}/learners/${encodeURIComponent(stu.email)}`)}>Voir</button>
                      <button
                        className="btn-small btn-view"
                        title="Visualiser"
                        onClick={() => navigate('/analysis', { state: { name: stu.name, date: stu.last_date, score: stu.score, chat_analysis: stu.chat_analysis } })}
                        disabled={!stu.chat_analysis}
                      >
                        {/* Icona occhio */}
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

export default AllStudentList; 