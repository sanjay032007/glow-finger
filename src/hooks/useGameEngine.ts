import { useRef, useState, useCallback } from 'react';
import { audio } from '../utils/audio';

export interface Orb {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  life: number;
  type: 'NORMAL' | 'GOLD' | 'FREEZE' | 'BOMB';
}

export interface GameParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}

export const useGameEngine = () => {
  const [score, setScore] = useState(0);
  const [isGameMode, setIsGameMode] = useState(false);
  const [combo, setCombo] = useState(0);
  
  // New States for Arcade Loop
  const [timeLeft, setTimeLeft] = useState(45);
  const [lives, setLives] = useState(3);
  const [isGameOver, setIsGameOver] = useState(false);
  const [maxCombo, setMaxCombo] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [shake, setShake] = useState(false);
  
  const orbsRef = useRef<Orb[]>([]);
  const particlesRef = useRef<GameParticle[]>([]);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const lastHitTimeRef = useRef(0);
  const hitStopRef = useRef(0);
  
  // Freeze / Time Dilation Refs
  const isFrozenRef = useRef(false);
  const freezeEndTimeRef = useRef(0);

  const saveHighScore = (name: string, finalScore: number) => {
    if (finalScore <= 0) return;
    try {
      const saved = localStorage.getItem('glow_ar_highscores');
      let scores: any[] = saved ? JSON.parse(saved) : [];
      
      // Migrate legacy numbers format to objects
      scores = scores.map((item: any) => {
        if (typeof item === 'number') {
          return {
            name: 'GLOW_GUEST',
            score: item,
            date: new Date().toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
          };
        }
        return item;
      });

      scores.push({
        name: name.trim().toUpperCase() || 'PLAYER',
        score: finalScore,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      });
      
      scores.sort((a, b) => b.score - a.score);
      scores = scores.slice(0, 5);
      localStorage.setItem('glow_ar_highscores', JSON.stringify(scores));
      // Dispatch event to refresh Leaderboard component
      window.dispatchEvent(new Event('score-update'));
    } catch (e) {
      console.error("Failed to save high score", e);
    }
  };

  // Timer refs for precise game loop timing
  const lastFrameTimeRef = useRef(0);
  const timerAccumulatorRef = useRef(0);

  const toggleGameMode = useCallback(() => {
    setIsGameMode(prev => {
      const next = !prev;
      if (!next) {
        orbsRef.current = [];
        particlesRef.current = [];
        setScore(0);
        setCombo(0);
        scoreRef.current = 0;
        comboRef.current = 0;
        setTimeLeft(45);
        setLives(3);
        setMaxCombo(0);
        setIsGameOver(false);
        setIsPaused(false);
        isFrozenRef.current = false;
        freezeEndTimeRef.current = 0;
        lastFrameTimeRef.current = 0;
        timerAccumulatorRef.current = 0;
        hitStopRef.current = 0;
      } else {
        lastFrameTimeRef.current = Date.now();
        timerAccumulatorRef.current = 0;
      }
      return next;
    });
  }, []);

  const restartGame = useCallback(() => {
    orbsRef.current = [];
    particlesRef.current = [];
    setScore(0);
    setCombo(0);
    scoreRef.current = 0;
    comboRef.current = 0;
    setTimeLeft(45);
    setLives(3);
    setMaxCombo(0);
    setIsGameOver(false);
    setIsPaused(false);
    isFrozenRef.current = false;
    freezeEndTimeRef.current = 0;
    lastFrameTimeRef.current = Date.now();
    timerAccumulatorRef.current = 0;
    hitStopRef.current = 0;
    audio.playClick();
  }, []);

  const spawnOrb = (width: number) => {
    const radius = Math.random() * 15 + 25;
    const rand = Math.random();
    
    let type: Orb['type'] = 'NORMAL';
    let color = '#00f3ff'; // Default Cyan

    if (rand < 0.12) {
      type = 'BOMB';
      color = '#ff0055'; // Red
    } else if (rand < 0.22) {
      type = 'FREEZE';
      color = '#00ffff'; // Ice Blue
    } else if (rand < 0.32) {
      type = 'GOLD';
      color = '#ffb300'; // Gold
    } else {
      const colors = ['#00f3ff', '#39ff14', '#b026ff', '#ff007f'];
      color = colors[Math.floor(Math.random() * colors.length)];
    }

    orbsRef.current.push({
      id: Date.now() + Math.random(),
      x: Math.random() * (width - 100) + 50,
      y: -50,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 3 + 2,
      radius,
      color,
      life: 500,
      type
    });
  };

  const createExplosion = (x: number, y: number, color: string, count = 25) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x, y,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.5) * 16,
        life: Math.random() * 25 + 15,
        maxLife: 40,
        color
      });
    }
  };

  const updatePhysics = (
    ctx: CanvasRenderingContext2D, 
    width: number, 
    height: number, 
    handX: number | null, 
    handY: number | null, 
    isDrawing: boolean,
    isPausedParam: boolean = false
  ) => {
    if (!isGameMode) return;

    const now = Date.now();
    if (lastFrameTimeRef.current === 0) lastFrameTimeRef.current = now;
    let dt = now - lastFrameTimeRef.current;
    if (dt > 100) dt = 16; // Cap dt to prevent huge jumps when switching tabs
    lastFrameTimeRef.current = now;

    if (hitStopRef.current > 0) {
      hitStopRef.current -= dt;
      return; // Freeze physics for game feel
    }

    // Update pause state safely
    setIsPaused(prev => {
      if (prev !== isPausedParam) return isPausedParam;
      return prev;
    });

    if (isPausedParam) {
      // Draw static orbs
      orbsRef.current.forEach(orb => {
        ctx.save();
        ctx.shadowBlur = 20;
        ctx.shadowColor = orb.color;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
        ctx.fillStyle = orb.color;
        ctx.fill();
        ctx.restore();
      });
      
      // Render pause overlay and text
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(0, 0, width, height);
      ctx.font = 'bold 36px Outfit, sans-serif';
      ctx.fillStyle = '#00f3ff';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#00f3ff';
      ctx.fillText('⏸️ GAME PAUSED', width / 2, height / 2 - 20);
      
      ctx.font = '500 16px Outfit, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 0;
      ctx.fillText(
        handX === null ? 'Bring your hand into the camera view' : 'Hold up open palm to pause / index finger to resume', 
        width / 2, 
        height / 2 + 25
      );
      ctx.restore();
      return;
    }

    if (!isGameOver) {
      timerAccumulatorRef.current += dt;
      if (timerAccumulatorRef.current >= 1000) {
        timerAccumulatorRef.current -= 1000;
        setTimeLeft(prev => {
          const next = prev - 1;
          if (next <= 0) {
            setIsGameOver(true);
            audio.playCombo();
            return 0;
          }
          return next;
        });
      }
    }

    // Check freeze timer expiration
    if (isFrozenRef.current && now > freezeEndTimeRef.current) {
      isFrozenRef.current = false;
    }

    const timeScale = isFrozenRef.current ? 0.35 : 1.0;

    // Spawn rate speeds up as time counts down
    const spawnChance = (0.04 + (45 - timeLeft) * 0.001) * timeScale;
    if (!isGameOver && Math.random() < spawnChance) {
      spawnOrb(width);
    }

    if (now - lastHitTimeRef.current > 1200) {
      if (comboRef.current > 1) {
        setCombo(0);
        comboRef.current = 0;
      }
    }

    for (let i = orbsRef.current.length - 1; i >= 0; i--) {
      const orb = orbsRef.current[i];
      orb.x += orb.vx * timeScale;
      orb.y += orb.vy * timeScale;
      orb.vy += 0.15 * timeScale; // Gravity
      orb.life--;

      // Render Orbs with custom styles per type
      ctx.save();
      ctx.shadowBlur = isFrozenRef.current ? 15 : 25;
      ctx.shadowColor = orb.color;
      
      if (orb.type === 'BOMB') {
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ff0033';
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = '#000000';
        ctx.fill();

        ctx.font = 'bold 12px Courier';
        ctx.fillStyle = '#ff0033';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('BOMB', orb.x, orb.y);
      } 
      else if (orb.type === 'FREEZE') {
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#e0f7fa';
        ctx.fill();
        
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.font = '14px sans-serif';
        ctx.fillText('❄️', orb.x - 7, orb.y + 5);
      }
      else if (orb.type === 'GOLD') {
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ffd700';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius * 0.7, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      else {
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
        ctx.fillStyle = orb.color;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius * 0.8, 0, Math.PI * 2);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();

      let hit = false;
      // Hits only count if game is not over
      if (!isGameOver && isDrawing && handX !== null && handY !== null) {
        const dist = Math.hypot(orb.x - handX, orb.y - handY);
        if (dist < orb.radius + 30) {
          hit = true;

          if (orb.type === 'BOMB') {
            hitStopRef.current = 200;
            setShake(true);
            setTimeout(() => setShake(false), 400);

            createExplosion(orb.x, orb.y, '#ff0000', 35);
            audio.playBomb();
            
            // Deduct score, break combo, deduct 1 life
            comboRef.current = 0;
            setCombo(0);
            scoreRef.current = Math.max(0, scoreRef.current - 100);
            setScore(scoreRef.current);
            
            setLives(prev => {
              const next = Math.max(0, prev - 1);
              if (next <= 0) {
                setIsGameOver(true);
              }
              return next;
            });
          } 
          else if (orb.type === 'FREEZE') {
            hitStopRef.current = 50;
            createExplosion(orb.x, orb.y, '#00ffff', 25);
            audio.playFreeze();
            
            isFrozenRef.current = true;
            freezeEndTimeRef.current = Date.now() + 4000;
            
            comboRef.current += 1;
            setCombo(comboRef.current);
            if (comboRef.current > maxCombo) setMaxCombo(comboRef.current);
            lastHitTimeRef.current = now;
          }
          else if (orb.type === 'GOLD') {
            hitStopRef.current = 100;
            createExplosion(orb.x, orb.y, '#ffd700', 40);
            audio.playCombo();
            
            comboRef.current += 1;
            setCombo(comboRef.current);
            if (comboRef.current > maxCombo) setMaxCombo(comboRef.current);
            lastHitTimeRef.current = now;

            const points = 50 * comboRef.current;
            scoreRef.current += points;
            setScore(scoreRef.current);
          }
          else {
            hitStopRef.current = 30;
            createExplosion(orb.x, orb.y, orb.color, 20);
            audio.playSlash();
            
            comboRef.current += 1;
            setCombo(comboRef.current);
            if (comboRef.current > maxCombo) setMaxCombo(comboRef.current);
            lastHitTimeRef.current = now;

            if (comboRef.current % 5 === 0) {
              audio.playCombo();
            }

            const points = 10 * comboRef.current;
            scoreRef.current += points;
            setScore(scoreRef.current);
          }
        }
      }

      // Check if target orb escaped past the bottom boundary without being slashed
      const escaped = orb.y > height + 80;
      if (!isGameOver && escaped && orb.type !== 'BOMB') {
        // Just reset combo for missed orbs so the user can survive the 45 seconds
        setCombo(0);
        comboRef.current = 0;
      }

      if (hit || escaped || orb.life <= 0) {
        orbsRef.current.splice(i, 1);
      }
    }

    // Freeze overlay effect
    if (isFrozenRef.current && !isGameOver) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 243, 255, 0.08)';
      ctx.fillRect(0, 0, width, height);
      ctx.font = 'bold 24px monospace';
      ctx.fillStyle = '#00ffff';
      ctx.fillText('⏳ MATRIX TIME IN EFFECT', 30, 60);
      ctx.restore();
    }

    // Update Particles
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      p.x += p.vx * timeScale;
      p.y += p.vy * timeScale;
      p.vy += 0.3 * timeScale;
      p.life--;
      
      if (p.life <= 0) {
        particlesRef.current.splice(i, 1);
        continue;
      }
      
      ctx.beginPath();
      ctx.arc(p.x, p.y, (p.life / p.maxLife) * 5, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 15;
      ctx.shadowColor = p.color;
      ctx.fill();
    }
  };

  return { 
    isGameMode, 
    toggleGameMode, 
    score, 
    combo, 
    timeLeft, 
    lives, 
    isGameOver, 
    maxCombo, 
    isPaused,
    shake,
    saveHighScore, 
    restartGame, 
    updatePhysics 
  };
};
