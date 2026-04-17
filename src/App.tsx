import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';

// --- Types & Constants ---
type Point = { x: number; y: number };
const GRID_SIZE = 20;
const INITIAL_SNAKE: Point[] = [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }];
const INITIAL_DIR: Point = { x: 0, y: -1 };

const TRACKS = [
  { id: 1, title: 'SYNTH_WAVE_V1.mp3', artist: 'AI.CORE [DUMMY]', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: 2, title: 'NEURAL_GROOVE.mp3', artist: 'AI.CORE [DUMMY]', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { id: 3, title: 'CYBER_DRIFT.mp3', artist: 'AI.CORE [DUMMY]', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' }
];

// --- Custom Hook for Interval Game Loop ---
function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);
  useEffect(() => { savedCallback.current = callback; }, [callback]);
  useEffect(() => {
    if (delay !== null) {
      const id = setInterval(() => savedCallback.current(), delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}

// --- Main App Component ---
export default function App() {
  // 1. Audio State
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTrackIdx, setCurrentTrackIdx] = useState(0);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  // 2. Game State
  const [gameState, setGameState] = useState<'MENU' | 'PLAYING' | 'GAME_OVER'>('MENU');
  const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE);
  const dirQueueRef = useRef<Point[]>([]);
  const lastProcessedDirRef = useRef<Point>(INITIAL_DIR);
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [score, setScore] = useState(0);

  // Random food generator (avoids snake body)
  const randomFood = useCallback((currentSnake: Point[]) => {
    let newFood: Point;
    while (true) {
      newFood = { x: Math.floor(Math.random() * GRID_SIZE), y: Math.floor(Math.random() * GRID_SIZE) };
      if (!currentSnake.some(s => s.x === newFood.x && s.y === newFood.y)) break;
    }
    return newFood;
  }, []);

  // Sync isAudioPlaying with actual DOM element
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      // Small timeout to circumvent instant block on fast toggles
      if (isAudioPlaying) {
        audio.play().catch(err => {
          console.error('Audio play failed (browser block)', err);
          setIsAudioPlaying(false);
        });
      } else {
        audio.pause();
      }
    }
  }, [isAudioPlaying, currentTrackIdx]);

  // Audio track cyclers
  const playNextTrack = useCallback(() => setCurrentTrackIdx(p => (p + 1) % TRACKS.length), []);
  const playPrevTrack = useCallback(() => setCurrentTrackIdx(p => (p - 1 + TRACKS.length) % TRACKS.length), []);

  // Central direction handler
  const changeDirection = useCallback((key: string) => {
    if (gameState !== 'PLAYING') return;

    const lastDirInQueue = dirQueueRef.current.length > 0 
      ? dirQueueRef.current[dirQueueRef.current.length - 1] 
      : lastProcessedDirRef.current;
    
    let nextDir = lastDirInQueue;

    if (key === 'ArrowUp' && lastDirInQueue.y === 0) nextDir = { x: 0, y: -1 };
    if (key === 'ArrowDown' && lastDirInQueue.y === 0) nextDir = { x: 0, y: 1 };
    if (key === 'ArrowLeft' && lastDirInQueue.x === 0) nextDir = { x: -1, y: 0 };
    if (key === 'ArrowRight' && lastDirInQueue.x === 0) nextDir = { x: 1, y: 0 };

    if (nextDir !== lastDirInQueue) {
      dirQueueRef.current.push(nextDir);
    }
  }, [gameState]);

  // Keybindings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault(); // Prevent page scroll
        changeDirection(e.key);
      }
      if (e.key === ' ' && gameState === 'MENU') {
        startGame();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [changeDirection, gameState]);

  const startGame = () => {
    setSnake(INITIAL_SNAKE);
    dirQueueRef.current = [];
    lastProcessedDirRef.current = INITIAL_DIR;
    setFood(randomFood(INITIAL_SNAKE));
    setScore(0);
    setGameState('PLAYING');
    setIsAudioPlaying(true);
  };

  // Game Loop
  useInterval(() => {
    if (gameState !== 'PLAYING') return;

    const currentDir = dirQueueRef.current.length > 0 
      ? dirQueueRef.current.shift()! 
      : lastProcessedDirRef.current;
    
    lastProcessedDirRef.current = currentDir;

    const head = snake[0];
    const newHead = { x: head.x + currentDir.x, y: head.y + currentDir.y };

    // Wall collision
    if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
      setGameState('GAME_OVER');
      return;
    }

    // Self collision (ignore tail since it will move, unless eating food - check all but last segment)
    if (snake.slice(0, -1).some(s => s.x === newHead.x && s.y === newHead.y)) {
      setGameState('GAME_OVER');
      return;
    }

    const newSnake = [newHead, ...snake];

    if (newHead.x === food.x && newHead.y === food.y) {
      setScore(s => s + 10);
      setFood(randomFood(newSnake));
    } else {
      newSnake.pop(); // Remove tail if no food eaten
    }

    setSnake(newSnake);
  }, gameState === 'PLAYING' ? 120 : null);

  const activeTrack = TRACKS[currentTrackIdx];

  return (
    <main className="min-h-screen bg-black text-[#00ffff] font-mono overflow-hidden flex flex-col relative selection:bg-[#ff00ff]/30">
      {/* Glitch & CRT FX */}
      <div className="scanlines" />
      <div className="static-noise" />
      <div className="crt-flicker pointer-events-none absolute inset-0 z-50 mix-blend-overlay bg-gradient-to-b from-transparent via-[#00ffff]/[0.02] to-transparent" />

      {/* Header */}
      <header className="flex-none pt-8 pb-4 text-center z-10 glitch-wrapper mt-4">
         <h1 className="text-5xl sm:text-6xl font-black tracking-widest uppercase glitch-text" data-text="NEURAL_SNAKE.EXE">
            NEURAL_SNAKE.EXE
         </h1>
      </header>

      {/* Center Game Board */}
      <div className="flex-1 flex flex-col items-center justify-start sm:justify-center p-4 z-10 pb-32">
        {/* Top Status Bar */}
        <div className="w-full max-w-[400px] flex justify-between items-center mb-4 px-2 tracking-widest text-[#00ffff] text-lg sm:text-xl font-bold uppercase">
           <span>
             DATA_FRAGS / <span className="text-[#ff00ff]">{score.toString().padStart(4, '0')}</span>
           </span>
           <span className={`${gameState === 'GAME_OVER' ? 'text-[#ff00ff] animate-pulse' : ''}`}>
             SYS / {gameState === 'MENU' ? 'IDLE' : gameState === 'PLAYING' ? 'ACTIVE' : 'CRITICAL'}
           </span>
        </div>

        {/* Game Canvas Container */}
        <div className="relative w-full max-w-[400px] aspect-square bg-[#050505] raw-border overflow-hidden">
           {/* Overlays */}
           {gameState === 'MENU' && (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20">
               <button 
                 onClick={startGame}
                 className="px-6 py-3 bg-black raw-border text-[#00ffff] font-bold tracking-widest glitch-bg transition-all duration-75 uppercase cursor-pointer"
               >
                  [ EXECUTE : SYS.BOOT ]
               </button>
               <p className="text-[#00ffff]/60 mt-6 text-sm tracking-widest uppercase animate-pulse">Awaiting Input Sequence...</p>
             </div>
           )}

           {gameState === 'GAME_OVER' && (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20 crt-flicker">
                <h2 className="text-4xl font-black text-[#ff00ff] mb-2 uppercase glitch-text" data-text="FATAL_ERR // 0xDEADBEEF">FATAL_ERR // 0xDEADBEEF</h2>
                <p className="text-[#00ffff] mb-8 font-mono text-xl uppercase">DATA HARVESTED: {score}</p>
                <button 
                  onClick={startGame}
                  className="px-6 py-3 bg-black raw-border-magenta text-[#ff00ff] font-bold tracking-widest cursor-pointer hover:bg-[#ff00ff] hover:text-black hover:shadow-[-4px_-4px_0px_#00ffff] transition-all duration-75 uppercase"
                >
                  [ REBOOT_SEQUENCE ]
                </button>
             </div>
           )}

           {/* Food */}
           <motion.div
              animate={{ opacity: [0.2, 1] }}
              transition={{ repeat: Infinity, duration: 0.1, ease: "linear", repeatType: "mirror" }}
              className="absolute bg-white z-10"
              style={{
                 left: `${(food.x / GRID_SIZE) * 100}%`,
                 top: `${(food.y / GRID_SIZE) * 100}%`,
                 width: `${100 / GRID_SIZE}%`,
                 height: `${100 / GRID_SIZE}%`
              }}
           />

           {/* Snake Elements */}
           {snake.map((segment, i) => {
              const isHead = i === 0;
              return (
                 <div
                   key={`${segment.x}-${segment.y}-${i}`}
                   className={`absolute ${
                     isHead 
                       ? 'bg-[#ff00ff] z-15' 
                       : 'bg-[#00ffff] opacity-80'
                   }`}
                   style={{
                     left: `${(segment.x / GRID_SIZE) * 100}%`,
                     top: `${(segment.y / GRID_SIZE) * 100}%`,
                     width: `${100 / GRID_SIZE}%`,
                     height: `${100 / GRID_SIZE}%`,
                     border: '1px solid #000'
                   }}
                 />
              )
           })}
        </div>

        {/* Mobile D-pad */}
        <div className="mt-8 sm:hidden flex flex-col items-center gap-1 w-full mb-8 font-bold text-xl">
          <button 
            onClick={() => changeDirection('ArrowUp')} 
            className="w-16 h-12 bg-black raw-border text-[#00ffff] active:bg-[#00ffff] active:text-black cursor-pointer"
          >[ ^ ]</button>
          <div className="flex gap-1">
            <button 
              onClick={() => changeDirection('ArrowLeft')} 
              className="w-16 h-12 bg-black raw-border text-[#00ffff] active:bg-[#00ffff] active:text-black cursor-pointer"
            >[ &lt; ]</button>
            <button 
              onClick={() => changeDirection('ArrowDown')} 
              className="w-16 h-12 bg-black raw-border text-[#00ffff] active:bg-[#00ffff] active:text-black cursor-pointer"
            >[ v ]</button>
            <button 
              onClick={() => changeDirection('ArrowRight')} 
              className="w-16 h-12 bg-black raw-border text-[#00ffff] active:bg-[#00ffff] active:text-black cursor-pointer"
            >[ &gt; ]</button>
          </div>
        </div>
      </div>

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        src={activeTrack.url}
        onEnded={playNextTrack}
        onPlay={() => setIsAudioPlaying(true)}
        onPause={() => setIsAudioPlaying(false)}
        preload="auto"
      />

      {/* Bottom Docked Music Player */}
      <div className="fixed bottom-0 left-0 w-full h-24 bg-black border-t-4 border-[#ff00ff] flex flex-col justify-center px-4 sm:px-8 z-50">
        <div className="flex items-center justify-between max-w-5xl w-full mx-auto">
          {/* Left: Track Info & Visualizer */}
          <div className="flex items-center gap-4 w-1/3">
            <div className="hidden sm:flex gap-1 items-end h-8 w-16 shrink-0">
               {[1,2,3,4,5].map(idx => (
                 <motion.div
                   key={idx}
                   className="w-[6px] bg-[#00ffff]"
                   animate={isAudioPlaying ? { height: ['20%', '100%', '40%', '90%', '10%'] } : { height: '20%' }}
                   transition={{ 
                      repeat: Infinity, 
                      duration: 0.2 + (idx * 0.1), 
                      ease: "steps(3)",
                      repeatType: "mirror"
                   }}
                 />
               ))}
            </div>
            <div className="flex flex-col truncate uppercase">
              <span className="text-xl font-bold text-[#00ffff] truncate">
                {activeTrack.title}
              </span>
              <span className="text-sm text-[#ff00ff] truncate">{activeTrack.artist}</span>
            </div>
          </div>

          {/* Center: Controls */}
          <div className="flex items-center justify-center gap-4 sm:gap-6 w-1/3 text-xl sm:text-3xl font-bold">
            <button 
              onClick={playPrevTrack} 
              className="px-2 py-1 text-[#00ffff] hover:text-[#ff00ff] cursor-pointer hover:bg-white/10 transition-none"
            >
              [|&lt;]
            </button>
            
            <button 
              onClick={() => setIsAudioPlaying(!isAudioPlaying)}
              className="px-4 py-2 text-[#ff00ff] border-2 border-[#ff00ff] cursor-pointer hover:bg-[#ff00ff] hover:text-black transition-none min-w-[70px]"
            >
              {isAudioPlaying ? '[||]' : '[>]'}
            </button>
            
            <button 
              onClick={playNextTrack} 
              className="px-2 py-1 text-[#00ffff] hover:text-[#ff00ff] cursor-pointer hover:bg-white/10 transition-none"
            >
              [&gt;|]
            </button>
          </div>

          {/* Right: Helper */}
          <div className="w-1/3 flex justify-end items-center">
            <div className="text-sm sm:text-base font-black text-[#ff00ff] uppercase hidden sm:flex items-center gap-2">
              <span className="animate-pulse">_AUDIO_STREAM_</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
