/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Target, Zap, Trophy, AlertTriangle, RefreshCw, Languages } from 'lucide-react';
import { 
  Rocket, Interceptor, Explosion, City, Turret, GameStatus,
  GAME_WIDTH, GAME_HEIGHT 
} from './types';

// --- Constants ---
const INITIAL_CITIES_COUNT = 6;
const EXPLOSION_SPEED = 1.5;
const EXPLOSION_MAX_RADIUS = 40;
const ROCKET_SCORE = 20;
const WIN_SCORE = 1000;

const TRANSLATIONS = {
  zh: {
    title: "Tina新星防御",
    start: "开始游戏",
    restart: "再玩一次",
    win: "任务成功！",
    lose: "防御失败",
    score: "得分",
    ammo: "弹药",
    round: "回合",
    targetScore: "目标得分",
    instructions: "点击屏幕拦截敌方火箭。保护城市和炮台！",
    winMsg: "你成功保卫了地球！",
    loseMsg: "所有炮台已被摧毁...",
  },
  en: {
    title: "Tina Nova Defense",
    start: "Start Game",
    restart: "Play Again",
    win: "Mission Success!",
    lose: "Defense Failed",
    score: "Score",
    ammo: "Ammo",
    round: "Round",
    targetScore: "Target",
    instructions: "Click screen to intercept rockets. Protect cities and turrets!",
    winMsg: "You successfully defended Earth!",
    loseMsg: "All turrets have been destroyed...",
  }
};

