import React, { useState, useEffect, useRef } from 'react';

const WinnersLogo = ({ size = 'medium', className = '' }) => {
  const canvasRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const particles = useRef([]);

  const sizes = {
    small: { scale: 0.696 },
    medium: { scale: 0.87 },
    large: { scale: 1.305 }
  };

  const { scale } = sizes[size] || sizes.medium;

  useEffect(() => {
    if (!isHovered) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;

    const createParticle = (x, y) => {
      const colors = ['#8b00ff', '#ff00de', '#ffffff', '#00d0ff'];
      return {
        x, y,
        startY: y,
        vx: (Math.random() - 0.5) * 6,
        vy: Math.random() * 4 + 2, // Solo hacia abajo
        alpha: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 3 + 1
      };
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (Math.random() < 0.25) {
        particles.current.push(createParticle(canvas.width / 2, canvas.height / 2));
      }

      for (let i = particles.current.length - 1; i >= 0; i--) {
        const p = particles.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.01;
        p.vy += 0.08; // gravity

        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        if (p.alpha <= 0 || p.y - p.startY > 150) {
          particles.current.splice(i, 1);
        }
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationId);
  }, [isHovered]);

  return (
    <div
      className={`relative group cursor-pointer z-[100] ${className}`}
      style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        particles.current = [];
      }}
    >
      <canvas
        ref={canvasRef}
        width={400}
        height={400}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[9999] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
      />
      <style>
        {`
          @keyframes glow-pulse {
            0%, 100% { box-shadow: 0 0 20px rgba(139, 0, 255, 0.4), inset 0 0 10px rgba(139, 0, 255, 0.2); border-color: rgba(139, 0, 255, 0.5); }
            50% { box-shadow: 0 0 35px rgba(255, 0, 222, 0.6), inset 0 0 15px rgba(255, 0, 222, 0.4); border-color: rgba(255, 0, 222, 0.7); }
          }
          @keyframes jump-anim {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          @keyframes glitch-anim {
            0% { clip-path: inset(80% 0 0 0); transform: translate(-2px, -2px); }
            10% { clip-path: inset(10% 0 80% 0); transform: translate(2px, 2px); }
            20% { clip-path: inset(80% 0 0 0); transform: translate(-2px, -2px); }
            30% { clip-path: inset(10% 0 80% 0); transform: translate(2px, 2px); }
            40% { clip-path: inset(50% 0 30% 0); transform: translate(-1px, 1px); }
            50% { clip-path: inset(0% 0 0% 0); transform: translate(0); }
            100% { clip-path: inset(0% 0 0% 0); transform: translate(0); }
          }
          @keyframes swing-anim {
            0%, 100% { transform: translateX(-4px); }
            50% { transform: translateX(4px); }
          }
          @keyframes scan-vertical {
            0% { top: -100%; }
            100% { top: 100%; }
          }
          .neo-punk-container {
            animation: glow-pulse 3s infinite, jump-anim 2s infinite ease-in-out;
          }
          .glitch-layer {
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            background: inherit;
            display: none;
            opacity: 0.5;
          }
          .neo-punk-logo:hover .glitch-layer {
            display: block;
            animation: glitch-anim 0.2s infinite linear alternate-reverse;
          }
          .cyber-grid {
            mask-image: linear-gradient(to bottom, transparent, black, transparent);
            background-image: radial-gradient(circle, #8b00ff 1px, transparent 1px);
            background-size: 8px 8px;
          }
          @keyframes equalizer-anim {
            0% { height: 15%; opacity: 0.3; filter: brightness(0.8); }
            50% { height: 60%; opacity: 0.8; }
            100% { height: 100%; opacity: 1; filter: brightness(1.5); box-shadow: 0 0 10px #ff00de; }
          }
        `}
      </style>

      <div className="neo-punk-logo neo-punk-container relative z-10 flex items-center bg-gray-900 rounded-xl px-5 py-2.5 border-2 border-[#8b00ff]/30 overflow-hidden transition-all duration-500 group-hover:border-[#ff00de]/80 group-hover:bg-black group-hover:brightness-[1.5]">
        {/* Background Grids and Scans */}
        <div className="absolute inset-0 cyber-grid opacity-10 group-hover:opacity-30 transition-opacity" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#8b00ff]/5 to-transparent pointer-events-none" />
        <div className="absolute top-0 left-0 w-full h-[1px] bg-[#8b00ff] opacity-30 animate-[scan-vertical_2s_linear_infinite]" />

        {/* Main Brand Text */}
        <div className="relative z-10 flex items-center">
          <div className="relative flex flex-col items-center mr-3">
            <img
              src="/favicon.png"
              alt="Favicon"
              className="w-11 h-11 object-contain animate-[swing-anim_3s_infinite_ease-in-out]"
            />
          </div>

          <div className="relative">
            {/* Base Text */}
            <span className="text-2xl sm:text-3xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#8b00ff] via-white to-[#ff00de] drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] transition-all duration-300 group-hover:brightness-125 pr-2">
              WINNERS
            </span>

            {/* Glitch Shadow Effect */}
            <span className="absolute top-0 left-0 text-3xl font-black italic tracking-tighter text-[#ff00de] opacity-0 group-hover:opacity-40 group-hover:animate-[glitch-anim_0.4s_infinite] -z-10 translate-x-1 translate-y-0.5">
              WINNERS
            </span>
            <span className="absolute top-0 left-0 text-3xl font-black italic tracking-tighter text-[#8b00ff] opacity-0 group-hover:opacity-40 group-hover:animate-[glitch-anim_0.4s_infinite_reverse] -z-10 -translate-x-1 -translate-y-0.5">
              WINNERS
            </span>
          </div>
        </div>

        {/* Tech Decor Details */}
        <div className="hidden sm:flex ml-5 relative z-10 flex-col justify-center border-l border-white/20 pl-4 py-1 min-w-[160px]">
          <div className="flex items-center space-x-2 mb-1">
            <div className="w-1.5 h-1.5 bg-[#ff00de] rounded-full animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite]" />
            <span className="text-[9px] font-black text-white uppercase tracking-[0.25em] leading-none drop-shadow-[0_0_8px_rgba(255,0,222,0.6)]">
              SISTEMA VERIFICADO
            </span>
          </div>

          {/* Dynamic Audio Spectrum */}
          <div className="flex items-end justify-between w-full h-4 gap-[2px] overflow-hidden opacity-80 group-hover:opacity-100 transition-opacity duration-300">
            {Array.from({ length: 28 }).map((_, i) => (
              <div
                key={i}
                className="w-1 rounded-t-[1px] bg-gradient-to-t from-[#8b00ff] to-[#ff00de] origin-bottom transition-all duration-300 group-hover:shadow-[0_0_8px_#ff00de] group-hover:brightness-125"
                style={{
                  height: '30%',
                  animationName: 'equalizer-anim',
                  animationDuration: `${0.6 + (i % 5) * 0.15 + Math.random() * 0.2}s`,
                  animationTimingFunction: 'ease-in-out',
                  animationIterationCount: 'infinite',
                  animationDirection: 'alternate',
                  animationDelay: `${i * 0.05}s`
                }}
              />
            ))}
          </div>
        </div>

        {/* Corner Decor */}
        <div className="absolute top-0 right-0 w-8 h-8 flex items-center justify-center opacity-20">
          <div className="w-4 h-4 border-t-2 border-r-2 border-[#8b00ff]" />
        </div>
      </div>
    </div>
  );
};

export default WinnersLogo;
