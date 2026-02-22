import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Grid, Layout, Settings, Trophy, Home, ArrowLeft, Check, Copy } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

const AdminSidebar = ({ raffleTitle, raffleId, activeItem }) => {
    const navigate = useNavigate();
    const [copied, setCopied] = useState(false);

    const publicUrl = `${window.location.origin}/${raffleId}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(publicUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const items = [
        { id: 'admin', label: 'Administración', icon: Layout, path: `/panel?raffle=${raffleId}` },
        { id: 'web', label: 'Talonario web', icon: Grid, path: `/${raffleId}` },
        { id: 'settings', label: 'Ajustes', icon: Settings, path: `/panel?raffle=${raffleId}&action=settings` },
        { id: 'draw', label: 'Sortear ganadores', icon: Trophy, path: `/panel?raffle=${raffleId}&action=draw` },
    ];

    return (
        <aside className="w-80 bg-[#111] border-r border-gray-800 hidden md:flex flex-col p-6 space-y-8 h-screen sticky top-0 shadow-sm overflow-y-auto custom-scrollbar">
            <div className="space-y-4">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center justify-center space-x-3 py-4 px-6 bg-gradient-to-r from-[#8b00ff] to-[#ff00de] text-white font-black rounded-2xl transition-all duration-300 hover:-translate-y-1 active:scale-95 uppercase tracking-wider italic shadow-[0_10px_25px_rgba(139,0,255,0.3)] hover:shadow-[0_15px_35px_rgba(139,0,255,0.4)] w-full mb-8"
                >
                    <ArrowLeft className="w-5 h-5 stroke-[3]" />
                    <span className="text-sm">VOLVER A SORTEOS</span>
                </button>
                <div className="px-2 mb-6">
                    <h2 className="text-3xl font-black text-white tracking-tighter truncate leading-tight uppercase italic">{raffleTitle || 'Cargando...'}</h2>
                </div>
            </div>

            <nav className="flex-1 space-y-2">
                {items.map((item) => {
                    const isActive = activeItem === item.id;
                    const Icon = item.icon;

                    return (
                        <button
                            key={item.id}
                            onClick={() => navigate(item.path)}
                            className={`w-full flex items-center space-x-4 px-4 py-4 rounded-2xl font-black transition-all text-left group
                                ${isActive
                                    ? 'bg-[#8b00ff] text-white shadow-lg shadow-[#8b00ff]/20 scale-[1.02]'
                                    : 'text-gray-500 hover:bg-[#1a1a1a] hover:text-[#8b00ff]'
                                }`}
                        >
                            <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-[#8b00ff]'}`} />
                            <span className="font-black text-sm tracking-tight italic">{item.label}</span>
                        </button>
                    );
                })}
            </nav>

            <div className="pt-6 mt-6 border-t border-gray-50 flex flex-col items-center">
                <button
                    onClick={handleCopy}
                    className={`p-4 rounded-[2rem] border-2 flex flex-col items-center space-y-3 w-full group transition-all relative overflow-hidden
                        ${copied
                            ? 'bg-green-50 border-green-200'
                            : 'bg-[#1a1a1a] border-gray-800 border-transparent hover:bg-[#ff00de]/5 hover:border-[#ff00de] hover:border-solid hover:shadow-xl hover:shadow-[#ff00de]/10 hover:-translate-y-1'
                        }`}
                >
                    <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-800 group-hover:border-[#ff00de]/30 transition-all relative">
                        <QRCodeCanvas
                            value={publicUrl}
                            size={140}
                            level="H"
                            includeMargin={false}
                        />
                        {copied && (
                            <div className="absolute inset-0 bg-green-500/90 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center text-white p-2 animate-fade-in">
                                <Check className="w-8 h-8 mb-1" />
                                <span className="text-[10px] font-black uppercase tracking-widest">¡Copiado!</span>
                            </div>
                        )}
                    </div>
                    <div className="text-center space-y-1">
                        <p className={`text-[10px] font-black uppercase tracking-[0.2em] italic transition-colors ${copied ? 'text-green-600' : 'text-primary group-hover:text-[#ff00de]'}`}>
                            {copied ? 'Enlace en portapapeles' : 'Talonario Web'}
                        </p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                            {copied ? 'Listo para compartir' : 'Clic para copiar ruta'}
                        </p>
                    </div>
                </button>
            </div>


        </aside>
    );
};

export default AdminSidebar;
