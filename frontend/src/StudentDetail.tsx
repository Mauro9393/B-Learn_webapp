import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './assets/css/studentDetail.css';

interface Simulation {
  id: number;
  user_email: string;
  chatbot_name: string;
  score: number;
  chat_history: string;
  chat_analysis: string;
  created_at: string;
  name: string;
}

//interface StudentStats {
//  name: string;
//  email: string;
//  avatar: string;
//  simulations: number;
//  best_score: number;
//  avg_score: number;
//  simulationHistory: Simulation[];
//}

const getInitials = (name: string) => {
  if (!name) return '';
  const parts = name.split(/\s|,|-/).filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('fr-FR');
};

const StudentDetail: React.FC = () => {
  const { storyline_key, email } = useParams<{ storyline_key: string; email: string }>();
  const navigate = useNavigate();
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/learner-detail?storyline_key=${storyline_key}&email=${email}`);
        const data = await res.json();
        setSimulations(data);
      } catch (e) {
        setSimulations([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [storyline_key, email]);

  if (loading) return <div className="student-detail-main">Caricamento...</div>;
  if (!simulations.length) return <div className="student-detail-main">Learner non trovato.</div>;

  const learner = simulations[0];
  const initials = getInitials(learner.name);
  const numSimulations = simulations.length;
  const bestScore = Math.max(...simulations.map(s => s.score));
  const avgScore = Math.round(simulations.reduce((acc, s) => acc + s.score, 0) / numSimulations);

  return (
    <main className="student-detail-main">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <span className="breadcrumb-link" onClick={() => navigate(-1)}>Liste des learners</span> &gt; 
        <span className="breadcrumb-link" onClick={() => navigate(-1)}>Learners</span> &gt; 
        <span className="current">{learner.name}</span>
      </div>
      {/* Profilo */}
      <div className="student-profile">
        <div className="profile-content">
          <div className="profile-avatar">
            <div className="avatar-circle">{initials}</div>
          </div>
          <h1 className="student-name">{learner.name}</h1>
        </div>
      </div>
      {/* Statistiche */}
      <div className="student-stats">
        <div className="stat-card">
          <span className="stat-icon">🎯</span>
          <span className="stat-label">Simulations :</span>
          <span className="stat-value">{numSimulations}</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🏆</span>
          <span className="stat-label">Meilleur score :</span>
          <span className="stat-value best-score">{bestScore}</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">📊</span>
          <span className="stat-label">Score moyen :</span>
          <span className="stat-value average-score">{avgScore}</span>
        </div>
      </div>
      {/* Storico simulazioni */}
      <div className="simulations-history">
        <table className="simulations-table">
          <thead>
            <tr>
              <th>Date simulation</th>
              <th>Simulations</th>
              <th>Historique conversation</th>
              <th>Analyse conversation</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {simulations.map(sim => (
              <tr key={sim.id}>
                <td>{formatDate(sim.created_at)}</td>
                <td>{sim.id}</td>
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
                <td>
                  <span className={`score-badge ${sim.score >= 90 ? 'score-high' : sim.score >= 75 ? 'score-medium' : 'score-low'}`}>{sim.score}</span>
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