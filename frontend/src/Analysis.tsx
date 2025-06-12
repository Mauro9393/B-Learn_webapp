import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './assets/css/analysis.css';

const Analysis: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as any;
  if (!state) return <div>Contenuto non trovato.</div>;

  const { name, date, score, chat_analysis } = state;
  const handleFullscreen = () => {
    const elem = document.getElementById('analysis-pdf-viewer');
    if (elem) {
      if (elem.requestFullscreen) elem.requestFullscreen();
      else if ((elem as any).webkitRequestFullscreen) (elem as any).webkitRequestFullscreen();
      else if ((elem as any).msRequestFullscreen) (elem as any).msRequestFullscreen();
    }
  };
  const handleDownloadPDF = () => {
    alert('Download PDF in sviluppo!');
  };
  return (
    <main className="student-detail-main">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <span className="breadcrumb-link" onClick={() => navigate(-3)}>Dashboard</span> &gt; 
        <span className="breadcrumb-link" onClick={() => navigate(-2)}>Chatbots</span> &gt; 
        <span className="breadcrumb-link" onClick={() => navigate(-1)}>Simulations</span> &gt; 
        <span className="current">Analyse</span>
      </div>
      {/* Header info */}
      <div className="analysis-header">
        <div className="analysis-info">
          <h1>Analyse de Performance</h1>
          <div className="simulation-meta">
            <div className="student-info">
              <div className="student-avatar">
                <div className="avatar-circle">
                  <span>👤</span>
                </div>
              </div>
              <div className="student-details">
                <h2 className="student-name">{name}</h2>
                <div className="simulation-date">Date : {date ? new Date(date).toLocaleDateString('fr-FR') : ''}</div>
                <div className="simulation-score">
                  <span className="score-badge score-high">Score Final : {score}/100</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Visualiseur PDF */}
      <div className="pdf-container">
        <div className="pdf-viewer" id="analysis-pdf-viewer">
          <div className="pdf-header">
            <h3>📊 Rapport d'Analyse</h3>
            <div className="pdf-controls">
              <button className="btn-small btn-secondary" onClick={handleFullscreen}>Plein écran</button>
              <button className="btn-small btn-primary" onClick={handleDownloadPDF}>Télécharger PDF</button>
            </div>
          </div>
          <div className="pdf-content">
            <div className="pdf-page">
              <div className="pdf-document">
                <div className="pdf-title">RAPPORT D'ANALYSE DE PERFORMANCE</div>
                <div className="pdf-subtitle">{name}</div>
                <div className="pdf-date">Date : {date ? new Date(date).toLocaleDateString('fr-FR') : ''}</div>
                <div className="pdf-section">
                  <div className="pdf-section-title">💬 Analyse</div>
                  <div className="pdf-list" style={{whiteSpace: 'pre-wrap'}}>{chat_analysis}</div>
                </div>
                <div className="pdf-footer">
                  <div className="pdf-footer-text">
                    Généré par B-Learn - Plateforme de formation IA
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Analysis; 