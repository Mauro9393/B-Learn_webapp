import './assets/css/list.css';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

// Definisci un'interfaccia per i dati
interface DataItem {
  id: number;
  user_email: string;
  chatbot_name: string;
  name: string;
  score: number;
  chat_history: string;
  chat_analysis: string;
}

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

function List() {
  const [data, setData] = useState<DataItem[]>([]);
  const [modalContent, setModalContent] = useState<string | null>(null);
  const [modalTitle, setModalTitle] = useState<string>('');
  const query = useQuery();
  const chatbotName = query.get('chatbot_name');
  const [filter, setFilter] = useState('');
  const [filteredData, setFilteredData] = useState<DataItem[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      let url = `${import.meta.env.VITE_API_URL}/api/userlist`;
      if (chatbotName) {
        url += `?chatbot_name=${encodeURIComponent(chatbotName)}`;
      }
      const response = await fetch(url);
      const data = await response.json();
      setData(data || []);
      setFilteredData(data || []);
    };
    fetchData();
  }, [chatbotName]);

  useEffect(() => {
    setFilteredData(
      data.filter(item => {
        const search = filter.toLowerCase();
        return (
          item.name.toLowerCase().includes(search) ||
          String(item.score).toLowerCase().includes(search) ||
          item.chatbot_name.toLowerCase().includes(search) ||
          item.user_email.toLowerCase().includes(search) ||
          (item.chat_history && item.chat_history.toLowerCase().includes(search)) ||
          (item.chat_analysis && item.chat_analysis.toLowerCase().includes(search))
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
              <td>{item.chatbot_name}</td>
              <td>{item.user_email}</td>
              <td>
                <button
                  onClick={() => openModal('Historique', item.chat_history)}
                  disabled={!item.chat_history}
                  style={{
                    backgroundColor: !item.chat_history ? '#ccc' : undefined,
                    color: !item.chat_history ? '#666' : undefined,
                    cursor: !item.chat_history ? 'not-allowed' : 'pointer',
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
                  onClick={() => openModal('Rapport', item.chat_analysis)}
                  disabled={!item.chat_analysis}
                  style={{
                    backgroundColor: !item.chat_analysis ? '#ccc' : undefined,
                    color: !item.chat_analysis ? '#666' : undefined,
                    cursor: !item.chat_analysis ? 'not-allowed' : 'pointer',
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