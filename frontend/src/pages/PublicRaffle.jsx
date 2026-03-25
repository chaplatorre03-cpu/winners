import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Users, DollarSign, Calendar, Info, CheckCircle, CheckCircle2,
    QrCode, ArrowLeft, Menu, Lock, X, Grid, Layout, Settings, Trophy, Home, Eye, EyeOff, Search, Filter,
    Banknote, MousePointer2, Send, Award, Ticket, Phone, CreditCard, Wallet, RotateCcw, Dices, Copy
} from 'lucide-react';
import WinnersLogo from '../components/WinnersLogo';
import AdminSidebar from '../components/AdminSidebar';
import CloseButton from '../components/CloseButton';
import LoadingOverlay from '../components/LoadingOverlay';

import { API_URL } from '../config';

const INITIAL_PURCHASE_STATE = { name: '', phone: '', email: '' };

const PublicRaffle = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [raffle, setRaffle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedNumbers, setSelectedNumbers] = useState([]);
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [purchaseForm, setPurchaseForm] = useState(INITIAL_PURCHASE_STATE);
    const [purchaseError, setPurchaseError] = useState('');
    const [purchasing, setPurchasing] = useState(false);
    const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [tempPhone, setTempPhone] = useState('');
    const [showTicketUpdateSuccess, setShowTicketUpdateSuccess] = useState(false);
    const [successType, setSuccessType] = useState('status'); // 'status' or 'phone'
    const [showHowToModal, setShowHowToModal] = useState(false);
    const [showRandomModal, setShowRandomModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [randomSelection, setRandomSelection] = useState([]);
    const [paymentDetailView, setPaymentDetailView] = useState(null);
    const [copiedField, setCopiedField] = useState(null);

    const [session, setSession] = useState({
        token: localStorage.getItem('token'),
        user: JSON.parse(localStorage.getItem('user') || 'null')
    });

    // Reactive session sync across tabs
    useEffect(() => {
        const syncSession = () => {
            setSession({
                token: localStorage.getItem('token'),
                user: JSON.parse(localStorage.getItem('user') || 'null')
            });
        };
        window.addEventListener('storage', syncSession);
        // Also check when window gets focus
        window.addEventListener('focus', syncSession);
        return () => {
            window.removeEventListener('storage', syncSession);
            window.removeEventListener('focus', syncSession);
        };
    }, []);

    const { token, user } = session;

    // Strict owner check with validation and string casting
    const isOwner = React.useMemo(() => {
        if (!raffle || !user) return false;
        const raffleCreatorId = raffle.creatorId || raffle.creator?._id || raffle.creator?.id;
        const currentUserId = user._id || user.id;
        
        if (!raffleCreatorId || !currentUserId) return false;
        return String(raffleCreatorId) === String(currentUserId);
    }, [raffle, user]);

    const isEnded = raffle?.status === 'COMPLETED';

    useEffect(() => {
        fetchRaffle();
    }, [id]);

    // Lock body scroll when any modal is open
    useEffect(() => {
        const isAnyModalOpen = showPurchaseModal || showSuccessModal ||
            showTicketUpdateSuccess || showHowToModal || showRandomModal || showPaymentModal;

        if (isAnyModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [showPurchaseModal, showSuccessModal, showTicketUpdateSuccess, showHowToModal, showRandomModal, showPaymentModal]);

    const fetchRaffle = async () => {
        try {
            const response = await fetch(`${API_URL}/raffles/${id}`);
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Rifa no encontrada');
            setRaffle(data);
            setLoading(false);
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };



    const handleRandomSelect = () => {
        if (isEnded) return;
        const availableNumbers = Array.from({ length: raffle?.totalTickets || 0 }, (_, i) => i)
            .filter(num => !isTicketSold(num) && !selectedNumbers.includes(num) && !randomSelection.includes(num));

        if (availableNumbers.length === 0) return;

        const randomIndex = Math.floor(Math.random() * availableNumbers.length);
        const randomNum = availableNumbers[randomIndex];
        setRandomSelection(prev => [...prev, randomNum]);
    };

    const confirmRandomSelection = () => {
        setSelectedNumbers(prev => {
            const newSelection = [...new Set([...prev, ...randomSelection])];
            return newSelection;
        });
        setRandomSelection([]);
        setShowRandomModal(false);
    };

    const handleTicketClick = (num) => {
        if (isTicketSold(num) || isEnded) return;

        setSelectedNumbers(prev => {
            const newSet = new Set(prev);
            if (newSet.has(num)) {
                newSet.delete(num);
            } else {
                newSet.add(num);
            }
            return Array.from(newSet);
        });
    };

    const ticketMap = React.useMemo(() => {
        const map = new Map();
        if (raffle?.tickets) {
            raffle.tickets.forEach(t => map.set(t.number, t));
        }
        return map;
    }, [raffle?.tickets]);

    const isTicketSold = (num) => ticketMap.has(num);

    const formatNumber = (num) => {
        if (!raffle?.totalTickets) return num;
        const padding = (raffle.totalTickets - 1).toString().length;
        return num.toString().padStart(padding, '0');
    };

    const getTicketByNumber = (num) => ticketMap.get(num);

    const getTicketStatus = (num) => {
        const ticket = getTicketByNumber(num);
        return ticket ? ticket.status : 'AVAILABLE';
    };

    if (loading || purchasing) return <LoadingOverlay />;

    if (error) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center pt-20 pb-12 p-4 overflow-y-auto h-screen relative">
                {/* Animated background elements */}
                <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-sm">
                    <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button onClick={() => navigate('/')} className="btn-primary w-full">Volver al inicio</button>
                </div>
            </div>
        );
    }

    const paidCount = raffle.tickets?.filter(t => t.status === 'PAGADO').length || 0;
    const allTicketsCount = raffle.tickets?.length || 0;
    const paidPercentage = (paidCount / raffle.totalTickets) * 100;
    const progress = (isEnded || (token && isOwner))
        ? paidPercentage
        : (allTicketsCount / raffle.totalTickets) * 100;



    return (
        <div className="min-h-screen bg-[#0a0a0a] flex">
            {/* Sidebar (Admin Only) */}
            {token && isOwner && (
                <AdminSidebar
                    raffleTitle={raffle?.title}
                    raffleId={id}
                    activeItem="web"
                />
            )}

            <div className="flex-1 flex flex-col min-w-0">
                <nav className="h-auto py-3 md:h-24 bg-[#111] shadow-sm border-b border-gray-800 flex flex-col md:flex-row items-center justify-between px-4 md:px-8 sticky top-0 z-50 gap-0">
                    {/* Search Section - Bottom on mobile (order-2), Left on desktop (order-1) */}
                    <div className="order-2 md:order-1 flex items-center w-full max-w-xl">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-[22px] md:w-[26px] h-[22px] md:h-[26px] text-gray-400 group-focus-within:text-primary transition-colors" />
                            <input
                                type="text"
                                placeholder="Buscar..."
                                className="w-full text-lg md:text-xl input-field pl-11 md:pl-12 pr-10 md:pr-12 h-[52px] md:h-[62px] bg-[#222] border-primary/50 border-2 focus:border-primary transition-all hover:bg-[#2a2a2a] focus:bg-[#333] focus:ring-4 focus:ring-primary/20 text-white placeholder-gray-500"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-red-500/20 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-md active:scale-90 group/clear z-10"
                                    title="Limpiar búsqueda"
                                >
                                    <RotateCcw className="w-5 h-5 md:w-6 md:h-6" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Logo and Actions Section - Top on mobile (order-1), Right on desktop (order-2) */}
                    <div className="order-1 md:order-2 flex items-center justify-center w-full md:w-auto relative py-2 md:py-0 space-x-2 md:space-x-4">
                        <div className="md:translate-x-10 md:translate-y-1 scale-90 md:scale-90 lg:scale-100 transition-transform hover:scale-110 duration-500">
                            <WinnersLogo size="small" />
                        </div>

                        {!token && (
                            <>
                                <button
                                    onClick={() => navigate('/login')}
                                    className="absolute right-0 md:hidden p-2.5 bg-gradient-to-r from-[#8b00ff] to-[#ff00de] rounded-xl text-white shadow-lg shadow-primary/20 active:scale-95"
                                >
                                    <Lock className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => navigate('/login')}
                                    className="hidden md:flex items-center space-x-2 px-4 lg:px-5 py-2 lg:py-3 bg-gradient-to-r from-[#8b00ff] to-[#ff00de] hover:brightness-110 rounded-xl text-white transition-all shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 whitespace-nowrap"
                                >
                                    <span className="text-[10px] lg:text-xs font-black tracking-widest uppercase italic">Ingresar</span>
                                    <Lock className="w-4 h-4 shrink-0" />
                                </button>
                            </>
                        )}
                    </div>
                </nav>
                <div className={`${token && isOwner ? 'px-4 md:px-8 pb-40 md:pb-8' : 'max-w-7xl mx-auto md:px-8 pb-40 md:pb-8'} pt-8 md:grid md:grid-cols-12 md:gap-8`}>
                    {/* Left Panel - Info */}
                    <div className="md:col-span-4 space-y-6 px-4 md:px-0">
                        <div className="bg-[#111] rounded-2xl shadow-sm border border-gray-800 p-6 space-y-6">
                            <div className="flex flex-col items-center text-center space-y-4">
                                {raffle?.image && (
                                    <div className="w-full aspect-square bg-white p-6 md:p-10 rounded-[3.5rem] shadow-2xl border-4 border-white/10 flex items-center justify-center overflow-hidden mb-4 group ring-1 ring-black/5">
                                        <img
                                            src={raffle.image.startsWith('http') ? raffle.image : `/${raffle.image.replace(/^\//, '')}`}
                                            alt={raffle.title}
                                            className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-110"
                                        />
                                    </div>
                                )}
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-bold text-white">{raffle.title}</h2>
                                    <p className="text-gray-400 text-sm">{raffle.description}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                <button
                                    onClick={() => setShowHowToModal(true)}
                                    className="flex flex-col items-center justify-center p-4 bg-[#1a1a1a] rounded-xl transition-all border border-transparent hover:border-[#fbbf24] group/howto"
                                >
                                    <Info className="w-6 h-6 text-[#fbbf24] mb-2 transition-colors" />
                                    <span className="text-[10px] font-bold text-white group-hover/howto:text-[#8b00ff] uppercase tracking-widest transition-colors">Cómo participar</span>
                                </button>
                                {!isEnded && (
                                    <button
                                        onClick={() => {
                                            setRandomSelection([]);
                                            setShowRandomModal(true);
                                        }}
                                        className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20 shadow-inner group hover:shadow-lg hover:shadow-primary/10 hover:border-white transition-all cursor-pointer overflow-hidden relative"
                                    >
                                        <div className="absolute -right-2 -top-2 p-4 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
                                            <Ticket className="w-12 h-12 text-primary" />
                                        </div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 group-hover:text-primary transition-colors">Precio por número</p>
                                        <div className="flex items-baseline space-x-1">
                                            <span className="text-sm font-black text-primary">$</span>
                                            <span className="text-[29px] md:text-[31px] font-black text-primary tracking-tighter italic">{Number(raffle.price || 0).toLocaleString('es-CO')}</span>
                                        </div>
                                        <p className="text-sm font-black text-gray-400 uppercase tracking-tighter mt-2 bg-white px-4 py-1.5 rounded-full shadow-md group-hover:scale-105 transition-transform">¡TOCA PARA AZAR!</p>
                                    </button>
                                )}

                                {isEnded && (
                                    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-3xl border-4 border-gray-100 text-center shadow-2xl relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                        <Trophy className="w-8 h-8 text-yellow-500 mb-3 relative z-10 animate-pulse" />
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] leading-tight mb-4 relative z-10">Números Ganadores</span>
                                        <div className="flex flex-wrap justify-center gap-3 relative z-10">
                                            {raffle.winnerTickets?.length > 0 ? (
                                                [...raffle.winnerTickets].reverse().map((win, idx) => {
                                                    const isManual = Boolean(win.isManualWinner);
                                                    return (
                                                        <div
                                                            key={idx}
                                                            className={`bg-white w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg border border-gray-100 font-black text-2xl italic ${isManual ? 'text-amber-500' : 'text-[#8b00ff]'}`}
                                                        >
                                                            {formatNumber(win.ticketNumber)}
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <span className="text-gray-400 font-black italic tracking-tighter uppercase text-sm">Próximamente...</span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <a
                                href={`https://api.whatsapp.com/send?phone=57${(raffle.creator?.phone || raffle.organizerPhone || '3204446733').replace(/\D/g, '').slice(-10)}&text=${encodeURIComponent(`Hola, deseo informacion sobre el sorteo: ${raffle.title}`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-6 border-[1.2px] border-primary bg-primary/5 rounded-2xl flex flex-col items-center hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-0.5 transition-all cursor-pointer group/organizer"
                            >
                                <div className="text-center">
                                    <p className="text-[10px] text-primary uppercase font-black tracking-[0.15em] leading-none mb-2 opacity-80">Organizador</p>
                                    <p className="text-lg font-black text-white group-hover/organizer:text-primary transition-colors uppercase">{raffle.creator?.name || raffle.organizerName || 'Winners'}</p>
                                    <div className="flex items-center justify-center space-x-3 mt-3 opacity-90">
                                        <div className="w-6 h-6 bg-[#00ff00] rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(0,255,0,0.3)]">
                                            <Phone className="w-3.5 h-3.5 text-white" />
                                        </div>
                                        <span className="text-sm font-black text-gray-400 font-mono tracking-widest transition-colors group-hover/organizer:text-[#00ff00]">{raffle.creator?.phone || raffle.organizerPhone || '3204446733'}</span>
                                    </div>
                                </div>
                            </a>


                            <div className="grid grid-cols-1 gap-2">
                                <div className="text-center p-4 md:p-3 bg-[#1a1a1a] rounded-xl border border-gray-800 flex flex-col items-center justify-center min-h-[70px]">
                                    <p className="text-lg md:text-sm font-black text-[#ff00de]">
                                        {raffle.tickets?.length || 0}
                                    </p>
                                    <p className="text-[10px] md:text-[8px] text-gray-400 font-black uppercase tracking-widest">Participantes</p>
                                </div>
                                <div className="text-center p-4 md:p-3 bg-[#1a1a1a] rounded-xl border border-gray-800 flex flex-col items-center justify-center min-h-[70px]">
                                    <p className="text-lg md:text-sm font-black text-[#ff00de] uppercase">
                                        {new Date(raffle.endDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).replace('.', '')}
                                    </p>
                                    <p className="text-[10px] md:text-[8px] text-gray-400 font-black uppercase tracking-widest">Sorteo</p>
                                </div>
                                {token && isOwner ? (
                                    <div className="text-center p-4 md:p-3 bg-[#1a1a1a] rounded-xl border border-gray-800 flex flex-col items-center justify-center min-h-[70px]">
                                        <p className="text-lg md:text-sm font-black text-[#ff00de] break-words px-0.5 leading-tight uppercase">
                                            ${((raffle.tickets?.filter(t => t.status === 'PAGADO').length || 0) * Number(raffle.price || 0)).toLocaleString('es-CO')}
                                        </p>
                                        <p className="text-[10px] md:text-[8px] text-gray-400 font-black uppercase tracking-widest">Recaudado</p>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowPaymentModal(true)}
                                        className="flex flex-col items-center justify-center p-4 md:p-3 bg-gradient-to-br from-[#8b00ff]/20 to-[#ff00de]/20 hover:from-[#8b00ff]/30 hover:to-[#ff00de]/30 rounded-xl border border-[#8b00ff]/50 transition-all cursor-pointer group min-h-[70px]"
                                    >
                                        <CreditCard className="w-7 h-7 md:w-5 md:h-5 text-[#ff00de] mb-1 group-hover:scale-110 transition-transform" />
                                        <span className="text-[11px] md:text-[9px] font-black text-white uppercase tracking-widest">MEDIOS DE PAGO</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Panel - Grid */}
                    <div className="md:col-span-8 mt-8 md:mt-0 space-y-6 px-4 md:px-0">
                        <div className="bg-[#111] rounded-2xl shadow-sm border border-gray-800 p-6">
                            <div className="mb-6 space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <h3 className="text-lg md:text-xl font-black text-white italic uppercase tracking-tighter">
                                        {isEnded ? 'SORTEO FINALIZADO' : 'Escoge tus números'}
                                    </h3>
                                    <div className="flex flex-col items-stretch sm:items-end gap-3 min-w-0">
                                        <div className="flex items-center gap-3 w-full sm:w-auto">
                                            <div className="flex flex-col gap-3 flex-1 sm:w-64 min-w-0">
                                                {!isEnded && (
                                                    <button
                                                        onClick={() => setShowOnlyAvailable(!showOnlyAvailable)}
                                                        className={`flex items-center justify-center space-x-2 px-6 py-2.5 rounded-2xl text-xs font-black transition-all border-2 w-full ${showOnlyAvailable
                                                            ? 'bg-[#8b00ff] border-[#8b00ff] text-white shadow-[0_0_20px_rgba(139,0,255,0.4)]'
                                                            : 'bg-[#1a1a1a] border-gray-800 text-gray-400 hover:border-[#8b00ff]/50 hover:text-white'
                                                            }`}
                                                    >
                                                        {showOnlyAvailable ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                        <span className="uppercase tracking-widest">Disponibles</span>
                                                    </button>
                                                )}
                                                <span className={`${isEnded ? 'bg-sky-400/10 text-sky-400 border-2 border-sky-400/20 shadow-[0_0_15_rgba(56,189,248,0.1)]' : 'bg-[#ff00de]/10 text-[#ff00de] border-2 border-[#ff00de]/20'} text-xs font-black px-6 py-2.5 rounded-2xl uppercase tracking-widest whitespace-nowrap text-center block w-full`}>
                                                    {isEnded ? `${Math.round(paidPercentage)}% PAGADO` : `${Math.round(progress)}% Vendido`}
                                                </span>
                                            </div>
                                            <div className="flex-shrink-0 w-[52px] h-[52px] sm:w-[56px] sm:h-[56px] md:w-[60px] md:h-[60px] flex items-center justify-center">
                                                {selectedNumbers.length > 0 && (
                                                    <button
                                                        onClick={() => setSelectedNumbers([])}
                                                        className="w-full h-full flex items-center justify-center bg-sky-500/10 border-2 border-sky-500/40 text-sky-500 rounded-xl hover:bg-sky-500 hover:text-white transition-all shadow-[0_0_15px_rgba(14,165,233,0.2)] hover:scale-105 active:scale-95 group"
                                                        title="Reiniciar selección"
                                                    >
                                                        <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6 group-hover:-rotate-180 transition-transform duration-500" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-800 rounded-full h-2.5 overflow-hidden border border-gray-700 shadow-inner">
                                    <div
                                        className="h-full bg-gradient-to-r from-[#8b00ff] to-[#ff00de] transition-all duration-1000 ease-out"
                                        style={{ width: `${progress}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* Ticket Grid */}
                            <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                                {Array.from({ length: raffle.totalTickets }, (_, i) => i)
                                    .filter(num => {
                                        const status = getTicketStatus(num);
                                        if (showOnlyAvailable && status !== 'AVAILABLE') return false;
                                        if (!searchQuery) return true;
                                        const ticket = raffle?.tickets?.find(t => t.number === num);
                                        const buyerInfo = ticket?.buyerName || '';
                                        const formattedNum = formatNumber(num);
                                        const query = searchQuery.trim().toLowerCase();
                                        const numStr = num.toString();
                                        return formattedNum.includes(query) || 
                                               numStr.includes(query) || 
                                               buyerInfo.toLowerCase().includes(query) ||
                                               (!isNaN(query) && query !== '' && parseInt(query, 10) === num);
                                    })
                                    .map((num) => {
                                        const status = getTicketStatus(num);
                                        const isSelected = selectedNumbers.includes(num);
                                        const isSold = status !== 'AVAILABLE';

                                        return (
                                            <button
                                                key={num}
                                                onClick={() => handleTicketClick(num)}
                                                disabled={isSold || isEnded}
                                                className={`
                      aspect-square rounded-xl flex items-center justify-center font-bold text-sm transition-all duration-300
                      ${status === 'AVAILABLE' && !isSelected ? 'bg-[#1a1a1a] border-2 border-gray-800 text-gray-500 hover:border-[#8b00ff] hover:text-[#8b00ff] hover:scale-105 hover:shadow-lg active:scale-95' : ''}
                      ${isSelected ? 'bg-gradient-to-br from-[#8b00ff] to-[#ff00de] text-gray-900 scale-110 shadow-[0_0_15px_rgba(139,0,255,0.5)] z-10 animate-bounce-selected' : ''}
                        ${token && isOwner && status === 'PAGADO' && !isSelected ? 'bg-[#00ff00]/10 text-[#00ff00] border-2 border-solid border-[#00ff00]/50 shadow-[0_0_10px_rgba(0,255,0,0.2)]' : ''}
                       ${token && isOwner && status === 'REVISANDO' && !isSelected ? 'bg-[#ff00de]/10 text-[#ff00de] border-2 border-dashed border-[#ff00de]/50' : ''}
                       ${token && isOwner && status === 'APARTADO' && !isSelected ? 'bg-[#8b00ff]/10 text-[#8b00ff] border-2 border-dotted border-[#8b00ff]/50' : ''}
                       ${!(token && isOwner) && status !== 'AVAILABLE' && !isSelected ? 'bg-[#ff00de]/10 border-2 border-solid border-[#ff00de]/20 text-[#ff00de]' : ''}
                       ${isEnded && status === 'AVAILABLE' ? 'opacity-40 grayscale pointer-events-none' : ''}
                    `}
                                            >
                                                {formatNumber(num)}
                                            </button>
                                        );
                                    })}
                            </div>
                        </div>

                        {/* Checkout Bar - Sticky on Mobile */}
                        {selectedNumbers.length > 0 && (
                            <div key={selectedNumbers.length} className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a]/90 backdrop-blur-md border-t border-gray-800 py-6 px-4 md:relative md:rounded-3xl md:border-2 md:border-primary/20 md:shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-slide-up z-[55]">
                                <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-baseline space-x-2 mb-1">
                                            <p className="text-2xl md:text-3xl font-black text-white italic tracking-tighter leading-none">
                                                ${(selectedNumbers.length * Number(raffle.price)).toLocaleString('es-CO')}
                                            </p>
                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest hidden md:inline-block">Total</p>
                                        </div>
                                        <div className="text-xs text-primary font-bold whitespace-normal break-words max-h-16 overflow-y-auto custom-scrollbar">
                                            {selectedNumbers.length} {selectedNumbers.length === 1 ? 'Número' : 'Números'}: <span className="text-gray-400 font-medium">{[...selectedNumbers].sort((a, b) => a - b).map(formatNumber).join(', ')}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setShowPurchaseModal(true);
                                            setPurchaseError('');
                                        }}
                                        className="btn-primary py-3 px-6 md:py-4 md:px-8 shadow-xl shadow-primary/30 whitespace-nowrap bg-gradient-to-r from-primary to-secondary text-gray-900 font-black rounded-xl md:rounded-2xl text-sm md:text-base uppercase tracking-widest italic"
                                    >
                                        RESERVAR
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Purchase Modal */}
                {showPurchaseModal && (
                    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-4">
                        <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowPurchaseModal(false)}></div>
                        <div className="relative bg-white w-full max-w-md md:rounded-3xl rounded-t-3xl shadow-2xl animate-slide-up md:animate-scale-in flex flex-col max-h-[95vh] overflow-hidden">
                            <CloseButton onClick={() => setShowPurchaseModal(false)} />
                            <div className="pt-20 md:pt-24 px-6 md:px-8 pb-6 md:pb-8 space-y-4 md:space-y-6 relative overflow-y-auto custom-scrollbar">
                                <div className="text-center space-y-1 md:space-y-2">
                                    <h3 className="text-xl md:text-2xl font-black text-gray-900">Finalizar reserva</h3>
                                    <p className="text-gray-500 text-xs md:text-sm">Ingresa tus datos para apartar tus números</p>
                                </div>

                                <form
                                    onSubmit={async (e) => {
                                        e.preventDefault();
                                        if (!purchaseForm.name || !purchaseForm.phone) {
                                            setPurchaseError('Nombre y teléfono son obligatorios');
                                            return;
                                        }
                                        if (purchaseForm.phone.length !== 10) {
                                            setPurchaseError('El teléfono debe tener 10 dígitos');
                                            return;
                                        }
                                        setPurchasing(true);
                                        setPurchaseError('');
                                        try {
                                            const res = await fetch(`${API_URL}/raffles/purchase`, {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    raffleId: raffle.id,
                                                    ticketNumbers: selectedNumbers,
                                                    buyerName: purchaseForm.name,
                                                    buyerPhone: purchaseForm.phone
                                                })
                                            });
                                            const data = await res.json();
                                            if (res.ok) {
                                                // Close the purchase modal first
                                                setShowPurchaseModal(false);

                                                // WhatsApp Redirection - Definitive Fix
                                                const organizerPhone = raffle.creator?.phone || raffle.organizerPhone || '3204446733';
                                                const cleanPhone = organizerPhone.replace(/\D/g, '').slice(-10);
                                                const numbersText = selectedNumbers.map(formatNumber).join(', ');

                                                const message = `Hola! He reservado los numeros ${numbersText} para el sorteo ${raffle.title} a nombre de ${purchaseForm.name}. Adjunto el comprobante de pago para validar mi participacion.`;

                                                const waLink = `https://api.whatsapp.com/send?phone=57${cleanPhone}&text=${encodeURIComponent(message)}`;
                                                setTempPhone(waLink);

                                                const waWindow = window.open(waLink, '_blank');
                                                if (!waWindow) {
                                                    console.warn('Popup blocked or failed to open');
                                                }

                                                setShowSuccessModal(true);
                                                setPurchaseForm(INITIAL_PURCHASE_STATE);
                                                setSelectedNumbers([]);
                                                fetchRaffle();
                                            } else {
                                                setPurchaseError(data.error || 'Error al comprar');
                                            }
                                        } catch (err) {
                                            console.error(err);
                                            setPurchaseError('Error de conexión');
                                        } finally {
                                            setPurchasing(false);
                                        }
                                    }}
                                    className="space-y-4"
                                >
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-700 uppercase">Nombre completo</label>
                                        <input
                                            type="text"
                                            name="name"
                                            autoComplete="name"
                                            className="input-field uppercase"
                                            placeholder="Tu nombre"
                                            required
                                            value={purchaseForm.name}
                                            onChange={e => {
                                                const val = e.target.value.toUpperCase().replace(/[^A-ZÁÉÍÓÚÑ\s]/g, '');
                                                setPurchaseForm({ ...purchaseForm, name: val });
                                                setPurchaseError('');
                                            }}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-700 uppercase">Teléfono / WhatsApp</label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            autoComplete="tel"
                                            className="input-field"
                                            placeholder="300 123 4567"
                                            required
                                            maxLength={10}
                                            value={purchaseForm.phone}
                                            onChange={e => {
                                                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                setPurchaseForm({ ...purchaseForm, phone: val });
                                                setPurchaseError('');
                                            }}
                                        />
                                    </div>
                                    {purchaseError && (
                                        <div className="bg-red-50 text-red-500 text-sm font-bold p-3 rounded-xl border border-red-100 flex items-center justify-center">
                                            {purchaseError}
                                        </div>
                                    )}
                                    <div className="pt-2">
                                        <button
                                            type="submit"
                                            disabled={purchasing}
                                            className="w-full btn-primary py-3 shadow-lg shadow-primary/20"
                                        >
                                            {purchasing ? 'Procesando...' : 'Confirmar'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {showSuccessModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-md animate-fade-in" onClick={() => setShowSuccessModal(false)}></div>
                        <div className="relative bg-white/95 backdrop-blur-xl w-full max-w-sm rounded-[2rem] p-8 shadow-2xl border-2 border-white/50 animate-scale-in text-center">
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 relative">
                                <div className="absolute inset-0 border-4 border-green-100 rounded-full animate-ping opacity-20"></div>
                                <CheckCircle className="w-8 h-8 md:w-10 md:h-10 text-green-500" />
                            </div>

                            <h3 className="text-xl md:text-2xl font-black text-gray-900 uppercase italic tracking-tighter mb-2">¡Éxito!</h3>
                            <p className="text-sm md:text-base text-gray-500 font-medium mb-6 md:mb-8">
                                ¡Números apartados con éxito! <br />
                                <span className="text-xs mt-2 block opacity-70">Contacta al organizador para pagar.</span>
                            </p>

                            <div className="space-y-3">
                                <a
                                    href={tempPhone || '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full bg-[#25D366] hover:bg-[#20ba59] text-white py-3 rounded-xl shadow-xl shadow-green-500/20 hover:shadow-2xl hover:shadow-green-500/40 text-[11px] font-black tracking-widest uppercase flex items-center justify-center space-x-2 transition-all hover:-translate-y-1 active:scale-95 relative z-10"
                                >
                                    <Phone className="w-4 h-4" />
                                    <span>Enviar Comprobante</span>
                                </a>
                                <button
                                    onClick={() => setShowSuccessModal(false)}
                                    className="w-full btn-primary py-3 rounded-xl shadow-lg shadow-primary/20 text-sm font-black tracking-widest uppercase relative z-10"
                                >
                                    CERRAR
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* How to Participate Modal */}
                {showHowToModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-md animate-fade-in" onClick={() => setShowHowToModal(false)}></div>
                        <div className="relative bg-[#F2F2F2] backdrop-blur-xl w-full max-w-md rounded-2xl md:rounded-[2rem] shadow-2xl border-2 border-white/50 animate-scale-in flex flex-col max-h-[90vh]">
                            <CloseButton onClick={() => setShowHowToModal(false)} />
                            <div className="flex items-center justify-between pt-20 md:pt-24 px-6 md:px-8 pb-6 md:pb-8 shrink-0">
                                <h3 className="text-xl md:text-2xl font-black text-gray-900 uppercase italic tracking-tighter">Participar</h3>
                            </div>
                            <div className="overflow-y-auto custom-scrollbar flex-1 px-6 md:px-8 space-y-6 md:space-y-8 pb-8">
                                <div className="flex items-start space-x-4">
                                    <div className="w-8 h-8 rounded-full border-2 border-primary/30 flex items-center justify-center bg-primary/5 shrink-0">
                                        <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900"><span className="text-primary italic">01.</span> Selecciona y aparta</p>
                                        <p className="text-sm text-gray-500">los números que quieres tomar.</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-4">
                                    <div className="w-8 h-8 rounded-full border-2 border-primary/30 flex items-center justify-center bg-primary/5 shrink-0">
                                        <div className="w-3 h-3 rounded-full bg-primary" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900"><span className="text-primary italic">02.</span> Realiza el pago</p>
                                        <p className="text-sm text-gray-500">correspondiente a tu reserva.</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-4">
                                    <div className="w-8 h-8 rounded-full border-2 border-primary/30 flex items-center justify-center bg-primary/5 shrink-0">
                                        <div className="w-3 h-3 rounded-full bg-primary" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900"><span className="text-primary italic">03.</span> Envía tu comprobante</p>
                                        <p className="text-sm text-gray-500">Envía captura al numero <span className="text-primary font-black">{raffle.creator?.phone || raffle.organizerPhone || '3204446733'}</span>.</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-4">
                                    <div className="w-8 h-8 rounded-full border-2 border-primary/30 flex items-center justify-center bg-primary/5 shrink-0">
                                        <Award className="w-4 h-4 text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900"><span className="text-primary italic">04.</span> Espera los resultados</p>
                                        <p className="text-sm text-gray-500 uppercase">Día: <span className="text-primary font-black">{new Date(raffle.endDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).replace('.', '')}</span></p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 md:p-8 pt-4 border-t border-gray-100/50 bg-[#F2F2F2]/80 backdrop-blur-sm rounded-b-2xl md:rounded-b-[2rem]">
                                <button onClick={() => setShowHowToModal(false)} className="w-full btn-primary py-4 rounded-xl shadow-lg shadow-primary/20 text-sm font-black tracking-widest uppercase relative z-10">
                                    ENTENDIDO
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Random Selection Modal */}
                {showRandomModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-md animate-fade-in" onClick={() => setShowRandomModal(false)}></div>
                        <div className="relative bg-white/95 backdrop-blur-xl w-full max-w-sm rounded-[2rem] pt-20 md:pt-24 px-8 pb-8 shadow-2xl border-2 border-white/50 animate-scale-in text-center flex flex-col max-h-[95vh]">
                            <CloseButton onClick={() => setShowRandomModal(false)} />
                            <div className="mb-8">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Generar números</p>
                                <p className="text-sm text-gray-500 font-medium">Selecciona números al azar</p>
                            </div>
                            <button onClick={handleRandomSelect} className="w-full flex items-center justify-center space-x-3 py-4 bg-secondary/10 hover:bg-secondary/20 text-primary border-2 border-secondary/50 border-dashed rounded-2xl transition-all group active:scale-95 mb-6">
                                <Dices className="w-6 h-6 group-hover:rotate-180 transition-transform duration-500" />
                                <span className="font-black uppercase tracking-widest italic text-sm">Aleatorio</span>
                            </button>
                            <div className="flex-1 overflow-y-auto custom-scrollbar mb-6">
                                <div className="flex flex-wrap gap-2 min-h-[50px] p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    {randomSelection.length === 0 ? (
                                        <p className="text-[10px] text-gray-400 font-bold uppercase italic m-auto">Ningún número generado</p>
                                    ) : (
                                        <>
                                            <h3 className="text-lg md:text-xl font-black text-[#8b00ff] uppercase italic tracking-[0.2em]">Números Elegidos</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {randomSelection.map(num => (
                                                    <div key={num} className="flex items-center space-x-2 bg-primary text-white px-3 py-1.5 rounded-lg animate-scale-in">
                                                        <span className="font-black text-sm">{formatNumber(num)}</span>
                                                        <button onClick={() => setRandomSelection(prev => prev.filter(n => n !== num))} className="hover:text-white/70 transition-colors">
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                            <button onClick={confirmRandomSelection} disabled={randomSelection.length === 0} className="w-full btn-primary py-3 rounded-xl shadow-lg shadow-primary/20 text-sm font-black tracking-widest uppercase relative z-10 disabled:opacity-50">
                                {randomSelection.length === 0 ? 'ELABORAR SELECCIÓN' : `TOMAR ${randomSelection.length} NÚMEROS`}
                            </button>
                        </div>
                    </div>
                )}

                {/* Payment Methods Modal */}
                {showPaymentModal && (
                    <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-0 md:p-4">
                        <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-md animate-fade-in" onClick={() => { setShowPaymentModal(false); setPaymentDetailView(null); }}></div>
                        <div className="relative bg-white/95 backdrop-blur-xl w-full max-w-md md:rounded-[2rem] rounded-t-[2rem] shadow-2xl border-2 border-white/50 animate-slide-up md:animate-scale-in flex flex-col max-h-[95vh]">
                            <CloseButton onClick={() => { setShowPaymentModal(false); setPaymentDetailView(null); }} />

                            {!paymentDetailView ? (
                                /* Main payment methods list */
                                <>
                                    <div className="pt-20 md:pt-24 px-6 md:px-8 pb-6 md:pb-8 shrink-0 relative border-b border-gray-100/50">
                                        <div className="text-center">
                                            <h3 className="text-xl md:text-2xl font-black text-gray-900 uppercase italic tracking-tighter mb-1">Medios de Pago</h3>
                                            <p className="text-xs md:text-sm text-gray-500 font-medium">Selecciona tu método preferido</p>
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
                                        <div className="flex flex-col space-y-3">
                                            <div onClick={() => window.open('https://kiire.mpos.com/mailpos/#/jb-27LN', '_blank')} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center space-x-4 hover:bg-white hover:shadow-lg transition-all group cursor-pointer w-full">
                                                <CreditCard className="w-6 h-6 text-[#8b00ff]" />
                                                <p className="font-bold text-gray-900 text-sm">Tarjeta Débito / Crédito</p>
                                            </div>
                                            <div onClick={() => window.open('https://kiire.mpos.com/mailpos/#/jb-27LN', '_blank')} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center space-x-4 hover:bg-white hover:shadow-lg transition-all group cursor-pointer w-full">
                                                <MousePointer2 className="w-6 h-6 text-[#ff00de]" />
                                                <p className="font-bold text-gray-900 text-sm">PSE</p>
                                            </div>
                                            <div onClick={() => { setPaymentDetailView('nequi'); setCopiedField(null); }} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center space-x-4 hover:bg-white hover:shadow-lg transition-all group cursor-pointer w-full">
                                                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M7.5 19.5V5h3.2l5.4 9.8V5h2.8v14.5h-3.2L10.3 9.7v9.8H7.5z" fill="#1f0e33" />
                                                    <rect x="3.5" y="5" width="2.5" height="2.5" fill="#e3007b" />
                                                </svg>
                                                <p className="font-bold text-gray-900 text-sm">Nequi</p>
                                            </div>
                                            <div onClick={() => { setPaymentDetailView('daviplata'); setCopiedField(null); }} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center space-x-4 hover:bg-white hover:shadow-lg transition-all group cursor-pointer w-full">
                                                <Wallet className="w-6 h-6 text-[#ff0000]" />
                                                <p className="font-bold text-gray-900 text-sm">Daviplata</p>
                                            </div>
                                            <div onClick={() => { setPaymentDetailView('breb'); setCopiedField(null); }} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center space-x-4 hover:bg-white hover:shadow-lg transition-all group cursor-pointer w-full">
                                                <Send className="w-6 h-6 text-[#ffcc00]" />
                                                <p className="font-bold text-gray-900 text-sm">Bre-B</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-6 md:p-8 shrink-0">
                                        <button onClick={() => setShowPaymentModal(false)} className="w-full btn-primary py-4 rounded-xl shadow-lg shadow-primary/20 text-sm font-black tracking-widest uppercase relative z-10">
                                            CERRAR
                                        </button>
                                    </div>
                                </>
                            ) : (
                                /* Detail sub-view */
                                <>
                                    <div className="pt-20 md:pt-24 px-6 md:px-8 pb-6 md:pb-8 shrink-0 relative border-b border-gray-100/50">
                                        <div className="text-center">
                                            <h3 className="text-xl md:text-2xl font-black text-gray-900 uppercase italic tracking-tighter mb-1">
                                                {paymentDetailView === 'nequi' ? 'Pago por Nequi' : paymentDetailView === 'daviplata' ? 'Pago por Daviplata' : 'Pago por Bre-B'}
                                            </h3>
                                            <p className="text-xs md:text-sm text-gray-500 font-medium tracking-tight">
                                                {(paymentDetailView === 'nequi' || paymentDetailView === 'daviplata') ? 'Copia los datos y abre la App' : 'Copia los datos'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
                                        <div className="space-y-4">
                                            <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Enviar a número</p>
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xl font-black text-gray-900 font-mono tracking-wider">
                                                        {raffle.creator?.phone || raffle.organizerPhone || '3204446733'}
                                                    </p>
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(raffle.creator?.phone || raffle.organizerPhone || '3204446733');
                                                            setCopiedField('phone');
                                                            setTimeout(() => setCopiedField(null), 2000);
                                                        }}
                                                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${copiedField === 'phone' ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                                                    >
                                                        {copiedField === 'phone' ? (
                                                            <><CheckCircle className="w-3.5 h-3.5" /><span>Copiado</span></>
                                                        ) : (
                                                            <><Copy className="w-3.5 h-3.5" /><span>Copiar</span></>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>

                                            {paymentDetailView !== 'breb' && (
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        const ua = navigator.userAgent || navigator.vendor || window.opera;
                                                        const isAndroid = /android/i.test(ua);
                                                        const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

                                                        const appScheme = paymentDetailView === 'nequi' ? 'nequi' : 'daviplata';
                                                        const packageId = paymentDetailView === 'nequi' ? 'com.nequi.MobileApp' : 'com.davivienda.daviplataapp';
                                                        
                                                        const fallbackUrl = paymentDetailView === 'nequi'
                                                            ? (isIOS ? 'https://apps.apple.com/co/app/nequi/id1010765891' : 'https://play.google.com/store/apps/details?id=com.nequi.MobileApp')
                                                            : (isIOS ? 'https://apps.apple.com/co/app/daviplata/id1220379146' : 'https://play.google.com/store/apps/details?id=com.davivienda.daviplataapp');

                                                        if (isAndroid) {
                                                            // SOLUCIÓN TOTALMENTE DEFINITIVA PARA ANDROID:
                                                            // Nequi se cierra porque al usar el deeplink (nequi://), la app 
                                                            // procesa el login mercantil temporal y luego destruye la actividad.
                                                            // Para evitarlo, invocaremos el Intent de "Lanzamiento Principal" (MAIN LAUNCHER), 
                                                            // que es exactamente el mismo comando que ejecuta Android cuando tocas el icono de Nequi.
                                                            // Esto abre la app en estado puro sin conectarla como una tarea web de Chrome.
                                                            const intentUrl = `intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=${packageId};S.browser_fallback_url=${encodeURIComponent(fallbackUrl)};end`;
                                                            window.location.href = intentUrl;
                                                        } else if (isIOS) {
                                                            // En iOS sí funciona el scheme directo sin self-close
                                                            let iOSFallbackCleared = false;
                                                            const fallbackTimer = setTimeout(() => {
                                                                if (!iOSFallbackCleared) {
                                                                    window.location.assign(fallbackUrl);
                                                                }
                                                            }, 2500);

                                                            // Prevenir redirección si el usuario sí pudo abrir la app
                                                            const onVisChange = () => {
                                                                if (document.hidden) {
                                                                    iOSFallbackCleared = true;
                                                                    clearTimeout(fallbackTimer);
                                                                }
                                                            };
                                                            document.addEventListener('visibilitychange', onVisChange, { once: true });
                                                            
                                                            window.location.assign(`${appScheme}://`);
                                                        } else {
                                                            window.open(fallbackUrl, '_blank');
                                                        }
                                                    }}
                                                className={`w-full py-4 rounded-2xl text-white font-black text-sm uppercase tracking-widest flex items-center justify-center space-x-2 transition-all active:scale-95 shadow-lg ${paymentDetailView === 'nequi'
                                                        ? 'bg-gradient-to-r from-[#E6007E] to-[#D4145A] shadow-[#E6007E]/30'
                                                        : 'bg-gradient-to-r from-[#ED1C24] to-[#C41017] shadow-[#ED1C24]/30'
                                                    }`}
                                            >
                                                    {paymentDetailView === 'nequi' ? (
                                                        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M7.5 19.5V5h3.2l5.4 9.8V5h2.8v14.5h-3.2L10.3 9.7v9.8H7.5z" fill="currentColor" />
                                                            <rect x="3.5" y="5" width="2.5" height="2.5" fill="currentColor" />
                                                        </svg>
                                                    ) : <Wallet className="w-5 h-5" />}
                                                    <span>Abrir {paymentDetailView === 'nequi' ? 'Nequi' : 'Daviplata'}</span>
                                                </button>
                                            )}

                                            <button
                                                onClick={() => setPaymentDetailView(null)}
                                                className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#8b00ff] to-[#ff00de] text-white font-black text-sm uppercase tracking-widest italic flex items-center justify-center space-x-2 transition-all active:scale-95 shadow-2xl shadow-primary/40 mt-4 group"
                                            >
                                                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                                                <span>VOLVER</span>
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Mobile Bottom Navigation - Only visible when authenticated AND OWNER */}
            {token && isOwner && (
                <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 z-50 px-6 py-4 pb-8 flex items-center justify-between shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
                    <button
                        onClick={() => navigate(`/panel?raffle=${id}`)}
                        className="flex flex-col items-center space-y-1 text-gray-400"
                    >
                        <Layout className="w-6 h-6" />
                        <span className="text-[8px] font-black uppercase tracking-tighter">Panel</span>
                    </button>
                    <button
                        onClick={() => navigate(`/${id}`)}
                        className="flex flex-col items-center space-y-1 text-primary"
                    >
                        <Grid className="w-6 h-6" />
                        <span className="text-[8px] font-black uppercase tracking-tighter">Web</span>
                    </button>
                    <button
                        onClick={() => navigate(`/panel?raffle=${id}&action=draw`)}
                        className="flex flex-col items-center space-y-1 text-gray-400"
                    >
                        <Trophy className="w-6 h-6" />
                        <span className="text-[8px] font-black uppercase tracking-tighter pt-1">Sortear</span>
                    </button>
                    <button
                        onClick={() => navigate(`/panel?raffle=${id}&action=settings`)}
                        className="flex flex-col items-center space-y-1 text-gray-400"
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
            )
            }
        </div >
    );
};

export default PublicRaffle;
