import './assets/css/list.css';
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';

// Definisci un'interfaccia per i dati
interface DataItem {
  id: number;
  name: string;
  score: number;
  client_name: string;
  user_id: string;
  historique: string;
  rapport: string;
}

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

function List() {
  const [data, setData] = useState<DataItem[]>([]);
  const [modalContent, setModalContent] = useState<string | null>(null);
  const [modalTitle, setModalTitle] = useState<string>('');
  const query = useQuery();
  const clientName = query.get('client_name');
  const [filter, setFilter] = useState('');
  const [filteredData, setFilteredData] = useState<DataItem[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      let query = supabase.from('userlist').select('*');
      if (clientName) {
        query = query.eq('client_name', clientName);
      }
      const { data, error } = await query;
      if (error) {
        console.error('Errore nel recupero dei dati:', error);
      } else {
        setData(data || []);
        setFilteredData(data || []);
      }
    };
    fetchData();
  }, [clientName]);

  useEffect(() => {
    setFilteredData(
      data.filter(item => {
        const search = filter.toLowerCase();
        return (
          item.name.toLowerCase().includes(search) ||
          String(item.score).toLowerCase().includes(search) ||
          item.client_name.toLowerCase().includes(search) ||
          item.user_id.toLowerCase().includes(search) ||
          (item.historique && item.historique.toLowerCase().includes(search)) ||
          (item.rapport && item.rapport.toLowerCase().includes(search))
        );
      })
    );
  }, [filter, data]);

  const openModal = (title: string, content: string) => {
    setModalTitle(title);
    setModalContent(content);
  };

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

  return (
    <div className="list-container">
      <h1>List</h1>
      <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
        <input
          type="text"
          placeholder="Trier par mots clés..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{ padding: '6px 10px', borderRadius: '4px', border: '1.5px solid #bbb', minWidth: 0, flex: 3 }}
        />
        <button
          onClick={() => setFilter('')}
          style={{ padding: '6px 8px', borderRadius: '4px', border: '1.5px solid #bbb', background: '#eee', cursor: 'pointer', flex: '0 0 60px', minWidth: '60px' }}
        >
          Reset
        </button>
      </div>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Nome</th>
            <th>Score</th>
            <th>Client Name</th>
            <th>User ID</th>
            <th>Historique</th>
            <th>Rapport</th>
          </tr>
        </thead>
        <tbody>
          {filteredData.map(item => (
            <tr key={item.id}>
              <td>{item.id}</td>
              <td>{item.name}</td>
              <td>{item.score}</td>
              <td>{item.client_name}</td>
              <td>{item.user_id}</td>
              <td>
                <button
                  onClick={() => openModal('Historique', item.historique)}
                  disabled={!item.historique}
                  style={{
                    backgroundColor: !item.historique ? '#ccc' : undefined,
                    color: !item.historique ? '#666' : undefined,
                    cursor: !item.historique ? 'not-allowed' : 'pointer',
                    padding: '2px 8px',
                    fontSize: '0.85em',
                    borderRadius: '4px',
                    border: '1px solid #bbb',
                  }}
                >
                  View
                </button>
              </td>
              <td>
                <button
                  onClick={() => openModal('Rapport', item.rapport)}
                  disabled={!item.rapport}
                  style={{
                    backgroundColor: !item.rapport ? '#ccc' : undefined,
                    color: !item.rapport ? '#666' : undefined,
                    cursor: !item.rapport ? 'not-allowed' : 'pointer',
                    padding: '2px 8px',
                    fontSize: '0.85em',
                    borderRadius: '4px',
                    border: '1px solid #bbb',
                  }}
                >
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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