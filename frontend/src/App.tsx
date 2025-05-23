
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import Login from './Login'
import Dashboard from './Dashboard'
import List from './List';
import Admin from './admin';
import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} /> 
        <Route path="/list" element={<List />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Router>
  )
}

export default App
