import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Home, Menu, Plus, ChevronDown, ChevronUp, MoreVertical,
    Grid, Settings, Trophy, X, Calendar, DollarSign,
    Ticket, Layout, LogOut, User, Mail, Phone, Lock, CheckCircle
} from 'lucide-react';
import WinnersLogo from '../components/WinnersLogo';

import { API_URL } from '../config';

const Dashboard = () => {
    const navigate = useNavigate();
    const [raffles, setRaffles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showFinalized, setShowFinalized] = useState(false);
    const [showOptionsMenu, setShowOptionsMenu] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // User Profile Edit States
    const [showEditProfileModal, setShowEditProfileModal] = useState(false);
    const [currentUser, setCurrentUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));
    const [phoneError, setPhoneError] = useState('');
    const [editProfileForm, setEditProfileForm] = useState({
        name: '',
        email: '',
        phone: '',
        password: ''
    });

    const [newRaffle, setNewRaffle] = useState({
        title: '',
        description: '',
        price: '',
        totalTickets: '',
        endDate: '',
        image: ''
    });

    const token = localStorage.getItem('token');

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }
        fetchRaffles();
        fetchUserProfile();
    }, []);

    // Update form when modal opens or user changes
    useEffect(() => {
        if (showEditProfileModal) {
            setEditProfileForm({
                name: currentUser.name || '',
                email: currentUser.email || '',
                phone: currentUser.phone || '',
                password: ''
            });
            setPhoneError('');
        }
    }, [showEditProfileModal, currentUser]);

    // Lock body scroll when any modal is open
    useEffect(() => {
        const isAnyModalOpen = showCreateModal || showLogoutConfirm ||
            showSuccessModal || showEditProfileModal;

        if (isAnyModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [showCreateModal, showLogoutConfirm, showSuccessModal, showEditProfileModal]);

    const fetchUserProfile = async () => {
        try {
            const response = await fetch(`${API_URL}/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const userData = await response.json();
                // Merge with existing user data to keep token if stored there (though usually token is separate)
                // In this app structure user object seems separate from token in localstorage
                localStorage.setItem('user', JSON.stringify(userData));
                setCurrentUser(userData);
            }
        } catch (err) {
            console.error('Error fetching user profile:', err);
        }
    };

    const fetchRaffles = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/raffles`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            setRaffles(data);
        } catch (err) {
            console.error('Error fetching raffles:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateRaffle = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_URL}/raffles`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...newRaffle,
                    price: Number(newRaffle.price.toString().replace(/\./g, '')),
                    totalTickets: Number(newRaffle.totalTickets.toString().replace(/\./g, '')),
                    description: newRaffle.description
                })
            });
            if (response.ok) {
                setShowCreateModal(false);
                setNewRaffle({ title: '', description: '', price: '', totalTickets: '', endDate: '', image: '' });
                fetchRaffles();
            }
        } catch (err) {
            console.error('Error creating raffle:', err);
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();

        if (editProfileForm.phone.length !== 10) {
            setPhoneError('El teléfono debe tener 10 dígitos');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/auth/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(editProfileForm)
            });

            const data = await response.json();

            if (response.ok) {
                // Update local storage and state
                const updatedUser = { ...currentUser, ...data.user };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                setCurrentUser(updatedUser);
                setShowEditProfileModal(false);
                setShowSuccessModal(true);
            } else {
                alert(data.error || 'Error al actualizar perfil');
            }
        } catch (err) {
            console.error('Error updating profile:', err);
            alert('Error de conexión');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const activeRaffles = raffles.filter(r => r.status === 'ACTIVE');
    const finalizedRaffles = raffles.filter(r => r.status === 'COMPLETED');

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Dynamic Header */}
            <header className="bg-white/90 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-40 transition-all duration-300 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 md:px-8">
                    <div className="flex items-center justify-between h-16 md:h-20">
                        <div className="flex items-center space-x-3 md:space-x-6">
                            <div className="scale-90 lg:scale-100 origin-left transition-transform hover:scale-110 duration-500 translate-y-1">
                                <WinnersLogo size="small" />
                            </div>
                        </div>

                        <div className="flex items-center space-x-2 md:space-x-4">
                            <button
                                onClick={() => setShowEditProfileModal(true)}
                                className="hidden md:flex items-center space-x-3 px-4 py-2 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-gray-100 transition-all cursor-pointer hover:scale-[1.2] duration-300"
                            >
                                <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center text-xs text-gray-900 font-black uppercase">
                                    {currentUser.name?.charAt(0)}
                                </div>
                                <span className="text-sm font-black text-gray-700 uppercase tracking-tight italic">{currentUser.name}</span>
                            </button>

                            {/* Mobile User Icon */}
                            <button
                                onClick={() => setShowEditProfileModal(true)}
                                className="md:hidden w-10 h-10 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center hover:scale-[1.2] transition-all duration-300"
                            >
                                <User className="w-5 h-5 text-gray-500" />
                            </button>

                            <button
                                onClick={() => setShowLogoutConfirm(true)}
                                className="p-2.5 md:p-3 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-xl md:rounded-2xl transition-all duration-300 border border-gray-100"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Hero Section - Image 3 Reference */}
            <main className="flex-1 max-w-4xl mx-auto w-full px-4 md:px-8 py-6 md:py-8 space-y-6 md:space-y-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Rondas activas</h2>
                        <p className="text-sm md:text-base text-gray-500 font-medium">Gestiona tus sorteos en Winners</p>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="w-full sm:w-auto flex items-center justify-center space-x-2 py-3 px-6 bg-gradient-to-r from-[#8b00ff] to-[#ff00de] text-white font-black rounded-xl transition-all duration-300 hover:-translate-y-1 active:scale-95 uppercase tracking-wider italic shadow-xl shadow-primary/20 hover:scale-105"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Nueva ronda</span>
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : activeRaffles.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-100">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Layout className="w-10 h-10 text-gray-300" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No tienes rifas activas</h3>
                        <p className="text-gray-500 max-w-xs mx-auto text-sm font-medium">Lanza tu primer sorteo hoy mismo y empieza a ver los resultados en tiempo real.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {activeRaffles.map((raffle) => {
                            const progress = ((raffle.paidTicketsCount || 0) / raffle.totalTickets) * 100;
                            return (
                                <div
                                    key={raffle.id}
                                    onClick={() => navigate(`/panel?raffle=${raffle.id}`)}
                                    className={`card p-4 md:p-6 group relative transition-all duration-500 z-0 cursor-pointer hover:shadow-2xl bg-white hover:bg-[#0f0f0f] border-gray-100 hover:border-white/5 rounded-[2rem] md:rounded-[2.5rem]`}
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 relative z-10 w-full">
                                        <div className="w-14 h-14 md:w-16 md:h-16 bg-white rounded-xl md:rounded-2xl flex items-center justify-center border-2 border-gray-100 group-hover:border-[#8b00ff]/30 group-hover:shadow-[0_0_30px_rgba(139,0,255,0.2)] transition-all duration-500 overflow-hidden relative shadow-sm shrink-0">
                                            {raffle.image ? (
                                                <img src={raffle.image} alt={raffle.title} className="w-full h-full object-contain transition-transform duration-500" />
                                            ) : (
                                                <WinnersLogo size="small" className="transition-transform duration-500" />
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="min-w-0 pr-2">
                                                    <span className="text-[10px] font-black text-[#ff00de] tracking-widest bg-[#ff00de]/5 px-2 py-0.5 rounded-full uppercase truncate block w-fit border border-[#ff00de]/10 group-hover:bg-[#ff00de]/20 transition-all">{new Date(raffle.endDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })}</span>
                                                    <h3 className="text-lg md:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#8b00ff] via-[#ff00de] to-[#8b00ff] transition-all duration-300 uppercase italic tracking-tighter mt-1 pr-1 truncate">{raffle.title}</h3>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <span className="text-[10px] md:text-xs font-black text-[#8b00ff] bg-[#8b00ff]/10 px-2 md:px-3 py-1 rounded-full uppercase tracking-tighter shadow-sm group-hover:bg-[#8b00ff] group-hover:text-white transition-all">{Math.round(progress)}%</span>
                                                </div>
                                            </div>

                                            <div className="bg-gray-100 group-hover:bg-white/20 rounded-full h-2 md:h-2.5 overflow-hidden border border-gray-50 group-hover:border-white/5 shadow-inner transition-all">
                                                <div
                                                    style={{ width: `${progress}%` }}
                                                    className="h-full bg-gradient-to-r from-[#8b00ff] to-[#ff00de] transition-all duration-1000 ease-out"
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );

                        })}
                    </div >
                )}

                {/* Finalized Raffles */}
                {
                    finalizedRaffles.length > 0 && (
                        <div className="pt-8 border-t border-gray-100">
                            <button
                                onClick={() => setShowFinalized(!showFinalized)}
                                className="group flex items-center justify-between w-full p-4 bg-white rounded-2xl border border-gray-100 hover:border-primary/20 transition-all shadow-sm"
                            >
                                <div className="flex items-center space-x-3">
                                    <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                                    <h2 className="text-lg font-bold text-gray-600 group-hover:text-gray-900 flex items-center">
                                        Rondas finalizadas <span className="ml-2 text-primary bg-primary/10 px-2 py-0.5 rounded-full text-xs font-black">{finalizedRaffles.length}</span>
                                    </h2>
                                </div>
                                <div className={`transition-transform duration-300 ${showFinalized ? 'rotate-180' : ''}`}>
                                    <ChevronDown className="w-5 h-5 text-gray-400" />
                                </div>
                            </button>

                            {showFinalized && (
                                <div className="grid gap-3 mt-4 animate-slide-down">
                                    {finalizedRaffles.map((raffle) => (
                                        <div
                                            key={raffle.id}
                                            onClick={() => navigate(`/panel?raffle=${raffle.id}`)}
                                            className="flex items-center justify-between p-5 bg-white hover:bg-[#0f0f0f] rounded-3xl border border-gray-100 hover:border-white/5 hover:shadow-xl cursor-pointer group transition-all duration-300"
                                        >
                                            <div className="flex items-center space-x-4">
                                                <div className="w-12 h-12 bg-white rounded-[1rem] flex items-center justify-center text-gray-400 grayscale group-hover:grayscale-0 transition-all overflow-hidden border border-gray-100 group-hover:border-white/10 shadow-sm">
                                                    {raffle.image ? (
                                                        <img src={raffle.image} alt={raffle.title} className="w-full h-full object-contain" />
                                                    ) : (
                                                        <WinnersLogo size="small" />
                                                    )}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-400 to-gray-600 group-hover:from-white group-hover:to-white transition-all">{raffle.title}</h4>
                                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{new Date(raffle.endDate).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <Trophy className="w-5 h-5 text-gray-300 group-hover:text-yellow-500 transition-colors" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                }
            </main >

            {/* Create Raffle Modal */}
            {
                showCreateModal && (
                    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-4">
                        <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowCreateModal(false)}></div>
                        <div className="relative bg-white w-full max-w-lg md:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden animate-slide-up md:animate-scale-in max-h-[95vh] flex flex-col">
                            <div className="bg-gradient-to-r from-primary to-secondary p-6 md:p-8 text-white relative shrink-0">
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="absolute top-4 md:top-6 right-4 md:right-6 p-2 hover:bg-white/20 rounded-xl transition-colors"
                                >
                                    <X className="w-5 h-5 md:w-6 md:h-6" />
                                </button>
                                <h2 className="text-2xl md:text-3xl font-black italic tracking-tighter uppercase mb-1 md:mb-2">Nueva ronda</h2>
                                <p className="text-white/80 font-bold text-xs md:text-sm">Configura tu próximo sorteo</p>
                            </div>

                            <form onSubmit={handleCreateRaffle} className="p-6 md:p-8 space-y-4 md:space-y-6 pb-8 overflow-y-auto custom-scrollbar">
                                <div className="space-y-3 md:space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Título de la rifa</label>
                                        <div className="relative group">
                                            <Layout className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                                            <input
                                                type="text"
                                                required
                                                placeholder="Ej: iPhone 15 Pro Max"
                                                className="input-field pl-12 bg-gray-50 border-gray-100 focus:bg-white text-gray-900"
                                                value={newRaffle.title}
                                                onChange={(e) => setNewRaffle({ ...newRaffle, title: e.target.value })}
                                                onInvalid={(e) => e.target.setCustomValidity('Por favor, ingresa el título de la rifa')}
                                                onInput={(e) => e.target.setCustomValidity('')}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Descripción</label>
                                        <textarea
                                            rows="2"
                                            placeholder="Detalles del premio..."
                                            className="input-field bg-gray-50 border-gray-100 focus:bg-white resize-none text-gray-900"
                                            value={newRaffle.description}
                                            onChange={(e) => setNewRaffle({ ...newRaffle, description: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Imagen del producto (URL)</label>
                                        <input
                                            type="url"
                                            placeholder="https://ejemplo.com/imagen.jpg"
                                            className="input-field bg-gray-50 border-gray-100 focus:bg-white text-gray-900"
                                            value={newRaffle.image}
                                            onChange={(e) => setNewRaffle({ ...newRaffle, image: e.target.value })}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Precio por número</label>
                                            <div className="relative group">
                                                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="0"
                                                    className="input-field pl-12 bg-gray-50 border-gray-100 focus:bg-white text-gray-900"
                                                    value={newRaffle.price}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/\D/g, '');
                                                        const formatted = val.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                                                        setNewRaffle({ ...newRaffle, price: formatted });
                                                    }}
                                                    onInvalid={(e) => e.target.setCustomValidity('Por favor, ingresa el precio por número')}
                                                    onInput={(e) => e.target.setCustomValidity('')}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Total de números</label>
                                            <div className="relative group">
                                                <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="100"
                                                    className="input-field pl-12 bg-gray-50 border-gray-100 focus:bg-white text-gray-900"
                                                    value={newRaffle.totalTickets}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/\D/g, '');
                                                        const formatted = val.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                                                        setNewRaffle({ ...newRaffle, totalTickets: formatted });
                                                    }}
                                                    onInvalid={(e) => e.target.setCustomValidity('Por favor, ingresa el total de números')}
                                                    onInput={(e) => e.target.setCustomValidity('')}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Fecha de sorteo</label>
                                        <div className="relative group">
                                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                                            <input
                                                type="date"
                                                required
                                                className="input-field pl-12 bg-gray-50 border-gray-100 focus:bg-white text-gray-900"
                                                value={newRaffle.endDate}
                                                onChange={(e) => setNewRaffle({ ...newRaffle, endDate: e.target.value })}
                                                onInvalid={(e) => e.target.setCustomValidity('Por favor, selecciona la fecha del sorteo')}
                                                onInput={(e) => e.target.setCustomValidity('')}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button type="submit" className="w-full btn-primary py-4 text-lg shadow-2xl shadow-primary/30">
                                    CREAR RONDA
                                </button>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Edit Profile Modal */}
            {
                showEditProfileModal && (
                    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-4">
                        <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowEditProfileModal(false)}></div>
                        <div className="relative bg-white w-full max-w-lg md:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden animate-scale-in max-h-[95vh] flex flex-col">
                            <div className="bg-gradient-to-r from-primary to-secondary p-6 md:p-8 text-white relative shrink-0">
                                <button
                                    onClick={() => setShowEditProfileModal(false)}
                                    className="absolute top-4 md:top-6 right-4 md:right-6 p-2 hover:bg-white/20 rounded-xl transition-colors"
                                >
                                    <X className="w-5 h-5 md:w-6 md:h-6" />
                                </button>
                                <h2 className="text-3xl font-black italic tracking-tighter uppercase mb-2">Mi Perfil</h2>
                                <p className="text-white/80 font-bold text-sm">Actualiza tu información personal</p>
                            </div>

                            <form onSubmit={handleUpdateProfile} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                                        <div className="relative group">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                                            <input
                                                type="text"
                                                required
                                                autoComplete="off"
                                                placeholder="Tu nombre"
                                                className="input-field pl-12 bg-gray-50 border-gray-100 focus:bg-white text-gray-900 uppercase"
                                                value={editProfileForm.name}
                                                onChange={(e) => {
                                                    const val = e.target.value.toUpperCase().replace(/[^A-ZÁÉÍÓÚÑ\s]/g, '');
                                                    setEditProfileForm({ ...editProfileForm, name: val });
                                                }}
                                                onInvalid={(e) => e.target.setCustomValidity('Por favor, ingresa tu nombre completo')}
                                                onInput={(e) => e.target.setCustomValidity('')}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5 opacity-60">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Correo Electrónico (No editable)</label>
                                        <div className="relative group">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <input
                                                type="email"
                                                readOnly
                                                placeholder="tu@email.com"
                                                className="input-field pl-12 bg-gray-100 border-gray-200 cursor-not-allowed text-gray-500 font-bold"
                                                value={editProfileForm.email}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5 opacity-60">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Teléfono (No editable)</label>
                                        <div className="relative group">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <input
                                                type="tel"
                                                readOnly
                                                placeholder="300 123 4567"
                                                className="input-field pl-12 bg-gray-100 border-gray-200 cursor-not-allowed text-gray-500 font-bold"
                                                value={editProfileForm.phone}
                                            />
                                        </div>
                                    </div>

                                    <div className="border-t border-gray-100 my-4 pt-4">
                                        <h4 className="text-sm font-bold text-gray-500 mb-4 uppercase tracking-wider">Seguridad</h4>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nueva Contraseña (Opcional)</label>
                                            <div className="relative group">
                                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                                                <input
                                                    type="password"
                                                    autoComplete="new-password"
                                                    placeholder="Dejar vacía para no cambiar"
                                                    className="input-field pl-12 bg-gray-50 border-gray-100 focus:bg-white text-gray-900"
                                                    value={editProfileForm.password}
                                                    onChange={(e) => setEditProfileForm({ ...editProfileForm, password: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <button type="submit" className="w-full btn-primary py-4 text-lg shadow-2xl shadow-primary/30">
                                    GUARDAR CAMBIOS
                                </button>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Logout Confirmation Modal */}
            {
                showLogoutConfirm && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-md transition-opacity" onClick={() => setShowLogoutConfirm(false)}></div>
                        <div className="relative bg-white/90 backdrop-blur-2xl w-full max-w-md rounded-[3rem] p-10 shadow-[0_40px_100px_rgba(0,0,0,0.2)] border-2 border-gray-100 overflow-hidden animate-scale-in">
                            <button
                                onClick={() => setShowLogoutConfirm(false)}
                                className="absolute top-6 right-6 p-2 hover:bg-gray-50 rounded-xl transition-colors z-20"
                            >
                                <X className="w-6 h-6 text-gray-400" />
                            </button>
                            {/* Design details */}


                            <div className="relative z-10 text-center space-y-6">
                                <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-2 border-2 border-red-100">
                                    <LogOut className="w-10 h-10 text-red-500" />
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tighter italic">¿Cerrar sesión?</h3>
                                    <p className="text-gray-500 font-medium">Estás a punto de salir del sistema de administración de Winners.</p>
                                </div>

                                <div className="pt-4">
                                    <button
                                        onClick={handleLogout}
                                        className="w-full px-6 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white font-black rounded-2xl hover:shadow-[0_10px_30px_rgba(239,68,68,0.4)] transition-all uppercase tracking-widest italic text-sm border-b-4 border-red-700 active:border-b-0 active:translate-y-1"
                                    >
                                        Salir
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Success Modal */}
            {
                showSuccessModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-md animate-fade-in" onClick={() => setShowSuccessModal(false)}></div>
                        <div className="relative bg-white/95 backdrop-blur-xl w-full max-w-sm rounded-[2rem] p-8 shadow-2xl border-2 border-white/50 animate-scale-in text-center">


                            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                                <div className="absolute inset-0 border-4 border-green-100 rounded-full animate-ping opacity-20"></div>
                                <CheckCircle className="w-10 h-10 text-green-500" />
                            </div>

                            <h3 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter mb-2">¡Éxito!</h3>
                            <p className="text-gray-500 font-medium mb-8">Tu perfil ha sido actualizado correctamente.</p>

                            <button
                                onClick={() => setShowSuccessModal(false)}
                                className="w-full btn-primary py-3 rounded-xl shadow-lg shadow-primary/20 text-sm font-black tracking-widest uppercase relative z-10"
                            >
                                Aceptar
                            </button>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default Dashboard;
