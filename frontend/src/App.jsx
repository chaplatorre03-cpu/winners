import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import RaffleManagement from './pages/RaffleManagement';
import PublicRaffle from './pages/PublicRaffle';
import PrivacyPolicy from './pages/PrivacyPolicy';
import ScrollToTop from './components/ScrollToTop';

function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/panel" element={<RaffleManagement />} />
        <Route path="/:id" element={<PublicRaffle />} />
      </Routes>
    </Router>
  );
}

export default App;
