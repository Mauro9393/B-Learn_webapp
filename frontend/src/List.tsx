import './assets/css/list.css';
import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
// @ts-ignore
import jsPDF from 'jspdf';
import { useBreadcrumbContext } from './BreadcrumbContext';
import { useSettings } from './SettingsContext';

// Definisci un'interfaccia per i dati
interface DataItem {
  id: number;
  user_email: string;
  chatbot_name: string;
  name: string;
  score: number;
  chat_history: string;
  chat_analysis: string;
  created_at?: string; // aggiunta per la data
  usergroup?: string; // aggiunta per il gruppo
  temp?: string; // aggiunta per il tempo formattato dal backend
}

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

// Frecce unicode
const UP_ARROW = '↑';
const DOWN_ARROW = '↓';

function List() {
  const [data, setData] = useState<DataItem[]>([]);
  const [modalContent, setModalContent] = useState<string | null>(null);
  const [modalTitle, setModalTitle] = useState<string>('');
  const query = useQuery();
  const chatbotName = query.get('chatbot_name');
  const location = useLocation();
  const [filter, setFilter] = useState('');
  const [scoreFilter, setScoreFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [showAllLaunches, setShowAllLaunches] = useState(false);
  const [filteredData, setFilteredData] = useState<DataItem[]>([]);
  // Stato per ordinamento
  const [sortColumn, setSortColumn] = useState<'name' | 'created_at' | 'score'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const navigate = useNavigate();
  // Stato per la paginazione mobile
  const [currentPage, setCurrentPage] = useState(1);
  const cardsPerPage = 5;
  const totalPages = Math.ceil(filteredData.length / cardsPerPage);
  // Calcola le card da mostrare in base alla pagina
  const paginatedCards = filteredData.slice((currentPage - 1) * cardsPerPage, currentPage * cardsPerPage);
  const { addBreadcrumb } = useBreadcrumbContext();
  const { settings } = useSettings();
  
  // Dropdown personalizzati per i filtri (stesso stile del Période)
  const [isScoreMenuOpen, setIsScoreMenuOpen] = useState(false);
  const [isMonthMenuOpen, setIsMonthMenuOpen] = useState(false);
  const [isYearMenuOpen, setIsYearMenuOpen] = useState(false);
  const scoreDropdownRef = useRef<HTMLDivElement>(null);
  const monthDropdownRef = useRef<HTMLDivElement>(null);
  const yearDropdownRef = useRef<HTMLDivElement>(null);
  
  // Stato per i gruppi
  const [groups, setGroups] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');

  // Stato per mostrare i criteri
  const [showCriteres, setShowCriteres] = useState(false);

  // Stato per la selezione multipla
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Opzioni dinamiche anni come array (per dropdown custom)
  const years = React.useMemo(() => (
    [...new Set(data.map(item => item.created_at ? item.created_at.substring(0,4) : ''))]
      .filter(y => y)
      .sort((a, b) => b.localeCompare(a))
  ), [data]);

  // Click outside handlers
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (scoreDropdownRef.current && !scoreDropdownRef.current.contains(e.target as Node)) setIsScoreMenuOpen(false);
    };
    if (isScoreMenuOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isScoreMenuOpen]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (monthDropdownRef.current && !monthDropdownRef.current.contains(e.target as Node)) setIsMonthMenuOpen(false);
    };
    if (isMonthMenuOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isMonthMenuOpen]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(e.target as Node)) setIsYearMenuOpen(false);
    };
    if (isYearMenuOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isYearMenuOpen]);

  // Funzione per parsare i criteri dal testo dell'analisi (robusta e dinamica)
  const parseCriteres = (analysis: string) => {
    if (!analysis) return [];

    // Normalizza il testo per gestire spazi e caratteri Unicode strani
    const normalized = analysis
      .normalize('NFKC')
      .replace(/[\u00A0\u202F\u2007\u2009\u200A\u200B]+/g, ' ')
      .replace(/[⁄∕⧸⟋]/g, '/')
      .replace(/[：﹕꞉︓]/g, ':')
      .replace(/\n\s*:\s*/g, ' : ');

    // Trova tutti gli header "Critère n°X" (accetta anche "Critere")
    const headerRegex = /Crit[eè]re\s*n[°ºo]?\s*(\d+)/gi;
    const headers = Array.from(normalized.matchAll(headerRegex));
    const criteres: Array<{ name: string; description: string; note: number; fullMatch: string }>=[];

    for (let i = 0; i < headers.length; i++) {
      const m = headers[i];
      const num = m[1];
      const start = m.index ?? 0;
      const end = i < headers.length - 1 ? (headers[i + 1].index ?? normalized.length) : normalized.length;
      const block = normalized.slice(start, end);

      // Estrai la nota nel blocco
      const noteMatch = block.match(/Note\s*[ :]\s*(\d+)\s*\/\s*(10|100)\b/i);
      if (!noteMatch) continue;
      const raw = parseInt(noteMatch[1], 10);
      const denom = parseInt(noteMatch[2], 10);
      const note = denom === 100 ? raw : (raw <= 10 ? raw * 10 : raw);

      // Ricava una descrizione breve: PRIORITARIO = testo sulla stessa riga dell'header
      const headerLine = block.split(/\n/)[0] || '';
      let description = '';
      const sameLineRegex = new RegExp(`Crit[eè]re\\s*n[°ºo]?\\s*${num}\s*[ ,:—–-]*\s*(.+)$`, 'i');
      const sameLineMatch = headerLine.match(sameLineRegex);
      if (sameLineMatch && sameLineMatch[1]) {
        description = sameLineMatch[1].trim();
      }
      // Fallback 1: linea con trattino che introduce il titolo (esclude etichette non titolo)
      if (!description) {
        const dashTitleMatch = block.match(/(^|\n)\s*[—–\-]\s*(?!La question|Ma r[ée]ponse|La r[ée]ponse id[ée]ale|Corrections? apportées|Point|Axe|Commentaires?)([^:\n]{1,120}?)\s*:/i);
        if (dashTitleMatch && dashTitleMatch[2]) {
          description = dashTitleMatch[2].trim();
        }
      }
      // Fallback 2: prima riga con ":" che non sia Point/Axe/Commentaire/La question/Ma réponse/La réponse idéale/Corrections apportées
      if (!description) {
        const afterHeader = block.slice(headerLine.length);
        const candidate = (afterHeader.split(/\n+/).find(l => {
          const s = l.trim();
          return s && !/^Note\b/i.test(s) && /:/.test(s) && !/^(Point\(s\)?|Point|Axe|Commentaire|Commentaires?|La question|Ma r[ée]ponse|La r[ée]ponse id[ée]ale|Corrections? apportées)/i.test(s);
        }) || '').trim();
        if (candidate) {
          description = candidate.split(':')[0].trim();
        }
      }
      description = description.replace(/^[—–\-]\s*/, '').replace(/\s*[:，]\s*$/, '');

      criteres.push({
        name: `Critère n°${num}`,
        description,
        note,
        fullMatch: block
      });
    }

    return criteres;
  };

  // Restituisce solo la prima parola della descrizione seguita da "..."
  const getCritereShortLabel = (description: string) => {
    const d = (description || '').trim();
    if (!d) return '';
    const firstWord = d
      .replace(/^[:\-\s]+/, '')
      .split(/\s+/)[0]
      .replace(/[.,;:!?)]*$/, '');
    return firstWord ? `${firstWord}...` : '';
  };

  // Stato per il numero massimo di criteri
  const [maxCriteres, setMaxCriteres] = useState(0);

  // Calcola il numero massimo di criteri quando cambiano i dati filtrati
  useEffect(() => {
    let max = 0;
    filteredData.forEach(item => {
      if (item.chat_analysis) {
        const criteres = parseCriteres(item.chat_analysis);
        //console.log(`=== DEBUG List.tsx: ${item.name} ===`);
        //console.log(`Chat analysis length: ${item.chat_analysis.length}`);
        //console.log(`Criteri trovati: ${criteres.length}`);
        if (criteres.length > 0) {
          //console.log('Primo criterio:', criteres[0]);
        }
        //console.log('=== FINE DEBUG ===');
        max = Math.max(max, criteres.length);
      }
    });
    setMaxCriteres(max);
  }, [filteredData]);



  // Funzione per determinare la classe CSS del criterio in base al punteggio
  const getCritereClass = (note: number) => {
    // Per note su 100: rosso 0-49, giallo 50-79, verde 80-100
    // Usa le stesse soglie di Analysis.tsx per coerenza visiva
    if (note < 50) return 'critere-red';
    if (note < 80) return 'critere-yellow';
    return 'critere-green';
  };

  // Funzione per gestire il cambio di gruppo
  const handleGroupChange = (group: string) => {
    setSelectedGroup(group);
    // Salva il gruppo selezionato nel localStorage
    localStorage.setItem(`selectedGroup_${chatbotName}`, group);
  };

  // Funzioni per la selezione multipla
  const handleSelectRow = (id: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRows(new Set());
      setSelectAll(false);
    } else {
      setSelectedRows(new Set(sortedData.map(item => item.id)));
      setSelectAll(true);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedRows.size === 0) return;
    
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${selectedRows.size} simulation(s) ?`)) {
      return;
    }

    try {
      const response = await fetch('/api/userlist/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ids: Array.from(selectedRows),
          chatbot_name: chatbotName
        }),
      });

      if (response.ok) {
        // Rimuovi le righe eliminate dai dati locali
        const newData = data.filter(item => !selectedRows.has(item.id));
        setData(newData);
        setFilteredData(newData);
        setSelectedRows(new Set());
        setSelectAll(false);
        alert(`${selectedRows.size} Simulation(s) supprimée(s) avec succès !`);
      } else {
        throw new Error('Error during delection');
      }
    } catch (error) {
      console.error('Error during deletion:', error);
      alert('Error during delection');
    }
  };

  // Salva le informazioni del tenant nel localStorage quando arrivano dallo stato
  if (location.state?.tenant_name) {
    localStorage.setItem(`tenant_${chatbotName}`, location.state.tenant_name);
    localStorage.setItem(`storyline_${chatbotName}`, location.state.storyline_key);
  }
  
  // Recupera le informazioni dal localStorage o dallo stato
  const tenant_name = location.state?.tenant_name || 
                     localStorage.getItem(`tenant_${chatbotName}`) || 
                     'Client inconnu';
  const storyline_key_from_state = location.state?.storyline_key || 
                                  localStorage.getItem(`storyline_${chatbotName}`) || 
                                  chatbotName;

  useEffect(() => {
    const fetchData = async () => {
      let url = `/api/userlist`;
      if (chatbotName) {
        url += `?chatbot_name=${encodeURIComponent(chatbotName)}`;
      }
      const response = await fetch(url);
      const data = await response.json();
      //console.log('=== DEBUG List.tsx - Dati ricevuti dal backend ===');
      console.log('Totale elementi:', data?.length);
      if (data && data.length > 0) {
        //console.log('Primo elemento:', data[0]);
        //console.log('Campi disponibili:', Object.keys(data[0]));
      }
      //console.log('=== FINE DEBUG ===');
      setData(data || []);
      setFilteredData(data || []);
      
      // Estrai i gruppi unici dai dati
      const uniqueGroups = Array.from(new Set(data.map((item: DataItem) => item.usergroup || 'Groupe par défaut'))) as string[];
      setGroups(uniqueGroups);
      
      // Se c'è un gruppo selezionato nello state, impostalo
      if (location.state?.selectedGroup) {
        setSelectedGroup(location.state.selectedGroup);
      }
    };
    fetchData();
  }, [chatbotName, location.state?.selectedGroup]);

  // Carica il gruppo selezionato dal localStorage quando il componente si monta
  useEffect(() => {
    const savedGroup = localStorage.getItem(`selectedGroup_${chatbotName}`);
    if (savedGroup && !location.state?.selectedGroup) {
      setSelectedGroup(savedGroup);
    }
  }, [chatbotName, location.state?.selectedGroup]);

  useEffect(() => {
    setFilteredData(
      data.filter(item => {
        // Filtro per score -1 (solo se showAllLaunches è true)
        if (!showAllLaunches && item.score === -1) {
          return false;
        }
        
        // Filtro par nom
        const matchesName = item.name.toLowerCase().includes(filter.toLowerCase());
        // Filtro per range di punteggio
        const matchesScore = scoreFilter ? (() => {
          const score = item.score;
          switch(scoreFilter) {
            case '0-20': return score >= 0 && score <= 20;
            case '20-40': return score >= 20 && score <= 40;
            case '40-60': return score >= 40 && score <= 60;
            case '60-80': return score >= 60 && score <= 80;
            case '80-100': return score >= 80 && score <= 100;
            default: return true;
          }
        })() : true;
        // Filtro per anno
        let matchesYear = true;
        if (yearFilter && item.created_at) {
          matchesYear = item.created_at.startsWith(yearFilter);
        }
        // Filtro per mese
        let matchesMonth = true;
        if (monthFilter && item.created_at) {
          const month = item.created_at.substring(5, 7); // Estrae MM da YYYY-MM-DD
          matchesMonth = month === monthFilter;
        }
        // Filtro per gruppo
        const matchesGroup = selectedGroup === 'all' || (item.usergroup || 'Groupe par défaut') === selectedGroup;
        return matchesName && matchesScore && matchesYear && matchesMonth && matchesGroup;
      })
    );
  }, [filter, scoreFilter, yearFilter, monthFilter, showAllLaunches, data, selectedGroup]);

  // Ordina i dati filtrati in base a sortColumn e sortDirection
  const sortedData = [...filteredData].sort((a, b) => {
    if (sortColumn === 'name') {
      if (a.name.toLowerCase() < b.name.toLowerCase()) return sortDirection === 'asc' ? -1 : 1;
      if (a.name.toLowerCase() > b.name.toLowerCase()) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    } else if (sortColumn === 'created_at') {
      // Plus récent = date plus grande
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    } else if (sortColumn === 'score') {
      return sortDirection === 'asc' ? a.score - b.score : b.score - a.score;
    }
    return 0;
  });

  // Gestori per la paginazione
  const goToPrevPage = () => setCurrentPage(p => Math.max(1, p - 1));
  const goToNextPage = () => setCurrentPage(p => Math.min(totalPages, p + 1));
  useEffect(() => { setCurrentPage(1); }, [filteredData]); // resetta pagina se cambia filtro

  const closeModal = () => {
    setModalContent(null);
    setModalTitle('');
  };

  const renderModalContent = () => {
    if (modalTitle === 'Rapport' && modalContent) {
      // Evidenzia tutte le occorrenze di 'Question X' in grassetto
      const parts = modalContent.split(/(Question \d+)/g);
      return (
        <div style={{ whiteSpace: 'pre-wrap', textAlign: 'left' }}>
          {parts.map((part, idx) =>
            /^Question \d+$/.test(part) ? <strong key={idx}>{part}</strong> : part
          )}
        </div>
      );
    }
    return <div style={{ whiteSpace: 'pre-wrap', textAlign: 'left' }}>{modalContent}</div>;
  };

  // Funzione per formattare la data (YYYY-MM-DD -> DD/MM/YYYY)
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('fr-FR');
  };

  // Gestione click sulle colonne
  const handleSort = (column: 'name' | 'created_at' | 'score') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      // Default: name = asc, created_at = desc, score = desc
      if (column === 'name') setSortDirection('asc');
      else setSortDirection('desc');
    }
  };

  // Freccia da mostrare accanto alla colonna ordinata
  const getArrow = (column: 'name' | 'created_at' | 'score') => {
    if (sortColumn !== column) return <span className="sort-arrow">⇅</span>;
    return <span className="sort-arrow">{sortDirection === 'asc' ? UP_ARROW : DOWN_ARROW}</span>;
  };

  // Funzione per scaricare PDF
  const downloadPDF = (title: string, content: string, filename: string) => {
    if (!content) return;
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text(title, 10, 18);
      doc.setFontSize(12);
      // Gestione testo multilinea
      const lines = doc.splitTextToSize(content, 180);
      doc.text(lines, 10, 30);
      doc.save(filename);
    } catch (e) {
      // Fallback: scarica come txt
      const blob = new Blob([content], { type: 'text/plain' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename.replace(/\.pdf$/, '.txt');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="list-container">
      <h1>Liste des Simulations</h1>
      <div className="client-info">
        <span className="client-name">{tenant_name}</span>
        <span className="storyline-key">ID: {storyline_key_from_state}</span>
      </div>
      {/* Breadcrumb 
      <div className="breadcrumb">
        <span className="breadcrumb-link" onClick={() => navigate('/dashboard')}>Dashboard</span> &gt;
        <span
          className="breadcrumb-link"
          onClick={() => navigate(`/chatbot/${chatbotName || ''}`)}
        >
          Chatbot
        </span> &gt;
        <span className='current'>Liste des simulations</span>
      </div>*/}
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
      {/* Filtri comme in simulations-list.html */}
      <br />
      <div className="filters">
        <input
          type="text"
          id="student-filter"
          placeholder="Rechercher un apprenant..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
        <div className="period-dropdown" ref={scoreDropdownRef}>
          <button type="button" className="period-trigger" onClick={() => setIsScoreMenuOpen(o => !o)}>
            {scoreFilter === '' ? 'Tous les scores' : `Score ${scoreFilter.replace('-', '-')}`}
            <span className="chevron">▾</span>
          </button>
          {isScoreMenuOpen && (
            <div className="period-menu">
              <div className="menu-item" onClick={() => { setScoreFilter(''); setIsScoreMenuOpen(false); }}>Tous les scores</div>
              <div className="menu-item" onClick={() => { setScoreFilter('0-20'); setIsScoreMenuOpen(false); }}>Score 0-20</div>
              <div className="menu-item" onClick={() => { setScoreFilter('20-40'); setIsScoreMenuOpen(false); }}>Score 20-40</div>
              <div className="menu-item" onClick={() => { setScoreFilter('40-60'); setIsScoreMenuOpen(false); }}>Score 40-60</div>
              <div className="menu-item" onClick={() => { setScoreFilter('60-80'); setIsScoreMenuOpen(false); }}>Score 60-80</div>
              <div className="menu-item" onClick={() => { setScoreFilter('80-100'); setIsScoreMenuOpen(false); }}>Score 80-100</div>
            </div>
          )}
        </div>
        <div className="period-dropdown" ref={monthDropdownRef}>
          <button type="button" className="period-trigger" onClick={() => setIsMonthMenuOpen(o => !o)}>
            {monthFilter === '' ? 'Tous les mois' : new Date(2000, parseInt(monthFilter, 10) - 1, 1).toLocaleString('fr-FR', { month: 'long' })}
            <span className="chevron">▾</span>
          </button>
          {isMonthMenuOpen && (
            <div className="period-menu">
              <div className="menu-item" onClick={() => { setMonthFilter(''); setIsMonthMenuOpen(false); }}>Tous les mois</div>
              {['01','02','03','04','05','06','07','08','09','10','11','12'].map((m) => (
                <div key={m} className="menu-item" onClick={() => { setMonthFilter(m); setIsMonthMenuOpen(false); }}>
                  {new Date(2000, parseInt(m, 10) - 1, 1).toLocaleString('fr-FR', { month: 'long' })}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="period-dropdown" ref={yearDropdownRef}>
          <button type="button" className="period-trigger" onClick={() => setIsYearMenuOpen(o => !o)}>
            {yearFilter === '' ? 'Toutes les années' : yearFilter}
            <span className="chevron">▾</span>
          </button>
          {isYearMenuOpen && (
            <div className="period-menu">
              <div className="menu-item" onClick={() => { setYearFilter(''); setIsYearMenuOpen(false); }}>Toutes les années</div>
              {years.map(year => (
                <div key={year} className="menu-item" onClick={() => { setYearFilter(year as string); setIsYearMenuOpen(false); }}>{year}</div>
              ))}
            </div>
          )}
        </div>
        <div className="toggle-container">
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={showAllLaunches}
              onChange={(e) => setShowAllLaunches(e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
          <span className="toggle-label">Tous les lancements</span>
        </div>
        {maxCriteres > 0 && (
          <div className="toggle-container">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={showCriteres}
                onChange={(e) => setShowCriteres(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
            <span className="toggle-label">Afficher les critères</span>
          </div>
        )}
      </div>
      
      {/* Etichetta Lancement */}
      <div className="lancement-label-container">
        <div className="lancement-label">
          {showAllLaunches ? 'Formations terminées / non terminées' : 'Formations terminées'} : {showAllLaunches ? filteredData.length : filteredData.filter(item => item.score >= 0).length}
        </div>
        {selectedRows.size > 0 && (
          <button 
            className="delete-selected-btn"
            onClick={handleDeleteSelected}
            title={`Supprimer ${selectedRows.size} simulazione/i selezionata/e`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3,6 5,6 21,6"></polyline>
              <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
            </svg>
            Supprimer ({selectedRows.size})
          </button>
        )}
      </div>
      <div className="simulations-container">
        <table className="simulations-table" id="simulations-table">
          <thead>
            <tr>
              <th className="checkbox-header">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAll}
                  title="Seleziona/Deseleziona tutto"
                />
              </th>
              <th className="sortable-header" onClick={() => handleSort('name')}>Nom {getArrow('name')}</th>
              <th className="sortable-header" onClick={() => handleSort('created_at')}>Date simulation {getArrow('created_at')}</th>
              {settings.showGroups && <th>Groupe</th>}
              <th className="sortable-header" onClick={() => handleSort('score')}>Score {getArrow('score')}</th>
              <th>Temps</th>
              {showCriteres && maxCriteres > 0 && Array.from({ length: maxCriteres }, (_, i) => {
                // Trova la descrizione del criterio dal primo elemento che ha criteri
                const firstItemWithCriteres = sortedData.find(item => {
                  const criteres = parseCriteres(item.chat_analysis);
                  return criteres.length > i;
                });
                const critereDescription = firstItemWithCriteres ? 
                  parseCriteres(firstItemWithCriteres.chat_analysis)[i]?.description : '';
                
                return (
                  <th key={`critere-${i + 1}`}>
                    <div>Critère n°{i + 1}</div>
                    {critereDescription && (
                      <div style={{ fontSize: '0.7rem', fontWeight: 'normal', color: '#666', marginTop: '2px' }}>
                        {getCritereShortLabel(critereDescription)}
                      </div>
                    )}
                  </th>
                );
              })}
              <th>Historique chat</th>
              <th>Analyse chat</th>
            </tr>
          </thead>
          <tbody id="simulationTableBody">
            {sortedData.map(item => (
              <tr key={item.id} data-student={item.name} data-date={item.created_at || ''} data-score={item.score}>
                <td className="checkbox-cell">
                  <input
                    type="checkbox"
                    checked={selectedRows.has(item.id)}
                    onChange={() => handleSelectRow(item.id)}
                    title="Seleziona questa riga"
                  />
                </td>
                <td>
                  <span 
                    className="clickable-name"
                    onClick={() => {
                      addBreadcrumb({ label: item.name || (item.user_email ? item.user_email.split('@')[0] : '') || 'Utilisateur inconnu', path: `/chatbot/${encodeURIComponent(chatbotName || '')}/learners/${encodeURIComponent(item.user_email)}` });
                      navigate(`/chatbot/${encodeURIComponent(chatbotName || '')}/learners/${encodeURIComponent(item.user_email)}`, { 
                        state: { 
                          from: 'simulations-list',
                          tenant_name: tenant_name,
                          storyline_key: storyline_key_from_state
                        } 
                      });
                    }}
                    title="Voir le profil"
                  >
                    {item.name || (item.user_email ? item.user_email.split('@')[0] : '') || 'Utilisateur inconnu'}
                  </span>
                </td>
                <td className="date-cell">{formatDate(item.created_at)}</td>
                {settings.showGroups && <td>{item.usergroup || 'Groupe par défaut'}</td>}
                <td>
                  {item.score === -1 ? (
                    <span>N/A</span>
                  ) : (
                    <span className={`score-badge ${item.score >= 80 ? 'score-high' : item.score >= 50 ? 'score-medium' : 'score-low'}`}>{item.score}</span>
                  )}
                </td>
                <td>{item.temp || '-'}</td>
                {showCriteres && maxCriteres > 0 && (() => {
                  const criteres = parseCriteres(item.chat_analysis);
                  return Array.from({ length: maxCriteres }, (_, i) => {
                    const critere = criteres.find(c => c.name === `Critère n°${i + 1}`);
                    return (
                      <td key={`critere-${i + 1}`} className="critere-cell">
                        {critere ? (
                          <span className={`critere-note ${getCritereClass(critere.note)}`}>
                            {critere.note}/100
                          </span>
                        ) : (
                          <span className="critere-empty">-</span>
                        )}
                      </td>
                    );
                  });
                })()}
                <td>
                  <div className="card-buttons">
                    <button
                      className="btn-small btn-download"
                      title="Télécharger"
                      onClick={() => downloadPDF('Historique chat', item.chat_history, `historique_${item.name}.pdf`)}
                      disabled={!item.chat_history}
                    >
                      {/* Icona download */}
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </button>
                    <button
                      className="btn-small btn-view"
                      title="Visualiser"
                      onClick={() => {
                        addBreadcrumb({ label: 'Historique', path: '/chat-history' });
                        navigate('/chat-history', { state: { name: item.name, date: item.created_at, score: item.score, chat_history: item.chat_history, chat_analysis: item.chat_analysis, temp: item.temp, show: 'analysis', from: 'simulations-list', storyline_key: chatbotName } });
                      }}
                      disabled={!item.chat_history}
                    >
                      {/* Icona occhio */}
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                  </div>
                </td>
                <td>
                  <div className="card-buttons">
                    <button
                      className={`btn-small btn-download ${!item.chat_analysis ? 'btn-disabled' : ''}`}
                      title="Télécharger"
                      onClick={() => downloadPDF('Rapport', item.chat_analysis, `rapport_${item.name}.pdf`)}
                      disabled={!item.chat_analysis}
                    >
                      {/* Icona download */}
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </button>
                    <button
                      className={`btn-small btn-view ${!item.chat_analysis ? 'btn-disabled' : ''}`}
                      title="Visualiser"
                      onClick={() => {
                        addBreadcrumb({ label: 'Analyse de Performance', path: '/analysis' });
                        navigate('/analysis', { state: { name: item.name, date: item.created_at, score: item.score, chat_analysis: item.chat_analysis, chat_history: item.chat_history, from: 'simulations-list', storyline_key: chatbotName } });
                      }}
                      disabled={!item.chat_analysis}
                    >
                      {/* Icona occhio */}
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="simulations-cards">
        {paginatedCards.map(item => (
          <div className="simulation-card" key={item.id}>
            <div className="card-checkbox">
              <input
                type="checkbox"
                checked={selectedRows.has(item.id)}
                onChange={() => handleSelectRow(item.id)}
                title="Seleziona questa simulazione"
              />
            </div>
            <div>
              <strong>Nom:</strong> 
              <span 
                className="clickable-name"
                onClick={() => {
                  addBreadcrumb({ label: item.name || (item.user_email ? item.user_email.split('@')[0] : '') || 'Utilisateur inconnu', path: `/chatbot/${encodeURIComponent(chatbotName || '')}/learners/${encodeURIComponent(item.user_email)}` });
                  navigate(`/chatbot/${encodeURIComponent(chatbotName || '')}/learners/${encodeURIComponent(item.user_email)}`, { 
                    state: { 
                      from: 'simulations-list',
                      tenant_name: tenant_name,
                      storyline_key: storyline_key_from_state
                    } 
                  });
                }}
                title="Voir le profil"
              >
                {item.name || (item.user_email ? item.user_email.split('@')[0] : '') || 'Utilisateur inconnu'}
              </span>
            </div>
            <div><strong>Date simulation:</strong> {formatDate(item.created_at)}</div>
            {settings.showGroups && <div><strong>Group:</strong> {item.usergroup || 'Groupe par défaut'}</div>}
            <div>
              <strong>Score:</strong>
              {item.score === -1 ? (
                <span>N/A</span>
              ) : (
                <span className={`score-badge ${item.score >= 80 ? 'score-high' : item.score >= 50 ? 'score-medium' : 'score-low'}`}>{item.score}</span>
              )}
            </div>
            <div><strong>Temp:</strong> {item.temp || '-'}</div>
            <div>
              <strong>Historique chat:</strong>
              <div className="card-buttons">
                <button className="btn-small btn-download" title="Télécharger"
                  onClick={() => downloadPDF('Historique chat', item.chat_history, `historique_${item.name}.pdf`)}
                  disabled={!item.chat_history}>
                  {/* Icona download */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </button>
                <button className="btn-small btn-view" title="Visualiser"
                  onClick={() => {
                    addBreadcrumb({ label: 'Historique', path: '/chat-history' });
                    navigate('/chat-history', { state: { name: item.name, date: item.created_at, score: item.score, chat_history: item.chat_history, chat_analysis: item.chat_analysis, temp: item.temp, show: 'analysis', from: 'simulations-list', storyline_key: chatbotName } });
                  }}
                  disabled={!item.chat_history}>
                  {/* Icona occhio */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
              </div>
            </div>
            <div>
              <strong>Analyse chat:</strong>
              <div className="card-buttons">
                <button className={`btn-small btn-download ${!item.chat_analysis ? 'btn-disabled' : ''}`} title="Télécharger"
                  onClick={() => downloadPDF('Rapport', item.chat_analysis, `rapport_${item.name}.pdf`)}
                  disabled={!item.chat_analysis}>
                  {/* Icona download */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </button>
                <button
                  className={`btn-small btn-view ${!item.chat_analysis ? 'btn-disabled' : ''}`}
                  title="Visualiser"
                  onClick={() => {
                    addBreadcrumb({ label: 'Analyse de Performance', path: '/analysis' });
                    navigate('/analysis', { state: { name: item.name, date: item.created_at, score: item.score, chat_analysis: item.chat_analysis, chat_history: item.chat_history, from: 'simulations-list', storyline_key: chatbotName } });
                  }}
                  disabled={!item.chat_analysis}
                >
                  {/* Icona occhio */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
              </div>
            </div>
          </div>
        ))}
        {/* Paginazione mobile */}
        {totalPages > 1 && (
          <div className="mobile-pagination">
            <button className="page-btn" onClick={goToPrevPage} disabled={currentPage === 1} aria-label="Pagina precedente">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span className="page-indicator">{currentPage} / {totalPages}</span>
            <button className="page-btn" onClick={goToNextPage} disabled={currentPage === totalPages} aria-label="Pagina successiva">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        )}
      </div>
      {modalContent !== null && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>
              &times;
            </button>
            <h2>{modalTitle}</h2>
            {renderModalContent()}
          </div>
        </div>
      )}
    </div>
  );
}

export default List;