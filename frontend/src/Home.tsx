import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './assets/css/home.css';

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
      {/* HEADER */}
      <header className="home-header">
        <div className="home-header-inner">
          <img
            src="/assets/bLogo.png"
            alt="B-Learn"
            className="home-logo-brand"
            onClick={() => navigate('/')}
          />
          <button className="connection-button" onClick={() => navigate('/login')}>
            Se connecter
          </button>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="home-hero-bg">
        <div className="home-hero-overlay" />
        <div className="home-hero-overlay-points" />
        <div className="home-hero-content">
          <h1 className="home-hero-title main-title">
            <strong>
              Formez vos collaborateurs rapidement<br />
              avec des Chatbots pédagogiques<br />
              et suivez les résultats sur Blearn !
            </strong>
          </h1>
        </div>
      </section>

      {/* THREE FEATURE CARDS */}
      <section className="home-cards-row">
        <div className="home-card">
          <h3 className="home-card-title">Organisez</h3>
          <img src="/assets/Organisez2.png" alt="Organisez" className="home-card-image" />
          <p className="home-card-text">
            Organisez le suivi de vos apprenants avec des dashboards complets, nom, prénom,
            groupes d’apprenants, business units, semaines...
          </p>
        </div>
        <div className="home-card">
          <h3 className="home-card-title">Suivez</h3>
          <img src="/assets/Suivez.png" alt="Suivez" className="home-card-image" />
          <p className="home-card-text">
            Suivre les simulations réalisées et visualiser les retranscriptions, les rapports,
            les scores, le nombres de simulations...
          </p>
        </div>
        <div className="home-card">
          <h3 className="home-card-title">Challengez</h3>
          <img src="/assets/Challengez.png" alt="Challengez" className="home-card-image" />
          <p className="home-card-text">
            Créez des challenges. Suivez le classement par chatbot/simulation et visualisez
            les apprenants les plus performants !
          </p>
        </div>
      </section>

      {/* TWO WIDE CARDS */}
      <section className="home-staggered">
        <div className="home-staggered-card left">
          <div className="home-staggered-content">
            <div className="text">
              <h3>Donnez la main à vos managers terrains</h3>
              <p>
                Ils peuvent suivre de manière détaillée les simulations et adapter leur plan de formation
                afin de faire monter en compétence rapidement leurs collaborateurs.
              </p>
            </div>
            <img src="/assets/main.png" alt="Managers" />
          </div>
        </div>
        <div className="home-staggered-card right">
          <div className="home-staggered-content">
            <img src="/assets/centre.png" alt="Dashboard" />
            <div className="text">
              <h3>Mesurez l'impact</h3>
              <p>
                Un dashboard complet qui vous permets de suivre les résultats, les historiques de conversations
                et les analyses et recommandations du coach
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="home-final-cta">
        <div className="home-final-cta-inner">
          <h2>
            <strong>
              Prêt à transformer vos formations et challenger vos collaborateurs avec B-Learn ?👇
            </strong>
          </h2>
          <button className="home-final-cta-btn">Prendre rendez-vous</button>
          <div className="home-final-cta-line" />
        </div>
      </section>
    </>
  );
}

export default Home; 