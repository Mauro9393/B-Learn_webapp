import React, { useState } from 'react';
import './assets/css/login.css';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseLogin';
import bcrypt from 'bcryptjs';

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase
      .from('useraccount')
      .select('*')
      .eq('user_mail', email)
      .single();
  
    if (data && await bcrypt.compare(password, data.user_pw)) {
      localStorage.setItem('userEmail', email);
      navigate('/dashboard');
    } else {
      setError('Email o password errati');
    }
  };

  return (
    <div className="login-container">
      <h1>Login</h1>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="e-mail"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button type="submit">Log in</button>
        
      </form>
      {error && <p style={{color: 'red'}}>{error}</p>}
    </div>
  );
}

export default Login;