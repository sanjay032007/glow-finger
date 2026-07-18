import { useState, useEffect } from 'react';
import { Trophy, Medal, Award } from 'lucide-react';

interface HighScore {
  name: string;
  score: number;
  date: string;
  isPreset?: boolean;
}

const PRESET_HIGH_SCORES: HighScore[] = [
  { name: 'NEON_NINJA', score: 15000, date: 'Exhibition', isPreset: true },
  { name: 'CYBER_SLAYER', score: 11200, date: 'Exhibition', isPreset: true },
  { name: 'CHRONOS_DEV', score: 8500, date: 'Exhibition', isPreset: true },
  { name: 'MATRIX_CAT', score: 6200, date: 'Exhibition', isPreset: true },
  { name: 'GLOW_ROOKIE', score: 3500, date: 'Exhibition', isPreset: true },
];

export function Leaderboard() {
  const [displayScores, setDisplayScores] = useState<HighScore[]>([]);

  const loadScores = () => {
    const saved = localStorage.getItem('glow_ar_highscores');
    let userScores: HighScore[] = [];
    if (saved) {
      try {
        const raw = JSON.parse(saved);
        userScores = raw.map((item: any) => {
          if (typeof item === 'number') {
            return {
              name: 'GLOW_GUEST',
              score: item,
              date: new Date().toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
            };
          }
          return item;
        });
      } catch (e) {
        console.error("Error parsing highscores", e);
      }
    }
    
    // Merge user scores with presets
    const allScores = [...userScores, ...PRESET_HIGH_SCORES];
    // Sort by score descending. User scores break ties first.
    allScores.sort((a, b) => b.score - a.score || (a.isPreset ? 1 : -1));
    
    // Take top 5
    setDisplayScores(allScores.slice(0, 5));
  };

  useEffect(() => {
    loadScores();
    const handleScoreUpdate = () => loadScores();
    window.addEventListener('score-update', handleScoreUpdate);
    return () => window.removeEventListener('score-update', handleScoreUpdate);
  }, []);

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" size={20} />;
    if (index === 1) return <Medal className="text-slate-300 drop-shadow-[0_0_10px_rgba(203,213,225,0.5)]" size={20} />;
    if (index === 2) return <Award className="text-amber-600 drop-shadow-[0_0_10px_rgba(217,119,6,0.5)]" size={20} />;
    return <span className="text-[#4a453f]/60 font-bold font-mono text-sm w-5 text-center">{index + 1}</span>;
  };

  return (
    <section className="interactive-gallery w-full max-w-7xl mx-auto px-6 py-10 z-10 pointer-events-auto">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-extrabold mb-3 tracking-tight text-[#2c2b29]">
          Arcade Leaderboard
        </h2>
        <p className="text-[#5c5952] text-sm max-w-lg mx-auto font-light leading-relaxed">
          The ultimate champions of the Orb Smasher target slashing challenge.
        </p>
      </div>

      <div className="max-w-md mx-auto bg-[#faf8f5] border-2 border-[#4a453f] rounded-[2.5rem] p-8 shadow-[4px_4px_0px_#4a453f]">
        <div className="space-y-4">
          {displayScores.map((item, index) => (
            <div
              key={index}
              className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-300 ${
                !item.isPreset
                  ? 'bg-[#d4a34b]/10 border-[#d4a34b] shadow-inner scale-[1.02]'
                  : index === 0
                    ? 'bg-[#faf8f5] border-[#d4a34b]/40'
                    : 'bg-[#faf8f5] border-[#4a453f]/20 hover:border-[#4a453f]/40'
              }`}
            >
              <div className="flex items-center gap-4">
                {getRankIcon(index)}
                <div className="flex flex-col">
                  <span className={`font-bold tracking-wider flex items-center gap-1.5 ${!item.isPreset ? 'text-[#8a6d3b]' : index === 0 ? 'text-[#8a6d3b]' : 'text-[#2c2b29]'}`}>
                    {item.name}
                    {!item.isPreset && (
                      <span className="text-[8px] bg-[#d4a34b]/20 text-[#8a6d3b] px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest">
                        YOU
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] text-[#4a453f]/40 font-medium">{item.date}</span>
                </div>
              </div>
              <span className={`font-black text-2xl font-mono tracking-widest ${!item.isPreset ? 'text-[#8a6d3b]' : 'text-[#2c2b29]'}`}>
                {item.score}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
