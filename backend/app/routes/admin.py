import React, { useState, useEffect } from 'react';
import { Route, Routes, BrowserRouter as Router } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import HomePage from './pages/HomePage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import AdminPage from './pages/AdminPage.jsx';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('duovideo_user');
    if (saved) {
      try { setUser(JSON.parse(saved)); } catch { localStorage.removeItem('duovideo_user'); }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setInstallPrompt(null);
  };

  if (loading) return null;

  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route path="/admin" element={<AdminPage />} />
        <Route
          path="/"
          element={
            user
              ? <HomePage user={user} installPrompt={installPrompt} onInstallClick={handleInstallClick} />
              : <RegisterPage onRegistered={setUser} />
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
