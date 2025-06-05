import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './assets/css/studentDetail.css';

interface Simulation {
  id: number;
  simulation: string;
  date: string;
  simulations: number;
  score: number;
  chat_history: string;
  chat_analysis: string;
}

interface StudentStats {
  name: string;
  email: string;
  avatar: string;
  simulations: number;
  best_score: number;
  avg_score: number;
  simulationHistory: Simulation[];
}

const StudentDetail: React.FC = () => {
  const { storyline_key, email } = useParams<{ storyline_key: string; email: string }>();
  const navigate = useNavigate();
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/learner-detail?storyline_key=${storyline_key}&email=${email}`);
        const data = await res.json();
        setStats(data);
      } catch (e) {
        setStats(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [storyline_key, email]);

  if (loading) return <div className="student-detail-bg"><div className="student-detail-main">Caricamento...</div></div>;
  if (!stats) return <div className="student-detail-bg"><div className="student-detail-main">Learner non trovato.</div></div>;

  return (
    <div className="student-detail-bg">
      <main className="student-detail-main">
        {/* Breadcrumb */}
        <div className="breadcrumb">
          <span className="breadcrumb-link" onClick={() => navigate(-1)}>Liste des learners</span> &gt; 
          <span className="breadcrumb-link" onClick={() => navigate(-1)}>Learners</span> &gt; 
          <span className="current">{stats.name}</span>
        </div>
        {/* Card profilo */}
        <div className="student-profile-card">
          <div className="student-avatar-box">
            <div className="avatar-circle-lg">{stats.avatar}</div>
          </div>
          <div className="student-name-lg">{stats.name}</div>
        </div>
        {/* Card statistiche */}
        <div className="student-stats-cards">
          <div className="stat-card-lg">
            <span className="stat-icon-lg">🎯</span>
            <span className="stat-label-lg">Simulations :</span>
            <span className="stat-value-lg">{stats.simulations}</span>
          </div>
          <div className="stat-card-lg">
            <span className="stat-icon-lg">🏆</span>
            <span className="stat-label-lg">Meilleur score :</span>
            <span className="stat-value-lg best-score-lg">{stats.best_score}</span>
          </div>
          <div className="stat-card-lg">
            <span className="stat-icon-lg">📊</span>
            <span className="stat-label-lg">Score moyen :</span>
            <span className="stat-value-lg average-score-lg">{stats.avg_score}</span>
          </div>
        </div>
        {/* Tabella simulazioni */}
        <div className="simulations-table-box">
          <table className="simulations-table-lg">
            <thead>
              <tr>
                <th>Simulation</th>
                <th>Date simulation</th>
                <th>Simulations</th>
                <th>Historique conversation</th>
                <th>Analyse conversation</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {stats.simulationHistory.map(sim => (
                <tr key={sim.id}>
                  <td>{sim.simulation}</td>
                  <td className="date-cell">{sim.date}</td>
                  <td>{sim.simulations}</td>
                  <td>
                    <button className="btn-small btn-download" title="Télécharger" onClick={() => alert(sim.chat_history)}>
                      <span role="img" aria-label="download">⬇️</span>
                    </button>
                    <button className="btn-small btn-view" title="Visualiser" onClick={() => alert(sim.chat_history)}>
                      <span role="img" aria-label="view">👁️</span>
                    </button>
                  </td>
                  <td>
                    <button className="btn-small btn-download" title="Télécharger" onClick={() => alert(sim.chat_analysis)}>
                      <span role="img" aria-label="download">⬇️</span>
                    </button>
                    <button className="btn-small btn-view" title="Visualiser" onClick={() => alert(sim.chat_analysis)}>
                      <span role="img" aria-label="view">👁️</span>
                    </button>
                  </td>
                  <td>
                    <span className={`score-badge-lg ${sim.score >= 90 ? 'score-high-lg' : sim.score >= 75 ? 'score-medium-lg' : 'score-low-lg'}`}>Score : {sim.score}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

export default StudentDetail; 