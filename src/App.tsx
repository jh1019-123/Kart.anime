import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Coins, 
  Gauge, 
  Sparkles, 
  Flame, 
  Compass, 
  Zap, 
  RotateCcw, 
  Play, 
  ShieldAlert,
  ShoppingBag,
  Grid,
  Info
} from 'lucide-react';
import { KARTS, MAPS } from './data';
import { KartInfo, MapInfo } from './types';
import { GameEngine, AudioEngine } from './lib/gameEngine';

export default function App() {
  // --- Persistent Storage State ---
  const [gold, setGold] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('anime_gold');
      return saved ? parseInt(saved, 10) : 300; // 300G for generous initial pulls
    } catch (e) {
      return 300;
    }
  });
  const [unlockedKarts, setUnlockedKarts] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('anime_unlocked_karts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.every(x => typeof x === 'string')) {
          return parsed;
        }
      }
      return ['pink_thunder'];
    } catch (e) {
      return ['pink_thunder'];
    }
  });
  const [selectedKartId, setSelectedKartId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('anime_selected_kart');
      return saved ? saved : 'pink_thunder';
    } catch (e) {
      return 'pink_thunder';
    }
  });
  const [selectedMapId, setSelectedMapId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('anime_selected_map');
      return saved ? saved : 'neon_sky_way';
    } catch (e) {
      return 'neon_sky_way';
    }
  });

  // --- UI Layout & Navigation States ---
  const [activeMenuTab, setActiveMenuTab] = useState<'play' | 'garage_shop'>('play');
  const [gameState, setGameState] = useState<'lobby' | 'countdown' | 'playing' | 'finished'>('lobby');
  const [gameMode, setGameMode] = useState<'speed' | 'item' | 'time_attack'>('speed');

  // --- In-game Dynamic HUD States ---
  const [speedVal, setSpeedVal] = useState<number>(0);
  const [currentLap, setCurrentLap] = useState<number>(1);
  const [boosterGauge, setBoosterGauge] = useState<number>(0);
  const [boosterStock, setBoosterStock] = useState<number>(0);
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [shieldActive, setShieldActive] = useState<boolean>(false);
  const [gameTimeFormatted, setGameTimeFormatted] = useState<string>('00:00.00');
  const [rivalProgress, setRivalProgress] = useState<number>(0);
  const [playerProgress, setPlayerProgress] = useState<number>(0);

  // --- Custom Notifications / Comic Pops ---
  const [comicPop, setComicPop] = useState<{ text: string; color: string; id: number } | null>(null);
  const [alertNotify, setAlertNotify] = useState<{ title: string; message: string; show: boolean }>({
    title: '',
    message: '',
    show: false
  });

  // --- Gacha Drawing (Slot Machine) States ---
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [drawnKart, setDrawnKart] = useState<KartInfo | null>(null);
  const [drawRefund, setDrawRefund] = useState<boolean>(false);
  const [gachaIntervalText, setGachaIntervalText] = useState<string>('???');

  // --- Finish Game Outcome Stats ---
  const [finishStats, setFinishStats] = useState<{
    playerWon: boolean;
    finalTimeStr: string;
    earnedGold: number;
  }>({
    playerWon: true,
    finalTimeStr: '00:00.00',
    earnedGold: 0
  });

  // --- Game Mechanics Refs ---
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const keysPressedRef = useRef<Record<string, boolean>>({});
  const animationFrameIdRef = useRef<number | null>(null);

  // Sync to Storage
  useEffect(() => {
    localStorage.setItem('anime_gold', gold.toString());
  }, [gold]);

  useEffect(() => {
    localStorage.setItem('anime_unlocked_karts', JSON.stringify(unlockedKarts));
  }, [unlockedKarts]);

  useEffect(() => {
    localStorage.setItem('anime_selected_kart', selectedKartId);
  }, [selectedKartId]);

  useEffect(() => {
    localStorage.setItem('anime_selected_map', selectedMapId);
  }, [selectedMapId]);

  // Audio trigger helper
  const triggerAudioInit = () => {
    AudioEngine.init();
  };

  // Toast HUD Alert
  const showHUDNotification = (title: string, message: string) => {
    setAlertNotify({ title, message, show: true });
    setTimeout(() => {
      setAlertNotify(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  // Spark visual comic text pop on top screen
  const triggerComicTextPop = (text: string, styleColor = '#f43f5e') => {
    setComicPop({ text, color: styleColor, id: Date.now() });
  };

  // --- Karts & Maps data resolution ---
  const currentKart = KARTS.find(k => k.id === selectedKartId) || KARTS[0];
  const currentMap = MAPS.find(m => m.id === selectedMapId) || MAPS[0];

  // --- Play Keyboard Hook for Gameplay controls ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      triggerAudioInit();
      const k = e.key;
      keysPressedRef.current[k] = true;
      if (k === 'ArrowUp' || k === 'w' || k === 'ArrowDown' || k === 's' || k === 'ArrowLeft' || k === 'a' || k === 'ArrowRight' || k === 'd' || k === 'Shift') {
        const standardMovementKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', ' '];
        if (standardMovementKeys.includes(e.code) || standardMovementKeys.includes(k)) {
          e.preventDefault();
        }
      }
      
      // Use Item / Booster
      if (k === ' ' || k === 'Control') {
        e.preventDefault();
        triggerItemSlinger();
      }

      // Camera view toggle
      if (k.toLowerCase() === 'v' || k.toLowerCase() === 'c') {
        toggleEngineCamera();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressedRef.current[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, activeItem, boosterStock, gameMode]);

  // Handle Canvas resize
  useEffect(() => {
    const handleResize = () => {
      if (engineRef.current) {
        engineRef.current.resize();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- Game Loop Implementation ---
  useEffect(() => {
    if (gameState !== 'playing') {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      return;
    }

    if (engineRef.current) {
      engineRef.current.resize();
    }

    const loop = () => {
      if (engineRef.current && gameState === 'playing') {
        engineRef.current.update(keysPressedRef.current, currentKart.stats.drift);

        // Update real-time HUD values
        const engineInstance = engineRef.current;
        setRivalProgress(engineInstance.aiProgress);
        const nearestT = engineInstance.getNearestTrackSplinePoint(engineInstance.playerKart.mesh.position);
        setPlayerProgress(nearestT);
        setShieldActive(engineInstance.shieldActive);

        // Format Timer
        const timeElapsed = engineInstance.timer;
        const mins = Math.floor(timeElapsed / 60000);
        const secs = Math.floor((timeElapsed % 60000) / 1000);
        const mils = Math.floor((timeElapsed % 1000) / 10);
        setGameTimeFormatted(
          `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${mils.toString().padStart(2, '0')}`
        );

        // Render Minimap
        if (minimapCanvasRef.current) {
          engineInstance.drawMinimap(minimapCanvasRef.current);
        }

        engineInstance.render();
      }
      animationFrameIdRef.current = requestAnimationFrame(loop);
    };

    animationFrameIdRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [gameState, currentKart]);

  // --- Game Launch Controllers ---
  const launchRace = () => {
    triggerAudioInit();
    setGameState('countdown');
    setCurrentLap(1);
    setSpeedVal(0);
    setBoosterGauge(0);
    setBoosterStock(0);
    setActiveItem(null);
    setShieldActive(false);

    // Initial countdown sequence
    let count = 3;
    triggerComicTextPop(`${count}`, '#eab308');
    AudioEngine.playItemPickup();

    const timer = setInterval(() => {
      count--;
      if (count > 0) {
        triggerComicTextPop(`${count}`, '#eab308');
        AudioEngine.playItemPickup();
      } else if (count === 0) {
        triggerComicTextPop('GO!', '#f43f5e');
        AudioEngine.playBoost();
        
        // Start 3D environment inside canvas container
        if (canvasContainerRef.current) {
          // Cleanup old engine
          if (engineRef.current) {
            engineRef.current.cleanup();
          }

          engineRef.current = new GameEngine(
            canvasContainerRef.current,
            currentMap,
            currentKart.color,
            currentKart.flameColor,
            0xfacc15, // AI kart yellow
            currentKart.stats,
            (lap) => {
              setCurrentLap(lap);
              triggerComicTextPop(`LAP ${lap}!`, '#22d3ee');
              const finalLapNumber = gameMode === 'time_attack' ? 1 : 3;
              if (lap === finalLapNumber) {
                showHUDNotification('FINAL LAP 돌입!', '마지막 질주를 이어가세요!');
              } else {
                showHUDNotification(`LAP ${lap} 진입!`, '페이스를 가속하세요!');
              }
            },
            (speed) => setSpeedVal(speed),
            (gauge) => setBoosterGauge(gauge),
            (stock) => setBoosterStock(stock),
            () => {
              // Item pickup trigger
              if (gameMode === 'item') {
                triggerItemAcquisition();
              }
            },
            (playerWon, finalTime) => {
              concludeRaceOutcome(playerWon, finalTime);
            },
            () => {
              triggerComicTextPop('AI CRASH!', '#a855f7');
              showHUDNotification('피격 성공!', '라이벌 스핀 연계를 유도했습니다.');
            },
            () => {
              triggerComicTextPop('CRASH!', '#ef4444');
              showHUDNotification('충돌 발생!', '바나나 또는 외벽 충돌로 속도가 저하됩니다.');
            }
          );

          if (gameMode === 'time_attack') {
            engineRef.current.maxLaps = 1;
          }

          engineRef.current.activateEngine();
          if (AudioEngine.ctx) {
            AudioEngine.playEngine(0.15);
          }
        }
        setGameState('playing');
        clearInterval(timer);
      }
    }, 1000);
  };

  const concludeRaceOutcome = (playerWon: boolean, finalTime: number) => {
    let baseGold = playerWon ? 180 : 80;
    // Time bonus multiplier
    const timeInSec = finalTime / 1000;
    const speedBonus = Math.max(0, Math.floor(100 - timeInSec));
    const finalGoldAwarded = baseGold + speedBonus;

    const mins = Math.floor(finalTime / 60000);
    const secs = Math.floor((finalTime % 60000) / 1000);
    const mils = Math.floor((finalTime % 1000) / 10);
    const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${mils.toString().padStart(2, '0')}`;

    setFinishStats({
      playerWon,
      finalTimeStr: timeStr,
      earnedGold: finalGoldAwarded
    });

    setGold(prev => prev + finalGoldAwarded);
    setGameState('finished');

    if (engineRef.current) {
      engineRef.current.cleanup();
      engineRef.current = null;
    }
  };

  const triggerItemAcquisition = () => {
    if (activeItem) return; // limit one item holding
    AudioEngine.playItemPickup();
    triggerComicTextPop('ITEM BOX', '#eab308');

    const itemList = ['booster', 'shield', 'banana', 'missile'];
    const rolledItem = itemList[Math.floor(Math.random() * itemList.length)];
    setActiveItem(rolledItem);
  };

  const triggerItemSlinger = () => {
    if (gameState !== 'playing') return;

    if (gameMode === 'speed' || gameMode === 'time_attack') {
      if (boosterStock > 0) {
        setBoosterStock(prev => {
          const next = prev - 1;
          if (engineRef.current) {
            engineRef.current.boosterStock = next;
            engineRef.current.activateBooster();
          }
          return next;
        });
        triggerComicTextPop('SPEED BOOST!', '#22d3ee');
        showHUDNotification('부스터 발동!', '광속 가속 모드에 진입했습니다.');
      }
      return;
    }

    if (!activeItem) return;
    const used = activeItem;
    setActiveItem(null);

    if (engineRef.current) {
      switch (used) {
        case 'booster':
          engineRef.current.activateBooster();
          triggerComicTextPop('BOOSTER!', '#22d3ee');
          showHUDNotification('아이템 부스터!', '순간 가속력 증폭 주행!');
          break;
        case 'shield':
          engineRef.current.shieldActive = true;
          engineRef.current.shieldTimer = 220;
          triggerComicTextPop('SHIELD ON', '#3b82f6');
          showHUDNotification('일렉트로 실드', '트랩 타격을 전방 무효화합니다.');
          break;
        case 'banana':
          engineRef.current.dropBanana();
          triggerComicTextPop('TRAP DROPPED', '#eab308');
          showHUDNotification('트랩 매설 완료', '후방에 회전 장애물 바나나를 투하했습니다.');
          break;
        case 'missile':
          engineRef.current.shootMissile();
          triggerComicTextPop('MISSILE LOADED', '#ec4899');
          showHUDNotification('미사일 유도 록온', '라이벌 AI 레이서를 저격합니다.');
          break;
      }
    }
  };

  const toggleEngineCamera = () => {
    if (engineRef.current) {
      const modes: Array<'isometric' | 'chase' | 'first'> = ['isometric', 'chase', 'first'];
      const curIdx = modes.indexOf(engineRef.current.cameraView);
      const nextMode = modes[(curIdx + 1) % modes.length];
      engineRef.current.cameraView = nextMode;
      triggerComicTextPop(`CAMERA: ${nextMode.toUpperCase()}`, '#a855f7');
    }
  };

  const quitRace = () => {
    triggerAudioInit();
    if (engineRef.current) {
      engineRef.current.cleanup();
      engineRef.current = null;
    }
    setGameState('lobby');
  };

  // --- 뽑기 Gacha Shop Logic ---
  const handleGachaDraw = () => {
    try {
      triggerAudioInit();
      if (gold < 100) {
        showHUDNotification('잔액 부족', '가챠를 뽑을 골드가 부족합니다! 완수 보상으로 모아보세요.');
        return;
      }

      setIsDrawing(true);
      setDrawnKart(null);
      setDrawRefund(false);
      setGold(prev => prev - 100);

      // Gacha Shuffle Animation
      let counter = 0;
      const interval = setInterval(() => {
        try {
          const randomKart = KARTS[Math.floor(Math.random() * KARTS.length)];
          setGachaIntervalText(randomKart.name.split(' (')[0]);
          counter++;

          // Play click effect on shuffle tick (surrounded by try-catch inside AudioEngine)
          AudioEngine.playItemPickup();

          if (counter > 15) {
            clearInterval(interval);
            
            // Final roll distribution (Legendary: 8%, Rare: 42%, Normal: 50%)
            const roll = Math.random() * 100;
            let finalKart: KartInfo;
            if (roll < 8) {
              finalKart = KARTS.find(k => k.rarity === 'Legendary') || KARTS[KARTS.length - 1];
            } else if (roll < 50) {
              const rares = KARTS.filter(k => k.rarity === 'Rare');
              finalKart = rares[Math.floor(Math.random() * rares.length)];
            } else {
              const normals = KARTS.filter(k => k.rarity === 'Normal');
              finalKart = normals[Math.floor(Math.random() * normals.length)];
            }

            setDrawnKart(finalKart);
            AudioEngine.playBoost();

            const alreadyOwned = unlockedKarts.includes(finalKart.id);
            if (alreadyOwned) {
              setDrawRefund(true);
              setGold(prev => prev + 50); // Refund 50%
            } else {
              setUnlockedKarts(prev => {
                if (prev.includes(finalKart.id)) return prev;
                return [...prev, finalKart.id];
              });
            }
            setIsDrawing(false);
          }
        } catch (e) {
          clearInterval(interval);
          setIsDrawing(false);
          console.error("Error inside gacha drawer shuffle:", e);
        }
      }, 110);
    } catch (e) {
      setIsDrawing(false);
      console.error("Error starting gacha draw:", e);
    }
  };

  // Mobile directional touch controls mock bindings
  const handleTouchControl = (key: string, press: boolean) => {
    triggerAudioInit();
    keysPressedRef.current[key] = press;
  };

  // Progress relative calculations
  const rPosition = rivalProgress >= playerProgress ? '2nd' : '1st';
  const aPosition = rivalProgress >= playerProgress ? '1st' : '2nd';

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#030408] text-white">
      {/* Anime speed-line/flicker layer for adrenaline racing feeling */}
      <AnimatePresence>
        {gameState === 'playing' && speedVal > 110 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.1, 0.4, 0.1] }}
            exit={{ opacity: 0 }}
            transition={{ repeat: Infinity, duration: 0.15 }}
            className="absolute inset-0 pointer-events-none z-10 border-[12px] border-white/20 select-none radial-lines-overlay"
            style={{
              backgroundImage: 'radial-gradient(circle, transparent 40%, rgba(255,255,255,0.15) 100%)'
            }}
          />
        )}
      </AnimatePresence>

      {/* --- MENU LOBBY SCREEN (Revamped layout with extreme usability) --- */}
      {gameState === 'lobby' && (
        <div className="absolute inset-0 z-50 flex flex-col justify-between bg-gradient-to-br from-[#060b1e] via-[#091535] to-[#020409] px-4 md:px-8 py-4 overflow-y-auto">
          {/* Subtle manga dotted style pattern */}
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #f43f5e 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}></div>
          
          {/* TOP BANNER LOBBY HEADER */}
          <div className="flex flex-col md:flex-row justify-between items-center w-full max-w-7xl mx-auto gap-4 z-10 py-2 border-b border-white/10">
            {/* Title Block */}
            <div className="text-center md:text-left transform -rotate-1">
              <h1 className="text-4xl md:text-5xl font-black italic tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-yellow-300 to-cyan-400 font-display comic-text">
                KART-RIDER <span className="text-yellow-400 font-black">ANIME</span>
              </h1>
              <p className="text-pink-400 text-xs font-black uppercase tracking-wider mt-1">
                ★ ULTRA HIGH-SPEED TOON RACING ★
              </p>
            </div>

            {/* Profile & Wallet display board with Accessibility emphasis */}
            <div className="flex items-center space-x-3 bg-slate-900/90 border-2 border-pink-500 rounded-2xl px-5 py-2.5 shadow-lg">
              <div className="w-10 h-10 rounded-full bg-pink-500/20 border border-pink-400 flex items-center justify-center text-pink-400 font-bold">
                <Trophy size={18} />
              </div>
              <div className="text-left">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block leading-3">MY PASS GOLD</span>
                <div className="flex items-center text-yellow-300 font-black text-xl font-display">
                  <Coins className="mr-1 text-yellow-400 animate-bounce" size={18} />
                  <span>{gold} G</span>
                </div>
              </div>
            </div>
          </div>

          {/* MAIN MODULAR GRID HUB (Everything accessible in single center pane) */}
          <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start z-10 my-4">
            
            {/* LEFT COLUMN: 맵선택 (MAP SELECTOR - Col span 7) */}
            <div className="lg:col-span-7 bg-slate-900/80 border-2 border-slate-700/60 rounded-3xl p-5 flex flex-col space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h3 className="text-md font-black text-pink-400 flex items-center space-x-2">
                  <Compass size={18} />
                  <span>1. 트랙 맵 선택 (Track Grid)</span>
                </h3>
                <span className="text-[11px] text-gray-400 font-mono tracking-wider font-bold">MAP LIST / {MAPS.length} ITEMS</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[360px] overflow-y-auto pr-1">
                {MAPS.map((m) => {
                  const isSelected = selectedMapId === m.id;
                  const difficultyColor = m.difficulty === '★★★' ? 'text-red-500' : m.difficulty === '★★☆' ? 'text-yellow-400' : 'text-green-400';
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        triggerAudioInit();
                        setSelectedMapId(m.id);
                      }}
                      className={`relative flex flex-col justify-between overflow-hidden text-left py-4 px-4 bg-slate-950 rounded-2xl border-2 transition-all group scale-100 cursor-pointer ${
                        isSelected 
                          ? 'border-pink-500 shadow-[0_0_15px_rgba(244,63,94,0.4)] bg-pink-950/20' 
                          : 'border-slate-800 hover:border-slate-600 hover:bg-slate-900'
                      }`}
                    >
                      {/* Gradient Ambient Deco */}
                      <div className={`absolute top-0 right-0 w-24 h-24 rounded-full bg-${m.themeColor}/10 blur-xl group-hover:scale-125 transition-all`}></div>
                      
                      <div>
                        {/* Difficulty rating banner */}
                        <div className="flex justify-between items-center mb-2">
                          <span className={`text-[10px] font-display font-black tracking-widest ${difficultyColor}`}>
                            DIFFICULTY: {m.difficulty}
                          </span>
                        </div>

                        <h4 className="text-sm font-black text-white group-hover:text-pink-300 transition-colors">
                          {m.name.split(' (')[0]}
                        </h4>
                        <p className="text-[11px] text-gray-400 mt-1 lines-clamp-3 leading-relaxed">
                          {m.description}
                        </p>
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-[9px] text-slate-500 font-bold tracking-widest uppercase">CATMULL-ROM PATH</span>
                        {isSelected && (
                          <span className="bg-pink-500 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded shadow">
                            ACTIVE
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* MODE SELECTOR PANEL INSIDE MAP SECTION */}
              <div className="mt-4 bg-slate-950/90 border-2 border-slate-800 rounded-2xl p-4">
                <div className="flex items-center space-x-2 text-yellow-400 font-black text-xs uppercase tracking-widest mb-3">
                  <Flame size={14} />
                  <span>2. 레이싱 모드 세팅 (Racing Mechanics)</span>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      triggerAudioInit();
                      setGameMode('speed');
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                      gameMode === 'speed'
                        ? 'bg-pink-950/10 border-pink-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                        : 'bg-slate-900/60 border-slate-800 text-gray-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2 text-left">
                      <div className={`p-1.5 rounded-lg ${gameMode === 'speed' ? 'bg-pink-500/20 text-pink-400' : 'bg-slate-800 text-slate-500'}`}>
                        <Gauge size={16} />
                      </div>
                      <div>
                        <div className="text-[11px] font-black leading-tight">클래식 스피드</div>
                        <span className="text-[9px] text-gray-500 font-bold block leading-none mt-0.5">3바퀴 드리프트</span>
                      </div>
                    </div>
                    {gameMode === 'speed' && <div className="w-1.5 h-1.5 rounded-full bg-pink-500"></div>}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerAudioInit();
                      setGameMode('item');
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                      gameMode === 'item'
                        ? 'bg-yellow-950/10 border-yellow-500 text-white shadow-[0_0_10px_rgba(234,179,8,0.3)]'
                        : 'bg-slate-900/60 border-slate-800 text-gray-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2 text-left">
                      <div className={`p-1.5 rounded-lg ${gameMode === 'item' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-800 text-slate-500'}`}>
                        <ShoppingBag size={16} />
                      </div>
                      <div>
                        <div className="text-[11px] font-black leading-tight">캐주얼 아이템</div>
                        <span className="text-[9px] text-gray-500 font-bold block leading-none mt-0.5">상자 파밍 공격</span>
                      </div>
                    </div>
                    {gameMode === 'item' && <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerAudioInit();
                      setGameMode('time_attack');
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                      gameMode === 'time_attack'
                        ? 'bg-cyan-950/20 border-cyan-400 text-white shadow-[0_0_10px_rgba(34,211,238,0.3)]'
                        : 'bg-slate-900/60 border-slate-800 text-gray-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2 text-left">
                      <div className={`p-1.5 rounded-lg ${gameMode === 'time_attack' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-500'}`}>
                        <Sparkles size={16} />
                      </div>
                      <div>
                        <div className="text-[11px] font-black leading-tight">신기록 경신</div>
                        <span className="text-[9px] text-gray-500 font-bold block leading-none mt-0.5">초긴장 1Lap 승부</span>
                      </div>
                    </div>
                    {gameMode === 'time_attack' && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400"></div>}
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: 차고 & 가구가챠 (GARAGE & GACHA - Col span 5) */}
            <div className="lg:col-span-5 bg-slate-900/80 border-2 border-slate-700/60 rounded-3xl p-5 flex flex-col space-y-4">
              <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800/80">
                <button
                  onClick={() => { triggerAudioInit(); setActiveMenuTab('play'); }}
                  className={`flex-1 flex items-center justify-center space-x-2 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
                    activeMenuTab === 'play' ? 'bg-pink-500 text-slate-950 shadow' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Grid size={14} />
                  <span>내 차고 (My Karts)</span>
                </button>
                <button
                  onClick={() => { triggerAudioInit(); setActiveMenuTab('garage_shop'); }}
                  className={`flex-1 flex items-center justify-center space-x-2 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
                    activeMenuTab === 'garage_shop' ? 'bg-yellow-400 text-slate-950 shadow' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Sparkles className="animate-pulse" size={14} />
                  <span>뽑기 상점 (Gacha)</span>
                </button>
              </div>

              {/* --- GARAGE TAB TAB CONTENT --- */}
              {activeMenuTab === 'play' && (
                <div className="flex flex-col space-y-4">
                  <div className="grid grid-cols-2 gap-3 max-h-[170px] overflow-y-auto pr-1">
                    {KARTS.map((k) => {
                      const isUnlocked = unlockedKarts.includes(k.id);
                      const isEquipped = selectedKartId === k.id;
                      return (
                        <button
                          key={k.id}
                          disabled={!isUnlocked}
                          onClick={() => {
                            triggerAudioInit();
                            setSelectedKartId(k.id);
                          }}
                          className={`relative flex items-center space-x-2 p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                            !isUnlocked 
                              ? 'opacity-40 bg-slate-950/50 border-dashed border-slate-800' 
                              : isEquipped 
                                ? 'bg-pink-950/20 border-pink-500 text-white ring-1 ring-pink-500' 
                                : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {/* Dot indicator matching kart render outline color */}
                          <div className="w-3.5 h-3.5 rounded-full border border-white" style={{ backgroundColor: `#${k.color.toString(16).padStart(6, '0')}` }} />
                          <div className="flex-grow">
                            <span className="text-[11px] font-black block leading-4 truncate">
                              {k.name.split(' (')[0]}
                            </span>
                            <span className={`text-[8px] font-bold block uppercase leading-3 ${k.rarity === 'Legendary' ? 'text-purple-400' : k.rarity === 'Rare' ? 'text-cyan-400' : 'text-gray-400'}`}>
                              {isUnlocked ? k.rarity : 'LOCKED'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* ACTIVE EQUIPPED KART PREVIEW STATS */}
                  <div className="bg-slate-950 border-2 border-slate-800/80 rounded-2xl p-4 flex flex-col space-y-3">
                    <div className="flex justify-between items-start border-b border-white/5 pb-2">
                      <div>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded inline-block uppercase tracking-wider mb-1 ${
                          currentKart.rarity === 'Legendary' ? 'bg-purple-500/20 text-purple-400' : currentKart.rarity === 'Rare' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {currentKart.rarity} 등급 머신
                        </span>
                        <h4 className="text-sm font-black text-white">{currentKart.name}</h4>
                      </div>
                      <div className="w-5 h-5 rounded-full" style={{ backgroundColor: `#${currentKart.color.toString(16).padStart(6, '0')}` }} />
                    </div>

                    <p className="text-[10px] text-slate-400 leading-normal">
                      {currentKart.description}
                    </p>

                    {/* Stats Indicator Rails */}
                    <div className="space-y-2 pt-1 font-mono text-[10px]">
                      <div>
                        <div className="flex justify-between font-bold text-gray-400 mb-1">
                          <span>최고 속도 (MAX SPEED)</span>
                          <span className="text-pink-400 font-bold">{Math.round(currentKart.stats.speed * 100)}%</span>
                        </div>
                        <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                          <div className="h-full bg-pink-500 rounded-full" style={{ width: `${(currentKart.stats.speed / 1.6) * 100}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between font-bold text-gray-400 mb-1">
                          <span>가속 성능 (ACCELERATION)</span>
                          <span className="text-cyan-400 font-bold">{Math.round(currentKart.stats.accel * 10000)} P</span>
                        </div>
                        <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                          <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${(currentKart.stats.accel / 0.04) * 100}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between font-bold text-gray-400 mb-1">
                          <span>충전 속도 (DRIFT CHARGE)</span>
                          <span className="text-yellow-400 font-bold">x{currentKart.stats.drift.toFixed(1)}</span>
                        </div>
                        <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                          <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${(currentKart.stats.drift / 3.0) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* --- GACHA SHOP TAB CONTENT --- */}
              {activeMenuTab === 'garage_shop' && (
                <div className="bg-slate-950 border-2 border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-between text-center min-h-[305px] relative overflow-hidden">
                  <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle, #facc15 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
                  
                  <div className="z-10 w-full flex flex-col items-center">
                    <span className="text-[10px] font-black text-yellow-400 bg-yellow-400/10 px-3 py-1 rounded-full uppercase tracking-widest mb-2 inline-block">
                      NEW TOON KART GACHA
                    </span>
                    <h4 className="text-md font-black text-white">무지개 럭키 가챠 머신</h4>
                    <p className="text-[11px] text-gray-400 mt-1 max-w-[260px] leading-relaxed">
                      1회당 <strong>100 골드</strong>가 소모됩니다. 레전더리 등급의 우주 유니크 머신(최대 속도 가중치 1.55배)을 저격해 탑승해보세요!
                    </p>
                  </div>

                  {/* ACTIVE SLOT SCREEN SHUFFLE DISPLAY */}
                  <div className="my-6 z-10 w-full max-w-[280px]">
                    <div className="bg-slate-900 border-4 border-yellow-500 rounded-2xl py-4 px-6 shadow-inner relative flex justify-center items-center">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/50 pointer-events-none" />
                      
                      {isDrawing ? (
                        <div className="flex flex-col items-center py-2">
                          <div className="text-yellow-400 font-display font-black text-xs animate-bounce uppercase tracking-widest">
                            SHUFFLING
                          </div>
                          <div className="text-white text-lg font-black italic truncate max-w-[220px] font-display comic-text">
                            {gachaIntervalText}
                          </div>
                        </div>
                      ) : drawnKart ? (
                        <div className="flex flex-col items-center w-full animate-fade-in">
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider mb-1 ${
                            drawnKart.rarity === 'Legendary' ? 'bg-purple-500 text-white' : drawnKart.rarity === 'Rare' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-700 text-gray-100'
                          }`}>
                            {drawnKart.rarity}
                          </span>
                          <div className="text-white text-lg font-black italic truncate max-w-[220px] font-display comic-text leading-tight">
                            {drawnKart.name.split(' (')[0]}
                          </div>
                          {drawRefund ? (
                            <span className="text-yellow-400 text-[10px] font-bold mt-1.5 block">
                              중복 획득! 50G 환급 보장!
                            </span>
                          ) : (
                            <span className="text-green-400 text-[10px] font-black mt-1.5 flex items-center">
                              차고에 새로이 등록되었습니다! 🎉
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="py-3 text-slate-500 text-[11px] font-bold">
                          레버를 기다리고 있습니다.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* DRAW BUTTON CLICKS */}
                  <div className="w-full space-y-2">
                    <button
                      type="button"
                      onClick={handleGachaDraw}
                      disabled={isDrawing}
                      className={`w-full py-3.5 px-6 rounded-xl font-black text-sm transition-all text-slate-950 cursor-pointer ${
                        isDrawing 
                          ? 'bg-slate-800 text-slate-600 cursor-not-allowed' 
                          : 'bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 hover:scale-[1.02] shadow-lg shadow-yellow-500/20 active:scale-95'
                      }`}
                    >
                      {isDrawing ? '럭키 스핀 돌아가는 중...' : '100 G 소모하여 뽑기 스핀'}
                    </button>
                    
                    <div className="flex space-x-2 w-full pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          triggerAudioInit();
                          setGold(prev => prev + 500);
                          showHUDNotification('골드 충전 (+500G)', '500G 코인을 획득했습니다! 마음껏 가챠 스핀을 열어보세요!');
                        }}
                        className="flex-1 py-2 px-3 rounded-xl font-bold text-[11px] bg-slate-900 border border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 transition-all active:scale-95 cursor-pointer"
                      >
                        🎁 골드 500G 무료 충전
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          triggerAudioInit();
                          setUnlockedKarts(['pink_thunder']);
                          setSelectedKartId('pink_thunder');
                          setGold(300);
                          setDrawnKart(null);
                          setDrawRefund(false);
                          showHUDNotification('가챠 초기화 완료', '모든 장비 및 골드가 처음 상태로 안전하게 재조정되었습니다.');
                        }}
                        className="py-2 px-3.5 rounded-xl font-bold text-[11px] bg-slate-900 border border-slate-800 text-gray-500 hover:text-gray-300 transition-all active:scale-95 cursor-pointer"
                        title="가챠 진행상황 리셋"
                      >
                        초기화
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* LOWER HUD START RACE ENGINE (Prominent center call to action) */}
          <div className="w-full max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center bg-slate-900 shadow-xl border-x-2 border-t-2 border-pink-500 rounded-t-3xl px-6 md:px-8 py-5 gap-4 mt-4 z-10">
            {/* Assembly Overview text description */}
            <div className="text-center md:text-left">
              <span className="text-[10px] text-pink-400 font-bold tracking-widest block uppercase">READY TO RACING COMPILED</span>
              <h2 className="text-lg font-black text-white flex items-center justify-center md:justify-start space-x-2 leading-6 mt-1">
                <span>{currentMap.name.split(' (')[0]}</span>
                <span className="text-slate-600 font-mono">|</span>
                <span className="text-yellow-300">{currentKart.name.split(' (')[0]}</span>
              </h2>
              <span className="text-xs text-gray-400 block mt-1.5">
                선택된 서킷에서 드라이브하여 골드를 벌고 차고를 해금해 최고 속도 기록을 갱신하세요!
              </span>
            </div>

            {/* Launch Action Button */}
            <button
              onClick={launchRace}
              className="w-full md:w-auto bg-gradient-to-r from-pink-500 via-rose-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white font-black text-md px-10 py-5 rounded-2xl shadow-xl shadow-pink-500/30 flex items-center justify-center space-x-3 transform transition-all hover:scale-[1.03] active:scale-[0.98] cursor-pointer"
            >
              <Play fill="white" size={20} />
              <span className="tracking-widest">초고속 레이스 시작!!</span>
            </button>
          </div>

          {/* BOTTOM QUICK TIP CONTROLS FOOTER */}
          <div className="w-full max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 text-center text-[10px] text-gray-400 border-t border-white/5 mt-auto z-10">
            <div>
              <span className="text-white font-bold block mb-1">가속/조향</span>
              <span>W,A,S,D / 키보드 방향키</span>
            </div>
            <div>
              <span className="text-pink-400 font-bold block mb-1">익스트림 드리프트</span>
              <span>Shift + 방향키 누르고 코너 진입</span>
            </div>
            <div>
              <span className="text-yellow-400 font-bold block mb-1">부스터 & 시전 아이템</span>
              <span>스페이스바 / Ctrl 버튼 타격</span>
            </div>
            <div>
              <span className="text-cyan-400 font-bold block mb-1">시점 즉시 체인지</span>
              <span>V 또는 C 버튼 연속 조작</span>
            </div>
          </div>
        </div>
      )}

      {/* --- COUNTDOWN TRANSITION LAYER --- */}
      {gameState === 'countdown' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 select-none pointer-events-none animate-pulse">
          <div className="font-display font-black text-9xl comic-text text-pink-500 tracking-widest leading-none transform -rotate-6 scale-110">
            {comicPop ? comicPop.text : 'READY'}
          </div>
          <span className="text-[12px] text-pink-400 font-bold uppercase tracking-widest mt-6">
            ★ SYSTEM CORE ALIGNING BOOSTERS ★
          </span>
        </div>
      )}

      {/* --- IN-GAME THREE.JS SIMULATOR LAYER --- */}
      <div 
        ref={canvasContainerRef} 
        className="absolute inset-0 w-full h-full z-0 block"
      />

      {/* --- REAL-TIME IN-GAME USER INTERFACE OVERLAYS --- */}
      {gameState === 'playing' && (
        <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-4 md:p-6 select-none font-sans">
          
          {/* HUD Top Info-bar */}
          <div className="flex justify-between items-start w-full">
            {/* Lap Counter + Realtime formatted timer */}
            <div className="flex flex-col space-y-2.5 pointer-events-auto">
              <div className="bg-black/80 backdrop-blur-md px-4 py-2 rounded-2xl border-2 border-pink-500 flex items-center space-x-3 shadow-lg">
                <span className="text-pink-400 text-xs font-black uppercase tracking-wider font-display">TIME</span>
                <span className="font-display text-xl font-black text-white">{gameTimeFormatted}</span>
              </div>
              <div className="bg-black/80 backdrop-blur-md px-4 py-2 rounded-2xl border-2 border-yellow-400 flex items-center space-x-3 shadow-lg">
                <span className="text-yellow-400 text-xs font-black uppercase tracking-wider font-display">LAP</span>
                <span className="font-display text-lg font-black text-white">{currentLap} / {gameMode === 'time_attack' ? 1 : 3}</span>
              </div>
            </div>

            {/* Quick System Action Controls (Top center) */}
            <div className="flex space-x-3 pointer-events-auto">
              <button 
                onClick={toggleEngineCamera}
                className="bg-slate-900/90 hover:bg-slate-800 px-4 py-2.5 rounded-xl text-xs font-black border border-pink-500/50 flex items-center space-x-2 shadow cursor-pointer transition-colors"
              >
                <Gauge size={14} className="text-pink-400 animate-spin" />
                <span>시점 변환</span>
              </button>
              
              <button 
                onClick={quitRace}
                className="bg-red-950 hover:bg-red-900 px-4 py-2.5 rounded-xl text-xs font-black border-2 border-red-500 flex items-center space-x-2 cursor-pointer shadow transition-all"
              >
                <Flame size={14} className="text-red-400" />
                <span>경기 포기</span>
              </button>
            </div>

            {/* Live positioning Leaderboard sidebar */}
            <div className="bg-black/80 backdrop-blur-md px-4 py-3 rounded-2xl border-2 border-pink-500 w-48 shadow-lg pointer-events-auto">
              <div className="text-[10px] font-black text-pink-400 mb-2 border-b border-white/10 pb-1.5 uppercase tracking-widest">
                REAL-TIME PLACEMENT
              </div>
              
              <div className="space-y-1 text-sm font-bold">
                <div className={`flex justify-between items-center transition-colors ${rPosition === '1st' ? 'text-pink-400' : 'text-gray-400'}`}>
                  <span className="flex items-center">
                    <span className="w-4 h-4 rounded-full bg-pink-500 text-[10px] text-slate-950 text-center inline-block mr-1.5 font-bold leading-4">1</span>
                    플레이어 (나)
                  </span>
                  <span className="font-display font-black">{rPosition}</span>
                </div>
                
                <div className={`flex justify-between items-center transition-colors ${aPosition === '1st' ? 'text-yellow-400' : 'text-gray-400'}`}>
                  <span className="flex items-center">
                    <span className="w-4 h-4 rounded-full bg-yellow-500 text-[10px] text-slate-950 text-center inline-block mr-1.5 font-bold leading-4">2</span>
                    라이벌 (AI)
                  </span>
                  <span className="font-display font-black">{aPosition}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ITEM HUDS OVERLAY SYSTEM IN CENTER BOTTOM */}
          {gameMode === 'item' && (
            <div className="flex flex-col items-center justify-end flex-grow pb-8">
              <div className="flex items-center space-x-4 bg-black/75 backdrop-blur px-5 py-3.5 rounded-3xl border-2 border-yellow-400 shadow-xl pointer-events-auto">
                <div className="relative w-16 h-16 bg-slate-950 rounded-xl border-2 border-yellow-400 flex items-center justify-center neon-border-yellow font-display">
                  {/* Slot Icon representation mapping */}
                  {activeItem === 'booster' && <Zap size={32} className="text-cyan-400 animate-pulse" />}
                  {activeItem === 'shield' && <Trophy size={32} className="text-blue-400 animate-spin" />}
                  {activeItem === 'banana' && <Flame size={32} className="text-yellow-400 rotate-90" />}
                  {activeItem === 'missile' && <Zap size={32} className="text-red-500 animate-ping" />}
                  {!activeItem && <span className="text-slate-700 font-mono text-xl animate-pulse">?</span>}
                  
                  {/* Indicator label */}
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-slate-950 px-2 py-0.5 rounded text-[8px] font-black tracking-widest whitespace-nowrap">
                    SLOT ITEM
                  </span>
                </div>

                <div className="text-left w-36">
                  {activeItem ? (
                    <>
                      <div className="text-xs font-black text-yellow-300">
                        {activeItem === 'booster' ? '만화풍 부스터' : activeItem === 'shield' ? '가디언 실드' : activeItem === 'banana' ? '트랩 바나나' : '유도 미사일'}
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold block leading-normal mt-0.5">
                        {activeItem === 'booster' ? '시속 200km 돌풍 가속' : activeItem === 'shield' ? '전방 충돌 무력화보호' : activeItem === 'banana' ? '후방 트랙 바바나 폭하' : '라이벌 저격 유도 무기'}
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="text-xs font-black text-slate-500">슬롯 비어있음</div>
                      <span className="text-[10px] text-slate-600 block mt-0.5">노란 상자를 먹어주세요.</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* LOWER INTERACTIVES & SPEED CONTROLLERS */}
          <div className="flex justify-between items-end w-full">
            {/* Left Bottom Mini-map Radar side-by-side with Compact Active Booster Stocks */}
            <div className="flex items-end space-x-3 pointer-events-auto">
              <div className="relative bg-black/90 rounded-2xl border-2 border-pink-500 p-2 shadow-lg">
                <canvas ref={minimapCanvasRef} width="140" height="140" className="rounded-xl" />
                <div className="absolute -top-3 left-4 bg-pink-500 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                  TRACK RADAR
                </div>
              </div>

              {/* GAUGE BOOSTER INDICATOR BAR (Speed and Time Attack Modes) */}
              {(gameMode === 'speed' || gameMode === 'time_attack') && (
                <div className="flex flex-col justify-between h-[156px] bg-black/90 p-3 rounded-2xl border-2 border-pink-500 w-36 shadow-lg text-center">
                  <span className="text-[9px] text-pink-400 font-black tracking-wider uppercase border-b border-white/10 pb-1">
                    BOOST CHARGE
                  </span>

                  <div className="flex-grow flex flex-col justify-center space-y-2">
                    <div className="w-full h-4.5 bg-slate-950 rounded-lg overflow-hidden border border-pink-400/50 relative flex items-center justify-center">
                      <div className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-pink-500 via-yellow-400 to-cyan-400 transition-all duration-75" style={{ width: `${boosterGauge}%` }} />
                      <span className="absolute text-[8px] font-black text-white font-mono leading-none">
                        {Math.floor(boosterGauge)}%
                      </span>
                    </div>
                    {boosterStock > 0 && (
                      <span className="bg-red-600 animate-pulse text-[8.5px] font-black text-white tracking-widest py-0.5 px-1.5 rounded uppercase font-mono">
                        BOOST READY!
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] font-mono font-black text-white bg-slate-950 py-1 border border-slate-800 rounded-lg tracking-wider">
                    STOCK: {boosterStock}
                  </span>
                </div>
              )}
            </div>

            {/* COMIC POP CHAT BANNER EFFECTS IN GAMEPLAY (Top Sky region helper overlay) */}
            <AnimatePresence>
              {comicPop && (
                <motion.div 
                  key={comicPop.id}
                  initial={{ scale: 0.5, y: 10, opacity: 0 }}
                  animate={{ scale: [1, 1.2, 1], y: -20, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35 }}
                  className="absolute left-1/2 top-24 -translate-x-1/2 bg-black px-6 py-2 border-4 border-double rounded-full text-center z-40"
                  style={{ borderColor: comicPop.color }}
                >
                  <span className="font-display font-black tracking-widest text-sm comic-text text-white">
                    ⚡ {comicPop.text} ⚡
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Speedometer display */}
            <div className="flex items-center space-x-5 bg-black/90 px-6 py-4 rounded-3xl border-2 border-pink-500 shadow-xl pointer-events-auto">
              <div className="relative flex flex-col items-center">
                <span className="font-display text-5xl font-black text-pink-400 tracking-tighter speedometer-glow">
                  {speedVal}
                </span>
                <span className="text-[9px] text-gray-400 font-bold tracking-widest mt-0.5 font-display">KM/H</span>
              </div>
              <div className="h-14 w-[1.5px] bg-slate-700/60" />
              <div className="flex flex-col text-[9.5px] text-gray-300 font-bold space-y-0.5 leading-normal">
                <div><span className="text-pink-400 font-black">W/S</span> 기기가속 / 제동</div>
                <div><span className="text-yellow-400 font-black">SHIFT</span> 방향드리프트</div>
                <div><span className="text-cyan-400 font-black">SPACE</span> 아이템/부스터</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MOBILE TOUCH CONTROLS PANEL OVERLAY --- */}
      {gameState === 'playing' && (
        <div className="lg:hidden absolute inset-0 z-30 pointer-events-none flex flex-col justify-end p-6 select-none font-sans">
          <div className="flex justify-between items-end w-full">
            
            {/* Steering Arrows Left */}
            <div className="flex space-x-3 pointer-events-auto">
              <button 
                onTouchStart={() => handleTouchControl('ArrowLeft', true)}
                onTouchEnd={() => handleTouchControl('ArrowLeft', false)}
                className="w-16 h-16 rounded-2xl bg-slate-950/90 border-2 border-pink-500 active:bg-pink-500 flex items-center justify-center text-pink-400 text-3xl shadow-xl transition-all"
              >
                <i className="fa-solid fa-arrow-left" />
              </button>

              <button 
                onTouchStart={() => handleTouchControl('ArrowRight', true)}
                onTouchEnd={() => handleTouchControl('ArrowRight', false)}
                className="w-16 h-16 rounded-2xl bg-slate-950/90 border-2 border-pink-500 active:bg-pink-500 flex items-center justify-center text-pink-400 text-3xl shadow-xl transition-all"
              >
                <i className="fa-solid fa-arrow-right" />
              </button>
            </div>

            {/* Actions Trigger Buttons Right */}
            <div className="flex flex-col space-y-3 pointer-events-auto items-end">
              <div className="flex space-x-3">
                <button 
                  onClick={triggerItemSlinger}
                  className="w-16 h-16 rounded-full bg-yellow-400 border-2 border-white flex items-center justify-center text-slate-950 text-2xl font-black shadow-xl animate-pulse"
                >
                  <Zap size={22} />
                </button>
                <button 
                  onTouchStart={() => handleTouchControl('Shift', true)}
                  onTouchEnd={() => handleTouchControl('Shift', false)}
                  className="w-16 h-16 rounded-2xl bg-purple-600 border-2 border-purple-400 flex items-center justify-center text-white text-xs font-black shadow-xl"
                >
                  DRIFT
                </button>
              </div>

              <div className="flex space-x-3">
                <button 
                  onTouchStart={() => handleTouchControl('ArrowDown', true)}
                  onTouchEnd={() => handleTouchControl('ArrowDown', false)}
                  className="w-16 h-16 rounded-2xl bg-red-600/90 border-2 border-red-500 flex items-center justify-center text-white text-2xl shadow-xl hover:bg-slate-800"
                >
                  <i className="fa-solid fa-angle-down" />
                </button>
                <button 
                  onTouchStart={() => handleTouchControl('ArrowUp', true)}
                  onTouchEnd={() => handleTouchControl('ArrowUp', false)}
                  className="w-20 h-20 rounded-2xl bg-pink-500 border-2 border-white flex items-center justify-center text-slate-950 text-4xl shadow-xl"
                >
                  <i className="fa-solid fa-gauge-high" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- FINISH COMPLETED OUTCOME SCREEN OVERLAY --- */}
      {gameState === 'finished' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/95 text-white p-4">
          <div className="bg-gradient-to-b from-[#090d23] to-[#010307] rounded-3xl p-8 border-4 border-pink-500 max-w-lg w-full text-center neon-border relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
            
            <div className={`inline-block px-6 py-2.5 rounded-full font-black text-sm tracking-widest mb-4 uppercase ${
              finishStats.playerWon ? 'bg-yellow-400 text-slate-950 neon-border-yellow' : 'bg-slate-700 text-gray-200'
            }`}>
              {finishStats.playerWon ? '🏆 우승 (VICTORY) 🏆' : '준우승 (FINISH)'}
            </div>

            <h2 className="text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-400 to-pink-500 mb-6 comic-text">
              {finishStats.playerWon ? '경이로운 대승리!' : '체커기 완주 완료!'}
            </h2>

            <div className="space-y-3 mb-8 bg-slate-900/80 p-5 rounded-2xl border border-slate-700/60 text-left font-mono">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">선택한 머신</span>
                <span className="font-extrabold text-white">{currentKart.name}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">최종 랩 기록 (TIME)</span>
                <span className="font-extrabold text-yellow-300 text-sm">{finishStats.finalTimeStr}</span>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-slate-800 pt-2.5">
                <span className="text-pink-400 font-bold flex items-center">
                  <Coins size={14} className="mr-1 text-yellow-400" />
                  획득한 마일리지 골드
                </span>
                <span className="font-extrabold text-green-400 text-md">+{finishStats.earnedGold} Gold</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={launchRace}
                className="flex-1 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 py-3.5 px-6 rounded-2xl text-sm font-black shadow-lg shadow-pink-500/30 cursor-pointer active:scale-95 transition-all"
              >
                다시 달리기 (Retry)
              </button>
              
              <button 
                onClick={() => setGameState('lobby')}
                className="flex-1 bg-slate-800 hover:bg-slate-700 py-3.5 px-6 rounded-2xl text-sm font-black border border-slate-600 cursor-pointer active:scale-95 transition-all"
              >
                차고 대기방으로 (Back)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- HUD ALERT NOTIFICATIONS DIALOG SYSTEM (Bottom layout) --- */}
      <AnimatePresence>
        {alertNotify.show && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="absolute bottom-6 right-6 z-50 bg-slate-900/95 border-2 border-pink-500 rounded-2xl px-5 py-3.5 flex items-center space-x-3 shadow-2xl backdrop-blur select-none pointer-events-none"
          >
            <div className="w-9 h-9 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center text-lg border border-pink-400/30">
              <Info size={16} />
            </div>
            <div>
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{alertNotify.title}</div>
              <div className="text-xs font-black text-white">{alertNotify.message}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
