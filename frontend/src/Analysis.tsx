import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './assets/css/analysis.css';
// @ts-ignore
import jsPDF from 'jspdf';

const Analysis: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const pdfContentRef = React.useRef<HTMLDivElement>(null);
  const state = location.state as any;
  if (!state) return <div>Contenuto non trovato.</div>;

  const { name, date, score, chat_analysis } = state;
  const from = state?.from;

  // Funzione per schermo intero (identica a ChatHistory, ref su pdf-content)
  const handleFullscreen = () => {
    if (pdfContentRef.current) {
      if (pdfContentRef.current.requestFullscreen) {
        pdfContentRef.current.requestFullscreen();
      } else if ((pdfContentRef.current as any).webkitRequestFullscreen) {
        (pdfContentRef.current as any).webkitRequestFullscreen();
      } else if ((pdfContentRef.current as any).msRequestFullscreen) {
        (pdfContentRef.current as any).msRequestFullscreen();
      }
    }
  };

  // Funzione per scaricare PDF
  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Rapport d\'Analyse', 10, 18);
    doc.setFontSize(12);
    doc.text(`Nom: ${name}`, 10, 28);
    doc.text(`Date: ${date ? new Date(date).toLocaleDateString('fr-FR') : ''}`, 10, 36);
    doc.text(`Score: ${score ? `${score}/100` : '-'}`, 10, 44);
    let y = 54;
    const lines = doc.splitTextToSize(chat_analysis || '', 180);
    doc.text(lines, 10, y);
    doc.save(`rapport_${name}.pdf`);
  };

  return (
    <main className="student-detail-main">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <span className="breadcrumb-link" onClick={() => navigate('/dashboard')}>Dashboard</span> &gt;
        {from === 'all-student-list' ? (
          <>
            <span className="breadcrumb-link" onClick={() => navigate('/all-student-list')}>Tous les utilisateurs</span> &gt;
            <span className="breadcrumb-link" onClick={() => navigate(-1)}>{name}</span> &gt;
            <span className="current">Analyse</span>
          </>
        ) : from === 'student-list' ? (
          <>
            <span className="breadcrumb-link" onClick={() => navigate(-3)}>Chatbot</span> &gt;
            <span className="breadcrumb-link" onClick={() => navigate(-2)}>Learners</span> &gt;
            <span className="breadcrumb-link" onClick={() => navigate(-1)}>{name}</span> &gt;
            <span className="current">Analyse</span>
          </>
        ) : (
          <>
            <span className="breadcrumb-link" onClick={() => navigate(-3)}>Chatbot</span> &gt;
            <span className="breadcrumb-link" onClick={() => navigate(-2)}>Simulations</span> &gt;
            <span className="breadcrumb-link" onClick={() => navigate(-1)}>{name}</span> &gt;
            <span className="current">Analyse</span>
          </>
        )}
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
        <div className="pdf-viewer">
          <div className="pdf-header">
            <h3>Rapport d'Analyse</h3>
            <div className="pdf-controls">
              <button className="btn-small btn-secondary" title="Plein écran" onClick={handleFullscreen}>
                {/* Icona fullscreen */}
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                </svg>
                <span className='btn-text'>Plein écran</span>
              </button>
              <button className="btn-small btn-primary" title="Télécharger PDF" onClick={handleDownloadPDF}>
                {/* Icona download */}
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span className='btn-text'>Télécharger PDF</span>
              </button>
            </div>
          </div>
          <div className="pdf-content" ref={pdfContentRef}>
            <div className="pdf-page">
              <div className="pdf-document">
                <div className="pdf-title">RAPPORT D'ANALYSE DE PERFORMANCE</div>
                <div className="pdf-subtitle">{name}</div>
                <div className="pdf-date">Date : {date ? new Date(date).toLocaleDateString('fr-FR') : ''}</div>
                <div className="pdf-section">
                  <div className="pdf-section-title">💬 Analyse</div>
                  <div className="pdf-list" style={{whiteSpace: 'pre-wrap', textAlign: 'left'}}>{chat_analysis}</div>
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
      {/* Résumé de la conversation */}
      <div className="progress-comparison">
        <h3>📊 Résumé de la Simulation</h3>
        <div className="progress-chart">
          <div className="chart-info">
            <div className="current-score">
              <span className="score-label">Score Final</span>
              <span className="score-value">{score ? `${score}/100` : '-'}</span>
            </div>
            <div className="progress-indicator">
              <span className="progress-label">Durée</span>
              <span className="progress-value score-style">-</span>
            </div>
            <div className="progress-indicator">
              <span className="progress-label">Messages</span>
              <span className="progress-value score-style">{(chat_analysis && chat_analysis.match(/Question/g)?.length) || 1} échanges</span>
            </div>
          </div>
          <div className="comparison-text">
            Simulation complète avec un score de {score ? `${score}/100` : '-'} et {(chat_analysis && chat_analysis.match(/Question/g)?.length) || 1} échanges.
          </div>
        </div>
      </div>
    </main>
  );
};

export default Analysis; 