import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
    Home, Grid, Settings, Trophy, Plus, Search,
    Filter, AlertTriangle, ExternalLink, User as UserIcon,
    ChevronRight, ArrowLeft, X, Check, Clock, AlertCircle, Layout, Trash2,
    Image as ImageIcon, Ticket, CheckCircle, Phone, QrCode, Copy
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import WinnersLogo from '../components/WinnersLogo';
import AdminSidebar from '../components/AdminSidebar';

import { API_URL } from '../config';

const RaffleManagement = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const raffleId = searchParams.get('raffle');

    const [raffle, setRaffle] = useState(null);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Modals
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [showDrawModal, setShowDrawModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [winnersList, setWinnersList] = useState([]);
    const [showWinnersView, setShowWinnersView] = useState(false);
    const [isDrawing, setIsDrawing] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [ticketToDelete, setTicketToDelete] = useState(null);
    const [statusFilter, setStatusFilter] = useState(null);
    const [tempPhone, setTempPhone] = useState('');
    const [showStatusConfirm, setShowStatusConfirm] = useState(false);
    const [pendingStatusUpdate, setPendingStatusUpdate] = useState(null);
    const [successType, setSuccessType] = useState('status'); // 'status' or 'phone'
    const winnersScrollRef = useRef(null);
    const [showTicketUpdateSuccess, setShowTicketUpdateSuccess] = useState(false);
    const [showQRModal, setShowQRModal] = useState(false);
    const [qrCopied, setQRCopied] = useState(false);
    const [manualWinnerNumber, setManualWinnerNumber] = useState('');
    const [drawOnlyPaid, setDrawOnlyPaid] = useState(true);

    // Raffle is finalized when status is COMPLETED
    const isEnded = raffle?.status === 'COMPLETED';

    const [showCustomErrorModal, setShowCustomErrorModal] = useState(false);
    const [customErrorMessage, setCustomErrorMessage] = useState('');

    const [updatedRaffleInfo, setUpdatedRaffleInfo] = useState({
        title: '',
        description: '',
        image: '',
        price: 0,
        totalTickets: 0,
        endDate: ''
    });


    const token = localStorage.getItem('token');
    const [phoneError, setPhoneError] = useState('');

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }
        if (raffleId) {
            fetchRaffleDetails();
        } else {
            navigate('/dashboard');
        }
    }, [raffleId]);

    useEffect(() => {
        const action = searchParams.get('action');
        if (action === 'settings') {
            setShowSettingsModal(true);
            setShowDrawModal(false);
        } else if (action === 'draw') {
            setShowDrawModal(true);
            setShowSettingsModal(false);
        } else {
            setShowSettingsModal(false);
            setShowDrawModal(false);
        }
    }, [searchParams]);

    // Lock body scroll when any modal is open
    useEffect(() => {
        const isAnyModalOpen = !!selectedTicket || showDrawModal || showSettingsModal ||
            showSuccessModal || showDeleteConfirm || showStatusConfirm ||
            showTicketUpdateSuccess || showQRModal || showCustomErrorModal;

        if (isAnyModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [selectedTicket, showDrawModal, showSettingsModal, showSuccessModal,
        showDeleteConfirm, showStatusConfirm, showTicketUpdateSuccess,
        showQRModal, showCustomErrorModal]);

    // Auto-scroll to top of winners list when view changes or list updates
    useEffect(() => {
        if (showWinnersView && winnersScrollRef.current) {
            winnersScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [showWinnersView, winnersList]);

    const fetchRaffleDetails = async () => {
        try {
            const response = await fetch(`${API_URL}/raffles/${raffleId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Error al cargar los detalles');

            setRaffle(data);
            setTickets(data.tickets || []);
            if (data.winnerTickets && data.winnerTickets.length > 0) {
                setWinnersList(data.winnerTickets);
            } else {
                setWinnersList([]);
            }
            setUpdatedRaffleInfo({
                title: data.title,
                description: data.description || '',
                image: data.image || '',
                price: data.price?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."),
                totalTickets: data.totalTickets?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."),
                endDate: new Date(data.endDate).toISOString().split('T')[0]
            });
            setLoading(false);
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    const handleStatusClick = (ticket, newStatus) => {
        setPendingStatusUpdate({
            id: ticket.id,
            status: newStatus,
            number: ticket.number,
            buyerName: ticket.buyerName
        });
        setShowStatusConfirm(true);
    };

    const confirmStatusUpdate = async () => {
        if (!pendingStatusUpdate) return;

        try {
            const response = await fetch(`${API_URL}/raffles/tickets/${pendingStatusUpdate.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: pendingStatusUpdate.status })
            });

            if (response.ok) {
                setShowStatusConfirm(false);
                setPendingStatusUpdate(null);
                setSelectedTicket(null);
                setSuccessType('status');
                setShowTicketUpdateSuccess(true);
                fetchRaffleDetails();
            }
        } catch (err) {
            console.error('Error updating ticket:', err);
        }
    };

    const handleUpdateStatus = async (ticketId, updates) => {
        try {
            const body = typeof updates === 'string' ? { status: updates } : updates;
            const response = await fetch(`${API_URL}/raffles/tickets/${ticketId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });
            if (response.ok) {
                if (typeof updates === 'string' || updates.status || updates.buyerPhone) {
                    if (updates.buyerPhone) {
                        setSuccessType('phone');
                    } else {
                        setSuccessType('status');
                    }
                    setSelectedTicket(null);
                    setShowTicketUpdateSuccess(true);
                }
                fetchRaffleDetails();
            }
        } catch (err) {
            console.error('Error updating ticket:', err);
        }
    };

    const handleDeleteTicket = (ticketId) => {
        setTicketToDelete(ticketId);
        setShowDeleteConfirm(true);
    };

    const confirmDeleteTicket = async () => {
        if (!ticketToDelete) return;

        try {
            const response = await fetch(`${API_URL}/raffles/tickets/${ticketToDelete}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                setShowDeleteConfirm(false);
                setTicketToDelete(null);
                setSelectedTicket(null);
                fetchRaffleDetails();
            } else {
                const data = await response.json();
                alert(data.error || 'Error al eliminar ticket');
            }
        } catch (err) {
            console.error('Error deleting ticket:', err);
        }
    };

    const startDraw = async (winnersCount = 1, onlyPaid = true) => {
        setIsDrawing(true);

        try {
            const response = await fetch(`${API_URL}/raffles/${raffleId}/draw`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ winnersCount, onlyPaid })
            });
            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Error al realizar el sorteo');

            setTimeout(() => {
                setWinnersList(prev => [...data.winners, ...(Array.isArray(prev) ? prev : [])]);
                setIsDrawing(false);
                setShowWinnersView(true);
                fetchRaffleDetails();
            }, 2000);

        } catch (err) {
            console.error(err);
            setCustomErrorMessage(err.message);
            setShowCustomErrorModal(true);
            setIsDrawing(false);
        }
    };

    const getStats = () => {
        if (!tickets) return { apartado: 0, revisando: 0, pagado: 0, totalSold: 0 };
        return {
            apartado: tickets.filter(t => t.status === 'APARTADO').length,
            revisando: tickets.filter(t => t.status === 'REVISANDO').length,
            pagado: tickets.filter(t => t.status === 'PAGADO').length,
            totalSold: tickets.length
        };
    };

    const stats = getStats();
    const currentStatCount = statusFilter === 'APARTADO' ? stats.apartado : statusFilter === 'REVISANDO' ? stats.revisando : statusFilter === 'PAGADO' ? stats.pagado : stats.totalSold;
    const progress = raffle ? (currentStatCount / raffle.totalTickets) * 100 : 0;

    const filteredTickets = tickets.filter(t => {
        const date = new Date(t.createdAt);
        const day = date.getDate().toString();
        const month = (date.getMonth() + 1).toString();
        const year = date.getFullYear().toString();
        const fullDate = date.toLocaleDateString();

        const matchesSearch = t.buyerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.number.toString().includes(searchQuery) ||
            day.includes(searchQuery) ||
            month.includes(searchQuery) ||
            year.includes(searchQuery) ||
            fullDate.includes(searchQuery);

        const matchesStatus = statusFilter ? t.status === statusFilter : true;
        return matchesSearch && matchesStatus;
    });

    const handleCloseModal = () => {
        if (window.history.state && window.history.state.idx > 0) {
            navigate(-1);
        } else {
            navigate(`/panel?raffle=${raffleId}`);
        }
    };

    const handleUpdateRaffle = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_URL}/raffles/${raffleId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...updatedRaffleInfo,
                    price: parseFloat(updatedRaffleInfo.price.toString().replace(/\./g, '')),
                    totalTickets: parseInt(updatedRaffleInfo.totalTickets.toString().replace(/\./g, ''))
                })
            });
            if (response.ok) {
                // Remove alert and use modal
                setShowSettingsModal(false);
                setShowSuccessModal(true);
                // Navigate to root panel to update selection to 'Administración' (optional or keep)
                navigate(`/panel?raffle=${raffleId}`, { replace: true });
                fetchRaffleDetails();
            } else {
                const errorData = await response.json();
                alert('Error al actualizar: ' + (errorData.error || response.statusText));
            }
        } catch (err) {
            console.error('Error updating raffle:', err);
            alert('Error de conexión al actualizar la rifa');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-12 h-12 border-4 border-[#8b00ff] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-sm">
                    <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button onClick={() => navigate('/dashboard')} className="btn-primary w-full">Volver al Dashboard</button>
                </div>
            </div>
        );
    }

    const action = searchParams.get('action');
    const activeItem = action === 'settings' ? 'settings' : action === 'draw' ? 'draw' : 'admin';

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex">
            <AdminSidebar
                raffleTitle={raffle?.title}
                raffleId={raffleId}
                activeItem={activeItem}
            />

            {/* Main Content */}
            <main className="flex-1 min-w-0 overflow-auto pb-32 md:pb-0">
                <div className="p-4 md:p-8 space-y-4 md:space-y-6">
                    {/* Action Bar */}
                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        <div className="flex flex-1 gap-2 w-full">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar participante, número o fecha..."
                                    className="input-field pl-10 bg-white border-gray-100 text-gray-900"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Stats Cards Dashboard */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                        {(() => {
                            const activeColor = !statusFilter ? '#00d1ff' :
                                statusFilter === 'REVISANDO' ? '#ff00de' :
                                    statusFilter === 'PAGADO' ? '#d000ff' :
                                        '#8b00ff';

                            const currentVal = statusFilter === 'APARTADO' ? stats.apartado :
                                statusFilter === 'REVISANDO' ? stats.revisando :
                                    statusFilter === 'PAGADO' ? stats.pagado :
                                        stats.totalSold;

                            const currentProgress = (currentVal / (raffle?.totalTickets || 1)) * 100;

                            return (
                                <div
                                    className={`bg-white aspect-square p-4 md:p-6 rounded-2xl md:rounded-3xl border flex flex-col items-center justify-center space-y-2 relative overflow-hidden group cursor-pointer transition-all duration-500 ${!statusFilter ? 'ring-2 ring-[#00d1ff]/50 shadow-lg shadow-[#00d1ff]/10 border-[#00d1ff]/10' : 'border-gray-100 hover:border-primary/30'}`}
                                    onClick={() => setStatusFilter(null)}
                                >
                                    <div
                                        className={`absolute inset-0 transition-transform duration-1000 group-hover:scale-110 ${!statusFilter ? 'bg-[#00d1ff]/10' : 'bg-primary/5'}`}
                                        style={{ clipPath: 'circle(50% at 50% 50%)' }}
                                    ></div>
                                    <div className="relative w-20 h-20 md:w-28 md:h-28 transform group-hover:scale-105 transition-transform">
                                        <svg className="w-full h-full transform -rotate-90">
                                            <circle cx="40" cy="40" r="36" stroke="#f3f4f6" strokeWidth="6" fill="transparent" className="md:hidden" />
                                            <circle cx="56" cy="56" r="50" stroke="#f3f4f6" strokeWidth="8" fill="transparent" className="hidden md:block" />

                                            <circle
                                                cx="40" cy="40" r="36" stroke={activeColor} strokeWidth="8" fill="transparent"
                                                strokeDasharray={226} strokeDashoffset={226 * (1 - currentProgress / 100)}
                                                strokeLinecap="round" className="transition-all duration-1000 ease-out md:hidden"
                                            />
                                            <circle
                                                cx="56" cy="56" r="50" stroke={activeColor} strokeWidth="10" fill="transparent"
                                                strokeDasharray={314} strokeDashoffset={314 * (1 - currentProgress / 100)}
                                                strokeLinecap="round" className="transition-all duration-1000 ease-out hidden md:block"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-xl md:text-2xl font-black text-gray-900 leading-none tracking-tighter">{Math.round(currentProgress)}%</span>
                                            <span className="text-[8px] md:text-[10px] font-black uppercase tracking-tighter mt-1" style={{ color: activeColor }}>
                                                {statusFilter || 'Vendido'}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest">
                                        {currentVal} / {raffle?.totalTickets}
                                    </p>
                                </div>
                            );
                        })()}

                        {[
                            { label: 'Apartado', val: stats.apartado, bg: 'bg-primary/10', border: 'border-primary/20', text: 'text-primary', badge: 'bg-primary', code: 'L-P', status: 'APARTADO', ring: 'ring-primary', hover: 'hover:bg-primary/20 hover:border-primary/50 hover:shadow-primary/20 hover:brightness-110' },
                            { label: 'Revisando', val: stats.revisando, bg: 'bg-secondary/10', border: 'border-secondary/20', text: 'text-secondary', badge: 'bg-secondary', code: 'R-S', status: 'REVISANDO', ring: 'ring-secondary', hover: 'hover:bg-secondary/20 hover:border-secondary/50 hover:shadow-secondary/20 hover:brightness-110' },
                            { label: 'Pagado', val: stats.pagado, bg: 'bg-accent/10', border: 'border-accent/20', text: 'text-accent', badge: 'bg-accent', code: 'OK', status: 'PAGADO', ring: 'ring-accent', hover: 'hover:bg-accent/20 hover:border-accent/50 hover:shadow-accent/20 hover:brightness-110' }
                        ].map((s) => (
                            <div
                                key={s.label}
                                onClick={() => setStatusFilter(statusFilter === s.status ? null : s.status)}
                                className={`${s.bg} aspect-square p-4 md:p-6 rounded-2xl md:rounded-3xl ${statusFilter === s.status ? `ring-2 ring-inset ${s.ring}` : `border-2 ${s.border}`} flex flex-col justify-between hover:scale-[1.02] transition-all cursor-pointer relative overflow-hidden group ${s.hover} duration-300 shadow-sm hover:shadow-xl`}
                            >
                                <div className="absolute top-0 right-0 p-2 md:p-4 opacity-10 group-hover:opacity-30 transition-opacity duration-300">
                                    <div className={`w-8 h-8 md:w-12 md:h-12 rounded-full ${s.badge}`} />
                                </div>
                                <span className={`text-3xl md:text-5xl font-black ${s.text} tracking-tighter relative z-10 transition-all duration-300`}>{s.val}</span>
                                <div className="flex items-center justify-between mt-2 md:mt-4 relative z-10">
                                    <span className={`text-[8px] md:text-[10px] font-black ${s.text} uppercase tracking-widest transition-all duration-300`}>{s.label}</span>
                                    <div className={`${s.badge} text-gray-900 text-[6px] md:text-[8px] px-2 py-0.5 rounded-full font-black transition-all duration-300`}>{s.code}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Participants Table */}
                    <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                        {/* Mobile QR Button - Only visible on mobile */}
                        <div className="md:hidden px-6 py-4 border-b border-gray-50">
                            <button
                                onClick={() => setShowQRModal(true)}
                                className="w-full flex items-center justify-center space-x-3 py-4 px-6 bg-gradient-to-r from-primary to-secondary text-white font-black rounded-2xl transition-all duration-300 hover:shadow-xl shadow-lg shadow-primary/30 active:scale-95 uppercase tracking-wider italic"
                            >
                                <QrCode className="w-5 h-5" />
                                <span className="text-sm">Ver Talonario Web</span>
                            </button>
                        </div>
                        <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
                            <h3 className="font-black text-gray-900 uppercase tracking-tight italic">Participantes actuales</h3>
                            <span className="text-xs font-bold text-gray-400 bg-gray-50 px-3 py-1 rounded-full">{filteredTickets.length} registros</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <tbody className="divide-y divide-gray-50">
                                    {filteredTickets.map((ticket) => (
                                        <tr
                                            key={ticket.id}
                                            onClick={() => {
                                                setSelectedTicket(ticket);
                                                setTempPhone(ticket.buyerPhone || '');
                                                setPhoneError('');
                                            }}
                                            className="hover:bg-gray-50 transition-all cursor-pointer group"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-4">
                                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black transition-all group-hover:scale-110 shadow-sm
                                                            ${ticket.status === 'PAGADO' ? 'bg-[#d000ff]/10 text-[#d000ff]' : ''}
                                                            ${ticket.status === 'REVISANDO' ? 'bg-[#ff00de]/10 text-[#ff00de]' : ''}
                                                            ${ticket.status === 'APARTADO' ? 'bg-[#8b00ff]/10 text-[#8b00ff]' : ''}
                                                          `}>
                                                        {ticket.number}
                                                    </div>
                                                    <div>
                                                        <p className={`font-bold text-gray-900 transition-colors
                                                            ${ticket.status === 'PAGADO' ? 'group-hover:text-[#d000ff]' : ''}
                                                            ${ticket.status === 'REVISANDO' ? 'group-hover:text-[#ff00de]' : ''}
                                                            ${ticket.status === 'APARTADO' ? 'group-hover:text-[#8b00ff]' : ''}
                                                        `}>{ticket.buyerName}</p>
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{new Date(ticket.createdAt).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center space-x-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 group-hover:bg-white transition-colors w-fit mx-auto">
                                                    <Phone className={`w-3.5 h-3.5 text-gray-400 transition-colors
                                                        ${ticket.status === 'PAGADO' ? 'group-hover:text-[#d000ff]' : ''}
                                                        ${ticket.status === 'REVISANDO' ? 'group-hover:text-[#ff00de]' : ''}
                                                        ${ticket.status === 'APARTADO' ? 'group-hover:text-[#8b00ff]' : ''}
                                                    `} />
                                                    <span className="text-xs font-bold text-gray-500 group-hover:text-gray-900 transition-colors tracking-tight">
                                                        {ticket.buyerPhone || 'Sin teléfono'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full
                                                  ${ticket.status === 'PAGADO' ? 'bg-[#d000ff]/20 text-[#d000ff]' : ''}
                                                  ${ticket.status === 'REVISANDO' ? 'bg-[#ff00de]/20 text-[#ff00de]' : ''}
                                                  ${ticket.status === 'APARTADO' ? 'bg-[#8b00ff]/20 text-[#8b00ff]' : ''}
                                                `}>
                                                    {ticket.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>

            {/* Mobile Bottom Navigation - NEW */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 z-50 px-6 py-4 pb-8 flex items-center justify-between shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
                <button
                    onClick={() => navigate(`/panel?raffle=${raffleId}`)}
                    className={`flex flex-col items-center space-y-1 ${activeItem === 'admin' ? 'text-primary' : 'text-gray-400'}`}
                >
                    <Layout className="w-6 h-6" />
                    <span className="text-[8px] font-black uppercase tracking-tighter">Panel</span>
                </button>
                <button
                    onClick={() => navigate(`/${raffleId}`)}
                    className={`flex flex-col items-center space-y-1 text-gray-400`}
                >
                    <Grid className="w-6 h-6" />
                    <span className="text-[8px] font-black uppercase tracking-tighter">Web</span>
                </button>
                <button
                    onClick={() => navigate(`/panel?raffle=${raffleId}&action=draw`)}
                    className={`flex flex-col items-center space-y-1 ${activeItem === 'draw' ? 'text-primary' : 'text-gray-400'}`}
                >
                    <Trophy className="w-6 h-6" />
                    <span className="text-[8px] font-black uppercase tracking-tighter pt-1">Sortear</span>
                </button>
                <button
                    onClick={() => navigate(`/panel?raffle=${raffleId}&action=settings`)}
                    className={`flex flex-col items-center space-y-1 ${activeItem === 'settings' ? 'text-primary' : 'text-gray-400'}`}
                >
                    <Settings className="w-6 h-6" />
                    <span className="text-[8px] font-black uppercase tracking-tighter">Ajustes</span>
                </button>
                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex flex-col items-center space-y-1 text-gray-400"
                >
                    <Home className="w-6 h-6" />
                    <span className="text-[8px] font-black uppercase tracking-tighter">Inicio</span>
                </button>
            </div>

            {/* Update Status Modal */}
            {selectedTicket && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setSelectedTicket(null)}></div>
                    <div className="relative bg-white w-full max-w-sm md:rounded-[2.5rem] rounded-t-3xl shadow-2xl animate-slide-up md:animate-scale-in max-h-[95vh] flex flex-col">
                        <button
                            onClick={() => setSelectedTicket(null)}
                            className="absolute top-4 md:top-6 right-4 md:right-6 p-2 hover:bg-gray-50 rounded-xl transition-colors z-30"
                        >
                            <X className="w-5 h-5 md:w-6 md:h-6 text-gray-400" />
                        </button>
                        <div className="overflow-y-auto overflow-x-visible custom-scrollbar flex-1">
                            <div className="p-6 md:p-10 text-center space-y-4 md:space-y-6 pb-8">


                                <div>
                                    <h3 className="text-3xl font-black tracking-tight text-gray-900 uppercase italic">{selectedTicket.buyerName || 'Participante'}</h3>
                                    <p className="text-gray-500 font-bold text-sm uppercase tracking-widest mt-1">NÚMERO {selectedTicket.number}</p>
                                </div>

                                {(() => {
                                    const allWins = winnersList.filter(w => w.ticketNumber === selectedTicket.number);
                                    if (allWins.length === 0) return null;

                                    return (
                                        <div className="space-y-2 mt-2 animate-bounce-in">
                                            {allWins.map((winInfo, wIdx) => {
                                                const isManual = Boolean(winInfo.isManualWinner);
                                                const subset = winnersList.filter(w => Boolean(w.isManualWinner) === isManual);
                                                const winIndexInSubset = subset.indexOf(winInfo);
                                                const position = subset.length - winIndexInSubset;

                                                return (
                                                    <div key={wIdx} className={`py-2 px-4 rounded-xl border flex items-center justify-center space-x-2 ${isManual
                                                        ? 'bg-amber-50 border-amber-200 text-amber-600 shadow-sm shadow-amber-500/10'
                                                        : 'bg-primary/5 border-primary/20 text-primary shadow-sm shadow-primary/10'
                                                        }`}>
                                                        <Trophy className={`w-4 h-4 ${isManual ? 'text-amber-500' : 'text-primary'}`} />
                                                        <span className="text-[10px] font-black uppercase tracking-widest italic leading-tight">
                                                            ¡Ganador {isManual ? 'Manual' : 'Oficial'} #{position}!
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}

                                {isEnded && (
                                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center space-x-3 text-left">
                                        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                                        <p className="text-[10px] font-bold text-amber-700 uppercase leading-relaxed">Esta rifa ha finalizado. No se permiten realizar cambios en los tickets.</p>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block text-left ml-2">Editar Teléfono</label>
                                    <div className="relative group">
                                        {selectedTicket.buyerPhone ? (
                                            <a
                                                href={`https://api.whatsapp.com/send?phone=57${selectedTicket.buyerPhone.replace(/\D/g, '').slice(-10)}&text=${encodeURIComponent(
                                                    (selectedTicket.status === 'APARTADO' || selectedTicket.status === 'RESERVED')
                                                        ? `Hola ${selectedTicket.buyerName || ''}, te escribo de Winners. Tu número ${selectedTicket.number} debe ser pagado o se liberará para que otro cliente pueda tomarlo. Si ya pagaste envíanos tu comprobante.`
                                                        : (selectedTicket.status === 'REVISANDO' || selectedTicket.status === 'REVIEWING')
                                                            ? `Hola ${selectedTicket.buyerName || ''}, te escribo de Winners. La revisión de tu comprobante de pago para el número ${selectedTicket.number} fue exitosa. ¡Mucha suerte en el sorteo!`
                                                            : (selectedTicket.status === 'PAGADO' || selectedTicket.status === 'PAID')
                                                                ? `Hola ${selectedTicket.buyerName || ''}, te escribo de Winners. ¡Felicidades! Has ganado el sorteo con el número ${selectedTicket.number}. Por favor contáctanos para reclamar tu premio.`
                                                                : `Hola ${selectedTicket.buyerName || ''}, te escribo de Winners sobre tu número ${selectedTicket.number}.`
                                                )}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="absolute left-2 top-1/2 -translate-y-1/2 z-30 p-1.5 bg-[#ff00de]/10 rounded-xl hover:bg-[#ff00de]/20 hover:scale-110 transition-all group/wa border border-[#ff00de]/20"
                                            >
                                                <Phone className="w-[18px] h-[18px] text-[#ff00de] group-hover/wa:rotate-12 transition-transform drop-shadow-[0_0_8px_rgba(255,0,222,0.4)]" />
                                                <span className="absolute -bottom-9 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-[#1a1a1a] text-[#ff00de] text-[9px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-[#ff00de]/20 border border-[#ff00de]/30 opacity-0 group-hover/wa:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap before:content-[''] before:absolute before:-top-1 before:left-1/2 before:-translate-x-1/2 before:w-2 before:h-2 before:bg-[#1a1a1a] before:rotate-45 before:border-l before:border-t before:border-[#ff00de]/30">WhatsApp</span>
                                            </a>
                                        ) : (
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                                        )}
                                        <input
                                            type="tel"
                                            value={tempPhone}
                                            maxLength={10}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                setTempPhone(val);
                                                setPhoneError('');
                                            }}
                                            disabled={isEnded}
                                            className="w-full pl-12 pr-12 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-primary focus:bg-white transition-all outline-none font-bold text-sm disabled:opacity-50"
                                            placeholder="300 123 4567"
                                        />
                                        {!isEnded && (
                                            <button
                                                onClick={() => {
                                                    if (tempPhone.length !== 10) {
                                                        setPhoneError('El teléfono debe tener 10 dígitos');
                                                        return;
                                                    }
                                                    handleUpdateStatus(selectedTicket.id, { buyerPhone: tempPhone });
                                                }}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-xl transition-all group/btn"
                                            >
                                                <Check className="w-4 h-4" />
                                                <span className="absolute -bottom-9 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-[#1a1a1a] text-[#8b00ff] text-[9px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-[#8b00ff]/20 border border-[#8b00ff]/30 opacity-0 group-hover/btn:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap before:content-[''] before:absolute before:-top-1 before:left-1/2 before:-translate-x-1/2 before:w-2 before:h-2 before:bg-[#1a1a1a] before:rotate-45 before:border-l before:border-t before:border-[#8b00ff]/30">Guardar</span>
                                            </button>
                                        )}
                                    </div>
                                    {phoneError && <p className="text-xs text-red-500 font-bold mt-1 ml-2 shake-animation">{phoneError}</p>}
                                </div>

                                <div className="grid grid-cols-1 gap-3">
                                    {['APARTADO', 'REVISANDO', 'PAGADO'].map((st) => {
                                        const getColorClasses = (status) => {
                                            switch (status) {
                                                case 'PAGADO': return 'bg-[#d000ff] border-[#a000c4] shadow-[#d000ff]/30';
                                                case 'REVISANDO': return 'bg-[#ff00de] border-[#b3009b] shadow-[#ff00de]/30';
                                                default: return 'bg-[#8b00ff] border-[#6000b0] shadow-[#8b00ff]/30';
                                            }
                                        };

                                        return (
                                            <button
                                                key={st}
                                                onClick={() => !isEnded && handleStatusClick(selectedTicket, st)}
                                                disabled={isEnded}
                                                className={`flex items-center justify-between px-6 py-5 rounded-2xl font-black transition-all uppercase tracking-widest text-sm disabled:cursor-not-allowed
                                                    ${selectedTicket.status === st
                                                        ? `${getColorClasses(st)} text-white shadow-xl opacity-100 border-b-4`
                                                        : 'bg-gray-50 text-gray-400 hover:bg-gray-100 disabled:opacity-50'
                                                    }
                                                `}
                                            >
                                                <span>{st}</span>
                                                {selectedTicket.status === st && <Check className="w-5 h-5" />}
                                            </button>
                                        );
                                    })}

                                    {!isEnded && selectedTicket.status !== 'PAGADO' && (
                                        <div className="pt-6 mt-2 border-t border-gray-100 px-2">
                                            <button
                                                onClick={() => handleDeleteTicket(selectedTicket.id)}
                                                className="w-full px-6 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white font-black rounded-2xl hover:shadow-[0_10px_30px_rgba(239,68,68,0.4)] transition-all uppercase tracking-widest italic text-sm border-b-4 border-red-700 active:border-b-0 active:translate-y-1"
                                            >
                                                ELIMINAR RESERVA
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Draw Modal */}
            {showDrawModal && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
                    <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-md" onClick={() => !isDrawing && handleCloseModal()}></div>
                    <div className="relative bg-white w-full max-w-md md:rounded-[2.5rem] rounded-t-3xl shadow-2xl overflow-hidden animate-slide-up md:animate-scale-in flex flex-col max-h-[95vh]">
                        <div className="bg-gradient-to-r from-primary to-secondary p-8 text-white relative text-center shrink-0">
                            <button
                                onClick={() => {
                                    if (isDrawing) return;
                                    if (showWinnersView) {
                                        setShowWinnersView(false);
                                    } else {
                                        handleCloseModal();
                                    }
                                }}
                                className="absolute top-6 right-6 p-2 hover:bg-white/20 rounded-xl transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                            <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center mx-auto mb-4 border border-white/30">
                                <Trophy className="w-10 h-10 text-white" />
                            </div>
                            <h3 className="text-2xl font-black italic tracking-tighter uppercase">
                                Ganadores Seleccionados
                            </h3>
                            <p className="text-white/80 font-bold text-sm">
                                Se han registrado {winnersList.length} ganadores
                            </p>
                        </div>


                        {!showWinnersView ? (
                            <div className="p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">


                                {isEnded && (
                                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start space-x-3 text-left">
                                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                                        <p className="text-xs font-bold text-amber-800 leading-snug uppercase tracking-tight italic">
                                            Este sorteo ya ha sido finalizado. No se pueden lanzar más ganadores.
                                        </p>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 gap-4 text-left">
                                    {winnersList.length > 0 && (
                                        <button
                                            onClick={() => setShowWinnersView(true)}
                                            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl border border-gray-100 transition-all group shadow-sm"
                                        >
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-amber-500">
                                                    <Trophy className="w-5 h-5" />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ganadores registrados</p>
                                                    <p className="text-sm font-black text-gray-900 uppercase italic">Ver ganadores anteriores</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    )}
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Cantidad de ganadores</label>
                                        <input
                                            type="number"
                                            className="input-field bg-gray-50 border-gray-100 text-gray-900"
                                            defaultValue="1"
                                            min="1"
                                            id="winnersCount"
                                        />
                                    </div>
                                    <div className="flex items-center space-x-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                        <input
                                            type="checkbox"
                                            id="onlyPaid"
                                            checked={drawOnlyPaid}
                                            onChange={(e) => setDrawOnlyPaid(e.target.checked)}
                                            className="w-5 h-5 accent-primary"
                                        />
                                        <label htmlFor="onlyPaid" className="text-sm font-bold text-gray-700">
                                            {drawOnlyPaid ? `Solo números pagados (${stats.pagado})` : `Todos los números (${stats.totalSold})`}
                                        </label>
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        const countInput = document.getElementById('winnersCount');
                                        if (!countInput || !countInput.value || parseInt(countInput.value) <= 0) {
                                            setCustomErrorMessage("Por favor ingresa una cantidad válida de ganadores (mínimo 1).");
                                            setShowCustomErrorModal(true);
                                            return;
                                        }
                                        const count = countInput.value;
                                        startDraw(count, drawOnlyPaid);
                                    }}
                                    disabled={isDrawing || isEnded || (stats.pagado === 0 && drawOnlyPaid)}
                                    className={`w-full btn-primary py-5 text-xl tracking-tighter font-black shadow-2xl transition-transform ${isEnded ? 'opacity-50 grayscale cursor-not-allowed' : 'active:scale-95 shadow-primary/40'}`}
                                >
                                    {isEnded ? 'SORTEO FINALIZADO' : isDrawing ? 'SORTEANDO...' : 'LANZAR SORTEO'}
                                </button>

                                {/* Divider */}
                                <div className="flex items-center gap-4 py-2">
                                    <div className="flex-1 h-px bg-gray-200"></div>
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">O</span>
                                    <div className="flex-1 h-px bg-gray-200"></div>
                                </div>

                                {/* Manual Winner Section */}
                                <div className="space-y-3 text-left">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Ingresar ganador manual</label>
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <div className="relative flex-none sm:flex-1 group">
                                            <Trophy className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#ff00de] transition-colors" />
                                            <input
                                                type="number"
                                                placeholder="Número ganador"
                                                min="1"
                                                max={raffle?.totalTickets || 999}
                                                className="input-field pl-11 bg-gray-50 border-gray-100 text-gray-900 focus:border-[#ff00de] focus:ring-2 focus:ring-[#ff00de]/20"
                                                value={manualWinnerNumber}
                                                onChange={(e) => setManualWinnerNumber(e.target.value)}
                                                disabled={isEnded}
                                            />
                                        </div>
                                        <button
                                            onClick={async () => {
                                                if (!manualWinnerNumber) {
                                                    setCustomErrorMessage('Ingresa un número de boleta para registrar como ganador.');
                                                    setShowCustomErrorModal(true);
                                                    return;
                                                }

                                                const manualNum = parseInt(manualWinnerNumber);
                                                // Permitir si ya ganó al azar, pero no si ya se ingresó manualmente
                                                if (winnersList.some(w => w.ticketNumber === manualNum && Boolean(w.isManualWinner))) {
                                                    setCustomErrorMessage(`El número ${manualNum} ya ha sido registrado manualmente como ganador.`);
                                                    setShowCustomErrorModal(true);
                                                    return;
                                                }

                                                // El usuario permite duplicados manuales, pero validamos frontend para evitar errores de fetch

                                                try {
                                                    const res = await fetch(`${API_URL}/raffles/${raffleId}/manual-winner`, {
                                                        method: 'POST',
                                                        headers: {
                                                            'Authorization': `Bearer ${token}`,
                                                            'Content-Type': 'application/json'
                                                        },
                                                        body: JSON.stringify({
                                                            ticketNumber: parseInt(manualWinnerNumber),
                                                            onlyPaid: drawOnlyPaid
                                                        })
                                                    });
                                                    const data = await res.json();
                                                    if (!res.ok) throw new Error(data.error || 'Error al registrar ganador');

                                                    // ACUMULACIÓN: Sumamos el manual a los ganadores actuales (al principio)
                                                    setWinnersList(prev => [...data.winners, ...(Array.isArray(prev) ? prev : [])]);
                                                    setShowWinnersView(true);

                                                    setManualWinnerNumber('');
                                                    fetchRaffleDetails();
                                                } catch (err) {
                                                    setCustomErrorMessage(err.message);
                                                    setShowCustomErrorModal(true);
                                                }
                                            }}
                                            disabled={isEnded || !manualWinnerNumber}
                                            className={`btn-primary px-8 py-4 text-sm tracking-widest whitespace-nowrap shadow-2xl transition-all ${isEnded || !manualWinnerNumber ? 'opacity-50 grayscale cursor-not-allowed' : 'active:scale-95 shadow-primary/40'}`}
                                        >
                                            Agregar
                                        </button>
                                    </div>
                                    <p className="text-[9px] text-gray-400 font-medium ml-1">Ingresa un número de boleta existente para registrarlo como ganador sin sorteo aleatorio.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col h-full overflow-hidden">
                                <div className="px-6 py-6 border-b border-gray-100 bg-white flex items-center justify-between shrink-0">
                                    <button
                                        onClick={() => setShowWinnersView(false)}
                                        className="btn-primary flex items-center space-x-2 px-6 py-2 shadow-2xl shadow-primary/40 relative z-10 group scale-90 md:scale-100"
                                    >
                                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                                        <span className="font-black italic uppercase tracking-tighter text-xs">Volver Atrás</span>
                                    </button>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest italic leading-none">Resultados</span>
                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter mt-1">
                                            {winnersList.length} registrados
                                        </span>
                                    </div>
                                </div>

                                <div
                                    ref={winnersScrollRef}
                                    className="p-8 space-y-8 animate-bounce-in overflow-y-auto custom-scrollbar flex-1"
                                >
                                    <div className="space-y-4">
                                        <div className="overflow-x-auto -mx-8 px-8 pb-4">
                                            <div className="space-y-3 min-w-[340px]">
                                                {winnersList.map((win, idx) => {
                                                    const isManual = win && Boolean(win.isManualWinner);
                                                    const ticketNum = win?.ticketNumber || '??';
                                                    const buyerName = win?.buyer?.name || 'Anónimo';
                                                    const buyerPhone = win?.buyer?.phone || 'Sin tel.';
                                                    // If buyer is missing but the record exists in winnersList, it was deleted.
                                                    // However, manual winners might not have a buyer relation if added purely by number without a registration? 
                                                    // Actually manual winners are linked to tickets usually. If ticket is deleted, relation remains but buyer is null.
                                                    // We assume if no buyer info is present, it's a deleted reservation.
                                                    const isDeleted = !win?.buyer;

                                                    return (
                                                        <div
                                                            key={`${idx}-${ticketNum}`}
                                                            onClick={() => {
                                                                if (buyerPhone && buyerPhone !== 'Sin tel.' && !isDeleted) {
                                                                    const cleanPhone = buyerPhone.replace(/\D/g, '').slice(-10);
                                                                    const message = `¡Felicidades ${buyerName}! Has ganado un puesto en el sorteo "${raffle?.title || 'Winners'}" con el numero ${ticketNum}. Por favor comunicate con el organizador para reclamar tu premio.`;
                                                                    window.open(`https://api.whatsapp.com/send?phone=57${cleanPhone}&text=${encodeURIComponent(message)}`, '_blank');
                                                                }
                                                            }}
                                                            className={`p-4 rounded-2xl border flex flex-row items-center justify-between transition-all duration-300 
                                                            ${isDeleted
                                                                    ? 'bg-gray-100 border-gray-200 opacity-60 grayscale cursor-not-allowed'
                                                                    : `bg-gray-50 border-gray-100 ${buyerPhone && buyerPhone !== 'Sin tel.' ? `cursor-pointer hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] group/card ${isManual
                                                                        ? 'hover:bg-gradient-to-r hover:from-amber-500/5 hover:to-orange-400/5 hover:border-amber-400/30 hover:shadow-xl hover:shadow-amber-500/10'
                                                                        : 'hover:bg-gradient-to-r hover:from-[#8b00ff]/5 hover:to-[#ff00de]/5 hover:border-[#8b00ff]/30 hover:shadow-xl hover:shadow-[#8b00ff]/10'
                                                                        }` : ''}`
                                                                }`}
                                                        >
                                                            {/* Left Section: Rank and Name */}
                                                            <div className="text-left w-1/3">
                                                                <p className={`text-[10px] font-black uppercase ${isDeleted ? 'text-gray-400' : (isManual ? 'text-amber-500' : 'text-primary')}`}>
                                                                    Puesto #{
                                                                        (() => {
                                                                            const subset = winnersList.filter(w => Boolean(w.isManualWinner) === isManual);
                                                                            const winIndexInSubset = subset.indexOf(win);
                                                                            return subset.length - winIndexInSubset;
                                                                        })()
                                                                    }
                                                                </p>
                                                                <h4 className={`text-lg font-black transition-colors ${isDeleted ? 'text-gray-500' : 'text-gray-900'} ${!isDeleted && (isManual ? 'group-hover/card:text-amber-600' : 'group-hover/card:text-[#8b00ff]')}`}>{buyerName}</h4>
                                                            </div>

                                                            {/* Center Section: Phone (Centered on md+) */}
                                                            <div className="flex-1 flex items-center justify-center space-x-2">
                                                                <span className={`text-sm md:text-base font-bold font-mono tracking-tighter italic transition-all ${isDeleted ? 'text-gray-400' : 'text-gray-500'} ${!isDeleted && (isManual ? 'group-hover/card:text-amber-500' : 'group-hover/card:text-[#8b00ff]')}`}>
                                                                    {buyerPhone}
                                                                </span>
                                                                {buyerPhone && buyerPhone !== 'Sin tel.' && (
                                                                    <Phone className={`w-5 h-5 md:w-6 md:h-6 transition-all ${isDeleted ? 'text-gray-300' : (isManual ? 'text-amber-500' : 'text-[#ff00de]')} ${!isDeleted && 'group-hover/card:scale-125 group-hover/card:rotate-12'}`} />
                                                                )}
                                                            </div>

                                                            {/* Right Section: Ticket Number */}
                                                            <div className="w-1/3 flex justify-end">
                                                                <div className={`bg-white w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg border border-gray-100 font-black text-3xl italic transition-all ${isDeleted
                                                                    ? 'text-gray-300 shadow-none'
                                                                    : (isManual
                                                                        ? 'text-amber-500 group-hover/card:shadow-[0_0_20px_rgba(245,158,11,0.25)] group-hover/card:border-amber-400/30'
                                                                        : 'text-primary group-hover/card:shadow-[0_0_20px_rgba(139,0,255,0.2)] group-hover/card:border-[#8b00ff]/30')
                                                                    }`}>

                                                                    {ticketNum}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                    {!isEnded && (
                                        <button
                                            onClick={async () => {
                                                try {
                                                    // Finalize raffle status explicitly
                                                    await fetch(`${API_URL}/raffles/${raffleId}`, {
                                                        method: 'PATCH',
                                                        headers: {
                                                            'Authorization': `Bearer ${token}`,
                                                            'Content-Type': 'application/json'
                                                        },
                                                        body: JSON.stringify({ status: 'COMPLETED' })
                                                    });
                                                    setWinnersList([]);
                                                    setShowWinnersView(false);
                                                    navigate('/dashboard');
                                                } catch (err) {
                                                    console.error('Error finalizing raffle:', err);
                                                }
                                            }}
                                            className="w-full btn-primary py-5 text-xl tracking-tighter font-black shadow-2xl active:scale-95 shadow-primary/40"
                                        >
                                            FINALIZAR SORTEO
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )
            }

            {/* Settings Modal */}
            {
                showSettingsModal && (
                    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
                        <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => handleCloseModal()}></div>
                        <div className="relative bg-white w-full max-w-lg md:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden animate-slide-up md:animate-scale-in max-h-[95vh] flex flex-col">
                            <div className="bg-gradient-to-r from-primary to-secondary p-6 md:p-8 text-white relative shrink-0">
                                <button
                                    onClick={() => handleCloseModal()}
                                    className="absolute top-4 md:top-6 right-4 md:right-6 p-2 hover:bg-white/20 rounded-xl transition-colors"
                                >
                                    <X className="w-5 h-5 md:w-6 md:h-6" />
                                </button>
                                <h2 className="text-2xl md:text-3xl font-black italic tracking-tighter uppercase mb-1 md:mb-2">Ajustes de la Rifa</h2>
                                <p className="text-white/80 font-bold text-xs md:text-sm">Modifica los detalles de tu sorteo</p>
                            </div>

                            <form onSubmit={handleUpdateRaffle} className="p-6 md:p-8 space-y-4 md:space-y-6 pb-8 overflow-y-auto custom-scrollbar flex-1">

                                <div className="space-y-3 md:space-y-4">
                                    {isEnded && (
                                        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start space-x-3">
                                            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                                            <p className="text-xs font-bold text-amber-800 leading-snug uppercase tracking-tight italic">
                                                Rifa finalizada. No se pueden editar los detalles una vez completado el sorteo.
                                            </p>
                                        </div>
                                    )}

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Título de la rifa</label>
                                        <div className="relative group">
                                            <Layout className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                                            <input
                                                type="text"
                                                required
                                                placeholder="Título"
                                                disabled={isEnded}
                                                className="input-field pl-12 bg-gray-50 border-gray-100 focus:bg-white disabled:opacity-70 text-gray-900"
                                                value={updatedRaffleInfo.title}
                                                onChange={(e) => setUpdatedRaffleInfo({ ...updatedRaffleInfo, title: e.target.value })}
                                                onInvalid={(e) => e.target.setCustomValidity('Por favor, ingresa el título de la rifa')}
                                                onInput={(e) => e.target.setCustomValidity('')}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Descripción</label>
                                        <textarea
                                            rows="2"
                                            placeholder="Detalles..."
                                            disabled={isEnded}
                                            className="input-field bg-gray-50 border-gray-100 focus:bg-white resize-none disabled:opacity-70 text-gray-900"
                                            value={updatedRaffleInfo.description}
                                            onChange={(e) => setUpdatedRaffleInfo({ ...updatedRaffleInfo, description: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Imagen del premio (URL)</label>
                                        <div className="relative group">
                                            <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                                            <input
                                                type="url"
                                                placeholder="https://..."
                                                disabled={isEnded}
                                                className="input-field pl-12 bg-gray-50 border-gray-100 focus:bg-white disabled:opacity-70 text-gray-900"
                                                value={updatedRaffleInfo.image}
                                                onChange={(e) => setUpdatedRaffleInfo({ ...updatedRaffleInfo, image: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Precio por número</label>
                                            <input
                                                type="text"
                                                required
                                                disabled={isEnded}
                                                className="input-field bg-gray-50 border-gray-100 focus:bg-white disabled:opacity-70 text-gray-900"
                                                value={updatedRaffleInfo.price}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\D/g, '');
                                                    const formatted = val.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                                                    setUpdatedRaffleInfo({ ...updatedRaffleInfo, price: formatted });
                                                }}
                                                onInvalid={(e) => e.target.setCustomValidity('Por favor, ingresa el precio por número')}
                                                onInput={(e) => e.target.setCustomValidity('')}
                                            />
                                        </div>
                                        <div className="space-y-1.5 opacity-60">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Total Boletas (No editable)</label>
                                            <div className="relative group">
                                                <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                <input
                                                    type="text"
                                                    disabled={true}
                                                    className="input-field pl-12 bg-gray-100 border-gray-200 cursor-not-allowed text-gray-500 font-bold"
                                                    value={updatedRaffleInfo.totalTickets}
                                                    readOnly
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Fecha de sorteo</label>
                                        <input
                                            type="date"
                                            required
                                            disabled={isEnded}
                                            className="input-field bg-gray-50 border-gray-100 focus:bg-white disabled:opacity-70 text-gray-900"
                                            value={updatedRaffleInfo.endDate}
                                            onChange={(e) => setUpdatedRaffleInfo({ ...updatedRaffleInfo, endDate: e.target.value })}
                                            onInvalid={(e) => e.target.setCustomValidity('Por favor, selecciona la fecha del sorteo')}
                                            onInput={(e) => e.target.setCustomValidity('')}
                                        />
                                    </div>

                                </div>

                                {!isEnded && (
                                    <button type="submit" className="w-full btn-primary py-4 text-lg shadow-2xl shadow-primary/30 active:scale-95 transition-all">
                                        GUARDAR CAMBIOS
                                    </button>
                                )}
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Success Modal */}
            {
                showSuccessModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-md animate-fade-in" onClick={() => setShowSuccessModal(false)}></div>
                        <div className="relative bg-white/95 backdrop-blur-xl w-full max-w-sm rounded-[2rem] p-8 shadow-2xl border-2 border-white/50 animate-scale-in text-center overflow-visible">
                            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                                <div className="absolute inset-0 border-4 border-green-100 rounded-full animate-ping opacity-20"></div>
                                <CheckCircle className="w-10 h-10 text-green-500" />
                            </div>

                            <h3 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter mb-2">¡Éxito!</h3>
                            <p className="text-gray-500 font-medium mb-8">Rifa actualizada correctamente.</p>

                            <div className="p-2">
                                <button
                                    onClick={() => setShowSuccessModal(false)}
                                    className="w-full btn-primary py-4 rounded-2xl shadow-[0_15px_35px_-5px_rgba(255,0,222,0.4)] hover:shadow-[0_20px_45px_-5px_rgba(255,0,222,0.5)] text-sm font-black tracking-widest uppercase relative z-10 transition-all duration-300 active:scale-95"
                                >
                                    CERRAR
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Delete Confirmation Modal */}
            {
                showDeleteConfirm && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-md animate-fade-in" onClick={() => setShowDeleteConfirm(false)}></div>
                        <div className="relative bg-white/95 backdrop-blur-xl w-full max-w-sm rounded-[2rem] p-6 md:p-10 shadow-2xl border-2 border-white/50 animate-scale-in text-center flex flex-col max-h-[95vh] overflow-visible">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="absolute top-6 right-6 p-2 hover:bg-gray-50 rounded-xl transition-colors z-20"
                            >
                                <X className="w-6 h-6 text-gray-400" />
                            </button>
                            <div className="overflow-y-auto custom-scrollbar flex-1 overflow-x-visible">
                                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                                    <div className="absolute inset-0 border-4 border-red-100 rounded-full animate-ping opacity-20"></div>
                                    <AlertCircle className="w-10 h-10 text-red-500" />
                                </div>

                                <h3 className="text-3xl font-black text-gray-900 uppercase italic tracking-tighter mb-4">¿ELIMINAR?</h3>
                                <p className="text-gray-500 font-medium mb-8">¿Estás seguro de eliminar esta reserva? El número volverá a estar disponible.</p>
                            </div>

                            <div className="flex flex-col gap-3 p-2 pt-4">
                                <button
                                    onClick={confirmDeleteTicket}
                                    className="w-full px-6 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white font-black rounded-2xl shadow-[0_15px_35px_-5px_rgba(239,68,68,0.4)] hover:shadow-[0_20px_45px_-5px_rgba(239,68,68,0.5)] transition-all uppercase tracking-widest italic text-sm active:translate-y-1 relative z-10"
                                >
                                    ELIMINAR RESERVA
                                </button>
                            </div>
                        </div>

                    </div>
                )
            }

            {/* Ticket Update Success Modal */}
            {
                showTicketUpdateSuccess && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-md animate-fade-in" onClick={() => setShowTicketUpdateSuccess(false)}></div>
                        <div className="relative bg-white/95 backdrop-blur-xl w-full max-w-sm rounded-[2rem] p-8 shadow-2xl border-2 border-white/50 animate-scale-in text-center overflow-visible">
                            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                                <div className="absolute inset-0 border-4 border-green-100 rounded-full animate-ping opacity-20"></div>
                                <CheckCircle className="w-10 h-10 text-green-500" />
                            </div>

                            <h3 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter mb-2">¡Completado!</h3>
                            <p className="text-gray-500 font-medium mb-8">
                                {successType === 'phone'
                                    ? <>El teléfono del participante se ha <br /> actualizado correctamente.</>
                                    : <>El estado del ticket se ha <br /> actualizado correctamente.</>
                                }
                            </p>

                            <div className="p-2">
                                <button
                                    onClick={() => setShowTicketUpdateSuccess(false)}
                                    className="w-full btn-primary py-4 rounded-2xl shadow-[0_15px_35px_-5px_rgba(255,0,222,0.4)] hover:shadow-[0_20px_45px_-5px_rgba(255,0,222,0.5)] text-sm font-black tracking-widest uppercase relative z-10 transition-all duration-300 active:scale-95"
                                >
                                    CERRAR
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Status Change Confirmation Modal */}
            {
                showStatusConfirm && pendingStatusUpdate && (
                    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-md animate-fade-in" onClick={() => setShowStatusConfirm(false)}></div>
                        <div className="relative bg-white/95 backdrop-blur-xl w-full max-w-sm rounded-[2rem] p-6 md:p-10 shadow-2xl border-2 border-white/50 animate-scale-in text-center flex flex-col max-h-[95vh] overflow-visible">
                            <button
                                onClick={() => setShowStatusConfirm(false)}
                                className="absolute top-6 right-6 p-2 hover:bg-gray-50 rounded-xl transition-colors z-20"
                            >
                                <X className="w-6 h-6 text-gray-400" />
                            </button>
                            <div className="overflow-y-auto custom-scrollbar flex-1 overflow-x-visible">
                                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                                    <div className="absolute inset-0 border-4 border-primary/10 rounded-full animate-ping opacity-20"></div>
                                    <Clock className="w-10 h-10 text-primary" />
                                </div>

                                <h3 className="text-3xl font-black text-gray-900 uppercase italic tracking-tighter mb-4">¿CONFIRMAR?</h3>
                                <p className="text-gray-500 font-medium mb-8">
                                    ¿Estás seguro de cambiar el estado a <span className="text-primary font-black">{pendingStatusUpdate.status}</span> para el número <span className="font-black text-gray-700">{pendingStatusUpdate.number}</span> de <span className="font-black text-gray-700 italic">{pendingStatusUpdate.buyerName}</span>?
                                </p>
                            </div>

                            <div className="flex flex-col gap-3 p-2 pt-4">
                                <button
                                    onClick={confirmStatusUpdate}
                                    className="w-full btn-primary py-4 rounded-2xl shadow-[0_15px_35px_-5px_rgba(255,0,222,0.4)] hover:shadow-[0_20px_45px_-5px_rgba(255,0,222,0.5)] text-sm font-black tracking-widest uppercase relative z-10 transition-all duration-300 active:scale-95"
                                >
                                    CONFIRMAR CAMBIO
                                </button>
                            </div>
                        </div>

                    </div>
                )
            }
            {/* Custom Error Modal */}
            {
                showCustomErrorModal && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md animate-fade-in" onClick={() => setShowCustomErrorModal(false)}></div>
                        <div className="relative bg-white/95 backdrop-blur-xl w-full max-w-sm rounded-[2.5rem] p-6 md:p-10 shadow-3xl border-2 border-white/50 animate-scale-in text-center flex flex-col max-h-[95vh] overflow-visible">
                            <button
                                onClick={() => setShowCustomErrorModal(false)}
                                className="absolute top-6 right-6 p-2 hover:bg-gray-50 rounded-xl transition-colors z-20"
                            >
                                <X className="w-6 h-6 text-gray-400" />
                            </button>
                            <div className="overflow-y-auto custom-scrollbar flex-1 overflow-x-visible">
                                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                                    <div className="absolute inset-0 border-4 border-red-100 rounded-full animate-ping opacity-20"></div>
                                    <AlertTriangle className="w-10 h-10 text-red-500" />
                                </div>

                                <h3 className="text-3xl font-black text-gray-900 uppercase italic tracking-tighter mb-4">¡ATENCIÓN!</h3>
                                <p className="text-gray-500 font-bold leading-relaxed mb-8">
                                    {customErrorMessage}
                                </p>
                            </div>

                            <div className="p-2 pt-4">
                                <button
                                    onClick={() => setShowCustomErrorModal(false)}
                                    className="w-full btn-primary py-4 rounded-2xl shadow-[0_15px_35px_-5px_rgba(255,0,222,0.4)] hover:shadow-[0_20px_45px_-5px_rgba(255,0,222,0.5)] text-sm font-black tracking-widest uppercase relative z-10 transition-all duration-300 active:scale-95"
                                >
                                    ENTENDIDO
                                </button>
                            </div>
                        </div>

                    </div>
                )
            }

            {/* QR Modal for Mobile */}
            {
                showQRModal && (
                    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
                        <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowQRModal(false)}></div>
                        <div className="relative bg-white/95 backdrop-blur-xl w-full max-w-sm md:rounded-[2rem] rounded-t-3xl shadow-2xl border-2 border-white/50 animate-slide-up md:animate-scale-in text-center flex flex-col max-h-[95vh] overflow-hidden">
                            <button
                                onClick={() => setShowQRModal(false)}
                                className="absolute top-6 right-6 p-2 hover:bg-gray-50 rounded-xl transition-colors z-20"
                            >
                                <X className="w-6 h-6 text-gray-400" />
                            </button>
                            <div className="overflow-y-auto custom-scrollbar flex-1 p-8 pt-12">
                                <div className="mb-6">

                                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <QrCode className="w-8 h-8 text-primary" />
                                    </div>
                                    <h3 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter mb-2">Talonario Web</h3>
                                    <p className="text-sm text-gray-500 font-medium">Comparte el link o escanea el QR</p>
                                </div>

                                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 relative">
                                    <QRCodeCanvas
                                        value={`${window.location.origin}/${raffleId}`}
                                        size={200}
                                        level="H"
                                        includeMargin={false}
                                        className="mx-auto"
                                    />
                                    {qrCopied && (
                                        <div className="absolute inset-0 bg-green-500/90 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center text-white animate-fade-in">
                                            <Check className="w-10 h-10 mb-2" />
                                            <span className="text-sm font-black uppercase tracking-widest">¡Copiado!</span>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-gray-50 rounded-xl p-3 mb-4">
                                    <p className="text-xs font-mono text-gray-600 break-all">
                                        {`${window.location.origin}/${raffleId}`}
                                    </p>
                                </div>

                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(`${window.location.origin}/${raffleId}`);
                                        setQRCopied(true);
                                        setTimeout(() => setQRCopied(false), 2000);
                                    }}
                                    className="w-full btn-primary py-4 rounded-xl shadow-2xl shadow-primary/30 hover:shadow-secondary/50 text-sm font-black tracking-widest uppercase flex items-center justify-center space-x-2 transition-all duration-300"
                                >
                                    <Copy className="w-5 h-5" />
                                    <span>{qrCopied ? '¡COPIADO!' : 'COPIAR ENLACE'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }


        </div >
    );
};

export default RaffleManagement;
