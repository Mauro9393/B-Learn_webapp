import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './assets/css/home.css';
import logoBlearn from './assets/logo-blearn.png';

function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    document.body.classList.add('home-page');
    return () => {
      document.body.classList.remove('home-page');
    };
  }, []);

  const handleConnection = () => {
    navigate('/login');
  };

  return (
    <>
      {/* Header con pulsante Connection */}
      <header className="home-header">
        <button className="connection-button" onClick={handleConnection}>
          Connection
        </button>
      </header>

      {/* Contenuto principale */}
      <main className="home-main">
        {/* Sfondo animato */}
        <div className="animated-bg">
          {[...Array(12)].map((_, i) => (
            <div className="sphere" key={i}></div>
          ))}
        </div>

        {/* Container del contenuto */}
        <div className="home-container">
          {/* Logo */}
          <img src={logoBlearn} alt="B-learn Logo" className="home-logo" />
          
          {/* Titolo principale */}
          <h1 className="home-title">🎓 Bienvenue sur B-Learn</h1>
          
          {/* Sottotitolo */}
          <p className="home-subtitle">
            La plateforme qui vous permet de suivre l'apprentissage, de visualiser des données clés et d'accompagner vos apprenants dans leurs parcours de formation digitale.
          </p>

          {/* Sezione funzionalità */}
          <div className="features-section">
            <h2 className="features-title">📌 Que pouvez-vous faire avec B-Learn ?</h2>
            
            <div className="feature-item">
              <span className="feature-icon">🧑‍🏫</span>
              <p className="feature-text">
                Organisez et suivez les performances de vos apprenants en temps réel : les données collectées lors de l'utilisation de chatbots pédagogiques — intégrés à des parcours e-learning sur un LMS — sont centralisées sur B-Learn pour vous offrir une vision claire et immédiate de leur progression.
              </p>
            </div>

            <div className="feature-item">
              <span className="feature-icon">📊</span>
              <p className="feature-text">
                Analysez les progrès grâce à des tableaux de bord intuitifs et des rapports détaillés : prenez des décisions éclairées pour personnaliser l'expérience d'apprentissage.
              </p>
            </div>

            <div className="feature-item">
              <span className="feature-icon">🔐</span>
              <p className="feature-text">
                Gérez l'accès en toute sécurité : inscriptions, connexions et récupération de mot de passe sont rapides, simples et sécurisées.
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export default Home; 