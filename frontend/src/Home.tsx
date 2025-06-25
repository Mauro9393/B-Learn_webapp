import { useEffect } from 'react';
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

  return (
    <>
      {/* HERO SECTION */}
      <section className="home-hero">
        <div className="home-hero-left">
          <img src={logoBlearn} alt="B-learn Logo" className="home-hero-logo" />
        </div>
        <div className="home-hero-right">
          <h1 className="home-hero-title">🎓 Bienvenue sur B-Learn</h1>
          <p className="home-hero-desc">
            La plateforme qui vous permet de suivre l'apprentissage, de visualiser des données clés et d'accompagner vos apprenants dans leurs parcours de formation digitale.
          </p>
          <button className="home-hero-btn" onClick={() => navigate('/login')}>
            Connection
          </button>
        </div>
      </section>

      {/* BOXES SECTION */}
      <section className="home-boxes-row">
        <div className="home-box">
          <div className="home-box-icon">🧑‍🏫</div>
          <div className="home-box-title">Organisation & Suivi</div>
          <div className="home-box-desc">
            Organisez et suivez les performances de vos apprenants en temps réel : les données collectées lors de l'utilisation de chatbots pédagogiques — intégrés à des parcours e-learning sur un LMS — sont centralisées sur B-Learn pour vous offrir une vision claire et immédiate de leur progression.
          </div>
          <button className="home-box-btn" onClick={() => navigate('/login')}>En savoir plus</button>
        </div>
        <div className="home-box">
          <div className="home-box-icon">📊</div>
          <div className="home-box-title">Analyse & Tableaux de bord</div>
          <div className="home-box-desc">
            Analysez les progrès grâce à des tableaux de bord intuitifs et des rapports détaillés : prenez des décisions éclairées pour personnaliser l'expérience d'apprentissage.
          </div>
          <button className="home-box-btn" onClick={() => navigate('/login')}>En savoir plus</button>
        </div>
        <div className="home-box">
          <div className="home-box-icon">🔐</div>
          <div className="home-box-title">Sécurité & Accès</div>
          <div className="home-box-desc">
            Gérez l'accès en toute sécurité : inscriptions, connexions et récupération de mot de passe sont rapides, simples et sécurisées.
          </div>
          <button className="home-box-btn" onClick={() => navigate('/login')}>En savoir plus</button>
        </div>
      </section>
    </>
  );
}

export default Home; 