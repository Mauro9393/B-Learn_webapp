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
}

const StudentList: React.FC = () => {
  const { storyline_key } = useParams<{ storyline_key: string }>();
  const navigate = useNavigate();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/learners-list?storyline_key=${storyline_key}`);
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

  return (
    <div className="student-list-bg">
      <main className="student-list-main">
        {/* Breadcrumb */}
        <div className="breadcrumb">
          <span className="breadcrumb-link" onClick={() => navigate(-1)}>Dashboard</span> &gt; 
          <span className="breadcrumb-link" onClick={() => navigate(-1)}>Chatbots</span> &gt; 
          <span className="current">Liste des learners</span>
        </div>
        {/* Card centrale titolo */}
        <div className="student-list-title-card">
          <h1>Liste des learners</h1>
        </div>
        {/* Statistiche generali learners (placeholder, puoi aggiungere dati reali) */}
        {/* <div className="student-list-stats">
          <div className="stat-card"><span className="stat-icon">👥</span> <span className="stat-label">Total learners :</span> <span className="stat-value">{students.length}</span></div>
        </div> */}
        {/* Tabella learners */}
        <div className="student-list-table-card">
          <div className="filters">
            <input type="text" placeholder="Rechercher un learner..." disabled />
            <select disabled>
              <option value="">Tous les scores</option>
              <option value="90">Score ≥ 90</option>
              <option value="80">Score ≥ 80</option>
              <option value="70">Score ≥ 70</option>
            </select>
            <select disabled>
              <option value="">Toutes les simulations</option>
              <option value="10">≥ 10 simulations</option>
              <option value="5">≥ 5 simulations</option>
            </select>
          </div>
          <table className="student-table styled-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Groupe</th>
                <th>Simulations</th>
                <th>Score</th>
                <th>Dernière simulation</th>
                <th>Détails</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6}>Caricamento...</td></tr>
              ) : students.length === 0 ? (
                <tr><td colSpan={6}>Nessun learner trovato.</td></tr>
              ) : (
                students.map(stu => (
                  <tr key={stu.email}>
                    <td>{stu.name}</td>
                    <td>{stu.group}</td>
                    <td>{stu.simulations}</td>
                    <td><span className={`score-badge ${stu.score >= 90 ? 'score-high' : stu.score >= 80 ? 'score-medium' : 'score-low'}`}>{stu.score}</span></td>
                    <td className="date-cell">{stu.last_date}</td>
                    <td>
                      <button className="btn" onClick={() => navigate(`/chatbot/${storyline_key}/learners/${encodeURIComponent(stu.email)}`)}>Voir</button>
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

export default StudentList; 