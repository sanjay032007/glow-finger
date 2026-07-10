import { useEffect, useState } from 'react';
import type { MutableRefObject } from 'react';
import { Hand, HandMetal, CheckCircle2, Sparkles, SlidersHorizontal, Repeat, Trophy, Info, ChevronRight, ChevronLeft } from 'lucide-react';
import type { HandState } from '../hooks/useARTracking';

interface Props {
  handStateRef?: MutableRefObject<HandState>;
}

export const Onboarding = ({ handStateRef }: Props) => {
  const [dismissed, setDismissed] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [currentGesture, setCurrentGesture] = useState<string>('NONE');

  useEffect(() => {
    if (!handStateRef) return;
    const interval = setInterval(() => {
      setCurrentGesture(handStateRef.current.gesture);
    }, 100);
    return () => clearInterval(interval);
  }, [handStateRef]);

  if (dismissed) return null;

  const tabs = [
    {
      title: "Gestures",
      icon: HandMetal,
      content: (
        <div className="space-y-6">
          <p className="text-white/70 text-sm leading-relaxed max-w-sm mx-auto">
            Experience spatial drawing in your browser. Hold your hand up to the camera to engage the neural engine.
          </p>
          <div className="flex justify-around bg-black/25 rounded-3xl p-5 border border-white/5 shadow-inner">
            <div className={`flex flex-col items-center gap-3 transition-all duration-300 ${currentGesture === 'DRAW' ? 'scale-110 opacity-100' : 'opacity-50'}`}>
              <HandMetal size={32} className={`transition-colors ${currentGesture === 'DRAW' ? 'text-[#00f3ff] drop-shadow-[0_0_15px_rgba(0,243,255,0.8)]' : 'text-white/30'}`} />
              <div className="text-center">
                <p className="text-[9px] text-white/40 uppercase tracking-widest font-bold">Posture</p>
                <span className="text-white font-semibold text-xs">Index Finger Up</span>
              </div>
              <span className={`text-black font-extrabold tracking-wider text-[10px] px-4 py-1.5 rounded-full transition-all ${currentGesture === 'DRAW' ? 'bg-[#00f3ff] shadow-[0_0_12px_rgba(0,243,255,0.6)]' : 'bg-white/20'}`}>DRAW</span>
            </div>
            
            <div className="w-px bg-gradient-to-b from-transparent via-white/10 to-transparent"></div>
            
            <div className={`flex flex-col items-center gap-3 transition-all duration-300 ${currentGesture === 'PAUSE' ? 'scale-110 opacity-100' : 'opacity-50'}`}>
              <Hand size={32} className={`transition-colors ${currentGesture === 'PAUSE' ? 'text-[#ff007f] drop-shadow-[0_0_15px_rgba(255,0,127,0.8)]' : 'text-white/30'}`} />
              <div className="text-center">
                <p className="text-[9px] text-white/40 uppercase tracking-widest font-bold">Posture</p>
                <span className="text-white font-semibold text-xs">Open Palm</span>
              </div>
              <span className={`text-black font-extrabold tracking-wider text-[10px] px-4 py-1.5 rounded-full transition-all ${currentGesture === 'PAUSE' ? 'bg-[#ff007f] shadow-[0_0_12px_rgba(255,0,127,0.6)]' : 'bg-white/20'}`}>PAUSE</span>
            </div>
          </div>
          <div className="text-left bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-xs text-white/50 space-y-1 max-w-sm mx-auto">
            <p className="font-bold text-white/70 mb-1 flex items-center gap-1.5"><Info size={13} className="text-[#00f3ff]" /> Hotkeys:</p>
            <p>• <kbd className="bg-white/10 px-1.5 py-0.5 rounded font-mono text-[10px] text-white">D</kbd> - Draw Mode | <kbd className="bg-white/10 px-1.5 py-0.5 rounded font-mono text-[10px] text-white">E</kbd> - Erase Mode</p>
            <p>• <kbd className="bg-white/10 px-1.5 py-0.5 rounded font-mono text-[10px] text-white">C</kbd> - Clear Canvas | <kbd className="bg-white/10 px-1.5 py-0.5 rounded font-mono text-[10px] text-white">Z</kbd> - Undo Stroke</p>
          </div>
        </div>
      )
    },
    {
      title: "Brushes",
      icon: Sparkles,
      content: (
        <div className="space-y-6">
          <p className="text-white/70 text-sm leading-relaxed max-w-sm mx-auto">
            Switch between 5 advanced neon brush types and project coordinates symmetrically across the canvas.
          </p>
          <div className="grid grid-cols-2 gap-3 text-left max-w-sm mx-auto">
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3.5 flex items-center gap-3">
              <Sparkles className="text-yellow-400" size={18} />
              <div>
                <h4 className="font-bold text-xs text-white">Cosmic Brush</h4>
                <p className="text-[10px] text-white/40">Floating particle stars</p>
              </div>
            </div>
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3.5 flex items-center gap-3">
              <HandMetal className="text-orange-400" size={18} />
              <div>
                <h4 className="font-bold text-xs text-white">Rainbow Path</h4>
                <p className="text-[10px] text-white/40">Color cycling lines</p>
              </div>
            </div>
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3.5 flex items-center gap-3">
              <SlidersHorizontal className="text-purple-400" size={18} />
              <div>
                <h4 className="font-bold text-xs text-white">Double Lasers</h4>
                <p className="text-[10px] text-white/40">Offset lines, white cores</p>
              </div>
            </div>
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3.5 flex items-center gap-3">
              <Repeat className="text-[#39ff14]" size={18} />
              <div>
                <h4 className="font-bold text-xs text-white">Symmetry Mode</h4>
                <p className="text-[10px] text-white/40">Mirror & Kaleidoscope</p>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-white/40 italic">
            Tip: Move your finger closer to the webcam to dynamically thicken lines!
          </p>
        </div>
      )
    },
    {
      title: "Arcade Mode",
      icon: Trophy,
      content: (
        <div className="space-y-6">
          <p className="text-white/70 text-sm leading-relaxed max-w-sm mx-auto">
            Activate Arcade mode to slash falling target orbs with your drawing trail, build combos, and climb the leaderboard!
          </p>
          <div className="grid grid-cols-2 gap-3 text-left max-w-sm mx-auto">
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-yellow-400 flex items-center justify-center font-bold text-[9px] text-black">G</div>
              <div>
                <h4 className="font-bold text-xs text-white">Gold Target</h4>
                <p className="text-[10px] text-white/40">Huge points multiplier</p>
              </div>
            </div>
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-cyan-400 flex items-center justify-center text-[10px]">❄️</div>
              <div>
                <h4 className="font-bold text-xs text-white">Freeze Target</h4>
                <p className="text-[10px] text-white/40">Matrix slow-motion 4s</p>
              </div>
            </div>
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center font-bold text-[9px] text-white">💀</div>
              <div>
                <h4 className="font-bold text-xs text-white">Bomb target</h4>
                <p className="text-[10px] text-white/40">Deducts 100 points</p>
              </div>
            </div>
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3.5 flex items-center gap-3">
              <Trophy className="text-[#00f3ff]" size={18} />
              <div>
                <h4 className="font-bold text-xs text-white">Leaderboard</h4>
                <p className="text-[10px] text-white/40">High scores auto-saved</p>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  const handleNext = () => {
    if (activeTab < tabs.length - 1) {
      setActiveTab(prev => prev + 1);
    } else {
      setDismissed(true);
    }
  };

  const handleBack = () => {
    if (activeTab > 0) {
      setActiveTab(prev => prev - 1);
    }
  };

  const IconComponent = tabs[activeTab].icon;

  return (
    <div className="absolute inset-0 bg-black/70 z-50 flex items-center justify-center p-6 backdrop-blur-2xl transition-all duration-500">
      <div className="glass-panel p-8 md:p-10 max-w-lg w-full text-center relative overflow-hidden group">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none transition-transform duration-1000"></div>
        
        <div className="relative z-10 flex flex-col min-h-[460px] justify-between">
          <div>
            {/* Header Icon */}
            <div className="flex justify-center mb-5">
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
                <IconComponent className="text-white animate-pulse" size={26} />
              </div>
            </div>
            
            <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 mb-1 tracking-tight">
              {tabs[activeTab].title} Guide
            </h2>
            <p className="text-white/30 text-[9px] font-bold mb-6 tracking-widest uppercase">Glow AR Studio System</p>
            
            {/* Tab navigation headers */}
            <div className="flex justify-center gap-1.5 mb-8">
              {tabs.map((tab, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveTab(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === activeTab ? 'w-8 bg-[#00f3ff]' : 'w-2 bg-white/20 hover:bg-white/40'
                  }`}
                  title={tab.title}
                />
              ))}
            </div>

            {/* Active Tab Content */}
            <div className="min-h-[220px] flex items-center justify-center">
              {tabs[activeTab].content}
            </div>
          </div>
          
          {/* Footer Controls */}
          <div className="flex gap-4 mt-8 pt-4 border-t border-white/5">
            {activeTab > 0 ? (
              <button 
                onClick={handleBack}
                className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold text-sm px-6 py-4 rounded-xl transition-all flex items-center justify-center gap-2 border border-white/10"
              >
                <ChevronLeft size={16} />
                Back
              </button>
            ) : (
              <button 
                onClick={() => setDismissed(true)}
                className="flex-1 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white font-bold text-sm px-6 py-4 rounded-xl transition-all"
              >
                Skip Tour
              </button>
            )}
            
            <button 
              onClick={handleNext}
              className="flex-1 bg-white text-black font-extrabold text-sm px-6 py-4 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(255,255,255,0.15)]"
            >
              {activeTab === tabs.length - 1 ? 'Enter Studio' : 'Next'}
              {activeTab === tabs.length - 1 ? <CheckCircle2 size={16} /> : <ChevronRight size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
