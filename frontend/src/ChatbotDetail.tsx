import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './assets/css/chatbotDetail.css';
import { useBreadcrumbContext } from './BreadcrumbContext';
import { useSettings } from './SettingsContext';

interface ChatbotDetailData {
  id: number;
  name: string;
  manager_email: string;
  simulations: number;
  avg_score: number;
  learners: number;
  storyline_key: string;
  tenant_id?: number;
  tenant_name?: string;
}

interface Simulation {
  id: number;
  name: string;
  user_email: string;
  score: number;
  created_at: string;
  usergroup?: string;
}

// Interfaccia per le impostazioni
interface Settings {
  showGroups: boolean;
  showRanking: boolean;
}

const ChatbotDetail: React.FC = () => {
  const { storyline_key } = useParams<{ storyline_key: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ChatbotDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSims, setLoadingSims] = useState(true);
  const { addBreadcrumb } = useBreadcrumbContext();

  // Stato per le impostazioni
  const { settings, updateSettings } = useSettings();
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Statistiche mensili
  const [monthStats, setMonthStats] = useState({
    simulations: 0,
    avgScore: 0,
    learners: 0,
    bestLearners: [] as { name: string; user_email: string; score: number }[],
  });

  // Stato per i gruppi e il filtro
  const [groups, setGroups] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [filteredData, setFilteredData] = useState<ChatbotDetailData | null>(null);
  const [filteredBestLearners, setFilteredBestLearners] = useState<{ name: string; user_email: string; score: number }[]>([]);
  
  // Stato per le nuove statistiche
  const [completionRate, setCompletionRate] = useState<number>(0);
  const [engagementRate, setEngagementRate] = useState<number>(0);
  const [totalSimulations, setTotalSimulations] = useState<number>(0);

  // Stato per i dati del grafico criteri
  const [criteresData, setCriteresData] = useState<{ name: string; average: number; count: number; description?: string }[]>([]);

  // Stato per il filtro periodo
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');

  // Nuovi stati per i filtri del grafico
  const [scoreType, setScoreType] = useState<'average' | 'percentage30' | 'percentage50' | 'percentage80'>('average');
  const [selectedGroupForChart, setSelectedGroupForChart] = useState<string>('all');
  const [simulationType, setSimulationType] = useState<'all' | 'first' | 'last' | 'average_per_user'>('all');

  // Funzione per parsare i criteri dal testo dell'analisi (identica a Analysis.tsx)
  const parseCriteres = (analysis: string) => {
    if (!analysis) return [];
    
    // Normalizza il testo per gestire spazi e caratteri Unicode strani
    let normalizedAnalysis = analysis
      .normalize('NFKC')
      .replace(/[\u00A0\u202F\u2007\u2009\u200A\u200B]+/g, ' ')
      .replace(/[⁄∕⧸⟋]/g, '/')
      .replace(/[：﹕꞉︓]/g, ':')
      .replace(/\n\s*:\s*/g, ' : ');
    
    // cattura anche il denominatore - modifica per catturare tutto il contenuto tra titolo e nota
    const criterePattern = /Critère\s*n[°ºo]?\s*(\d+)\s*:\s*([\s\S]*?)(?=Note\s*:\s*\d+\s*\/\s*(?:10|100))/gi;
    const criteres = [];
    let match;
    
    while ((match = criterePattern.exec(normalizedAnalysis)) !== null) {
      const critereNumber = match[1];
      let description = (match[2] || '').trim();
      
      // Pulisci la descrizione rimuovendo righe vuote eccessive e spazi
      description = description.replace(/\n\s*\n/g, '\n').replace(/^\s+|\s+$/g, '');
      
      // Trova la nota per questo criterio
      const notePattern = new RegExp(`Critère\\s*n[°ºo]?\\s*${critereNumber}[\\s\\S]*?Note\\s*:\\s*(\\d+)\\s*\\/\\s*(10|100)`, 'gi');
      const noteMatch = notePattern.exec(normalizedAnalysis);
      
      if (noteMatch) {
        const raw = parseInt(noteMatch[1], 10);
        const denom = parseInt(noteMatch[2], 10);
        
        // Se per caso arrivasse /10 realmente, scala (5/10 -> 50/100).
        // Se è il tuo caso (50/10 = già su 100 ma denom sbagliato), lo lasciamo 50.
        const note = denom === 100 ? raw : (raw <= 10 ? raw * 10 : raw);
        
        if (note !== null) {
          criteres.push({
            name: `Critère n°${critereNumber}`,
            description: description,
            note: note,
            fullMatch: match[0]
          });
        }
      }
    }
    
    return criteres;
  };



  // Funzione per calcolare le medie dei criteri per questo chatbot
  const calculateCriteresAverages = async () => {
    try {
      // Fetch tutte le simulazioni per questo chatbot
      const res = await fetch(`/api/userlist?chatbot_name=${storyline_key}`);
      const allSims = await res.json();
      
      // Filtra per periodo se selezionato
      let filteredSims = allSims;
      if (selectedPeriod !== 'all') {
        const today = new Date();
        let startDate: Date;
        
        switch (selectedPeriod) {
          case '30':
            startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case '90':
            startDate = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          case '180':
            startDate = new Date(today.getTime() - 180 * 24 * 60 * 60 * 1000);
            break;
          case '365':
            startDate = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDate = new Date(0); // Depuis le début
        }
        
        filteredSims = allSims.filter((sim: any) => {
          if (!sim.created_at) return false;
          const simDate = new Date(sim.created_at);
          return simDate >= startDate;
        });
      }
      
      // Filtra per gruppo del grafico (separato dal filtro principale)
      if (selectedGroupForChart !== 'all') {
        filteredSims = filteredSims.filter((sim: any) => 
          (sim.usergroup || 'Groupe par défaut') === selectedGroupForChart
        );
      }
      
      // Filtra per tipo di simulazione
      if (simulationType !== 'all') {
        const userSimulations = new Map<string, any[]>();
        
        // Raggruppa le simulazioni per utente
        filteredSims.forEach((sim: any) => {
          if (!userSimulations.has(sim.user_email)) {
            userSimulations.set(sim.user_email, []);
          }
          userSimulations.get(sim.user_email)!.push(sim);
        });
        
        // Filtra in base al tipo selezionato
        const filteredUserSims: any[] = [];
        userSimulations.forEach((userSims) => {
          if (simulationType === 'first') {
            // Prendi solo la prima simulazione (più vecchia per data)
            const sortedSims = userSims.sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
            if (sortedSims.length > 0) {
              filteredUserSims.push(sortedSims[0]);
            }
          } else if (simulationType === 'last') {
            // Prendi solo l'ultima simulazione (più recente per data)
            const sortedSims = userSims.sort((a, b) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            if (sortedSims.length > 0) {
              filteredUserSims.push(sortedSims[0]);
            }
          } else if (simulationType === 'average_per_user') {
            // Calcola la media per ogni utente e crea una simulazione "virtuale" con la media
            if (userSims.length > 0) {
              const userAverages: { [key: string]: number[] } = {};
              
              // Raccogli tutti i criteri di questo utente
              userSims.forEach((sim: any) => {
                if (sim.chat_analysis) {
                  const criteres = parseCriteres(sim.chat_analysis);
                  criteres.forEach(critere => {
                    if (!userAverages[critere.name]) {
                      userAverages[critere.name] = [];
                    }
                    userAverages[critere.name].push(critere.note);
                  });
                }
              });
              
              // Calcola la media per ogni criterio di questo utente
              const averagedCriteres: any[] = [];
              Object.keys(userAverages).forEach(critereName => {
                const notes = userAverages[critereName];
                const average = notes.reduce((sum, note) => sum + note, 0) / notes.length;
                averagedCriteres.push({
                  name: critereName,
                  note: Math.round(average * 10) / 10,
                  description: userSims[0].chat_analysis ? parseCriteres(userSims[0].chat_analysis).find(c => c.name === critereName)?.description : ''
                });
              });
              
              // Crea una simulazione virtuale con le medie
              const virtualSim = {
                ...userSims[0], // Usa i dati della prima simulazione come base
                chat_analysis: averagedCriteres.map(c => 
                  `${c.name}: ${c.description}\nNote: ${c.note}/100`
                ).join('\n\n')
              };
              
              filteredUserSims.push(virtualSim);
            }
          }
        });
        
        filteredSims = filteredUserSims;
      }
      
      const criteresMap = new Map<string, number[]>();
      const globalScores: number[] = [];
      
      // Prima raccogli tutti i criteri e calcola gli score globali
      filteredSims.forEach((sim: any) => {
        if (sim.chat_analysis) {
          console.log(`=== DEBUG ChatbotDetail: ${sim.name} ===`);
          console.log(`Chat analysis length: ${sim.chat_analysis.length}`);
          console.log(`Chat analysis preview: ${sim.chat_analysis.substring(0, 200)}...`);
          
          const criteres = parseCriteres(sim.chat_analysis);
          console.log(`Criteri trovati: ${criteres.length}`);
          if (criteres.length > 0) {
            console.log('Primo criterio:', criteres[0]);
            // Calcola lo score globale per questa simulazione (media di tutti i criteri)
            const totalScore = criteres.reduce((sum, critere) => sum + critere.note, 0);
            const avgScore = totalScore / criteres.length;
            globalScores.push(avgScore);
            console.log(`Score globale calcolato: ${avgScore}`);
          } else {
            console.log('Nessun criterio trovato, score globale non calcolato');
          }
        }
      });
      
      // Ora filtra le simulazioni in base al tipo di score selezionato
      let finalFilteredSims = filteredSims;
      if (scoreType !== 'average') {
        let threshold: number;
        switch (scoreType) {
          case 'percentage30':
            threshold = 30;
            break;
          case 'percentage50':
            threshold = 50;
            break;
          case 'percentage80':
            threshold = 80;
            break;
          default:
            threshold = 80;
        }
        
        // Filtra le simulazioni che hanno score globale sopra la soglia
        finalFilteredSims = filteredSims.filter((sim: any) => {
          if (sim.chat_analysis) {
            const criteres = parseCriteres(sim.chat_analysis);
            if (criteres.length > 0) {
              const totalScore = criteres.reduce((sum, critere) => sum + critere.note, 0);
              const avgScore = totalScore / criteres.length;
              return avgScore >= threshold;
            }
          }
          return false;
        });
      }
      
      // Ora raccogli i criteri solo dalle simulazioni filtrate per la soglia
      finalFilteredSims.forEach((sim: any) => {
        if (sim.chat_analysis) {
          const criteres = parseCriteres(sim.chat_analysis);
          criteres.forEach(critere => {
            if (!criteresMap.has(critere.name)) {
              criteresMap.set(critere.name, []);
            }
            criteresMap.get(critere.name)!.push(critere.note);
          });
        }
      });
      
      console.log(`=== DEBUG FINALE ===`);
      console.log(`Totale simulazioni filtrate: ${filteredSims.length}`);
      console.log(`Simulazioni con criteri: ${globalScores.length}`);
      console.log(`Criteri unici trovati: ${criteresMap.size}`);
      console.log(`Criteri map:`, Array.from(criteresMap.entries()));
      
      // Calcola la media o percentuale per ogni criterio
      const averages: { name: string; average: number; count: number; description?: string }[] = [];
      criteresMap.forEach((notes, name) => {
        let average: number;
        
        if (scoreType === 'average') {
          // Calcolo normale della media
          average = Math.round((notes.reduce((sum, note) => sum + note, 0) / notes.length) * 10) / 10;
        } else {
          // Calcolo percentuale: simulazioni con questo criterio sopra la soglia / totale simulazioni con questo criterio
          let threshold: number;
          switch (scoreType) {
            case 'percentage30':
              threshold = 30;
              break;
            case 'percentage50':
              threshold = 50;
              break;
            case 'percentage80':
              threshold = 80;
              break;
            default:
              threshold = 80;
          }
          
          // Conta quante simulazioni hanno questo criterio sopra la soglia
          const aboveThreshold = notes.filter(note => note >= threshold).length;
          // Percentuale = (simulazioni sopra soglia / totale simulazioni con questo criterio) * 100
          average = Math.round((aboveThreshold / notes.length) * 100);
        }
        
        // Trova la descrizione del criterio dalla prima simulazione che lo contiene
        let description = '';
        for (const sim of finalFilteredSims) {
          if (sim.chat_analysis) {
            const criteres = parseCriteres(sim.chat_analysis);
            const critere = criteres.find(c => c.name === name);
            if (critere?.description) {
              description = critere.description;
              break;
            }
          }
        }
        
        averages.push({
          name,
          average,
          count: notes.length,
          description
        });
      });
      
      // Calcola la media o percentuale dello score globale
      let globalAverage = 0;
      if (scoreType === 'average') {
        // Per "Score moyen": usa tutti gli score globali
        if (globalScores.length > 0) {
          globalAverage = Math.round((globalScores.reduce((sum, score) => sum + score, 0) / globalScores.length) * 10) / 10;
        }
      } else {
        // Per "Percentage au-dessus de X%": calcola la percentuale di simulazioni sopra la soglia
        let threshold: number;
        switch (scoreType) {
          case 'percentage30':
            threshold = 30;
            break;
          case 'percentage50':
            threshold = 50;
            break;
          case 'percentage80':
            threshold = 80;
            break;
          default:
            threshold = 80;
        }
        
        // Conta quante simulazioni hanno score globale sopra la soglia
        const aboveThreshold = globalScores.filter(score => score >= threshold).length;
        // Percentuale = (simulazioni sopra soglia / totale simulazioni) * 100
        globalAverage = Math.round((aboveThreshold / globalScores.length) * 100);
      }
      
      // Aggiungi lo score globale come primo elemento
      const sortedAverages = averages.sort((a, b) => {
        const numA = parseInt(a.name.match(/\d+/)?.[0] || '0');
        const numB = parseInt(b.name.match(/\d+/)?.[0] || '0');
        return numA - numB;
      });
      
      // Inserisci lo score globale all'inizio dell'array
      const finalData = [
        {
          name: 'Général',
          average: globalAverage,
          count: globalScores.length,
          description: scoreType === 'average' ? 'Moyenne' : `Pourcentage`
        },
        ...sortedAverages
      ];
      
      setCriteresData(finalData);
    } catch (error) {
      console.error('Errore nel calcolo delle medie dei criteri:', error);
      setCriteresData([]);
    }
  };

  // Funzione per gestire il cambio delle impostazioni
  const handleSettingChange = (setting: keyof Settings) => {
    updateSettings({ [setting]: !settings[setting] });
  };

  // Funzione per chiudere il modal
  const closeSettingsModal = () => {
    setShowSettingsModal(false);
  };

  // Funzione per gestire il cambio di gruppo
  const handleGroupChange = (group: string) => {
    setSelectedGroup(group);
    // Salva il gruppo selezionato nel localStorage
    localStorage.setItem(`selectedGroup_${storyline_key}`, group);
  };



  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/chatbots/storyline/${storyline_key}`);
        const chatbot = await res.json();
        setData({
          id: chatbot.id,
          name: chatbot.name,
          manager_email: chatbot.manager_email || 'manager1@gmail.com',
          simulations: chatbot.simulations || 0,
          avg_score: chatbot.avg_score || 0,
          learners: chatbot.learners || 0,
          storyline_key: chatbot.storyline_key,
          tenant_id: chatbot.tenant_id,
          tenant_name: chatbot.tenant_name,
        });
        
        // Fetch tutte le simulazioni per calcolare le statistiche
        try {
          const allSimsRes = await fetch(`/api/userlist?chatbot_name=${storyline_key}`);
          const allSims = await allSimsRes.json();
          
          const totalSims = allSims.length;
          const completedSims = allSims.filter((s: Simulation) => typeof s.score === 'number' && s.score >= 0).length;
          const totalLearners = new Set(allSims.map((s: Simulation) => s.user_email)).size;
          
          setTotalSimulations(totalSims);
          setCompletionRate(totalSims > 0 ? Math.round((completedSims / totalSims) * 100) : 0);
          setEngagementRate(totalLearners > 0 ? Math.round((completedSims / totalLearners) * 10) / 10 : 0);
        } catch (e) {
          console.error('Errore nel calcolo delle statistiche:', e);
        }
      } catch (e) {
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [storyline_key]);

  // Carica il gruppo selezionato dal localStorage quando il componente si monta
  useEffect(() => {
    const savedGroup = localStorage.getItem(`selectedGroup_${storyline_key}`);
    if (savedGroup) {
      setSelectedGroup(savedGroup);
    }
  }, [storyline_key]);

  useEffect(() => {
    const fetchSimulations = async () => {
      setLoadingSims(true);
      try {
        // Nuova fetch: solo simulazioni del mese corrente per questo chatbot
        const res = await fetch(`/api/userlist/month?chatbot_name=${storyline_key}`);
        const sims = await res.json();
        
        // learners unici mese
        const learnersSet = new Set(sims.map((s: Simulation) => s.user_email));
        const learnersThisMonth = learnersSet.size;
        // Filtra solo simulazioni con score >= 0
        const completedSims = sims.filter((s: Simulation) => typeof s.score === 'number' && s.score >= 0);
        const simulationsThisMonth = completedSims.length;
        const avgScoreThisMonth = completedSims.length > 0 ? Math.round(completedSims.reduce((sum: number, s: Simulation) => sum + s.score, 0) / completedSims.length) : 0;
        // Best learners mese
        const bestLearners = (Array.from(sims.reduce((acc: Map<string, { name: string; user_email: string; score: number }>, s: Simulation) => {
          if (!acc.has(s.user_email) || acc.get(s.user_email)!.score < s.score) {
            acc.set(s.user_email, { name: s.name, user_email: s.user_email, score: s.score });
          }
          return acc;
        }, new Map()).values()) as { name: string; user_email: string; score: number }[])
          .sort((a, b) => b.score - a.score)
          .slice(0, 3);
        setMonthStats({
          simulations: simulationsThisMonth,
          avgScore: avgScoreThisMonth,
          learners: learnersThisMonth,
          bestLearners,
        });
      } catch (e) {
        setMonthStats({ simulations: 0, avgScore: 0, learners: 0, bestLearners: [] });
      } finally {
        setLoadingSims(false);
      }
    };
    if (storyline_key) fetchSimulations();
  }, [storyline_key]);

  // Nuovo useEffect per caricare tutti i gruppi disponibili per il filtro del grafico
  useEffect(() => {
    const fetchAllGroups = async () => {
      try {
        // Fetch tutte le simulazioni per questo chatbot per estrarre tutti i gruppi
        const res = await fetch(`/api/userlist?chatbot_name=${storyline_key}`);
        const allSims = await res.json();
        
        // Estrai tutti i gruppi unici disponibili
        const allGroups = Array.from(new Set(allSims.map((s: Simulation) => s.usergroup || 'Groupe par défaut'))) as string[];
        setGroups(allGroups);
        
        // Se il gruppo selezionato per il grafico non è più disponibile, resetta a 'all'
        if (selectedGroupForChart !== 'all' && !allGroups.includes(selectedGroupForChart)) {
          setSelectedGroupForChart('all');
        }
      } catch (e) {
        console.error('Errore nel caricamento dei gruppi:', e);
        setGroups([]);
      }
    };
    if (storyline_key) fetchAllGroups();
  }, [storyline_key, selectedGroupForChart]);

  // Funzione per filtrare i dati in base al gruppo selezionato
  const filterDataByGroup = async (group: string) => {
    if (group === 'all') {
      setFilteredData(data);
      setFilteredBestLearners(monthStats.bestLearners);
      // Ripristina le statistiche globali
      const allSimsRes = await fetch(`/api/userlist?chatbot_name=${storyline_key}`);
      const allSims = await allSimsRes.json();
      const totalSims = allSims.length;
      const completedSims = allSims.filter((s: Simulation) => typeof s.score === 'number' && s.score >= 0).length;
      const totalLearners = new Set(allSims.map((s: Simulation) => s.user_email)).size;
      
      setTotalSimulations(totalSims);
      setCompletionRate(totalSims > 0 ? Math.round((completedSims / totalSims) * 100) : 0);
      setEngagementRate(totalLearners > 0 ? Math.round((completedSims / totalLearners) * 10) / 10 : 0);
      return;
    }

    try {
      // Fetch tutte le simulazioni per questo chatbot
      const res = await fetch(`/api/userlist?chatbot_name=${storyline_key}`);
      const allSims = await res.json();
      
      // Filtra per gruppo
      const groupSims = allSims.filter((s: Simulation) => 
        (s.usergroup || 'Groupe par défaut') === group
      );
      
      // Filtra per gruppo e score >= 0
      const filteredSims = groupSims.filter((s: Simulation) => 
        typeof s.score === 'number' && 
        s.score >= 0
      );

      // Calcola le statistiche filtrate
      const simulations = filteredSims.length;
      const learners = new Set(filteredSims.map((s: Simulation) => s.user_email)).size;
      const avgScore = filteredSims.length > 0 
        ? Math.round(filteredSims.reduce((sum: number, s: Simulation) => sum + s.score, 0) / filteredSims.length)
        : 0;

      // Calcola le nuove statistiche per il gruppo
      const totalSimsGroup = groupSims.length; // Tutte le simulazioni del gruppo
      const completedSimsGroup = filteredSims.length; // Solo simulazioni completate del gruppo
      const totalLearnersGroup = new Set(groupSims.map((s: Simulation) => s.user_email)).size; // Solo learners del gruppo
      
      const completionRateGroup = totalSimsGroup > 0 ? Math.round((completedSimsGroup / totalSimsGroup) * 100) : 0;
      const engagementRateGroup = totalLearnersGroup > 0 ? Math.round((completedSimsGroup / totalLearnersGroup) * 10) / 10 : 0;

      // Calcola i best learners filtrati per gruppo
      const bestLearnersFiltered = (Array.from(filteredSims.reduce((acc: Map<string, { name: string; user_email: string; score: number }>, s: Simulation) => {
        if (!acc.has(s.user_email) || acc.get(s.user_email)!.score < s.score) {
          acc.set(s.user_email, { name: s.name, user_email: s.user_email, score: s.score });
        }
        return acc;
      }, new Map()).values()) as { name: string; user_email: string; score: number }[])
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      setFilteredData({
        ...data!,
        simulations,
        learners,
        avg_score: avgScore,
      });
      setFilteredBestLearners(bestLearnersFiltered);
      
      // Aggiorna le nuove statistiche per il gruppo
      setTotalSimulations(totalSimsGroup); // Aggiorna il totale per mostrare solo le simulazioni del gruppo
      setCompletionRate(completionRateGroup);
      setEngagementRate(engagementRateGroup);
    } catch (e) {
      console.error('Errore nel filtraggio per gruppo:', e);
    }
  };

  // Effetto per aggiornare i dati quando cambia il gruppo selezionato
  useEffect(() => {
    if (data) {
      filterDataByGroup(selectedGroup);
    }
  }, [selectedGroup, data]);

  // Effetto per calcolare le medie dei criteri
  useEffect(() => {
    if (storyline_key) {
      calculateCriteresAverages();
    }
  }, [storyline_key, monthStats.simulations, selectedPeriod, selectedGroup, selectedGroupForChart, simulationType, scoreType]); // Si aggiorna quando cambiano le simulazioni, il periodo o il gruppo

  if (loading) return <div className="chatbot-detail-bg"><div className="chatbot-detail-main">Charging...</div></div>;
  if (!data) return <div className="chatbot-detail-bg"><div className="chatbot-detail-main">Chatbot not found.</div></div>;

  return (
    <div className="">
      <main className="chatbot-detail-main">
        {/* Card principale */}
        <div className="chatbot-card">
          <div className="chatbot-header">
            <div className="chatbot-header-top">
              <div className="chatbot-id-detail">ID: {data.storyline_key}</div>
              <button 
                className="settings-button"
                onClick={() => setShowSettingsModal(true)}
                title="Paramètres"
              >
                ⚙️
              </button>
            </div>
            <br />
            <h1 className="chatbot-name">🤖 {data.name}</h1>
            <div className="manager-info">
              <span className="manager-label">👤 Manager référent :</span>
              <span className="manager-email">{data.manager_email}</span>
            </div>
            {/* Etichette gruppi */}
            {settings.showGroups && groups.length > 0 && (
              <div className="groups-container">
                <div className="group-label">Groupes : </div>
                <div 
                  className={`group-tag all-groups ${selectedGroup === 'all' ? 'active' : ''}`}
                  onClick={() => handleGroupChange('all')}
                >
                  Tous les groupes
                </div>
                {groups.map((group, index) => (
                  <div 
                    key={group}
                    className={`group-tag group-${index % 10} ${selectedGroup === group ? 'active' : ''}`}
                    onClick={() => handleGroupChange(group)}
                  >
                    {group}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* Breadcrumb 
        <div className="breadcrumb">
          <span className="breadcrumb-link" onClick={() => navigate('/dashboard')}>Dashboard</span> &gt;  
          <span className="current">{data.name}</span>
        </div>*/}
        {/* Statistiche principali */}
        <div className="chatbot-main-stats">
          <div className={`main-stat-card ${!settings.showRanking ? 'expanded' : ''}`}>
            <span className="main-stat-label">🎯 Simulations Terminées :</span>
            <span className="main-stat-value">{filteredData ? filteredData.simulations : data.simulations}</span>
            <br />
            <span className="stat-green-small">
              Simulations ce mois-ci : {monthStats.simulations}
            </span>
          </div>
          {settings.showRanking && (
            <div className="main-stat-card">
              <span className="main-stat-label">👑 Best Learners:</span>
              {loadingSims ? (
                <span className="main-stat-value">Caricamento...</span>
              ) : (selectedGroup === 'all' ? monthStats.bestLearners : filteredBestLearners).length === 0 ? (
                <span className="main-stat-value">0 <br /> <span style={{fontSize:'0.8rem', color:'#00cc00'}}>Ce mois-ci</span></span>
              ) : (
                <ul className="best-learners-list">
                  {(selectedGroup === 'all' ? monthStats.bestLearners : filteredBestLearners).map((l, i) => {
                    let icon = '';
                    if (i === 0) icon = '🥇';
                    else if (i === 1) icon = '🥈';
                    else if (i === 2) icon = '🥉';
                    return (
                      <li key={l.user_email} className={`best-learner-item best-learner-${i}`}>
                        <span className="learner-icon">{icon}</span>
                        <span className="learner-name">
                          {l.name}
                        </span>
                        <span className="learner-score">
                          Score: {l.score}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
          <div className="main-stat-card">
            <span className="main-stat-label">📊 Taux de complétion :</span>
            <span className="main-stat-value">{completionRate}%</span>
            <br />
            <span className="stat-green-small">
              {filteredData ? filteredData.simulations : data.simulations}/{totalSimulations} simulations
            </span>
          </div>
          <div className="main-stat-card">
            <span className="main-stat-label">🎯 Taux d'engagement :</span>
            <span className="main-stat-value">{engagementRate}</span>
            <br />
            <span className="stat-green-small">
              simulations/learner
            </span>
          </div>
        </div>
        {/* Statistiche secondarie */}
        <div className="chatbot-secondary-stats">
          <div className="main-stat-card">
            <span className="secondary-stat-label">⭐ Score moyen :</span>
            <span className="secondary-stat-value">{filteredData ? filteredData.avg_score : data.avg_score}</span>
            <br />
            <span className="stat-green-small">
              Score moyen ce mois-ci : {monthStats.avgScore}
            </span>
          </div>
          <div className="main-stat-card">
            <span className="secondary-stat-label">👥 Learners :</span>
            <span className="secondary-stat-value">{filteredData ? filteredData.learners : data.learners}</span>
            <br />
            <span className="stat-green-small">
              Nouveaux learners ce mois-ci : {monthStats.learners}
            </span>
          </div>
        </div>
        {/* Grafico criteri */}
        {criteresData.length > 0 && (
          <div className="criteres-chart-container">
            <div className="criteres-chart-header">
              <h3 className="criteres-chart-title">
                📊 {scoreType === 'average' ? 'Evaluation' : `Pourcentage des simulations au-dessus de ${scoreType === 'percentage30' ? '30%' : scoreType === 'percentage50' ? '50%' : '80%'} par Critères`}
              </h3>
            </div>
            {/* Filtri sopra il grafico */}
            <div className="chart-filters">
              <div className="filter-group">
                <label className="filter-label">Information:</label>
                <select 
                  className="filter-select"
                  value={scoreType}
                  onChange={(e) => setScoreType(e.target.value as 'average' | 'percentage30' | 'percentage50' | 'percentage80')}
                >
                  <option value="average">Score moyen</option>
                  <option value="percentage30">Pourcentage au-dessus de 30%</option>
                  <option value="percentage50">Pourcentage au-dessus de 50%</option>
                  <option value="percentage80">Pourcentage au-dessus de 80%</option>
                </select>
              </div>
              
              <div className="filter-group">
                <label className="filter-label">Groupe:</label>
                <select 
                  className="filter-select"
                  value={selectedGroupForChart}
                  onChange={(e) => setSelectedGroupForChart(e.target.value)}
                >
                  <option value="all">Tous les groupes</option>
                  {groups.length > 0 ? groups.map((group) => (
                    <option key={group} value={group}>{group}</option>
                  )) : (
                    <option value="" disabled>Chargement des groupes...</option>
                  )}
                </select>
              </div>
              
              <div className="filter-group">
                <label className="filter-label">N. simulations:</label>
                <select 
                  className="filter-select"
                  value={simulationType}
                  onChange={(e) => setSimulationType(e.target.value as 'all' | 'first' | 'last' | 'average_per_user')}
                >
                  <option value="all">Toutes les simulations</option>
                  <option value="first">Première simulation</option>
                  <option value="last">Dernière simulation</option>
                  <option value="average_per_user">Moyenne par apprenant</option>
                </select>
              </div>
              
              <div className="filter-group">
                <label className="filter-label">Période:</label>
                <select 
                  className="filter-select"
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                >
                  <option value="all">Depuis le début</option>
                  <option value="30">Sur les derniers 30 jours</option>
                  <option value="90">Sur le dernier trimestre</option>
                  <option value="180">Sur le dernier 6 mois</option>
                  <option value="365">Sur l'année précédent</option>
                </select>
              </div>
            </div>
            
            <div className="criteres-chart">
              <div className="chart-y-axis">
                <div className="y-label">100</div>
                <div className="y-label">80</div>
                <div className="y-label">60</div>
                <div className="y-label">40</div>
                <div className="y-label">20</div>
                <div className="y-label">0</div>
              </div>
              <div className="chart-content">
                <div className="chart-grid">
                  {[100, 80, 60, 40, 20, 0].map((value) => (
                    <div key={value} className="grid-line" style={{ bottom: `${(value / 100) * 100}%` }}></div>
                  ))}
                </div>
                <div className="chart-bars">
                  {criteresData.map((critere, index) => {
                    // Calcolo corretto: ora da 0 a 100 per entrambi i tipi
                    const height = (critere.average / 100) * 100; // Altezza in percentuale
                    const gradientId = `gradient-${index}`;
                    const isGlobalScore = critere.name === 'Général';
                    
                    // Determina il colore in base al punteggio
                    const getScoreColor = (score: number) => {
                      if (score >= 80) {
                        return { start: '#4CAF50', end: '#66BB6A' }; // Verde
                      } else if (score >= 50) {
                        return { start: '#FFC107', end: '#FFD54F' }; // Giallo
                      } else {
                        return { start: '#F44336', end: '#EF5350' }; // Rosso
                      }
                    };
                    
                    const colors = getScoreColor(critere.average);
                    
                    return (
                      <div key={critere.name} className="chart-bar-container">
                        <div className={`chart-bar ${isGlobalScore ? 'global-score-bar' : ''}`} style={{ height: `${height}%` }}>
                          <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
                            <defs>
                              <linearGradient id={gradientId} x1="0%" y1="100%" x2="0%" y2="0%">
                                <stop offset="0%" stopColor={colors.start} />
                                <stop offset="100%" stopColor={colors.end} />
                              </linearGradient>
                            </defs>
                            <rect width="100%" height="100%" fill={`url(#${gradientId})`} />
                          </svg>
                          <div className="bar-value">
                            {scoreType === 'average' ? critere.average : `${critere.average}%`}
                          </div>
                        </div>
                        <div className="chart-label">
                          <span className={isGlobalScore ? 'global-score-label' : ''}>
                            {critere.name}
                          </span>
                          {critere.description && (
                            <div className="chart-label-description">
                              {critere.description.split('\n')[0].trim()}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Bottoni azione */}
        <div className="action-buttons">
          <button className="action-btn primary" onClick={() => {
            addBreadcrumb({ label: 'Simulations', path: `/list?chatbot_name=${encodeURIComponent(data.storyline_key)}` });
            navigate(`/list?chatbot_name=${encodeURIComponent(data.storyline_key)}`, {
              state: {
                selectedGroup: selectedGroup,
                tenant_name: data.tenant_name || 'Client inconnu',
                storyline_key: data.storyline_key
              }
            });
          }}>
            Voir la liste des simulations
          </button>
          <button className="action-btn primary" onClick={() => {
            addBreadcrumb({ label: 'Learners', path: `/chatbot/${data.storyline_key}/learners` });
            navigate(`/chatbot/${data.storyline_key}/learners`, { 
              state: { 
                selectedGroup: selectedGroup,
                tenant_name: data.tenant_name || 'Client inconnu',
                storyline_key: data.storyline_key
              } 
            });
          }}>
            Voir la liste des learners
          </button>
        </div>
      </main>

      {/* Modal delle impostazioni */}
      {showSettingsModal && (
        <div className="settings-modal-overlay" onClick={closeSettingsModal}>
          <div className="settings-modal-content" onClick={e => e.stopPropagation()}>
            <div className="settings-modal-header">
              <h2>Paramètres</h2>
              <button className="settings-modal-close" onClick={closeSettingsModal}>
                ×
              </button>
            </div>
            <div className="settings-modal-body">
              <div className="setting-item">
                <span className="setting-label">Suivi par groupes d'apprenantes</span>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.showGroups}
                    onChange={() => handleSettingChange('showGroups')}
                  />
                  <span className={`toggle-slider ${settings.showGroups ? 'active' : 'inactive'}`}></span>
                </label>
              </div>
              <div className="setting-item">
                <span className="setting-label">Vue classement</span>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.showRanking}
                    onChange={() => handleSettingChange('showRanking')}
                  />
                  <span className={`toggle-slider ${settings.showRanking ? 'active' : 'inactive'}`}></span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default ChatbotDetail; 