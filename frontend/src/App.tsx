import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom'
import Login from './Login'
import Dashboard from './Dashboard'
import List from './List';
import AddPartner from './AddPartner';
import Admin from './admin';
import Inscription from './Inscription';
import CreateChatbot from './CreateChatbot';
import ChatbotDetail from './ChatbotDetail';
import StudentDetail from './StudentDetail';
import StudentList from './StudentList';
import ChatHistory from './ChatHistory';
import HeaderMenu from './HeaderMenu';
import AllStudentList from './AllStudentList';
import Analysis from './Analysis';
import './App.css'

function AppLayout() {
  const location = useLocation();
  // Nascondi header su login e inscription
  const hideHeader = location.pathname === '/' || location.pathname === '/login' || location.pathname === '/inscription';
  return (
    <>
      {!hideHeader && <HeaderMenu />}
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/inscription" element={<Inscription />} />
        <Route path="/add-partner" element={<AddPartner />} />
        <Route path="/login" element={<Login />} /> 
        <Route path="/list" element={<List />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/create-chatbot" element={<CreateChatbot />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/chatbot/:storyline_key" element={<ChatbotDetail />} />
        <Route path="/chatbot/:storyline_key/learners/:email" element={<StudentDetail />} />
        <Route path="/chatbot/:storyline_key/learners" element={<StudentList />} />
        <Route path="/student-list" element={<StudentList />} />
        <Route path="/chat-history" element={<ChatHistory />} />
        <Route path="/all-student-list" element={<AllStudentList />} />
        <Route path="/analysis" element={<Analysis />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  )
}

export default App
