import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import LoadingOverlay from '../components/LoadingOverlay';
import './IntelligencePanel.css';
import { API_URL } from '../config';

const IntelligencePanel = () => {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const chatEndRef = useRef(null);

    const [summary, setSummary] = useState(null);
    const [metrics, setMetrics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [chatMsg, setChatMsg] = useState("");
    const [chatHistory, setChatHistory] = useState([
        { role: 'ai', content: '¡Hola! Soy el Asistente de Inteligencia Winners. Puedes preguntarme cosas como: "¿Qué rifa está en mayor riesgo?" o "¿Cuál es la más rentable?"' }
    ]);
    const [isThinking, setIsThinking] = useState(false);

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }
        fetchDashboard();
    }, []);

    useEffect(() => {
        // Auto-scroll to bottom on new chat messages
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory, isThinking]);

    const fetchDashboard = async () => {
        try {
            const res = await fetch(`${API_URL}/intelligence/dashboard`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.status === 401) { navigate('/login'); return; }
            if (res.status === 403) { setError('Acceso denegado. Necesitas rol de Administrador.'); return; }
            if (!res.ok) throw new Error('Error obteniendo datos');

            const data = await res.json();
            setSummary(data.summary);
            setMetrics(data.metrics);
        } catch (err) {
            setError('No se pudo conectar con el servidor.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleChat = async (e) => {
        e.preventDefault();
        if (!chatMsg.trim() || isThinking) return;

        const userMessage = chatMsg.trim();
        setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);
        setChatMsg("");
        setIsThinking(true);

        try {
            const res = await fetch(`${API_URL}/intelligence/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ message: userMessage })
            });
            const data = await res.json();

            if (res.ok) {
                setChatHistory(prev => [...prev, { role: 'ai', content: data.response }]);
            } else {
                setChatHistory(prev => [...prev, { role: 'error', content: data.error || 'Error del servidor' }]);
            }
        } catch (err) {
            setChatHistory(prev => [...prev, { role: 'error', content: 'Fallo de conexión con el Asistente.' }]);
        } finally {
            setIsThinking(false);
        }
    };

    const getRiskLabel = (risk) => {
        const map = {
            'LOW': { label: 'Bajo', emoji: '🟢' },
            'MEDIUM-LOW': { label: 'Medio-Bajo', emoji: '🟡' },
            'MEDIUM': { label: 'Medio', emoji: '🟠' },
            'HIGH': { label: 'Alto', emoji: '🔴' },
        };
        return map[risk] || { label: risk, emoji: '⚪' };
    };

    if (loading) return <LoadingOverlay />;
    if (error) return (
        <div className="intelligence-loading" style={{ flexDirection: 'column', gap: '1rem' }}>
            <span>⚠️ {error}</span>
            <button onClick={() => navigate('/dashboard')} style={{ color: '#8b00ff', background: 'none', border: '1px solid #8b00ff', padding: '0.5rem 1.5rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 700 }}>
                Volver a Sorteos
            </button>
        </div>
    );

    return (
        <div className="intelligence-panel">
            <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center justify-center space-x-3 py-3 px-6 bg-gradient-to-r from-[#8b00ff] to-[#ff00de] text-white font-black rounded-2xl transition-all duration-300 hover:-translate-y-1 active:scale-95 uppercase tracking-wider italic shadow-[0_10px_25px_rgba(139,0,255,0.3)] hover:shadow-[0_15px_35px_rgba(139,0,255,0.4)] w-full sm:w-auto self-start mb-6"
            >
                <ArrowLeft className="w-5 h-5 stroke-[3]" />
                <span className="text-sm">VOLVER A SORTEOS</span>
            </button>

            <h2>🧠 Asistente de Inteligencia Winners</h2>

            {/* Main Content */}
            <div className="intelligence-content">
                {/* Left: Indicators & Metrics */}
                <div className="metrics-section">
                    <div className="summary-cards">
                        <div className="card profit-card">
                            <h3>Ganancia Estimada Total</h3>
                            <p className="value">
                                ${summary?.totalEstimatedProfit !== undefined
                                    ? Math.round(summary.totalEstimatedProfit).toLocaleString('es-CO')
                                    : 0}
                            </p>
                        </div>
                        <div className="sub-cards-grid">
                            <div className="card">
                                <h3>Rifas Activas</h3>
                                <p className="value">{summary?.activeRaffles || 0}</p>
                            </div>
                            <div className="card highlight-risk">
                                <h3>Requieren Atención</h3>
                                <p className="value">{summary?.rafflesNeedingAttention || 0} rifas</p>
                            </div>
                        </div>
                    </div>

                    <h3>📊 Evaluación de Rifas Activas</h3>
                    <div className="metrics-list">
                        {metrics.length === 0 ? (
                            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>
                                No hay rifas activas en este momento.
                            </p>
                        ) : (
                            metrics.map(m => {
                                const { label, emoji } = getRiskLabel(m.risk);
                                return (
                                    <div
                                        key={m.id}
                                        className={`metric-item risk-${(m.risk || 'low').toLowerCase().replace('-', '-')}`}
                                    >
                                        <h4>{m.title}</h4>
                                        <p>Score: <strong>{Math.round(m.score || 0)}/100</strong></p>
                                        <p>Riesgo: <strong>{emoji} {label}</strong></p>
                                        <p>Punto de equilibrio: <strong>{m.breakEvenReached ? '✅ Alcanzado' : '❌ Pendiente'}</strong></p>
                                        <p>Ganancia estimada: <strong>${(m.profit || 0).toLocaleString('es-CO')}</strong></p>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right: AI Chat */}
                <div className="chat-section">
                    <h3>💬 Habla con el Asistente</h3>
                    <div className="chat-window">
                        {chatHistory.map((msg, i) => (
                            <div key={i} className={`chat-message ${msg.role}`}>
                                <div className="msg-content">{msg.content}</div>
                            </div>
                        ))}
                        {isThinking && (
                            <div className="chat-message ai thinking">
                                Analizando datos...
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>
                    <form onSubmit={handleChat} className="chat-input-form">
                        <textarea
                            placeholder="¿Qué rifa corre más riesgo?"
                            value={chatMsg}
                            onChange={(e) => setChatMsg(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleChat(e);
                                }
                            }}
                            disabled={isThinking}
                            autoComplete="off"
                            rows={3}
                        />
                        <button type="submit" disabled={isThinking || !chatMsg.trim()}>
                            Enviar
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default IntelligencePanel;
