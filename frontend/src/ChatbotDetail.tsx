import React, { useEffect, useState, useRef } from 'react';
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

  // Periodo (aggiunta gestione personalizzata)
  // selectedPeriod: 'all' | '30' | '90' | '180' | 'custom'
  // Nota: selectedPeriod è già definito più sotto ed è usato anche per il grafico

  // Stato per i gruppi e il filtro
  const [groups, setGroups] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [filteredData, setFilteredData] = useState<ChatbotDetailData | null>(null);
  const [filteredBestLearners, setFilteredBestLearners] = useState<{ name: string; user_email: string; score: number }[]>([]);
  const [bestLearnersAll, setBestLearnersAll] = useState<{ name: string; user_email: string; score: number }[]>([]);
  
  
  // Stato per le nuove statistiche
  const [completionRate, setCompletionRate] = useState<number>(0);
  const [engagementRate, setEngagementRate] = useState<number>(0);

  // Stato per i dati del grafico criteri
  const [criteresData, setCriteresData] = useState<{ name: string; average: number; count: number; description?: string }[]>([]);

  // Stato per il filtro periodo
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  // Dropdown periodo
  const [isPeriodMenuOpen, setIsPeriodMenuOpen] = useState<boolean>(false);
  const [isCustomCalendarOpen, setIsCustomCalendarOpen] = useState<boolean>(false);
  const periodDropdownRef = useRef<HTMLDivElement>(null);
  const todayRef = new Date();
  const [calendarMonth, setCalendarMonth] = useState<number>(todayRef.getMonth()); // 0-11
  const [calendarYear, setCalendarYear] = useState<number>(todayRef.getFullYear());

  // Click outside per chiudere il dropdown periodo
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (periodDropdownRef.current && !periodDropdownRef.current.contains(event.target as Node)) {
        // Non chiudere se il calendario custom è aperto
        if (!isCustomCalendarOpen) {
          setIsPeriodMenuOpen(false);
        }
      }
    };

    if (isPeriodMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPeriodMenuOpen, isCustomCalendarOpen]);

  // Nuovi stati per i filtri del grafico
  const [scoreType, setScoreType] = useState<'average' | 'percentage30' | 'percentage50' | 'percentage80'>('average');
  const [selectedGroupForChart, setSelectedGroupForChart] = useState<string>('all');
  const [simulationType, setSimulationType] = useState<'all' | 'first' | 'last' | 'average_per_user'>('all');
  const [isChartPeriodMenuOpen, setIsChartPeriodMenuOpen] = useState<boolean>(false);
  const [isChartCustomCalendarOpen, setIsChartCustomCalendarOpen] = useState<boolean>(false);
  const [chartCustomStartDate, setChartCustomStartDate] = useState<Date | null>(null);
  const [chartCustomEndDate, setChartCustomEndDate] = useState<Date | null>(null);
  const [chartCalendarMonth, setChartCalendarMonth] = useState<number>(todayRef.getMonth());
  const [chartCalendarYear, setChartCalendarYear] = useState<number>(todayRef.getFullYear());
  const chartPeriodDropdownRef = useRef<HTMLDivElement>(null);
  // Dropdown personalizzati per Information, Groupe, N. simulations
  const [isInfoMenuOpen, setIsInfoMenuOpen] = useState<boolean>(false);
  const [isGroupMenuOpen, setIsGroupMenuOpen] = useState<boolean>(false);
  const [isSimMenuOpen, setIsSimMenuOpen] = useState<boolean>(false);
  const infoDropdownRef = useRef<HTMLDivElement>(null);
  const groupDropdownRef = useRef<HTMLDivElement>(null);
  const simDropdownRef = useRef<HTMLDivElement>(null);

  // Click outside per chiudere il dropdown periodo del grafico
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chartPeriodDropdownRef.current && !chartPeriodDropdownRef.current.contains(event.target as Node)) {
        // Non chiudere se il calendario custom è aperto
        if (!isChartCustomCalendarOpen) {
          setIsChartPeriodMenuOpen(false);
        }
      }
    };

    if (isChartPeriodMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isChartPeriodMenuOpen, isChartCustomCalendarOpen]);

  // Click outside per chiudere Information
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (infoDropdownRef.current && !infoDropdownRef.current.contains(event.target as Node)) {
        setIsInfoMenuOpen(false);
      }
    };
    if (isInfoMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isInfoMenuOpen]);

  // Click outside per chiudere Groupe
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (groupDropdownRef.current && !groupDropdownRef.current.contains(event.target as Node)) {
        setIsGroupMenuOpen(false);
      }
    };
    if (isGroupMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isGroupMenuOpen]);

  // Click outside per chiudere N. simulations
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (simDropdownRef.current && !simDropdownRef.current.contains(event.target as Node)) {
        setIsSimMenuOpen(false);
      }
    };
    if (isSimMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSimMenuOpen]);

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
    
    // cattura anche il denominatore - e supporta note con decimali (es. 55.5/100)
    const criterePattern = /Critère\s*n[°ºo]?\s*(\d+)\s*:\s*([\s\S]*?)(?=Note\s*:\s*\d+(?:[\.,]\d+)?\s*\/\s*(?:10|100))/gi;
    const criteres = [];
    let match;
    
    while ((match = criterePattern.exec(normalizedAnalysis)) !== null) {
      const critereNumber = match[1];
      let description = (match[2] || '').trim();
      
      // Pulisci la descrizione rimuovendo righe vuote eccessive e spazi
      description = description.replace(/\n\s*\n/g, '\n').replace(/^\s+|\s+$/g, '');
      
      // Trova la nota per questo criterio (supporta decimali)
      const notePattern = new RegExp(`Critère\\s*n[°ºo]?\\s*${critereNumber}[\\s\\S]*?Note\\s*:\\s*(\\d+(?:[\\.,]\\d+)?)\\s*\\/\\s*(10|100)`, 'gi');
      const noteMatch = notePattern.exec(normalizedAnalysis);
      
      if (noteMatch) {
        const raw = parseFloat((noteMatch[1] || '').replace(',', '.'));
        const denom = parseInt(noteMatch[2], 10);
        
        // Se per caso arrivasse /10, scala (5.5/10 -> 55/100). Mantieni una cifra decimale quando utile
        const note = denom === 100 ? Math.round(raw * 10) / 10 : (raw <= 10 ? Math.round(raw * 10) : raw);
        
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
      
      // Filtra per periodo usando la funzione del grafico
      let filteredSims = applyChartPeriodFilter(allSims);
      
      // Filtra per gruppo del grafico (separato dal filtro principale)
      if (selectedGroupForChart !== 'all') {
        filteredSims = filteredSims.filter((sim: any) => 
          (sim.usergroup || 'Groupe par défaut') === selectedGroupForChart
        );
      }
      
      // Filtra per tipo di simulazione
      if (simulationType !== 'all') {
        // Per "moyenne par apprenant": prepara l'elenco dei criteri a livello di GRUPPO
        // così ogni utente viene proiettato sugli stessi criteri e le colonne restano complete
        let groupCriteres: Set<string> | null = null;
        if (simulationType === 'average_per_user') {
          groupCriteres = new Set<string>();
          filteredSims.forEach((sim: any) => {
            if (sim.chat_analysis) {
              const criteres = parseCriteres(sim.chat_analysis);
              criteres.forEach(c => groupCriteres!.add(c.name));
            }
          });
        }
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
            if (userSims.length > 0 && groupCriteres && groupCriteres.size > 0) {
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
              
              // Calcola la media per TUTTI i criteri del gruppo (usa 0 per quelli mancanti per l'utente)
              const averagedCriteres: any[] = [];
              groupCriteres.forEach(critereName => {
                const notes = userAverages[critereName] || [];
                const average = notes.length > 0 
                  ? notes.reduce((sum, note) => sum + note, 0) / notes.length 
                  : 0;
                
                // Trova la descrizione del criterio da una qualunque simulazione del GRUPPO
                let description = '';
                for (const sim of filteredSims) {
                  if (sim.chat_analysis) {
                    const criteres = parseCriteres(sim.chat_analysis);
                    const critere = criteres.find(c => c.name === critereName);
                    if (critere?.description) {
                      description = critere.description;
                      break;
                    }
                  }
                }
                
                averagedCriteres.push({
                  name: critereName,
                  note: Math.round(average),
                  description: description
                });
              });
              
              // Crea una simulazione virtuale con le medie
              const virtualSim = {
                ...userSims[0],
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
          //console.log(`=== DEBUG ChatbotDetail: ${sim.name} ===`);
          //console.log(`Chat analysis length: ${sim.chat_analysis.length}`);
          //console.log(`Chat analysis preview: ${sim.chat_analysis.substring(0, 200)}...`);
          
          const criteres = parseCriteres(sim.chat_analysis);
          //console.log(`Criteri trovati: ${criteres.length}`);
          if (criteres.length > 0) {
            //console.log('Primo criterio:', criteres[0]);
            // Calcola lo score globale per questa simulazione (media di tutti i criteri)
            const totalScore = criteres.reduce((sum, critere) => sum + critere.note, 0);
            const avgScore = totalScore / criteres.length;
            globalScores.push(avgScore);
            //console.log(`Score globale calcolato: ${avgScore}`);
          } else {
            //console.log('Nessun criterio trovato, score globale non calcolato');
          }
        }
      });
      
      // Per il calcolo della percentuale globale, filtra le simulazioni in base al tipo di score selezionato
      let globalFilteredSims = filteredSims;
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
        
        // Filtra le simulazioni che hanno score globale sopra la soglia (solo per il calcolo globale)
        globalFilteredSims = filteredSims.filter((sim: any) => {
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
      
      // Raccogli i criteri da TUTTE le simulazioni (non solo quelle filtrate per la soglia)
      // per calcolare correttamente le percentuali dei criteri individuali
      filteredSims.forEach((sim: any) => {
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
      
      //console.log(`=== DEBUG FINALE ===`);
      //console.log(`Totale simulazioni filtrate: ${filteredSims.length}`);
      //console.log(`Simulazioni con criteri: ${globalScores.length}`);
      //console.log(`Criteri unici trovati: ${criteresMap.size}`);
      //console.log(`Criteri map:`, Array.from(criteresMap.entries()));
      
      // Calcola la media o percentuale per ogni criterio
      const averages: { name: string; average: number; count: number; description?: string }[] = [];
      criteresMap.forEach((notes, name) => {
        let average: number;
        
        if (scoreType === 'average') {
          // Calcolo normale della media (arrotondato all'intero)
          average = Math.round(notes.reduce((sum, note) => sum + note, 0) / notes.length);
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
          // Usa notes.length che ora rappresenta TUTTE le simulazioni con questo criterio
          average = Math.round((aboveThreshold / notes.length) * 100);
        }
        
        // Trova la descrizione del criterio dalla prima simulazione che lo contiene
        let description = '';
        for (const sim of filteredSims) {
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
          globalAverage = Math.round(globalScores.reduce((sum, score) => sum + score, 0) / globalScores.length);
        }
      } else {
        // Per "Percentage au-dessus de X%": usa le simulazioni già filtrate per la soglia
        // Percentuale = (simulazioni sopra soglia / totale simulazioni) * 100
        globalAverage = globalScores.length > 0 ? Math.round((globalFilteredSims.length / globalScores.length) * 100) : 0;
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
    const fetchBestLearnersForPeriod = async () => {
      setLoadingSims(true);
      try {
        const res = await fetch(`/api/userlist?chatbot_name=${storyline_key}`);
        const all = await res.json();
        const sims = applyPeriodFilter(all).filter((s: Simulation) => typeof s.score === 'number' && s.score >= 0);
        const best = (Array.from(sims.reduce((acc: Map<string, { name: string; user_email: string; score: number }>, s: Simulation) => {
          if (!acc.has(s.user_email) || acc.get(s.user_email)!.score < s.score) {
            acc.set(s.user_email, { name: s.name, user_email: s.user_email, score: s.score });
          }
          return acc;
        }, new Map()).values()) as { name: string; user_email: string; score: number }[])
          .sort((a, b) => b.score - a.score)
          .slice(0, 3);
        setBestLearnersAll(best);
      } catch (e) {
        setBestLearnersAll([]);
      } finally {
        setLoadingSims(false);
      }
    };
    if (storyline_key) fetchBestLearnersForPeriod();
  }, [storyline_key, selectedPeriod, customStartDate, customEndDate]);

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

  // Helper: ottieni startDate in base al selectedPeriod
  const getPeriodStartDate = (): { startDate: Date | null; endDate: Date | null } => {
    if (selectedPeriod === 'all') return { startDate: null, endDate: null };
    if (selectedPeriod === 'custom') return { startDate: customStartDate, endDate: customEndDate };
    const today = new Date();
    let days = 0;
    if (selectedPeriod === '30') days = 30;
    if (selectedPeriod === '90') days = 90;
    if (selectedPeriod === '180') days = 180;
    const startDate = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);
    return { startDate, endDate: today };
  };

  // Helper per il grafico: usa le date del calendario del grafico se disponibili
  const getChartPeriodStartDate = (): { startDate: Date | null; endDate: Date | null } => {
    if (selectedPeriod === 'all') return { startDate: null, endDate: null };
    if (selectedPeriod === 'custom') return { startDate: chartCustomStartDate, endDate: chartCustomEndDate };
    const today = new Date();
    let days = 0;
    if (selectedPeriod === '30') days = 30;
    if (selectedPeriod === '90') days = 90;
    if (selectedPeriod === '180') days = 180;
    const startDate = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);
    return { startDate, endDate: today };
  };

  const applyPeriodFilter = (sims: any[]): any[] => {
    const { startDate, endDate } = getPeriodStartDate();
    if (!startDate && !endDate) return sims;
    return sims.filter((sim) => {
      if (!sim.created_at) return false;
      const d = new Date(sim.created_at);
      
      // Se startDate e endDate sono lo stesso giorno, includi tutto il giorno
      if (startDate && endDate && startDate.toDateString() === endDate.toDateString()) {
        return d.toDateString() === startDate.toDateString();
      }
      
      // Logica normale per range di date
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
      return true;
    });
  };

  const applyChartPeriodFilter = (sims: any[]): any[] => {
    const { startDate, endDate } = getChartPeriodStartDate();
    if (!startDate && !endDate) return sims;
    return sims.filter((sim) => {
      if (!sim.created_at) return false;
      const d = new Date(sim.created_at);
      
      // Se startDate e endDate sono lo stesso giorno, includi tutto il giorno
      if (startDate && endDate && startDate.toDateString() === endDate.toDateString()) {
        return d.toDateString() === startDate.toDateString();
      }
      
      // Logica normale per range di date
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
      return true;
    });
  };

  // Funzione per filtrare i dati in base al gruppo selezionato (includendo il periodo)
  const filterDataByGroup = async (group: string) => {
    try {
      // Fetch tutte le simulazioni per questo chatbot
      const res = await fetch(`/api/userlist?chatbot_name=${storyline_key}`);
      const allSimsRaw = await res.json();
      const allSims = applyPeriodFilter(allSimsRaw);
      
      // Filtra per gruppo
      const groupSims = (group === 'all')
        ? allSims
        : allSims.filter((s: Simulation) => (s.usergroup || 'Groupe par défaut') === group);
      
      // Filtra per gruppo (include tutte le simulazioni per il conteggio learners)
      const allGroupSims = groupSims;
      
      // Filtra solo per score >= 0 per il calcolo dello score medio
      const filteredSims = groupSims.filter((s: Simulation) => 
        typeof s.score === 'number' && 
        s.score >= 0
      );

      // Calcola le statistiche filtrate
      const simulations = allGroupSims.length; // Tutte le simulazioni del gruppo nel periodo
      const learners = new Set(allGroupSims.map((s: Simulation) => s.user_email)).size; // Tutti i learners unici
      const avgScore = filteredSims.length > 0 
        ? Math.round(filteredSims.reduce((sum: number, s: Simulation) => sum + s.score, 0) / filteredSims.length)
        : 0;

      // Calcola le nuove statistiche per il gruppo
      const totalSimsGroup = allGroupSims.length; // Tutte le simulazioni (nel periodo) del gruppo
      const completedSimsGroup = filteredSims.length; // Solo simulazioni completate (nel periodo) del gruppo
      const totalLearnersGroup = new Set(allGroupSims.map((s: Simulation) => s.user_email)).size; // Learners (nel periodo) del gruppo
      
      const completionRateGroup = totalSimsGroup > 0 ? Math.round((completedSimsGroup / totalSimsGroup) * 100) : 0;
      const engagementRateGroup = totalLearnersGroup > 0 ? Math.round((completedSimsGroup / totalLearnersGroup) * 10) / 10 : 0;

      setFilteredData({
        ...data!,
        simulations,
        learners,
        avg_score: avgScore,
      });
      // Calcola i best learners filtrati per gruppo
      const bestLearnersFiltered = (Array.from(filteredSims.reduce((acc: Map<string, { name: string; user_email: string; score: number }>, s: Simulation) => {
        if (!acc.has(s.user_email) || acc.get(s.user_email)!.score < s.score) {
          acc.set(s.user_email, { name: s.name, user_email: s.user_email, score: s.score });
        }
        return acc;
      }, new Map()).values()) as { name: string; user_email: string; score: number }[])
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
      setFilteredBestLearners(bestLearnersFiltered);
      
      
      // Aggiorna le nuove statistiche per il gruppo
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
  }, [selectedGroup, selectedPeriod, customStartDate, customEndDate, data]);

  // Effetto per calcolare le medie dei criteri (include periodo e gruppo)
  useEffect(() => {
    if (storyline_key) {
      calculateCriteresAverages();
    }
  }, [storyline_key, selectedPeriod, customStartDate, customEndDate, chartCustomStartDate, chartCustomEndDate, selectedGroup, selectedGroupForChart, simulationType, scoreType]);

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
            <br /><br />
            {/* Filtro Période - dropdown personalizzato */}
            <div className="period-filter-container">
              <label className="period-filter-label">Période:</label>
              <div className="period-dropdown" ref={periodDropdownRef}>
                <button
                  type="button"
                  className="period-trigger"
                  onClick={() => setIsPeriodMenuOpen(o => !o)}
                >
                  {(() => {
                    if (selectedPeriod === 'all') return 'Depuis le début';
                    if (selectedPeriod === '30') return 'Sur les 30 derniers jours';
                    if (selectedPeriod === '90') return 'Sur le dernier trimestre';
                    if (selectedPeriod === '180') return 'Sur les derniers 6 mois';
                    if (selectedPeriod === 'custom') {
                      const fmt = (d: Date | null) => d ? d.toLocaleDateString('fr-FR') : '—';
                      return `Personnaliser: ${fmt(customStartDate)} - ${fmt(customEndDate)}`;
                    }
                    return 'Période';
                  })()}
                  <span className="chevron">▾</span>
                </button>
                {isPeriodMenuOpen && (
                  <div className="period-menu">
                    <div className="menu-item" onClick={() => { setSelectedPeriod('all'); setCustomStartDate(null); setCustomEndDate(null); setIsPeriodMenuOpen(false); setIsCustomCalendarOpen(false); }}>Depuis le début</div>
                    <div className="menu-item" onClick={() => { setSelectedPeriod('30'); setCustomStartDate(null); setCustomEndDate(null); setIsPeriodMenuOpen(false); setIsCustomCalendarOpen(false); }}>Sur les 30 derniers jours</div>
                    <div className="menu-item" onClick={() => { setSelectedPeriod('90'); setCustomStartDate(null); setCustomEndDate(null); setIsPeriodMenuOpen(false); setIsCustomCalendarOpen(false); }}>Sur le dernier trimestre</div>
                    <div className="menu-item" onClick={() => { setSelectedPeriod('180'); setCustomStartDate(null); setCustomEndDate(null); setIsPeriodMenuOpen(false); setIsCustomCalendarOpen(false); }}>Sur les derniers 6 mois</div>
                    <div className="menu-item custom" onClick={(e) => { e.stopPropagation(); setIsCustomCalendarOpen(!isCustomCalendarOpen); }}>
                      <div className="custom-label">Personnaliser</div>
                      {isCustomCalendarOpen && (
                      <div className="calendar-panel" onClick={(e) => e.stopPropagation()}>
                        <div className="calendar-header">
                          <button className="cal-nav" onClick={(e) => {
                            e.stopPropagation();
                            const prevMonth = calendarMonth - 1;
                            if (prevMonth < 0) {
                              setCalendarMonth(11);
                              setCalendarYear(calendarYear - 1);
                            } else {
                              setCalendarMonth(prevMonth);
                            }
                          }}>◀</button>
                          <div className="cal-title">{new Date(calendarYear, calendarMonth, 1).toLocaleString('fr-FR', { month: 'long' })} {calendarYear}</div>
                          <button className="cal-nav" onClick={(e) => {
                            e.stopPropagation();
                            const nextMonth = calendarMonth + 1;
                            if (nextMonth > 11) {
                              setCalendarMonth(0);
                              setCalendarYear(calendarYear + 1);
                            } else {
                              setCalendarMonth(nextMonth);
                            }
                          }}>▶</button>
                        </div>
                        <div className="calendar-grid">
                          {['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map(d => (
                            <div key={d} className="cal-weekday">{d}</div>
                          ))}
                          {(() => {
                            const firstDay = new Date(calendarYear, calendarMonth, 1);
                            const startWeekday = (firstDay.getDay() + 6) % 7; // lun=0
                            const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
                            const cells: React.ReactNode[] = [];
                            for (let i = 0; i < startWeekday; i++) {
                              cells.push(<div key={`empty-${i}`} className="cal-cell empty"></div>);
                            }
                            for (let d = 1; d <= daysInMonth; d++) {
                              const thisDate = new Date(calendarYear, calendarMonth, d);
                              const isSelectedStart = customStartDate && thisDate.toDateString() === customStartDate.toDateString();
                              const isSelectedEnd = customEndDate && thisDate.toDateString() === customEndDate.toDateString();
                              const inRange = customStartDate && customEndDate && thisDate >= customStartDate && thisDate <= customEndDate;
                              const cls = `cal-cell day ${isSelectedStart || isSelectedEnd ? 'selected' : ''} ${inRange ? 'in-range' : ''}`;
                              cells.push(
                                <div
                                  key={`d-${d}`}
                                  className={cls}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!customStartDate || (customStartDate && customEndDate)) {
                                      setCustomStartDate(thisDate);
                                      setCustomEndDate(null);
                                    } else if (customStartDate && !customEndDate) {
                                      if (thisDate < customStartDate) {
                                        setCustomEndDate(customStartDate);
                                        setCustomStartDate(thisDate);
                                      } else {
                                        setCustomEndDate(thisDate);
                                      }
                                    }
                                  }}
                                >
                                  <span className="day-number">{d}</span>
                                </div>
                              );
                            }
                            return cells;
                          })()}
                        </div>
                        <div className="calendar-actions">
                          <button
                            className="cal-btn apply"
                            disabled={!customStartDate || !customEndDate}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPeriod('custom');
                              setIsCustomCalendarOpen(false);
                              setIsPeriodMenuOpen(false);
                            }}
                          >Appliquer</button>
                          <button
                            className="cal-btn cancel"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsCustomCalendarOpen(false);
                              setIsPeriodMenuOpen(false);
                            }}
                          >Annuler</button>
                        </div>
                      </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
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
          <div
            className="main-stat-card clickable-card"
            onClick={() => {
              addBreadcrumb({ label: 'Simulations', path: `/list?chatbot_name=${encodeURIComponent(data.storyline_key)}` });
              navigate(`/list?chatbot_name=${encodeURIComponent(data.storyline_key)}`, {
                state: {
                  selectedGroup: selectedGroup,
                  tenant_name: data.tenant_name || 'Client inconnu',
                  storyline_key: data.storyline_key
                }
              });
            }}
          >
            <span className="main-stat-label">🎯 Simulations Terminées :</span>
            <span className="main-stat-value">{filteredData ? filteredData.simulations : data.simulations}</span>
          </div>
          <div
            className="main-stat-card clickable-card"
            onClick={() => {
              addBreadcrumb({ label: 'Learners', path: `/chatbot/${data.storyline_key}/learners` });
              navigate(`/chatbot/${data.storyline_key}/learners`, { 
                state: { 
                  selectedGroup: selectedGroup,
                  tenant_name: data.tenant_name || 'Client inconnu',
                  storyline_key: data.storyline_key
                } 
              });
            }}
          >
            <span className="main-stat-label">👥 Learners :</span>
            <span className="main-stat-value">{filteredData ? filteredData.learners : data.learners}</span>
          </div>
          <div className="main-stat-card">
            <span className="main-stat-label">📊 Taux de complétion :</span>
            <span className="main-stat-value">{completionRate}%</span>
          </div>
          <div className="main-stat-card">
            <span className="main-stat-label">⭐ Score moyen :</span>
            <span className="main-stat-value">{filteredData ? filteredData.avg_score : data.avg_score}</span>
          </div>
        </div>
        {/* Statistiche secondarie */}
        <div className="chatbot-secondary-stats">
          <div className="main-stat-card">
            <span className="main-stat-label">🎯 Taux d'engagement :</span>
            <span className="main-stat-value">{engagementRate}</span>
          </div>
          {settings.showRanking && (
            <div className="main-stat-card">
              <span className="secondary-stat-label">👑 Best Learners:</span>
              {loadingSims ? (
                <span className="secondary-stat-value">Caricamento...</span>
              ) : (selectedGroup === 'all' ? bestLearnersAll : filteredBestLearners).length === 0 ? (
                <span className="secondary-stat-value">0</span>
              ) : (
                <ul className="best-learners-list">
                  {(selectedGroup === 'all' ? bestLearnersAll : filteredBestLearners).map((l: { name: string; user_email: string; score: number }, i: number) => {
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
                <div className="period-dropdown" ref={infoDropdownRef}>
                  <button
                    type="button"
                    className="period-trigger"
                    onClick={() => setIsInfoMenuOpen(o => !o)}
                  >
                    {scoreType === 'average' ? 'Score moyen' : scoreType === 'percentage30' ? 'Pourcentage au-dessus de 30%' : scoreType === 'percentage50' ? 'Pourcentage au-dessus de 50%' : 'Pourcentage au-dessus de 80%'}
                    <span className="chevron">▾</span>
                  </button>
                  {isInfoMenuOpen && (
                    <div className="period-menu">
                      <div className="menu-item" onClick={() => { setScoreType('average'); setIsInfoMenuOpen(false); }}>Score moyen</div>
                      <div className="menu-item" onClick={() => { setScoreType('percentage30'); setIsInfoMenuOpen(false); }}>Pourcentage au-dessus de 30%</div>
                      <div className="menu-item" onClick={() => { setScoreType('percentage50'); setIsInfoMenuOpen(false); }}>Pourcentage au-dessus de 50%</div>
                      <div className="menu-item" onClick={() => { setScoreType('percentage80'); setIsInfoMenuOpen(false); }}>Pourcentage au-dessus de 80%</div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="filter-group">
                <label className="filter-label">Groupe:</label>
                <div className="period-dropdown" ref={groupDropdownRef}>
                  <button
                    type="button"
                    className="period-trigger"
                    onClick={() => setIsGroupMenuOpen(o => !o)}
                  >
                    {selectedGroupForChart === 'all' ? 'Tous les groupes' : selectedGroupForChart}
                    <span className="chevron">▾</span>
                  </button>
                  {isGroupMenuOpen && (
                    <div className="period-menu">
                      <div className="menu-item" onClick={() => { setSelectedGroupForChart('all'); setIsGroupMenuOpen(false); }}>Tous les groupes</div>
                      {groups.length > 0 && groups.map((group) => (
                        <div key={group} className="menu-item" onClick={() => { setSelectedGroupForChart(group); setIsGroupMenuOpen(false); }}>{group}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="filter-group">
                <label className="filter-label">N. simulations:</label>
                <div className="period-dropdown" ref={simDropdownRef}>
                  <button
                    type="button"
                    className="period-trigger"
                    onClick={() => setIsSimMenuOpen(o => !o)}
                  >
                    {simulationType === 'all' ? 'Toutes les simulations' : simulationType === 'first' ? 'Première simulation' : simulationType === 'last' ? 'Dernière simulation' : 'Moyenne par apprenant'}
                    <span className="chevron">▾</span>
                  </button>
                  {isSimMenuOpen && (
                    <div className="period-menu">
                      <div className="menu-item" onClick={() => { setSimulationType('all'); setIsSimMenuOpen(false); }}>Toutes les simulations</div>
                      <div className="menu-item" onClick={() => { setSimulationType('first'); setIsSimMenuOpen(false); }}>Première simulation</div>
                      <div className="menu-item" onClick={() => { setSimulationType('last'); setIsSimMenuOpen(false); }}>Dernière simulation</div>
                      <div className="menu-item" onClick={() => { setSimulationType('average_per_user'); setIsSimMenuOpen(false); }}>Moyenne par apprenant</div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="filter-group">
                <label className="filter-label">Période:</label>
                <div className="period-dropdown" ref={chartPeriodDropdownRef}>
                  <button
                    type="button"
                    className="period-trigger"
                    onClick={() => setIsChartPeriodMenuOpen(o => !o)}
                  >
                    {(() => {
                      if (selectedPeriod === 'all') return 'Depuis le début';
                      if (selectedPeriod === '30') return 'Sur les derniers 30 jours';
                      if (selectedPeriod === '90') return 'Sur le dernier trimestre';
                      if (selectedPeriod === '180') return 'Sur le dernier 6 mois';
                      if (selectedPeriod === 'custom') {
                        const fmt = (d: Date | null) => d ? d.toLocaleDateString('fr-FR') : '—';
                        return `${fmt(chartCustomStartDate)} - ${fmt(chartCustomEndDate)}`;
                      }
                      return 'Période';
                    })()}
                    <span className="chevron">▾</span>
                  </button>
                  {isChartPeriodMenuOpen && (
                    <div className="period-menu">
                      <div className="menu-item" onClick={() => { setSelectedPeriod('all'); setChartCustomStartDate(null); setChartCustomEndDate(null); setIsChartPeriodMenuOpen(false); setIsChartCustomCalendarOpen(false); }}>Depuis le début</div>
                      <div className="menu-item" onClick={() => { setSelectedPeriod('30'); setChartCustomStartDate(null); setChartCustomEndDate(null); setIsChartPeriodMenuOpen(false); setIsChartCustomCalendarOpen(false); }}>Sur les derniers 30 jours</div>
                      <div className="menu-item" onClick={() => { setSelectedPeriod('90'); setChartCustomStartDate(null); setChartCustomEndDate(null); setIsChartPeriodMenuOpen(false); setIsChartCustomCalendarOpen(false); }}>Sur le dernier trimestre</div>
                      <div className="menu-item" onClick={() => { setSelectedPeriod('180'); setChartCustomStartDate(null); setChartCustomEndDate(null); setIsChartPeriodMenuOpen(false); setIsChartCustomCalendarOpen(false); }}>Sur le dernier 6 mois</div>
                      <div className="menu-item custom" onClick={(e) => { e.stopPropagation(); setIsChartCustomCalendarOpen(!isChartCustomCalendarOpen); }}>
                        <div className="custom-label">Personnaliser</div>
                        {isChartCustomCalendarOpen && (
                        <div className="calendar-panel" onClick={(e) => e.stopPropagation()}>
                          <div className="calendar-header">
                            <button className="cal-nav" onClick={(e) => {
                              e.stopPropagation();
                              const prevMonth = chartCalendarMonth - 1;
                              if (prevMonth < 0) {
                                setChartCalendarMonth(11);
                                setChartCalendarYear(chartCalendarYear - 1);
                              } else {
                                setChartCalendarMonth(prevMonth);
                              }
                            }}>◀</button>
                            <div className="cal-title">{new Date(chartCalendarYear, chartCalendarMonth, 1).toLocaleString('fr-FR', { month: 'long' })} {chartCalendarYear}</div>
                            <button className="cal-nav" onClick={(e) => {
                              e.stopPropagation();
                              const nextMonth = chartCalendarMonth + 1;
                              if (nextMonth > 11) {
                                setChartCalendarMonth(0);
                                setChartCalendarYear(chartCalendarYear + 1);
                              } else {
                                setChartCalendarMonth(nextMonth);
                              }
                            }}>▶</button>
                          </div>
                          <div className="calendar-grid">
                            {['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map(d => (
                              <div key={d} className="cal-weekday">{d}</div>
                            ))}
                            {(() => {
                              const firstDay = new Date(chartCalendarYear, chartCalendarMonth, 1);
                              const startWeekday = (firstDay.getDay() + 6) % 7; // lun=0
                              const daysInMonth = new Date(chartCalendarYear, chartCalendarMonth + 1, 0).getDate();
                              const cells: React.ReactNode[] = [];
                              for (let i = 0; i < startWeekday; i++) {
                                cells.push(<div key={`empty-${i}`} className="cal-cell empty"></div>);
                              }
                              for (let d = 1; d <= daysInMonth; d++) {
                                const thisDate = new Date(chartCalendarYear, chartCalendarMonth, d);
                                const isSelectedStart = chartCustomStartDate && thisDate.toDateString() === chartCustomStartDate.toDateString();
                                const isSelectedEnd = chartCustomEndDate && thisDate.toDateString() === chartCustomEndDate.toDateString();
                                const inRange = chartCustomStartDate && chartCustomEndDate && thisDate >= chartCustomStartDate && thisDate <= chartCustomEndDate;
                                const cls = `cal-cell day ${isSelectedStart || isSelectedEnd ? 'selected' : ''} ${inRange ? 'in-range' : ''}`;
                                cells.push(
                                  <div
                                    key={`d-${d}`}
                                    className={cls}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!chartCustomStartDate || (chartCustomStartDate && chartCustomEndDate)) {
                                        setChartCustomStartDate(thisDate);
                                        setChartCustomEndDate(null);
                                      } else if (chartCustomStartDate && !chartCustomEndDate) {
                                        if (thisDate < chartCustomStartDate) {
                                          setChartCustomEndDate(chartCustomStartDate);
                                          setChartCustomStartDate(thisDate);
                                        } else {
                                          setChartCustomEndDate(thisDate);
                                        }
                                      }
                                    }}
                                  >
                                    <span className="day-number">{d}</span>
                                  </div>
                                );
                              }
                              return cells;
                            })()}
                          </div>
                          <div className="calendar-actions">
                            <button
                              className="cal-btn apply"
                              disabled={!chartCustomStartDate || !chartCustomEndDate}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPeriod('custom');
                                setCustomStartDate(chartCustomStartDate);
                                setCustomEndDate(chartCustomEndDate);
                                setIsChartCustomCalendarOpen(false);
                                setIsChartPeriodMenuOpen(false);
                              }}
                            >Appliquer</button>
                            <button
                              className="cal-btn cancel"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsChartCustomCalendarOpen(false);
                                setIsChartPeriodMenuOpen(false);
                              }}
                            >Annuler</button>
                          </div>
                        </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
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
        {/* Date range come espansione del menu - già incluso sopra nella voce Personnaliser */}

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