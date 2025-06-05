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

// Ordina le simulazioni in base a campo e direzione
const sortSimulations = (sims: Simulation[], field: 'created_at' | 'score', direction: 'asc' | 'desc') => {
  return [...sims].sort((a, b) => {
    if (field === 'created_at') {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return direction === 'asc' ? da - db : db - da;
    } else if (field === 'score') {
      return direction === 'asc' ? a.score - b.score : b.score - a.score;
    }
    return 0;
  });
};

const StudentDetail: React.FC = () => {
  const { storyline_key, email } = useParams<{ storyline_key: string; email: string }>();
  const navigate = useNavigate();
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<'created_at' | 'score'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

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

  // Ordina le simulazioni secondo lo stato
  const sortedSimulations = sortSimulations(simulations, sortField, sortDirection);

  // Gestione click sulle colonne
  const handleSort = (field: 'created_at' | 'score') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'created_at' ? 'desc' : 'asc'); // default: date desc, score asc
    }
  };

  // Freccia per l'ordinamento
  const getSortArrow = (field: 'created_at' | 'score') => {
    if (sortField !== field) return <span className="sort-arrow">⇅</span>;
    return <span className="sort-arrow">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <main className="student-detail-main">
      {/* Profilo */}
      <div className="student-profile">
        <div className="profile-content" style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
          <div className="profile-avatar" style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
            <div className="avatar-circle">{initials}</div>
          </div>
          <h1 className="student-name" style={{textAlign: 'center', marginTop: '12px'}}>{learner.name}</h1>
        </div>
      </div>
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <span className="breadcrumb-link" onClick={() => navigate(-3)}>Dashboard</span> &gt; 
        <span className="breadcrumb-link" onClick={() => navigate(-2)}>Chatbot</span> &gt; 
        <span className="breadcrumb-link" onClick={() => navigate(-1)}>Learners</span> &gt; 
        <span className="current">{learner.name}</span>
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
              <th style={{cursor: 'pointer'}} onClick={() => handleSort('created_at')}>
                Date simulation {getSortArrow('created_at')}
              </th>
              <th>Simulations</th>
              <th>Historique conversation</th>
              <th>Analyse conversation</th>
              <th style={{cursor: 'pointer'}} onClick={() => handleSort('score')}>
                Score {getSortArrow('score')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedSimulations.map(sim => (
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