export default function App() {
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const t = TRANSLATIONS[lang];

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<GameStatus>('START');
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  
  // Game State Refs (for high-performance loop)
  const rocketsRef = useRef<Rocket[]>([]);
  const interceptorsRef = useRef<Interceptor[]>([]);
  const explosionsRef = useRef<Explosion[]>([]);
  const citiesRef = useRef<City[]>([]);
  const turretsRef = useRef<Turret[]>([]);
  const lastTimeRef = useRef<number>(0);
  const requestRef = useRef<number>(0);

  // Initialize game entities
  const initGame = useCallback(() => {
    const cities: City[] = [];
    const spacing = GAME_WIDTH / (INITIAL_CITIES_COUNT + 4);
    
    // Create 6 cities
    for (let i = 0; i < INITIAL_CITIES_COUNT; i++) {
      // Place cities between turrets
      let x = (i + 1) * spacing + (i >= 3 ? spacing * 2 : spacing);
      cities.push({
        id: `city-${i}`,
        x,
        y: GAME_HEIGHT - 30,
        destroyed: false
      });
    }
    citiesRef.current = cities;

    // Create 3 turrets
    turretsRef.current = [
      { id: 'turret-left', x: spacing, y: GAME_HEIGHT - 40, ammo: 20, maxAmmo: 20, destroyed: false },
      { id: 'turret-mid', x: GAME_WIDTH / 2, y: GAME_HEIGHT - 40, ammo: 40, maxAmmo: 40, destroyed: false },
      { id: 'turret-right', x: GAME_WIDTH - spacing, y: GAME_HEIGHT - 40, ammo: 20, maxAmmo: 20, destroyed: false },
    ];

    rocketsRef.current = [];
    interceptorsRef.current = [];
    explosionsRef.current = [];
  }, []);

  const spawnRocket = useCallback(() => {
    const activeTargets = [
      ...citiesRef.current.filter(c => !c.destroyed),
      ...turretsRef.current.filter(t => !t.destroyed)
    ];
    
    if (activeTargets.length === 0) return;

    const target = activeTargets[Math.floor(Math.random() * activeTargets.length)];
    const startX = Math.random() * GAME_WIDTH;
    const speed = 0.5 + (round * 0.1);

    rocketsRef.current.push({
      id: `rocket-${Date.now()}-${Math.random()}`,
      startX,
      startY: 0,
      x: startX,
      y: 0,
      targetX: target.x,
      targetY: target.y,
      progress: 0,
      speed: speed / 1000, // normalized speed
    });
  }, [round]);

  const fireMissile = (targetX: number, targetY: number) => {
    // Find closest turret with ammo
    const availableTurrets = turretsRef.current
      .filter(t => !t.destroyed && t.ammo > 0)
      .sort((a, b) => {
        const distA = Math.hypot(a.x - targetX, a.y - targetY);
        const distB = Math.hypot(b.x - targetX, b.y - targetY);
        return distA - distB;
      });

    if (availableTurrets.length === 0) return;

    const turret = availableTurrets[0];
    turret.ammo -= 1;

    interceptorsRef.current.push({
      id: `interceptor-${Date.now()}-${Math.random()}`,
      startX: turret.x,
      startY: turret.y,
      x: turret.x,
      y: turret.y,
      targetX,
      targetY,
      progress: 0,
      speed: 4 / 1000,
    });
  };

  const update = (time: number) => {
    if (lastTimeRef.current === 0) {
      lastTimeRef.current = time;
    }
    const deltaTime = time - lastTimeRef.current;
    lastTimeRef.current = time;

    // 1. Spawn Rockets
    if (Math.random() < 0.01 + (round * 0.005)) {
      spawnRocket();
    }

    // 2. Update Rockets
    rocketsRef.current.forEach((rocket, index) => {
      rocket.progress += rocket.speed * deltaTime;
      rocket.x = rocket.startX + (rocket.targetX - rocket.startX) * rocket.progress;
      rocket.y = rocket.startY + (rocket.targetY - rocket.startY) * rocket.progress;

      // Hit target
      if (rocket.progress >= 1) {
        // Check what it hit
        const city = citiesRef.current.find(c => c.x === rocket.targetX && c.y === rocket.targetY);
        if (city) city.destroyed = true;
        
        const turret = turretsRef.current.find(t => t.x === rocket.targetX && t.y === rocket.targetY);
        if (turret) turret.destroyed = true;

        // Create small explosion
        explosionsRef.current.push({
          id: `exp-hit-${Date.now()}`,
          x: rocket.x,
          y: rocket.y,
          radius: 0,
          maxRadius: 20,
          expanding: true,
          done: false
        });

        rocketsRef.current.splice(index, 1);
      }
    });

    // 3. Update Interceptors
    interceptorsRef.current.forEach((inter, index) => {
      inter.progress += inter.speed * deltaTime;
      inter.x = inter.startX + (inter.targetX - inter.startX) * inter.progress;
      inter.y = inter.startY + (inter.targetY - inter.startY) * inter.progress;

      if (inter.progress >= 1) {
        // Create explosion
        explosionsRef.current.push({
          id: `exp-${Date.now()}`,
          x: inter.targetX,
          y: inter.targetY,
          radius: 0,
          maxRadius: EXPLOSION_MAX_RADIUS,
          expanding: true,
          done: false
        });
        interceptorsRef.current.splice(index, 1);
      }
    });

    // 4. Update Explosions
    explosionsRef.current.forEach((exp, index) => {
      if (exp.expanding) {
        exp.radius += EXPLOSION_SPEED;
        if (exp.radius >= exp.maxRadius) {
          exp.expanding = false;
        }
      } else {
        exp.radius -= EXPLOSION_SPEED * 0.5;
        if (exp.radius <= 0) {
          exp.done = true;
          explosionsRef.current.splice(index, 1);
        }
      }

      // Check collision with rockets
      rocketsRef.current.forEach((rocket, rIndex) => {
        const dist = Math.hypot(rocket.x - exp.x, rocket.y - exp.y);
        if (dist < exp.radius) {
          setScore(prev => {
            const newScore = prev + ROCKET_SCORE;
            
            // Round logic: every 200 points
            if (Math.floor(newScore / 200) > Math.floor(prev / 200)) {
              // Refill ammo
              turretsRef.current.forEach(t => {
                if (!t.destroyed) t.ammo = t.maxAmmo;
              });
              setRound(r => r + 1);
            }

            if (newScore >= WIN_SCORE) {
              setStatus('WIN');
            }
            return newScore;
          });
          rocketsRef.current.splice(rIndex, 1);
        }
      });
    });

    // Check Game Over
    const allTurretsDestroyed = turretsRef.current.every(t => t.destroyed);
    if (allTurretsDestroyed) {
      setStatus('LOSE');
    }

    draw();
    if (status === 'PLAYING') {
      requestRef.current = requestAnimationFrame(update);
    }
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Draw Ground
    ctx.fillStyle = '#333';
    ctx.fillRect(0, GAME_HEIGHT - 20, GAME_WIDTH, 20);

    // Draw Cities
    citiesRef.current.forEach(city => {
      if (!city.destroyed) {
        ctx.fillStyle = '#4ade80'; // Green-400
        ctx.fillRect(city.x - 15, city.y - 10, 30, 10);
        ctx.fillRect(city.x - 10, city.y - 20, 20, 10);
      } else {
        ctx.fillStyle = '#450a0a'; // Red-950
        ctx.fillRect(city.x - 15, city.y - 5, 30, 5);
      }
    });

    // Draw Turrets
    turretsRef.current.forEach(turret => {
      if (!turret.destroyed) {
        ctx.fillStyle = '#3b82f6'; // Blue-500
        ctx.beginPath();
        ctx.moveTo(turret.x - 20, turret.y + 10);
        ctx.lineTo(turret.x + 20, turret.y + 10);
        ctx.lineTo(turret.x, turret.y - 20);
        ctx.closePath();
        ctx.fill();
        
        // Ammo bar
        const ammoWidth = (turret.ammo / turret.maxAmmo) * 30;
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(turret.x - 15, turret.y + 15, 30, 4);
        ctx.fillStyle = '#60a5fa';
        ctx.fillRect(turret.x - 15, turret.y + 15, ammoWidth, 4);
      } else {
        ctx.fillStyle = '#1e1b4b'; // Dark blue
        ctx.beginPath();
        ctx.arc(turret.x, turret.y + 5, 10, 0, Math.PI, true);
        ctx.fill();
      }
    });

    // Draw Rockets
    ctx.strokeStyle = '#ef4444'; // Red-500
    ctx.lineWidth = 1;
    rocketsRef.current.forEach(rocket => {
      ctx.beginPath();
      ctx.moveTo(rocket.startX, rocket.startY);
      ctx.lineTo(rocket.x, rocket.y);
      ctx.stroke();
      
      ctx.fillStyle = '#fff';
      ctx.fillRect(rocket.x - 1, rocket.y - 1, 2, 2);
    });

    // Draw Interceptors
    ctx.strokeStyle = '#60a5fa'; // Blue-400
    ctx.lineWidth = 1;
    interceptorsRef.current.forEach(inter => {
      ctx.beginPath();
      ctx.moveTo(inter.startX, inter.startY);
      ctx.lineTo(inter.x, inter.y);
      ctx.stroke();

      // Target X
      ctx.strokeStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(inter.targetX - 3, inter.targetY - 3);
      ctx.lineTo(inter.targetX + 3, inter.targetY + 3);
      ctx.moveTo(inter.targetX + 3, inter.targetY - 3);
      ctx.lineTo(inter.targetX - 3, inter.targetY + 3);
      ctx.stroke();
    });

    // Draw Explosions
    explosionsRef.current.forEach(exp => {
      const gradient = ctx.createRadialGradient(exp.x, exp.y, 0, exp.x, exp.y, exp.radius);
      gradient.addColorStop(0, '#fff');
      gradient.addColorStop(0.3, '#fbbf24'); // Amber-400
      gradient.addColorStop(0.7, '#ef4444'); // Red-500
      gradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  useEffect(() => {
    if (status === 'PLAYING') {
      lastTimeRef.current = 0;
      requestRef.current = requestAnimationFrame(update);
    } else {
      cancelAnimationFrame(requestRef.current);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [status]);

  const handleCanvasClick = (e: React.MouseEvent | React.TouchEvent) => {
    if (status !== 'PLAYING') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const scaleX = GAME_WIDTH / rect.width;
    const scaleY = GAME_HEIGHT / rect.height;
    
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    fireMissile(x, y);
  };

  const startGame = () => {
    initGame();
    setScore(0);
    setRound(1);
    setStatus('PLAYING');
  };

  const totalAmmo = turretsRef.current.reduce((acc, t) => acc + t.ammo, 0);

  return (
    <div className="relative w-full h-screen bg-black flex flex-col items-center justify-center p-4 font-mono">
      {/* Header Info */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10 pointer-events-none">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-amber-400 text-xl font-bold tracking-widest">
            <Trophy className="w-5 h-5" />
            <span>{t.score}: {score.toString().padStart(6, '0')}</span>
          </div>
          <div className="text-xs text-white/50">{t.targetScore}: {WIN_SCORE}</div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2 text-blue-400 text-xl font-bold">
            <Target className="w-5 h-5" />
            <span>{t.ammo}: {totalAmmo}</span>
          </div>
          <div className="text-xs text-white/50">{t.round}: {round}</div>
        </div>
      </div>

      {/* Language Switcher */}
      <button 
        onClick={() => setLang(l => l === 'zh' ? 'en' : 'zh')}
        className="absolute bottom-4 left-4 z-20 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white/70 pointer-events-auto"
      >
        <Languages className="w-5 h-5" />
      </button>

      {/* Game Canvas Container */}
      <div className="relative w-full max-w-4xl aspect-[4/3] bg-zinc-900 rounded-lg overflow-hidden border-4 border-zinc-800 shadow-2xl">
        <canvas
          ref={canvasRef}
          width={GAME_WIDTH}
          height={GAME_HEIGHT}
          onMouseDown={handleCanvasClick}
          onTouchStart={handleCanvasClick}
          className="w-full h-full cursor-crosshair"
        />

        {/* Overlays */}
        <AnimatePresence>
          {status === 'START' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-8 text-center"
            >
              <motion.h1 
                initial={{ y: -20 }}
                animate={{ y: 0 }}
                className="text-5xl md:text-7xl font-bold text-amber-500 mb-4 tracking-tighter font-display"
              >
                {t.title}
              </motion.h1>
              <p className="text-zinc-400 mb-8 max-w-md">{t.instructions}</p>
              <button 
                onClick={startGame}
                className="group relative px-8 py-4 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xl rounded-sm transition-all transform active:scale-95 overflow-hidden"
              >
                <span className="relative z-10">{t.start}</span>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform" />
              </button>
            </motion.div>
          )}

          {status === 'WIN' && (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute inset-0 bg-green-900/90 flex flex-col items-center justify-center p-8 text-center"
            >
              <Trophy className="w-20 h-20 text-yellow-400 mb-4 animate-bounce" />
              <h2 className="text-5xl font-bold text-white mb-2">{t.win}</h2>
              <p className="text-green-200 mb-8">{t.winMsg}</p>
              <div className="text-3xl font-bold text-yellow-400 mb-8">{t.score}: {score}</div>
              <button 
                onClick={startGame}
                className="px-8 py-4 bg-white text-green-900 font-bold text-xl rounded-sm hover:bg-green-100 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                {t.restart}
              </button>
            </motion.div>
          )}

          {status === 'LOSE' && (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute inset-0 bg-red-900/90 flex flex-col items-center justify-center p-8 text-center"
            >
              <AlertTriangle className="w-20 h-20 text-white mb-4 animate-pulse" />
              <h2 className="text-5xl font-bold text-white mb-2">{t.lose}</h2>
              <p className="text-red-200 mb-8">{t.loseMsg}</p>
              <div className="text-3xl font-bold text-white mb-8">{t.score}: {score}</div>
              <button 
                onClick={startGame}
                className="px-8 py-4 bg-white text-red-900 font-bold text-xl rounded-sm hover:bg-red-100 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                {t.restart}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Instructions */}
      <div className="mt-8 text-zinc-500 text-sm flex items-center gap-4">
        <div className="flex items-center gap-1"><Shield className="w-4 h-4" /> {lang === 'zh' ? '保护城市' : 'Protect Cities'}</div>
        <div className="flex items-center gap-1"><Zap className="w-4 h-4" /> {lang === 'zh' ? '拦截火箭' : 'Intercept Rockets'}</div>
        <div className="flex items-center gap-1"><Target className="w-4 h-4" /> {lang === 'zh' ? '预判瞄准' : 'Predict Aim'}</div>
      </div>
    </div>
  );
}
