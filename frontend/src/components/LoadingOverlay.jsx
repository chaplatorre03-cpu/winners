import React from 'react';

export const LoadingSpinner = ({ size = 'medium', className = "" }) => {
    const dotSize = size === 'small' ? 'w-1.5 h-1.5' : 'w-2.5 h-2.5';
    const spacing = size === 'small' ? 'space-x-1' : 'space-x-2';

    return (
        <div className={`flex items-center justify-center ${spacing} ${className}`}>
            <div className={`${dotSize} bg-[#8b00ff] rounded-full animate-bounce`} style={{ animationDuration: '0.6s' }}></div>
            <div className={`${dotSize} bg-[#ff00de] rounded-full animate-bounce`} style={{ animationDuration: '0.6s', animationDelay: '0.2s' }}></div>
            <div className={`${dotSize} bg-white rounded-full animate-bounce`} style={{ animationDuration: '0.6s', animationDelay: '0.4s' }}></div>
        </div>
    );
};

const LoadingOverlay = ({ fullScreen = true, message = "CARGANDO..." }) => {
    return (
        <div className={`${fullScreen ? 'fixed inset-0 z-[9999] bg-[#0a090b]' : 'relative w-full h-full min-h-[400px] bg-[#0a090b] mt-8'} flex flex-col items-center justify-center overflow-hidden font-sans`}>

            {/* Center Content */}
            <div className="relative z-10 flex flex-col items-center w-full px-6 text-center">

                {/* Loading Text */}
                <h2 className="text-3xl md:text-5xl font-black italic tracking-[0.3em] text-white uppercase mb-8 translate-x-3">
                    {message}
                </h2>

                {/* Bouncing Dots */}
                <div className="flex space-x-3 mb-12">
                    <div className="w-3.5 h-3.5 bg-[#8b00ff] rounded-full animate-bounce" style={{ animationDuration: '0.6s' }}></div>
                    <div className="w-3.5 h-3.5 bg-[#ff00de] rounded-full animate-bounce" style={{ animationDuration: '0.6s', animationDelay: '0.2s' }}></div>
                    <div className="w-3.5 h-3.5 bg-white rounded-full animate-bounce" style={{ animationDuration: '0.6s', animationDelay: '0.4s' }}></div>
                </div>

                {/* Minimalist Progress Line */}
                <div className="w-full max-w-[500px] mb-12 px-10">
                    <div className="w-full h-[1px] bg-white/5 relative">
                        <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-transparent via-[#8b00ff] to-transparent animate-progress-loading"></div>
                    </div>
                </div>

                {/* Bottom Text */}
                <p className="text-[10px] md:text-[11px] font-black text-gray-400 uppercase tracking-[0.4em] text-center leading-relaxed opacity-80">
                    ESTÁS ENTRANDO EN LA EXPERIENCIA <br /> PREMIUM DE WINNERS
                </p>
            </div>
        </div>
    );
};

export default LoadingOverlay;
