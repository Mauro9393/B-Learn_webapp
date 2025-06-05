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
          <h1 className="student-name">{learner.name}</h1>
          <p>Email: {learner.user_email}</p>
          <p>Numero simulazioni: {simulations.length}</p>
        </div>
      </div>
      {/* Storico simulazioni */}
      <div className="simulations-history">
        <table className="simulations-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nome</th>
              <th>Email</th>
              <th>Chatbot</th>
              <th>Score</th>
              <th>Chat history</th>
              <th>Chat analysis</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            {simulations.map(sim => (
              <tr key={sim.id}>
                <td>{sim.id}</td>
                <td>{sim.name}</td>
                <td>{sim.user_email}</td>
                <td>{sim.chatbot_name}</td>
                <td>
                  <span className={`score-badge ${sim.score >= 90 ? 'score-high' : sim.score >= 75 ? 'score-medium' : 'score-low'}`}>
                    {sim.score}
                  </span>
                </td>
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
                <td>{sim.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
};

export default StudentDetail; 