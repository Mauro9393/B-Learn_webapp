import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react';
import Home from './Home'
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
import ChooseYourPw from './ChooseYourPw';
import Confirmation from './Confirmation';
import ForgotPassword from './ForgotPassword';
import ResetPassword from './ResetPassword';
import Breadcrumbs from "./Breadcrumbs";
import "./assets/css/breadcrumbs.css";
import './App.css'
import { BreadcrumbProvider } from "./BreadcrumbContext";
import { SettingsProvider } from "./SettingsContext";

// Componente per proteggere le route che richiedono autenticazione
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  useEffect(() => {
    const checkAuth = async () => {
      const userEmail = localStorage.getItem('userEmail');
      const userRole = localStorage.getItem('userRole');
      
      if (!userEmail || !userRole) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }
      
      // Verifica opzionale del token con il backend
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/verify-auth`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: userEmail, role: userRole })
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setIsAuthenticated(true);
          } else {
            // Token non valido, rimuovi i dati dal localStorage
            localStorage.removeItem('userEmail');
            localStorage.removeItem('userRole');
            setIsAuthenticated(false);
          }
        } else {
          // Se il backend non risponde, considera comunque autenticato se ci sono i dati locali
          // Questo permette di funzionare anche offline
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.warn('Errore di verifica auth, usando dati locali:', error);
        // In caso di errore di rete, considera comunque autenticato se ci sono i dati locali
        setIsAuthenticated(true);
      }
      
      setIsLoading(false);
    };
    
    checkAuth();
  }, []);
  
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#7F53F5',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: '20px' }}>🔐</div>
          Vérification de l'authentification...
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

function AppLayout() {
  const location = useLocation();
  // Nascondi header su home, login, inscription e confirmation
  const hideHeader = location.pathname === '/' || 
                    location.pathname === '/login' || 
                    location.pathname === '/inscription' ||
                    location.pathname === '/confirmation' ||
                    location.pathname === '/forgot-password' ||
                    location.pathname.startsWith('/reset-password');
  return (
    <>
      {!hideHeader && <HeaderMenu />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/inscription" element={<Inscription />} />
        <Route path="/login" element={<Login />} /> 
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/confirmation" element={<Confirmation />} />
        
        {/* Route protette che richiedono autenticazione */}
        <Route path="/add-partner" element={
          <ProtectedRoute>
            <AddPartner />
          </ProtectedRoute>
        } />
        <Route path="/list" element={
          <ProtectedRoute>
            <List />
          </ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/create-chatbot" element={
          <ProtectedRoute>
            <CreateChatbot />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute>
            <Admin />
          </ProtectedRoute>
        } />
        <Route path="/chatbot/:storyline_key" element={
          <ProtectedRoute>
            <ChatbotDetail />
          </ProtectedRoute>
        } />
        <Route path="/chatbot/:storyline_key/learners/:email" element={
          <ProtectedRoute>
            <StudentDetail />
          </ProtectedRoute>
        } />
        <Route path="/chatbot/:storyline_key/learners" element={
          <ProtectedRoute>
            <StudentList />
          </ProtectedRoute>
        } />
        <Route path="/student-list" element={
          <ProtectedRoute>
            <StudentList />
          </ProtectedRoute>
        } />
        <Route path="/chat-history" element={
          <ProtectedRoute>
            <ChatHistory />
          </ProtectedRoute>
        } />
        <Route path="/all-student-list" element={
          <ProtectedRoute>
            <AllStudentList />
          </ProtectedRoute>
        } />
        <Route path="/analysis" element={
          <ProtectedRoute>
            <Analysis />
          </ProtectedRoute>
        } />
        <Route path="/choose-password" element={
          <ProtectedRoute>
            <ChooseYourPw />
          </ProtectedRoute>
        } />
      </Routes>
    </>
  );
}

function App() {
  return (
    <SettingsProvider>
      <BreadcrumbProvider>
        <Router basename="/">
          <BreadcrumbsWrapper />
          <AppLayout />
        </Router>
      </BreadcrumbProvider>
    </SettingsProvider>
  )
}

function BreadcrumbsWrapper() {
  const location = useLocation();
  // Aggiungi qui tutti i path dove NON vuoi vedere il breadcrumbs
  const hideOn = [
    '/', 
    '/login', 
    '/reset-password', 
    '/forgot-password', 
    '/inscription', 
    '/confirmation'
  ];
  // Nascondi anche tutte le varianti di reset-password (es. con token)
  if (hideOn.includes(location.pathname) || location.pathname.startsWith('/reset-password')) {
    return null;
  }
  return <Breadcrumbs />;
}

export default App
