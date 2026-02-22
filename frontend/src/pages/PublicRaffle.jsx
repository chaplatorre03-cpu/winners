import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Users, DollarSign, Calendar, Info, CheckCircle, CheckCircle2,
    QrCode, ArrowLeft, Menu, Lock, X, Grid, Layout, Settings, Trophy, Home, Eye, EyeOff, Search, Filter,
    Banknote, MousePointer2, Send, Award, Ticket, Dices, Phone, CreditCard, Wallet, RotateCcw
} from 'lucide-react';
import WinnersLogo from '../components/WinnersLogo';
import AdminSidebar from '../components/AdminSidebar';

import { API_URL } from '../config';

const PublicRaffle = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [raffle, setRaffle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedNumbers, setSelectedNumbers] = useState([]);
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [purchaseForm, setPurchaseForm] = useState({ name: '', phone: '', email: '' });
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

    const token = localStorage.getItem('token');

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
        const availableNumbers = Array.from({ length: raffle?.totalTickets || 0 }, (_, i) => i + 1)
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


    const isTicketSold = (num) => {
        return raffle?.tickets?.some(t => t.number === num);
    };

    const getTicketByNumber = (num) => {
        return raffle?.tickets?.find(t => t.number === num);
    };

    const getTicketStatus = (num) => {
        const ticket = getTicketByNumber(num);
        return ticket ? ticket.status : 'AVAILABLE';
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
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
    const progress = token
        ? (paidCount / raffle.totalTickets) * 100
        : (allTicketsCount / raffle.totalTickets) * 100;



    return (
        <div className="min-h-screen bg-[#0a0a0a] flex">
            {/* Sidebar (Admin Only) */}
            {token && (
                <AdminSidebar
                    raffleTitle={raffle?.title}
                    raffleId={id}
                    activeItem="web"
                />
            )}

            <div className="flex-1 flex flex-col min-w-0">
                <nav className="h-16 md:h-20 bg-[#111] shadow-sm border-b border-gray-800 flex items-center justify-between px-4 md:px-8 sticky top-0 z-50">
                    <div className="flex items-center flex-1 max-w-xl">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-3.5 md:w-4 h-3.5 md:h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                            <input
                                type="text"
                                placeholder="Buscar número..."
                                className="w-full text-sm md:text-base input-field pl-9 md:pl-10 h-10 md:h-12 bg-[#222] border-gray-700 transition-all hover:bg-[#2a2a2a] focus:bg-[#333] focus:ring-4 focus:ring-primary/10 text-white placeholder-gray-500"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="hidden md:flex items-center space-x-2 lg:space-x-4">

                        <div className="translate-x-10 translate-y-1 scale-90 lg:scale-100 origin-right transition-transform hover:scale-110 duration-500">
                            <WinnersLogo size="small" />
                        </div>

                        {!token && (
                            <button
                                onClick={() => navigate('/login')}
                                className="flex items-center space-x-2 px-4 lg:px-5 py-2 lg:py-3 bg-gradient-to-r from-[#8b00ff] to-[#ff00de] hover:brightness-110 rounded-xl text-white transition-all shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 whitespace-nowrap"
                            >
                                <span className="text-[10px] lg:text-xs font-black tracking-widest uppercase italic">Ingresar</span>
                                <Lock className="w-4 h-4 shrink-0" />
                            </button>
                        )}
                    </div>
                </nav>
                <div className={`${token ? 'px-4 md:px-8 pb-40 md:pb-8' : 'max-w-7xl mx-auto md:px-8 pb-40 md:pb-8'} pt-8 md:grid md:grid-cols-12 md:gap-8`}>
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
                                    className="flex flex-col items-center justify-center p-4 bg-[#1a1a1a] rounded-xl hover:bg-primary/5 transition-colors border border-transparent hover:border-primary/20"
                                >
                                    <Info className="w-6 h-6 text-primary mb-2" />
                                    <span className="text-[10px] font-bold text-gray-700 uppercase">Cómo participar</span>
                                </button>
                                {!isEnded && (
                                    <button
                                        onClick={() => {
                                            setRandomSelection([]);
                                            setShowRandomModal(true);
                                        }}
                                        className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20 shadow-inner group hover:shadow-lg hover:shadow-primary/10 transition-all cursor-pointer overflow-hidden relative"
                                    >
                                        <div className="absolute -right-2 -top-2 p-4 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
                                            <Ticket className="w-12 h-12 text-primary" />
                                        </div>
                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 group-hover:text-primary transition-colors">Precio por número</p>
                                        <div className="flex items-baseline space-x-1">
                                            <span className="text-xs font-black text-primary">$</span>
                                            <span className="text-2xl font-black text-primary tracking-tighter italic">{Number(raffle.price || 0).toLocaleString('es-CO')}</span>
                                        </div>
                                        <p className="text-sm font-black text-gray-400 uppercase tracking-tighter mt-2 bg-white px-4 py-1.5 rounded-full shadow-md group-hover:scale-105 transition-transform">¡TOCA PARA AZAR!</p>
                                    </button>
                                )}

                                {isEnded && (
                                    <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-xl border border-gray-100 text-center">
                                        <Trophy className="w-6 h-6 text-yellow-500 mb-2" />
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-tight">Valor por boleta</span>
                                        <span className="text-xl font-black text-gray-900 italic tracking-tighter mt-1">${Number(raffle.price || 0).toLocaleString('es-CO')}</span>
                                    </div>
                                )}
                            </div>

                            <a
                                href={`https://api.whatsapp.com/send?phone=57${(raffle.creator?.phone || raffle.organizerPhone || '3204446733').replace(/\D/g, '').slice(-10)}&text=${encodeURIComponent(`Hola, deseo informacion sobre el sorteo: ${raffle.title}`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-4 border-2 border-[#d000ff] bg-[#fdf2ff] rounded-2xl flex items-center space-x-4 hover:shadow-xl hover:shadow-[#d000ff]/10 hover:-translate-y-0.5 transition-all cursor-pointer group/organizer"
                            >
                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm group-hover/organizer:scale-110 transition-transform border border-[#d000ff]/20">
                                    <span className="font-black text-[#d000ff] text-lg">
                                        {(raffle.creator?.name || raffle.organizerName || 'W').charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] text-[#d000ff] uppercase font-black tracking-[0.15em] leading-none mb-1.5 opacity-80">Organizador</p>
                                    <p className="text-base font-black text-gray-900 group-hover/organizer:text-[#d000ff] transition-colors">{raffle.creator?.name || raffle.organizerName || 'Winners'}</p>
                                    <div className="flex items-center space-x-2 mt-1 opacity-70">
                                        <div className="w-5 h-5 bg-[#d000ff] rounded-full flex items-center justify-center">
                                            <Phone className="w-3 h-3 text-white" />
                                        </div>
                                        <span className="text-xs font-black text-gray-500 font-mono tracking-widest">{raffle.creator?.phone || raffle.organizerPhone || '3204446733'}</span>
                                    </div>
                                </div>
                            </a>


                            <div className="grid grid-cols-2 md:grid-cols-1 lg:grid-cols-2 gap-2">
                                <div className="text-center p-2 md:p-3 bg-[#1a1a1a] rounded-xl border border-gray-800">
                                    <p className="text-xs md:text-sm font-black text-primary">
                                        {raffle.tickets?.length || 0}
                                    </p>
                                    <p className="text-[7px] md:text-[8px] text-gray-400 font-black uppercase tracking-widest">Participantes</p>
                                </div>
                                <div className="text-center p-2 md:p-3 bg-[#1a1a1a] rounded-xl border border-gray-800">
                                    <p className="text-xs md:text-sm font-black text-primary">
                                        {new Date(raffle.endDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', timeZone: 'UTC' })}
                                    </p>
                                    <p className="text-[7px] md:text-[8px] text-gray-400 font-black uppercase tracking-widest">Sorteo</p>
                                </div>
                                {token ? (
                                    <div className="col-span-2 md:col-span-1 lg:col-span-2 text-center p-2 md:p-3 bg-[#1a1a1a] rounded-xl border border-gray-800">
                                        <p className="text-xs md:text-sm font-black text-primary break-words px-0.5 leading-tight">
                                            ${((raffle.tickets?.filter(t => t.status === 'PAGADO').length || 0) * Number(raffle.price || 0)).toLocaleString('es-CO')}
                                        </p>
                                        <p className="text-[7px] md:text-[8px] text-gray-400 font-black uppercase tracking-widest">Recaudado ({raffle.tickets?.filter(t => t.status === 'PAGADO').length || 0} Pagados)</p>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowPaymentModal(true)}
                                        className="col-span-2 md:col-span-1 lg:col-span-2 flex flex-col items-center justify-center p-2 md:p-3 bg-gradient-to-br from-[#8b00ff]/20 to-[#ff00de]/20 hover:from-[#8b00ff]/30 hover:to-[#ff00de]/30 rounded-xl border border-[#8b00ff]/50 transition-all cursor-pointer group"
                                    >
                                        <CreditCard className="w-5 h-5 text-[#ff00de] mb-1 group-hover:scale-110 transition-transform" />
                                        <span className="text-[8px] md:text-[9px] font-black text-white uppercase tracking-widest">MEDIOS DE PAGO</span>
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
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:space-x-3">
                                        {!isEnded && (
                                            <button
                                                onClick={() => setShowOnlyAvailable(!showOnlyAvailable)}
                                                className={`flex items-center space-x-2 px-6 py-2.5 rounded-2xl text-xs font-black transition-all border-2 ${showOnlyAvailable
                                                    ? 'bg-[#8b00ff] border-[#8b00ff] text-white shadow-[0_0_20px_rgba(139,0,255,0.4)]'
                                                    : 'bg-[#1a1a1a] border-gray-800 text-gray-400 hover:border-[#8b00ff]/50 hover:text-white'
                                                    }`}
                                            >
                                                {showOnlyAvailable ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                <span className="uppercase tracking-widest">Disponibles</span>
                                            </button>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <span className={`${isEnded ? 'bg-gray-800 text-gray-500' : 'bg-[#ff00de]/10 text-[#ff00de] border-2 border-[#ff00de]/20'} text-xs font-black px-6 py-2.5 rounded-2xl uppercase tracking-widest whitespace-nowrap flex-1 text-center`}>
                                                {isEnded ? 'COMPLETADO' : `${Math.round(progress)}% Vendido`}
                                            </span>
                                            {selectedNumbers.length > 0 && (
                                                <button
                                                    onClick={() => setSelectedNumbers([])}
                                                    className="p-2.5 bg-sky-500/10 border-2 border-sky-500/20 text-sky-500 rounded-2xl hover:bg-sky-500 hover:text-white transition-all shadow-lg shadow-sky-500/10 active:scale-95 group"
                                                    title="Reiniciar selección"
                                                >
                                                    <RotateCcw className="w-4 h-4 group-hover:-rotate-180 transition-transform duration-500" />
                                                </button>
                                            )}
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
                                {Array.from({ length: raffle.totalTickets }, (_, i) => i + 1)
                                    .filter(num => {
                                        const status = getTicketStatus(num);
                                        if (showOnlyAvailable && status !== 'AVAILABLE') return false;
                                        if (!searchQuery) return true;
                                        const ticket = raffle?.tickets?.find(t => t.number === num);
                                        const buyerInfo = ticket?.buyerName || '';
                                        return num.toString().includes(searchQuery) || buyerInfo.toLowerCase().includes(searchQuery.toLowerCase());
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
                       ${status === 'PAGADO' ? 'bg-[#d000ff]/10 text-[#d000ff] border-2 border-solid border-[#d000ff]/50' : ''}
                       ${status === 'REVISANDO' ? 'bg-[#ff00de]/10 text-[#ff00de] border-2 border-dashed border-[#ff00de]/50' : ''}
                       ${status === 'APARTADO' ? 'bg-[#8b00ff]/10 text-[#8b00ff] border-2 border-dotted border-[#8b00ff]/50' : ''}
                       ${isEnded && status === 'AVAILABLE' ? 'opacity-40 grayscale pointer-events-none' : ''}
                    `}
                                            >
                                                {num}
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
                                            {selectedNumbers.length} {selectedNumbers.length === 1 ? 'Número' : 'Números'}: <span className="text-gray-400 font-medium">{[...selectedNumbers].sort((a, b) => a - b).join(', ')}</span>
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
                            <div className="p-6 md:p-8 space-y-4 md:space-y-6 relative overflow-y-auto custom-scrollbar">
                                <button
                                    onClick={() => setShowPurchaseModal(false)}
                                    className="absolute top-4 md:top-6 right-4 md:right-6 p-2 hover:bg-gray-50 rounded-xl transition-colors z-20"
                                >
                                    <X className="w-5 h-5 md:w-6 md:h-6 text-gray-400" />
                                </button>
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
                                                const numbersText = selectedNumbers.join(', ');

                                                const message = `Hola! He reservado los numeros ${numbersText} para el sorteo ${raffle.title} a nombre de ${purchaseForm.name}. Adjunto el comprobante de pago para validar mi participacion.`;

                                                const waLink = `https://api.whatsapp.com/send?phone=57${cleanPhone}&text=${encodeURIComponent(message)}`;
                                                setTempPhone(waLink);

                                                const waWindow = window.open(waLink, '_blank');
                                                if (!waWindow) {
                                                    console.warn('Popup blocked or failed to open');
                                                }

                                                setShowSuccessModal(true);
                                                setPurchaseForm({ name: '', phone: '', email: '' });
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
                            <div className="flex items-center justify-between p-6 md:p-8 shrink-0">
                                <h3 className="text-xl md:text-2xl font-black text-gray-900 uppercase italic tracking-tighter">Participar</h3>
                                <button onClick={() => setShowHowToModal(false)} className="p-2 hover:bg-white/50 rounded-xl transition-colors">
                                    <X className="w-5 h-5 md:w-6 md:h-6 text-gray-400" />
                                </button>
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
                                        <p className="text-sm text-gray-500 uppercase">Día: <span className="text-primary font-black">{new Date(raffle.endDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</span></p>
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
                        <div className="relative bg-white/95 backdrop-blur-xl w-full max-w-sm rounded-[2rem] p-8 shadow-2xl border-2 border-white/50 animate-scale-in text-center flex flex-col max-h-[95vh]">
                            <button onClick={() => setShowRandomModal(false)} className="absolute top-6 right-6 p-2 hover:bg-gray-50 rounded-xl transition-colors z-20">
                                <X className="w-6 h-6 text-gray-400" />
                            </button>
                            <div className="mb-8">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Generar números</p>
                                <p className="text-sm text-gray-500 font-medium">Selecciona números al azar</p>
                            </div>
                            <button onClick={handleRandomSelect} className="w-full flex items-center justify-center space-x-3 py-4 bg-primary/5 hover:bg-primary/10 text-primary border-2 border-primary/20 border-dashed rounded-2xl transition-all group active:scale-95 mb-6">
                                <Dices className="w-6 h-6 group-hover:rotate-180 transition-transform duration-500" />
                                <span className="font-black uppercase tracking-widest italic text-sm">Aleatorio</span>
                            </button>
                            <div className="flex-1 overflow-y-auto custom-scrollbar mb-6">
                                <div className="flex flex-wrap gap-2 min-h-[50px] p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    {randomSelection.length === 0 ? (
                                        <p className="text-[10px] text-gray-400 font-bold uppercase italic m-auto">Ningún número generado</p>
                                    ) : (
                                        randomSelection.map(num => (
                                            <div key={num} className="flex items-center space-x-2 bg-primary text-white px-3 py-1.5 rounded-lg animate-scale-in">
                                                <span className="font-black text-sm">{num}</span>
                                                <button onClick={() => setRandomSelection(prev => prev.filter(n => n !== num))} className="hover:text-white/70 transition-colors">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))
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
                        <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-md animate-fade-in" onClick={() => setShowPaymentModal(false)}></div>
                        <div className="relative bg-white/95 backdrop-blur-xl w-full max-w-md md:rounded-[2rem] rounded-t-[2rem] shadow-2xl border-2 border-white/50 animate-slide-up md:animate-scale-in flex flex-col max-h-[95vh]">
                            <div className="p-6 md:p-8 shrink-0 relative border-b border-gray-100/50">
                                <button onClick={() => setShowPaymentModal(false)} className="absolute top-4 md:top-6 right-4 md:right-6 p-2 hover:bg-gray-50 rounded-xl transition-colors z-20">
                                    <X className="w-6 h-6 text-gray-400" />
                                </button>
                                <div className="text-center">
                                    <h3 className="text-xl md:text-2xl font-black text-gray-900 uppercase italic tracking-tighter mb-1">Medios de Pago</h3>
                                    <p className="text-xs md:text-sm text-gray-500 font-medium">Selecciona tu método preferido</p>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
                                <div className="space-y-3">
                                    {/* Simplified payment methods for clarity */}
                                    <div onClick={() => window.open('https://www.wompi.co/', '_blank')} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center space-x-4 hover:bg-white hover:shadow-lg transition-all group cursor-pointer">
                                        <CreditCard className="w-6 h-6 text-[#8b00ff]" />
                                        <p className="font-bold text-gray-900 text-sm">Tarjeta Débito / Crédito</p>
                                    </div>
                                    <div onClick={() => window.open('https://www.pse.com.co/', '_blank')} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center space-x-4 hover:bg-white hover:shadow-lg transition-all group cursor-pointer">
                                        <MousePointer2 className="w-6 h-6 text-[#ff00de]" />
                                        <p className="font-bold text-gray-900 text-sm">PSE</p>
                                    </div>
                                    <div onClick={() => window.open('https://www.nequi.com.co/', '_blank')} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center space-x-4 hover:bg-white hover:shadow-lg transition-all group cursor-pointer">
                                        <Phone className="w-6 h-6 text-[#8b00ff]" />
                                        <p className="font-bold text-gray-900 text-sm">Nequi</p>
                                    </div>
                                    <div onClick={() => window.open('https://www.daviplata.com/', '_blank')} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center space-x-4 hover:bg-white hover:shadow-lg transition-all group cursor-pointer">
                                        <Wallet className="w-6 h-6 text-[#ff0000]" />
                                        <p className="font-bold text-gray-900 text-sm">Daviplata</p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 md:p-8 shrink-0">
                                <button onClick={() => setShowPaymentModal(false)} className="w-full btn-primary py-4 rounded-xl shadow-lg shadow-primary/20 text-sm font-black tracking-widest uppercase relative z-10">
                                    CERRAR
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Mobile Bottom Navigation - Only visible when authenticated */}
            {token && (
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
