import React, { useState } from 'react';
import { ShieldAlert, Activity, Lock } from 'lucide-react';

interface LandingPageProps {
  onEnter: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleHeartClick = () => {
    setIsTransitioning(true);
    // Add a slight delay for the zoom-in click animation to complete before changing views
    setTimeout(() => {
      onEnter();
    }, 600);
  };

  return (
    <div className="relative min-h-screen bg-slate-950 flex flex-col justify-between overflow-hidden font-sans select-none">
      
      {/* Custom CSS Animations */}
      <style>{`
        @keyframes heartbeat {
          0% { transform: scale(1); }
          12% { transform: scale(1.08); }
          22% { transform: scale(0.98); }
          32% { transform: scale(1.12); }
          46% { transform: scale(1); }
          100% { transform: scale(1); }
        }

        @keyframes heartglow {
          0%, 100% { filter: drop-shadow(0 0 15px rgba(239, 68, 68, 0.45)) drop-shadow(0 0 30px rgba(239, 68, 68, 0.2)); }
          50% { filter: drop-shadow(0 0 30px rgba(239, 68, 68, 0.8)) drop-shadow(0 0 60px rgba(239, 68, 68, 0.4)); }
        }

        @keyframes ringpulse {
          0% { transform: scale(0.9); opacity: 0.8; }
          100% { transform: scale(1.5); opacity: 0; }
        }

        .pulse-heart {
          animation: heartbeat 1.8s infinite cubic-bezier(0.215, 0.610, 0.355, 1);
        }

        .glow-heart {
          animation: heartglow 3s infinite ease-in-out;
        }

        .ring-pulse {
          animation: ringpulse 2.2s infinite ease-out;
        }

        .radial-bg {
          background: radial-gradient(circle at center, rgba(30, 41, 59, 0.5) 0%, rgba(2, 6, 23, 0.95) 100%);
        }
      `}</style>

      {/* Grid Overlay background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />
      <div className="absolute inset-0 radial-bg pointer-events-none" />

      {/* Header Info */}
      <div className="w-full text-center pt-16 px-4 z-10 space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-950/40 border border-blue-500/30 rounded-full">
          <Activity className="w-4 h-4 text-blue-400 animate-pulse" />
          <span className="text-[10px] uppercase font-bold tracking-widest text-blue-300">Cath Lab Registry Desk</span>
        </div>
        
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400 mt-2">
          SHYAM SHAH MEDICAL COLLEGE & HOSPITAL, REWA
        </h2>
        <h3 className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
          Department of Cardiology
        </h3>
        
        <h1 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-white to-slate-200 tracking-tight leading-tight pt-1">
          Cath Lab Inventory Management System
        </h1>
      </div>

      {/* Interactive Glowing Heart Section */}
      <div className="flex-1 flex flex-col justify-center items-center relative z-10 px-4">
        <div className="relative group cursor-pointer">
          
          {/* Circular Ambient Ripple Ring */}
          <div className="absolute inset-0 rounded-full bg-red-600/10 ring-pulse pointer-events-none" />
          <div className="absolute inset-0 rounded-full bg-red-650/5 ring-pulse pointer-events-none" style={{ animationDelay: '1.1s' }} />

          {/* Interactive Heart */}
          <div 
            onClick={handleHeartClick}
            className={`relative flex items-center justify-center transition-all duration-500 ${
              isTransitioning 
                ? 'scale-[4] opacity-0 rotate-12 blur-xs' 
                : 'hover:scale-105 active:scale-95'
            }`}
          >
            {/* The SVG Heart */}
            <svg 
              viewBox="0 0 32 32" 
              className="w-48 h-48 pulse-heart glow-heart transition-all duration-300"
            >
              <defs>
                <linearGradient id="heart3d" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="40%" stopColor="#dc2626" />
                  <stop offset="100%" stopColor="#7f1d1d" />
                </linearGradient>
              </defs>

              {/* Heart Path */}
              <path 
                d="M16 28.5L4.3 16.8C2.5 15 1.5 12.5 1.5 10c0-5 4-9 9-9 2.5 0 5 1 6.8 2.8L16 4.5l.7-.7c1.8-1.8 4.3-2.8 6.8-2.8 5 0 9 4 9 9 0 2.5-1 5-2.8 6.8L16 28.5z" 
                fill="url(#heart3d)" 
              />

              {/* ECG Line Overlay drawn inside the Heart */}
              <path 
                d="M 6,15 L 11,15 L 13,11 L 15,21 L 17,9 L 19,17 L 21,14 L 23,15 L 26,15" 
                fill="none" 
                stroke="#fee2e2" 
                strokeWidth="0.8" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                opacity="0.85" 
              />
            </svg>
          </div>
        </div>

        {/* Action Prompt */}
        <div className={`mt-8 text-center transition-all duration-500 ${isTransitioning ? 'opacity-0 translate-y-4' : 'opacity-100'}`}>
          <button 
            onClick={handleHeartClick}
            className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors duration-300 flex flex-col items-center gap-1.5 focus:outline-none"
          >
            <span className="animate-pulse bg-red-950/50 border border-red-550/40 text-red-400 text-[10px] px-3.5 py-1.5 rounded-full shadow-md shadow-red-500/5">
              Click Heart to Enter Portal
            </span>
          </button>
        </div>
      </div>

      {/* Compliance / Security Footer info */}
      <div className="w-full text-center pb-10 px-6 z-10 space-y-2">
        <div className="flex justify-center items-center gap-4 text-[10px] text-slate-500 font-semibold tracking-wider uppercase max-w-lg mx-auto border-t border-slate-900 pt-6">
          <span className="flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-slate-600" />
            3-Hour Audit Lock
          </span>
          <span className="text-slate-800">•</span>
          <span className="flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5 text-slate-600" />
            PMJAY Ceiling Alert
          </span>
          <span className="text-slate-800">•</span>
          <span>SSMC Internal Tool</span>
        </div>
        <p className="text-[9px] text-slate-600 font-mono">
          Authorized access only. Technical & consumable log ledger traces enabled.
        </p>
      </div>

    </div>
  );
};
