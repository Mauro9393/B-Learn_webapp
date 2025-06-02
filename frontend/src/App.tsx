
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import Login from './Login'
import Dashboard from './Dashboard'
import List from './List';
import AddPartner from './AddPartner';
import Admin from './admin';
import Inscription from './Inscription';
import CreateChatbot from './CreateChatbot';
import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/inscription" element={<Inscription />} />
        <Route path="/add-partner" element={<AddPartner />} />
        <Route path="/login" element={<Login />} /> 
        <Route path="/list" element={<List />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/create-chatbot" element={<CreateChatbot />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Router>
  )
}

export default App
