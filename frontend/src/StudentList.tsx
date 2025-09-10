import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import './assets/css/studentList.css';
import { useBreadcrumbContext } from './BreadcrumbContext';
import { useSettings } from './SettingsContext';

interface StudentRow {
  name: string;
  email: string;
  usergroup: string;
  simulations: number;
  score: number;
  last_date: string;
  chat_analysis: boolean;
}

const StudentList: React.FC = () => {
  const { storyline_key } = useParams<{ storyline_key: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Salva le informazioni del tenant nel localStorage quando arrivano dallo stato
  if (location.state?.tenant_name) {
    localStorage.setItem(`tenant_${storyline_key}`, location.state.tenant_name);
    localStorage.setItem(`storyline_${storyline_key}`, location.state.storyline_key);
  }
  
  // Recupera le informazioni dal localStorage o dallo stato
  const tenant_name = location.state?.tenant_name || 
                     localStorage.getItem(`tenant_${storyline_key}`) || 
                     'Client inconnu';
  const storyline_key_from_state = location.state?.storyline_key || 
                                  localStorage.getItem(`storyline_${storyline_key}`) || 
                                  storyline_key;
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [minScore, setMinScore] = useState('');
  const [minSimulations, setMinSimulations] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  // Stato per la paginazione mobile
  const [currentPage, setCurrentPage] = useState(1);
  const cardsPerPage = 5;
  const totalPages = Math.ceil((Array.isArray(students) ? students.length : 0) / cardsPerPage);
  const paginatedCards = Array.isArray(students) ? students.slice((currentPage - 1) * cardsPerPage, currentPage * cardsPerPage) : [];
  const goToPrevPage = () => setCurrentPage(p => Math.max(1, p - 1));
  const goToNextPage = () => setCurrentPage(p => Math.min(totalPages, p + 1));
  useEffect(() => { setCurrentPage(1); }, [students]);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const { addBreadcrumb } = useBreadcrumbContext();
  const { settings } = useSettings();
  
  // Dropdown personalizzati (stile identico a Période)
  const [isScoreMenuOpen, setIsScoreMenuOpen] = useState(false);
  const [isSimMenuOpen, setIsSimMenuOpen] = useState(false);
  const [isMonthMenuOpen, setIsMonthMenuOpen] = useState(false);
  const [isYearMenuOpen, setIsYearMenuOpen] = useState(false);
  const scoreDropdownRef = useRef<HTMLDivElement>(null);
  const simDropdownRef = useRef<HTMLDivElement>(null);
  const monthDropdownRef = useRef<HTMLDivElement>(null);
  const yearDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (scoreDropdownRef.current && !scoreDropdownRef.current.contains(e.target as Node)) setIsScoreMenuOpen(false); };
    if (isScoreMenuOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isScoreMenuOpen]);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (simDropdownRef.current && !simDropdownRef.current.contains(e.target as Node)) setIsSimMenuOpen(false); };
    if (isSimMenuOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isSimMenuOpen]);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (monthDropdownRef.current && !monthDropdownRef.current.contains(e.target as Node)) setIsMonthMenuOpen(false); };
    if (isMonthMenuOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isMonthMenuOpen]);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (yearDropdownRef.current && !yearDropdownRef.current.contains(e.target as Node)) setIsYearMenuOpen(false); };
    if (isYearMenuOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isYearMenuOpen]);
  
  // Stato per i gruppi
  const [groups, setGroups] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');

  // Stato per la selezione multipla
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Funzione per gestire il cambio di gruppo
  const handleGroupChange = (group: string) => {
    setSelectedGroup(group);
    // Salva il gruppo selezionato nel localStorage
    localStorage.setItem(`selectedGroup_${storyline_key}`, group);
  };

  // Funzioni per la selezione multipla
  const handleSelectRow = (email: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(email)) {
      newSelected.delete(email);
    } else {
      newSelected.add(email);
    }
    setSelectedRows(newSelected);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRows(new Set());
      setSelectAll(false);
    } else {
      setSelectedRows(new Set(sortedStudents.map(student => student.email)));
      setSelectAll(true);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedRows.size === 0) return;
    
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${selectedRows.size} apprenant(s) ?`)) {
      return;
    }

    try {
      const response = await fetch('/api/learners/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emails: Array.from(selectedRows),
          storyline_key: storyline_key
        }),
      });

      if (response.ok) {
        // Rimuovi i learners eliminati dai dati locali
        const newStudents = students.filter(student => !selectedRows.has(student.email));
        setStudents(newStudents);
        setSelectedRows(new Set());
        setSelectAll(false);
        alert(`${selectedRows.size} apprenant(s) supprimée(s) avec succès !`);
      } else {
        throw new Error('Error during delection');
      }
    } catch (error) {
      console.error('Error during delection', error);
      alert('Error during delection');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/learners-list-maxscore?storyline_key=${storyline_key}`);
        const data = await res.json();
        setStudents(data);
        
        // Estrai i gruppi unici dai dati
        const uniqueGroups = Array.from(new Set(data.map((student: StudentRow) => student.usergroup))) as string[];
        setGroups(uniqueGroups);
        
        // Se c'è un gruppo selezionato nello state, impostalo
        if (location.state?.selectedGroup) {
          setSelectedGroup(location.state.selectedGroup);
        }
      } catch (e) {
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [storyline_key, location.state?.selectedGroup]);

  // Carica il gruppo selezionato dal localStorage quando il componente si monta
  useEffect(() => {
    const savedGroup = localStorage.getItem(`selectedGroup_${storyline_key}`);
    if (savedGroup && !location.state?.selectedGroup) {
      setSelectedGroup(savedGroup);
    }
  }, [storyline_key, location.state?.selectedGroup]);

  const filteredStudents = (Array.isArray(students) ? students : []).filter(stu => {
    // Filtre pour la recherche de texte (nom ou email)
    const matchesSearch =
      stu.name.toLowerCase().includes(search.toLowerCase()) ||
      stu.email.toLowerCase().includes(search.toLowerCase());

    // Filtro per range di punteggio
    const matchesScore = minScore ? (() => {
      const score = stu.score;
      switch(minScore) {
        case '0-20': return score >= 0 && score <= 20;
        case '20-40': return score >= 20 && score <= 40;
        case '40-60': return score >= 40 && score <= 60;
        case '60-80': return score >= 60 && score <= 80;
        case '80-100': return score >= 80 && score <= 100;
        default: return true;
      }
    })() : true;

    // Filtro per simulazioni minime
    const matchesSimulations = minSimulations ? stu.simulations >= parseInt(minSimulations) : true;

    // Filtro per anno (se last_date è nel formato YYYY-MM-DD)
    let matchesYear = true;
    if (yearFilter && stu.last_date) {
      const dateParts = stu.last_date.split(/[\/\-]/);
      if (dateParts.length >= 3) {
        const year = dateParts[2] || dateParts[0]; // Supporta sia DD/MM/YYYY che YYYY-MM-DD
        matchesYear = year === yearFilter;
      }
    }

    // Filtro per mese (se last_date è nel formato YYYY-MM-DD)
    let matchesMonth = true;
    if (monthFilter && stu.last_date) {
      const dateParts = stu.last_date.split(/[\/\-]/);
      if (dateParts.length >= 3) {
        const month = dateParts[1]; // Il mese è sempre nella posizione 1
        matchesMonth = month === monthFilter;
      }
    }

    // Filtro per gruppo selezionato (etichette)
    const matchesSelectedGroup = selectedGroup === 'all' || stu.usergroup === selectedGroup;

    return matchesSearch && matchesScore && matchesSimulations && matchesYear && matchesMonth && matchesSelectedGroup;
  });

  // Funzione per parsing data formato giorno/mese/anno
  function parseDMY(dateStr: string) {
    if (!dateStr) return null;
    const [day, month, year] = dateStr.split(/[\/\-]/).map(Number);
    if (!day || !month || !year) return null;
    return new Date(year, month - 1, day);
  }

  // Funzione per ordinare gli studenti
  const sortedStudents = React.useMemo(() => {
    let sortable = [...filteredStudents];
    if (sortConfig !== null) {
      sortable.sort((a, b) => {
        let aValue = a[sortConfig.key as keyof StudentRow];
        let bValue = b[sortConfig.key as keyof StudentRow];
        // Gestione speciale per le colonne
        if (sortConfig.key === 'name' || sortConfig.key === 'usergroup') {
          aValue = String(aValue).toLowerCase();
          bValue = String(bValue).toLowerCase();
          if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
          if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        }
        if (sortConfig.key === 'score' || sortConfig.key === 'simulations') {
          return sortConfig.direction === 'asc'
            ? Number(aValue) - Number(bValue)
            : Number(bValue) - Number(aValue);
        }
        if (sortConfig.key === 'last_date') {
          const aDate = parseDMY(String(aValue));
          const bDate = parseDMY(String(bValue));
          const aTime = aDate ? aDate.getTime() : (sortConfig.direction === 'asc' ? Infinity : -Infinity);
          const bTime = bDate ? bDate.getTime() : (sortConfig.direction === 'asc' ? Infinity : -Infinity);
          return sortConfig.direction === 'asc'
            ? aTime - bTime
            : bTime - aTime;
        }
        return 0;
      });
    }
    return sortable;
  }, [filteredStudents, sortConfig]);

  // Funzione per cambiare ordinamento
  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="">
      <main className="student-list-main">
        {/* Card centrale titolo */}
        <div className="student-list-title-card">
          <h1>Liste des learners</h1>
          <div className="client-info">
            <span className="client-name">{tenant_name}</span>
            <span className="storyline-key">ID: {storyline_key_from_state}</span>
          </div>
        </div>
        {/* Breadcrumb 
        <div className="breadcrumb">
          <span className="breadcrumb-link" onClick={() => navigate('/dashboard')}>Dashboard</span> &gt;
          <span className="breadcrumb-link" onClick={() => navigate(`/chatbot/${storyline_key}`)}>Chatbot</span> &gt;
          <span className="current">Liste des learners</span>
        </div>*/}
        {/* Etichette gruppi */}
        {settings.showGroups && groups.length > 0 && (
          <div className="groups-container">
            <div className="group-label">Groupes :   </div>
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
        {/* Statistiche generali learners (placeholder, puoi aggiungere dati reali) */}
        {/* <div className="student-list-stats">
          <div className="stat-card"><span className="stat-icon">👥</span> <span className="stat-label">Total learners :</span> <span className="stat-value">{students.length}</span></div>
        </div> */}
        {selectedRows.size > 0 && (
          <div className="delete-selected-container">
            <button 
              className="delete-selected-btn"
              onClick={handleDeleteSelected}
              title={`Supprimer ${selectedRows.size} apprenant(s) sélectionné(s)`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3,6 5,6 21,6"></polyline>
                <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
              </svg>
              Supprimer ({selectedRows.size})
            </button>
          </div>
        )}
        {/* Tabella learners */}
        <div className="student-list-table-card">
          <div className="filters">
            <input
              type="text"
              placeholder="Rechercher un learner..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div className="period-dropdown" ref={scoreDropdownRef}>
              <button type="button" className="period-trigger" onClick={() => setIsScoreMenuOpen(o => !o)}>
                {minScore === '' ? 'Tous les scores' : `Score ${minScore}`}
                <span className="chevron">▾</span>
              </button>
              {isScoreMenuOpen && (
                <div className="period-menu">
                  <div className="menu-item" onClick={() => { setMinScore(''); setIsScoreMenuOpen(false); }}>Tous les scores</div>
                  <div className="menu-item" onClick={() => { setMinScore('0-20'); setIsScoreMenuOpen(false); }}>Score 0-20</div>
                  <div className="menu-item" onClick={() => { setMinScore('20-40'); setIsScoreMenuOpen(false); }}>Score 20-40</div>
                  <div className="menu-item" onClick={() => { setMinScore('40-60'); setIsScoreMenuOpen(false); }}>Score 40-60</div>
                  <div className="menu-item" onClick={() => { setMinScore('60-80'); setIsScoreMenuOpen(false); }}>Score 60-80</div>
                  <div className="menu-item" onClick={() => { setMinScore('80-100'); setIsScoreMenuOpen(false); }}>Score 80-100</div>
                </div>
              )}
            </div>
            <div className="period-dropdown" ref={simDropdownRef}>
              <button type="button" className="period-trigger" onClick={() => setIsSimMenuOpen(o => !o)}>
                {minSimulations === '' ? 'Toutes les simulations' : `≥ ${minSimulations} simulations`}
                <span className="chevron">▾</span>
              </button>
              {isSimMenuOpen && (
                <div className="period-menu">
                  <div className="menu-item" onClick={() => { setMinSimulations(''); setIsSimMenuOpen(false); }}>Toutes les simulations</div>
                  <div className="menu-item" onClick={() => { setMinSimulations('3'); setIsSimMenuOpen(false); }}>≥ 3 simulations</div>
                  <div className="menu-item" onClick={() => { setMinSimulations('5'); setIsSimMenuOpen(false); }}>≥ 5 simulations</div>
                  <div className="menu-item" onClick={() => { setMinSimulations('10'); setIsSimMenuOpen(false); }}>≥ 10 simulations</div>
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
                  {[...new Set(students.map(stu => {
                    if (stu.last_date) {
                      const dateParts = stu.last_date.split(/[\/\-]/);
                      if (dateParts.length >= 3) {
                        return dateParts[2] || dateParts[0];
                      }
                    }
                    return '';
                  }))]
                    .filter(y => y)
                    .sort((a, b) => b.localeCompare(a))
                    .map(year => (
                      <div key={year} className="menu-item" onClick={() => { setYearFilter(year); setIsYearMenuOpen(false); }}>{year}</div>
                    ))}
                </div>
              )}
            </div>
          </div>
          {/* Tabella desktop/tablet */}
          <table className="student-table styled-table no-vertical-lines">
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
                <th className="th-name" onClick={() => requestSort('name')} style={{ cursor: 'pointer' }}>
                  Nom <span className="sort-arrow">{sortConfig?.key === 'name' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                </th>
                {settings.showGroups && (
                  <th className="th-group" onClick={() => requestSort('usergroup')} style={{ cursor: 'pointer' }}>
                    Groupe <span className="sort-arrow">{sortConfig?.key === 'usergroup' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                  </th>
                )}
                <th className="th-simulations">Simulations</th>
                <th className="th-score" onClick={() => requestSort('score')} style={{ cursor: 'pointer' }}>
                  Score max <span className="sort-arrow">{sortConfig?.key === 'score' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                </th>
                <th className="th-date" onClick={() => requestSort('last_date')} style={{ cursor: 'pointer' }}>
                  Dernière simulation <span className="sort-arrow">{sortConfig?.key === 'last_date' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
                </th>
                <th className="th-details">Détails</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8}>Chargement...</td></tr>
              ) : sortedStudents.length === 0 ? (
                <tr><td colSpan={8}>Nothing found.</td></tr>
              ) : (
                sortedStudents.map(stu => (
                  <tr key={stu.email}>
                    <td className="checkbox-cell">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(stu.email)}
                        onChange={() => handleSelectRow(stu.email)}
                        title="Seleziona questo learner"
                      />
                    </td>
                    <td className="td-name" title={stu.name}>{stu.name}</td>
                    {settings.showGroups && <td className="td-group">{stu.usergroup}</td>}
                    <td className="td-simulations">{stu.simulations}</td>
                    <td className="td-score">
                      {stu.score === -1 ? (
                        <span>N/A</span>
                      ) : (
                        <span className={`score-badge score-badge-table ${stu.score >= 90 ? 'score-high' : stu.score >= 80 ? 'score-medium' : 'score-low'}`}>{stu.score}</span>
                      )}
                    </td>
                    <td className="td-date">
                      <span className="date-badge">{stu.last_date}</span>
                    </td>
                    <td className="td-details">
                      <button className="btn btn-voir" onClick={() => {
                        addBreadcrumb({ label: stu.name, path: `/chatbot/${storyline_key}/learners/${encodeURIComponent(stu.email)}` });
                        navigate(`/chatbot/${storyline_key}/learners/${encodeURIComponent(stu.email)}`, { 
                          state: { 
                            from: 'student-list',
                            tenant_name: tenant_name,
                            storyline_key: storyline_key_from_state
                          } 
                        });
                      }}>Voir</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {/* Card mobile */}
          <div className="student-cards">
            {paginatedCards.map(stu => (
              <div className="student-card" key={stu.email}>
                <div className="card-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedRows.has(stu.email)}
                    onChange={() => handleSelectRow(stu.email)}
                    title="Seleziona questo learner"
                  />
                </div>
                <div><strong>Nom:</strong> {stu.name}</div>
                {settings.showGroups && <div><strong>Groupe:</strong> {stu.usergroup}</div>}
                <div><strong>Simulations:</strong> {stu.simulations}</div>
                <div>
                  <strong>Score max:</strong>
                  {stu.score === -1 ? (
                    <span>N/A</span>
                  ) : (
                    <span className={`score-badge score-badge-table ${stu.score >= 90 ? 'score-high' : stu.score >= 80 ? 'score-medium' : 'score-low'}`}>{stu.score}</span>
                  )}
                </div>
                <div><strong>Dernière simulation:</strong> <span className="date-badge">{stu.last_date}</span></div>
                <div className="card-buttons">
                  <button className="btn btn-voir" onClick={() => {
                    addBreadcrumb({ label: stu.name, path: `/chatbot/${storyline_key}/learners/${encodeURIComponent(stu.email)}` });
                    navigate(`/chatbot/${storyline_key}/learners/${encodeURIComponent(stu.email)}`, { 
                      state: { 
                        from: 'student-list',
                        tenant_name: tenant_name,
                        storyline_key: storyline_key_from_state
                      } 
                    });
                  }}>Voir</button>
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
        </div>
      </main>
    </div>
  );
};

export default StudentList; 