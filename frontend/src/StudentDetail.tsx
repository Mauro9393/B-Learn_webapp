import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './assets/css/studentDetail.css';

interface Simulation {
  id: number;
  simulation: string;
  date: string;
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
        console.log("Email param:", email);
        const url = `${import.meta.env.VITE_API_URL}/api/learner-detail?storyline_key=${storyline_key}&email=${email}`;
        console.log("Chiamata API:", url);
        const res = await fetch(url);
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

  if (loading) return <div className="student-detail-main">Caricamento...</div>;
  if (!stats) return <div className="student-detail-main">Learner non trovato.</div>;

  return (
    <main className="student-detail-main">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <span className="breadcrumb-link" onClick={() => navigate(-1)}>Liste des learners</span> &gt; 
        <span className="breadcrumb-link" onClick={() => navigate(-1)}>Learners</span> &gt; 
        <span className="current">{stats.name}</span>
      </div>
      {/* Profilo */}
      <div className="student-profile">
        <div className="profile-content">
          <div className="profile-avatar">
            <div className="avatar-circle">{stats.avatar}</div>
          </div>
          <h1 className="student-name">{stats.name}</h1>
        </div>
      </div>
      {/* Statistiche */}
      <div className="student-stats">
        <div className="stat-card">
          <span className="stat-icon">🎯</span>
          <span className="stat-label">Simulations :</span>
          <span className="stat-value">{stats.simulations}</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🏆</span>
          <span className="stat-label">Meilleur score :</span>
          <span className="stat-value best-score">{stats.best_score}</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">📊</span>
          <span className="stat-label">Score moyen :</span>
          <span className="stat-value average-score">{stats.avg_score}</span>
        </div>
      </div>
      {/* Storico simulazioni */}
      <div className="simulations-history">
        <table className="simulations-table">
          <thead>
            <tr>
              <th>Simulation</th>
              <th>Date simulation</th>
              <th>Score</th>
              <th>Historique conversation</th>
              <th>Analyse conversation</th>
            </tr>
          </thead>
          <tbody>
            {stats.simulationHistory.map(sim => (
              <tr key={sim.id}>
                <td>{sim.simulation}</td>
                <td>{sim.date}</td>
                <td><span className={`score-badge ${sim.score >= 90 ? 'score-high' : sim.score >= 75 ? 'score-medium' : 'score-low'}`}>Score : {sim.score}</span></td>
                <td>
                  <button className="btn-small btn-view" title="Visualiser" onClick={() => alert(sim.chat_history)}>
                    Visualiser
                  </button>
                </td>
                <td>
                  <button className="btn-small btn-view" title="Visualiser" onClick={() => alert(sim.chat_analysis)}>
                    Visualiser
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
};

export default StudentDetail; 