import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Home,
    Grid,
    Settings,
    Trophy,
    LogOut,
    Search,
    Plus,
    Lock,
    X
} from 'lucide-react';
import WinnersLogo from '../components/WinnersLogo';
import './AdminPanel.css';

import { API_URL } from '../config';

const AdminPanel = () => {
    const navigate = useNavigate();
    const [raffles, setRaffles] = useState([]);
    const [selectedRaffle, setSelectedRaffle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showDrawModal, setShowDrawModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const token = localStorage.getItem('token');

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }
        fetchRaffles();
    }, []);

    // Lock body scroll when any modal is open
    useEffect(() => {
        const isAnyModalOpen = showDrawModal || showCreateModal || showLogoutConfirm;

        if (isAnyModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [showDrawModal, showCreateModal, showLogoutConfirm]);

    const fetchRaffles = async () => {
        try {
            const response = await fetch(`${API_URL}/raffles`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            setRaffles(data);
            if (data.length > 0) {
                setSelectedRaffle(data[0]);
            }
            setLoading(false);
        } catch (err) {
            console.error('Error fetching raffles:', err);
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const getTicketsByStatus = (status) => {
        if (!selectedRaffle) return [];
        return selectedRaffle.tickets?.filter(t => t.status === status) || [];
    };

    const apartadoTickets = getTicketsByStatus('APARTADO');
    const revisandoTickets = getTicketsByStatus('REVISANDO');
    const pagadoTickets = getTicketsByStatus('PAGADO');

    if (loading) {
        return (
            <div className="admin-panel">
                <div className="loading-container">
                    <p>Cargando...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-panel">
            {/* Sidebar */}
            <aside className="admin-sidebar">
                <div className="sidebar-header">
                    <WinnersLogo size="large" />
                </div>

                <nav className="sidebar-nav flex-1">
                    <button
                        className={`nav-item ${activeTab === 'talonario' ? 'active' : ''}`}
                        onClick={() => setActiveTab('talonario')}
                    >
                        <Grid size={18} />
                        <span>Talonario web</span>
                        <span className="external-icon">↗</span>
                    </button>

                    <button
                        className={`nav-item ${activeTab === 'administracion' ? 'active' : ''}`}
                        onClick={() => setActiveTab('administracion')}
                    >
                        <Grid size={18} />
                        <span>Administración</span>
                    </button>

                    <button
                        className={`nav-item ${activeTab === 'ajustes' ? 'active' : ''}`}
                        onClick={() => setActiveTab('ajustes')}
                    >
                        <Settings size={18} />
                        <span>Ajustes</span>
                    </button>


                    <button
                        className={`nav-item ${activeTab === 'sortear' ? 'active' : ''}`}
                        onClick={() => {
                            setActiveTab('sortear');
                            setShowDrawModal(true);
                        }}
                    >
                        <Trophy size={18} />
                        <span>Sortear ganadores</span>
                    </button>

                    <div className="mt-auto pt-4 border-t border-gray-100">
                        <button
                            className="nav-item text-red-500 hover:bg-red-50 hover:text-red-600"
                            onClick={() => setShowLogoutConfirm(true)}
                        >
                            <LogOut size={18} />
                            <span>Cerrar Sesión</span>
                        </button>
                    </div>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="admin-main">
                {/* Warning Banner */}
                <div className="warning-banner">
                    <div className="warning-icon">⚠️</div>
                    <div className="warning-content">
                        <p className="warning-text">
                            Fecha de sorteo finalizada
                        </p>
                        <p className="warning-subtext">
                            La fecha de sorteo está definida para el 12 de diciembre de 2025. Los participantes no podrán continuar apartando números pasada esta fecha.
                        </p>
                    </div>
                    <button className="warning-button">Ir a ajustes</button>
                </div>

                {/* Action Buttons */}
                <div className="action-buttons">
                    <button className="action-btn" onClick={() => setShowCreateModal(true)}>
                        <Plus size={20} />
                        <span>Nuevo</span>
                    </button>

                    <button className="action-btn">
                        <Search size={20} />
                        <span>Buscar</span>
                    </button>

                    <button className="action-btn">
                        <Lock size={20} />
                        <span>Avanzado</span>
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="stats-cards">
                    <div className="stat-card apartado-card">
                        <div className="stat-header">
                            <h3 className="stat-number">{apartadoTickets.length}</h3>
                            <span className="stat-badge apartado">APARTADO</span>
                        </div>
                    </div>

                    <div className="stat-card revisando-card">
                        <div className="stat-header">
                            <h3 className="stat-number">{revisandoTickets.length}</h3>
                            <span className="stat-badge revisando">REVISANDO</span>
                        </div>
                    </div>

                    <div className="stat-card pagado-card">
                        <div className="stat-header">
                            <h3 className="stat-number">{pagadoTickets.length}</h3>
                            <span className="stat-badge pagado">PAGADO</span>
                        </div>
                    </div>
                </div>

                {/* Participants Table */}
                <div className="participants-section">
                    <div className="section-header">
                        <h2>NOMBRE</h2>
                        <div className="section-header-right">
                            <span>CANT.</span>
                            <span>ESTADO</span>
                            <span>FECHA</span>
                        </div>
                    </div>

                    <div className="participants-list">
                        {selectedRaffle?.tickets?.map((ticket, index) => (
                            <div key={index} className="participant-row">
                                <span className="participant-name">{ticket.buyerName || `Participante ${ticket.number}`}</span>
                                <div className="participant-info">
                                    <span className="participant-count">{ticket.quantity || 1}</span>
                                    <span className={`participant-status ${ticket.status.toLowerCase()}`}>
                                        {ticket.status}
                                    </span>
                                    <span className="participant-date">
                                        {new Date(ticket.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Raffle Progress */}
                <div className="raffle-progress">
                    <WinnersLogo size="large" />
                    <p className="progress-label">5 / 50</p>
                </div>
            </main>

            {/* Draw Modal */}
            {showDrawModal && (
                <div className="modal-overlay" onClick={() => setShowDrawModal(false)}>
                    <div className="modal-content draw-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setShowDrawModal(false)}>×</button>

                        <div className="modal-header">
                            <WinnersLogo size="medium" />
                            <div className="draw-info">
                                <h2 className="draw-title">SORTEO</h2>
                                <p className="draw-code">AYT1S055N1YAIZGUZEXVWULR</p>
                            </div>
                        </div>

                        <div className="draw-description">
                            <p>Winners seleccionará los ganadores al azar de forma automática, garantizando un sorteo justo e imparcial.</p>
                            <p>El sorteo oficial se realiza una sola vez, los resultados son definitivos y se les notificará permanentemente al terminar.</p>
                        </div>

                        <div className="draw-settings">
                            <label className="draw-label">Cantidad de ganadores</label>
                            <input type="number" className="draw-input" defaultValue="1" min="1" />

                            <label className="draw-checkbox">
                                <input type="checkbox" defaultChecked />
                                <span>Solo números pagados</span>
                            </label>
                        </div>

                        <button className="draw-button">
                            <Trophy size={20} />
                            SORTEAR GANADORES
                        </button>

                        <button className="simulate-button">Simular sorteo</button>
                    </div>
                </div>
            )}

            {/* Create Raffle Modal */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal-content create-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>

                        <h2 className="modal-title">Crear ronda</h2>

                        <div className="form-group">
                            <label>Título</label>
                            <input type="text" placeholder="Nombre de la rifa" className="form-input" />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Precio por número</label>
                                <input type="number" placeholder="Precio" className="form-input" />
                            </div>
                            <div className="form-group">
                                <label>Cantidad de números</label>
                                <input type="number" placeholder="Números" className="form-input" />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Fecha de sorteo</label>
                            <input type="date" className="form-input" />
                        </div>

                        <p className="form-terms">
                            Al hacer clic en comenzar declaras haber leído y aceptado los{' '}
                            <a href="/terms" className="form-link">términos y condiciones</a> de uso.
                        </p>

                        <button className="create-button">Comenzar</button>
                    </div>
                </div>
            )}

            {/* Logout Confirmation Modal */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-md transition-opacity" onClick={() => setShowLogoutConfirm(false)}></div>
                    <div className="relative bg-white/90 backdrop-blur-2xl w-full max-w-md rounded-[3rem] p-10 shadow-[0_40px_100px_rgba(0,0,0,0.2)] border-2 border-gray-100 overflow-hidden animate-scale-in">
                        <div className="absolute top-0 right-0 p-6 opacity-5">
                            <LogOut className="w-32 h-32 text-red-500" />
                        </div>

                        <div className="relative z-10 text-center space-y-6">
                            <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-2 border-2 border-red-100">
                                <LogOut className="w-10 h-10 text-red-500" />
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tighter italic">¿Cerrar sesión?</h3>
                                <p className="text-gray-500 font-medium">Estás a punto de salir del sistema de administración.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4">
                                <button
                                    onClick={() => setShowLogoutConfirm(false)}
                                    className="px-6 py-4 bg-gray-50 text-gray-600 font-black rounded-2xl hover:bg-gray-100 transition-all uppercase tracking-widest italic text-sm"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="px-6 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white font-black rounded-2xl hover:shadow-[0_10px_30px_rgba(239,68,68,0.4)] transition-all uppercase tracking-widest italic text-sm border-b-4 border-red-700 active:border-b-0 active:translate-y-1"
                                >
                                    Salir
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPanel;
