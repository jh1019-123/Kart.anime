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
  Info,
  Users,
  ShieldCheck,
  Radio,
  User,
  LogOut,
  Target,
  ChevronRight,
  HelpCircle,
  Copy,
  Check,
  MapPin,
  Keyboard
} from 'lucide-react';
import { KARTS, MAPS } from './data';
import { KartInfo, MapInfo, Participant, RaceOutcome } from './types';
import { GameEngine, AudioEngine } from './lib/gameEngine';
import { PeerNetworkManager } from './network';

export default function App() {
  // --- Persistent Storage State ---
  const [gold, setGold] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('anime_gold');
      return saved ? parseInt(saved, 10) : 300;
    } catch (e) {
      return 300;
    }
  });
  const [unlockedKarts, setUnlockedKarts] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('anime_unlocked_karts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed as string[];
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
  // Reorganized lobby as unified full-width tabs
  const [activeMenuTab, setActiveMenuTab] = useState<'garage' | 'maps' | 'modes' | 'gacha' | 'multiplayer' | 'guide'>('garage');
  const [gameState, setGameState] = useState<'lobby' | 'countdown' | 'playing' | 'finished'>('lobby');
  const [gameMode, setGameMode] = useState<'speed' | 'item' | 'time_attack' | 'ten_laps' | 'super_nitro'>('speed');
  const [leaderboard, setLeaderboard] = useState<Array<{
    id: string;
    playerName: string;
    mapName: string;
    gameMode: string;
    kartName: string;
    finalTimeStr: string;
    finalTimeMs: number;
    date: string;
    isPlayer: boolean;
  }>>([]);

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

  // --- Real-Time P2P Network states ---
  const [netRole, setNetRole] = useState<'host' | 'client' | null>(null);
  const [roomIdInput, setRoomIdInput] = useState<string>('');
  const [roomIdLive, setRoomIdLive] = useState<string>('');
  const [playerNameInput, setPlayerNameInput] = useState<string>(() => {
    return localStorage.getItem('network_player_name') || '슈퍼라이더#' + Math.floor(Math.random() * 900 + 100);
  });
  const [netStatus, setNetStatus] = useState<string>('연결되지 않음');
  const [netError, setNetError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isMultiplayerActive, setIsMultiplayerActive] = useState<boolean>(false);
  const [latestMultiplayerOutcomes, setLatestMultiplayerOutcomes] = useState<RaceOutcome[]>([]);

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
  const [filterMap, setFilterMap] = useState<string>('All');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

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
  const netManagerRef = useRef<PeerNetworkManager | null>(null);

  // Sync to Storage
  useEffect(() => {
    localStorage.setItem('anime_gold', gold.toString());
  }, [gold]);

  useEffect(() => {
    localStorage.setItem('anime_unlocked_karts', JSON.stringify(unlockedKarts));
  }, [unlockedKarts]);

  useEffect(() => {
    localStorage.setItem('anime_selected_kart', selectedKartId);
    if (netManagerRef.current) {
      netManagerRef.current.updateMyStatus({ kartId: selectedKartId });
    }
  }, [selectedKartId]);

  useEffect(() => {
    localStorage.setItem('anime_selected_map', selectedMapId);
  }, [selectedMapId]);

  useEffect(() => {
    localStorage.setItem('network_player_name', playerNameInput);
  }, [playerNameInput]);

  // Load Leaderboard
  useEffect(() => {
    const cached = localStorage.getItem('kart_rider_leaderboard');
    if (cached) {
      setLeaderboard(JSON.parse(cached));
    } else {
      const defaultLeaderboard = [
        { id: 'rival-1', playerName: 'DAO (다오)', mapName: '네온 스카이 웨이', gameMode: '스피드전', kartName: '플라스마 카트', finalTimeStr: '01:04.12', finalTimeMs: 64120, date: '2126.05.28', isPlayer: false },
        { id: 'rival-2', playerName: 'DIZNI (디지니)', mapName: '사이스페이스 터널', gameMode: '아이템전', kartName: '레트로 브리즈', finalTimeStr: '01:12.35', finalTimeMs: 72350, date: '2126.05.27', isPlayer: false },
        { id: 'rival-3', playerName: 'NEO (네오)', mapName: '코스믹 하이웨이', gameMode: '타임어택', kartName: '네온 페라리', finalTimeStr: '01:32.88', finalTimeMs: 92880, date: '2126.05.29', isPlayer: false },
        { id: 'rival-4', playerName: 'ETU (에투)', mapName: '마그마 크레비스', gameMode: '10바퀴 레이스', kartName: '네온 페라리', finalTimeStr: '08:20.40', finalTimeMs: 500400, date: '2126.05.25', isPlayer: false },
        { id: 'rival-5', playerName: 'BRODI (브로디)', mapName: '아이스 윈드 캠프', gameMode: '무제한 부스터', kartName: '커먼핑크', finalTimeStr: '01:05.21', finalTimeMs: 65210, date: '2126.05.29', isPlayer: false },
      ];
      localStorage.setItem('kart_rider_leaderboard', JSON.stringify(defaultLeaderboard));
      setLeaderboard(defaultLeaderboard);
    }
  }, []);

  const triggerAudioInit = () => {
    AudioEngine.init();
  };

  const showHUDNotification = (title: string, message: string) => {
    setAlertNotify({ title, message, show: true });
    setTimeout(() => {
      setAlertNotify(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  const triggerComicTextPop = (text: string, styleColor = '#f43f5e') => {
    setComicPop({ text, color: styleColor, id: Date.now() });
  };

  const currentKart = KARTS.find(k => k.id === selectedKartId) || KARTS[0];
  const currentMap = MAPS.find(m => m.id === selectedMapId) || MAPS[0];

  // --- Network Event Listeners & Setups ---
  const handleHostCreate = () => {
    triggerAudioInit();
    if (!playerNameInput.trim()) {
      alert('이름을 입력해주세요!');
      return;
    }
    setNetError(null);
    setLatestMultiplayerOutcomes([]);

    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    const netManager = new PeerNetworkManager(playerNameInput);
    netManagerRef.current = netManager;

    netManager.onConnectionStatus = (status) => setNetStatus(status);
    netManager.onPeerError = (err) => setNetError(err);
    netManager.onParticipantsChange = (list) => setParticipants(list);
    netManager.onRoomIdAssigned = (assignedId) => setRoomIdLive(assignedId);
    
    netManager.onOutcomeReceived = (outcome) => {
      setLatestMultiplayerOutcomes(prev => {
        const next = prev.filter(x => x.peerId !== outcome.peerId);
        return [...next, outcome].sort((a,b) => (a.finalTime || 999999) - (b.finalTime || 999999));
      });
      showHUDNotification('경기 완주 보고 수신!', `${outcome.name} 학생이 완주를 보고했습니다.`);
    };

    netManager.init('host', code);
    setNetRole('host');
  };

  const handleClientJoin = () => {
    triggerAudioInit();
    if (!playerNameInput.trim()) {
      alert('이름을 입력해주세요!');
      return;
    }
    if (!roomIdInput.trim()) {
      alert('참여 코드를 입력해주세요!');
      return;
    }
    setNetError(null);
    setLatestMultiplayerOutcomes([]);

    const cleanCode = roomIdInput.trim();
    const netManager = new PeerNetworkManager(playerNameInput);
    netManagerRef.current = netManager;

    netManager.onConnectionStatus = (status) => setNetStatus(status);
    netManager.onPeerError = (err) => setNetError(err);
    netManager.onParticipantsChange = (list) => setParticipants(list);
    netManager.onRoomIdAssigned = (assignedId) => setRoomIdLive(assignedId);
    
    netManager.onGameStartReceived = (mapId, mode) => {
      setSelectedMapId(mapId);
      const matchedMode = mode as any;
      if (['speed','item','time_attack','ten_laps','super_nitro'].includes(matchedMode)) {
        setGameMode(matchedMode);
      }
      setIsMultiplayerActive(true);
      launchRace(true);
    };

    netManager.init('client', cleanCode);
    setNetRole('client');
  };

  const handleDisconnectNetwork = () => {
    triggerAudioInit();
    if (netManagerRef.current) {
      netManagerRef.current.cleanup();
      netManagerRef.current = null;
    }
    setNetRole(null);
    setRoomIdLive('');
    setParticipants([]);
    setLatestMultiplayerOutcomes([]);
    setNetStatus('연결 해제됨');
    setIsMultiplayerActive(false);
  };

  const copyRoomCode = () => {
    if (!roomIdLive) return;
    navigator.clipboard.writeText(roomIdLive);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    showHUDNotification('참여코드 복사됨', `방 번호 [ ${roomIdLive} ] 가 복사되었습니다.`);
  };

  // Keyboard controls keydown
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      triggerAudioInit();
      const k = e.key;
      keysPressedRef.current[k] = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(k)) {
        e.preventDefault();
      }
      
      if (k === ' ' || k === 'Control') {
        e.preventDefault();
        triggerItemSlinger();
      }

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
  }, [gameState, activeItem, boosterStock, gameMode, isMultiplayerActive]);

  // Canvas layout resize
  useEffect(() => {
    const handleResize = () => {
      if (engineRef.current) {
        engineRef.current.resize();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Reactively trigger BGM
  useEffect(() => {
    if (gameState === 'playing' || gameState === 'countdown') {
      AudioEngine.playBGM(selectedMapId);
    } else {
      AudioEngine.stopBGM();
    }
    return () => {
      AudioEngine.stopBGM();
    };
  }, [gameState, selectedMapId]);

  // In-Game 60 FPS Loop
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

    let frameCount = 0;

    const loop = () => {
      if (engineRef.current && gameState === 'playing') {
        engineRef.current.update(keysPressedRef.current, currentKart.stats.drift);

        const instance = engineRef.current;
        setRivalProgress(instance.aiProgress);
        const nearestT = instance.getNearestTrackSplinePoint(instance.playerKart.mesh.position);
        setPlayerProgress(nearestT);
        setShieldActive(instance.shieldActive);

        const timeElapsed = instance.timer;
        const mins = Math.floor(timeElapsed / 60000);
        const secs = Math.floor((timeElapsed % 60000) / 1000);
        const mils = Math.floor((timeElapsed % 1000) / 10);
        const currentFmtTime = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${mils.toString().padStart(2, '0')}`;
        setGameTimeFormatted(currentFmtTime);

        if (isMultiplayerActive && netManagerRef.current) {
          frameCount++;
          if (frameCount % 4 === 0) {
            const pMesh = instance.playerKart.mesh;
            const myPos = pMesh.position;
            const myRotY = pMesh.rotation.y;
            const myDriftAngle = instance.driftAngle;
            const myIsDrifting = instance.isDrifting;
            const myLap = instance.playerKart.lap;
            const mySpeed = Math.round(instance.playerKart.speed * 85);

            if (netRole === 'client') {
              netManagerRef.current.clientSendTelemetry(
                myLap,
                mySpeed,
                myPos.x,
                myPos.y,
                myPos.z,
                myRotY,
                myDriftAngle,
                myIsDrifting,
                nearestT
              );
            } else if (netRole === 'host') {
              netManagerRef.current.hostSendTelemetry(
                myLap,
                mySpeed,
                myPos.x,
                myPos.y,
                myPos.z,
                myRotY,
                myDriftAngle,
                myIsDrifting,
                nearestT
              );
            }
          }

          instance.updateMultiplayerPositions(
            netManagerRef.current.participants,
            netManagerRef.current.myInfo.peerId,
            isMultiplayerActive
          );
        }

        if (minimapCanvasRef.current) {
          instance.drawMinimap(minimapCanvasRef.current);
        }

        instance.render();
      }
      animationFrameIdRef.current = requestAnimationFrame(loop);
    };

    animationFrameIdRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [gameState, currentKart, isMultiplayerActive, netRole]);

  // --- Start Racing Sequencer ---
  const launchRace = (forceStart = false) => {
    triggerAudioInit();
    
    if (netRole === 'host' && !forceStart) {
      if (netManagerRef.current) {
        netManagerRef.current.hostStartGame(selectedMapId, gameMode);
      }
      setIsMultiplayerActive(true);
    }

    setGameState('countdown');
    setCurrentLap(1);
    setSpeedVal(0);
    setBoosterGauge(0);
    setBoosterStock(0);
    setActiveItem(null);
    setShieldActive(false);

    let count = 3;
    triggerComicTextPop(`${count}`, '#eab308');
    AudioEngine.playItemPickup();

    const timer = setInterval(() => {
      count--;
      if (count > 0) {
        triggerComicTextPop(`${count}`, '#eab308');
        AudioEngine.playItemPickup();
      } else {
        triggerComicTextPop('GO!', '#f43f5e');
        AudioEngine.playBoost();
        
        if (canvasContainerRef.current) {
          if (engineRef.current) {
            engineRef.current.cleanup();
          }

          engineRef.current = new GameEngine(
            canvasContainerRef.current,
            currentMap,
            currentKart.color,
            currentKart.flameColor,
            0xfacc15,
            currentKart.stats,
            (lap) => {
              setCurrentLap(lap);
              triggerComicTextPop(`LAP ${lap}!`, '#22d3ee');
              const finalLapNumber = gameMode === 'time_attack' ? 1 : gameMode === 'ten_laps' ? 10 : 3;
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
              showHUDNotification('충돌 발생!', '트랩 타격 또는 외벽 충돌로 속도가 저하됩니다.');
            }
          );

          if (gameMode === 'time_attack') {
            engineRef.current.maxLaps = 1;
          } else if (gameMode === 'ten_laps') {
            engineRef.current.maxLaps = 10;
          } else {
            engineRef.current.maxLaps = 3;
          }

          engineRef.current.isSuperNitro = gameMode === 'super_nitro';
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
    let baseGold = playerWon ? 45 : 20;
    const timeInSec = finalTime / 1000;
    const speedBonus = Math.max(0, Math.floor(35 - timeInSec));
    const finalGoldAwarded = Math.min(70, baseGold + speedBonus);

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

    if (isMultiplayerActive && netManagerRef.current && netRole === 'client') {
      netManagerRef.current.clientSubmitOutcome({
        name: playerNameInput,
        kartName: currentKart.name,
        finalTime: finalTime,
        finished: true,
        driftCount: 6,
        boostersUsed: 4,
        maxSpeed: 185,
      });
      showHUDNotification('경기결과 보고 전송!', '방장(선생님) 대시보드로 자가 기록을 통계 보고했습니다.');
    }

    try {
      const modeMap: Record<string, string> = {
        speed: '스피드전',
        item: '아이템전',
        time_attack: '타임어택',
        ten_laps: '10바퀴 레이스',
        super_nitro: '무제한 부스터'
      };
      const todayStr = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\s/g, '').slice(0, -1);
      
      const newPlayerRecord = {
        id: `player-${Date.now()}`,
        playerName: `${playerNameInput} (나)`,
        mapName: currentMap.name.split(' (')[0],
        gameMode: modeMap[gameMode] || gameMode,
        kartName: currentKart.name,
        finalTimeStr: timeStr,
        finalTimeMs: finalTime,
        date: todayStr,
        isPlayer: true
      };

      const currentLeaderboard = JSON.parse(localStorage.getItem('kart_rider_leaderboard') || '[]');
      const sorted = [newPlayerRecord, ...currentLeaderboard].sort((a, b) => a.finalTimeMs - b.finalTimeMs).slice(0, 40);
      localStorage.setItem('kart_rider_leaderboard', JSON.stringify(sorted));
      setLeaderboard(sorted);
    } catch (e) {
      console.error(e);
    }

    if (engineRef.current) {
      engineRef.current.cleanup();
      engineRef.current = null;
    }
  };

  const triggerItemAcquisition = () => {
    if (activeItem) return;
    AudioEngine.playItemPickup();
    triggerComicTextPop('ITEM BOX', '#eab308');

    const itemList = ['booster', 'shield', 'banana', 'missile'];
    const rolledItem = itemList[Math.floor(Math.random() * itemList.length)];
    setActiveItem(rolledItem);
  };

  const triggerItemSlinger = () => {
    if (gameState !== 'playing') return;

    if (gameMode !== 'item') {
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
    setIsMultiplayerActive(false);
  };

  const handleGachaDraw = () => {
    try {
      triggerAudioInit();
      if (gold < 100) {
        showHUDNotification('골드 부족', '가챠를 위한 골드가 부족합니다! 주행을 완수하여 골드를 획득하세요.');
        return;
      }

      setIsDrawing(true);
      setDrawnKart(null);
      setDrawRefund(false);
      setGold(prev => prev - 100);

      let counter = 0;
      const interval = setInterval(() => {
        try {
          const randomKart = KARTS[Math.floor(Math.random() * KARTS.length)];
          setGachaIntervalText(randomKart.name.split(' (')[0]);
          counter++;

          AudioEngine.playShuffleTick();

          if (counter > 15) {
            clearInterval(interval);
            
            const roll = Math.random() * 100;
            let finalKart: KartInfo;
            if (roll < 10) {
              finalKart = KARTS.find(k => k.rarity === 'Legendary') || KARTS[KARTS.length - 1];
            } else if (roll < 55) {
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
              setGold(prev => prev + 50);
            } else {
              setUnlockedKarts(prev => [...prev, finalKart.id]);
            }
            setIsDrawing(false);
          }
        } catch (e) {
          clearInterval(interval);
          setIsDrawing(false);
        }
      }, 110);
    } catch (e) {
      setIsDrawing(false);
    }
  };

  const rPosition = rivalProgress >= playerProgress ? '2위' : '1위';
  const aPosition = rivalProgress >= playerProgress ? '1위' : '2위';

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#030408] text-white">
      {/* Anime adrenaline Speed Line visual backdrop */}
      <AnimatePresence>
        {gameState === 'playing' && speedVal > 115 && (
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

      {/* --- MAIN LOBBY NAVIGATION CONTROL PANEL --- */}
      {gameState === 'lobby' && (
        <div className="absolute inset-0 z-50 flex flex-col justify-between bg-gradient-to-br from-[#e0f2fe] via-[#bae6fd] to-[#f0f9ff] px-4 md:px-8 py-4 overflow-y-auto">
          {/* Subtle anime comic pattern background & floating white clouds */}
          <div className="absolute inset-x-0 top-0 bottom-0 overflow-hidden pointer-events-none opacity-40">
            <div className="absolute top-[8%] left-[12%] w-64 h-16 bg-white/80 rounded-full filter blur-md animate-pulse" style={{ animationDuration: '8s' }} />
            <div className="absolute top-[28%] right-[10%] w-80 h-20 bg-white/70 rounded-full filter blur-lg animate-pulse" style={{ animationDuration: '14s' }} />
            <div className="absolute bottom-[22%] left-[30%] w-[420px] h-24 bg-white/60 rounded-full filter blur-md animate-pulse" style={{ animationDuration: '18s' }} />
          </div>
          <div className="absolute inset-0 opacity-15 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #0284c7 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}></div>
          
          {/* TOP HEADER STATUS ROW */}
          <div className="flex flex-col md:flex-row justify-between items-center w-full max-w-7xl mx-auto gap-4 z-10 py-2 border-b border-slate-800">
            <div className="text-center md:text-left transform -rotate-1">
              <h1 className="text-3xl md:text-4.5xl font-black italic tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-yellow-400 to-cyan-400 font-display comic-text">
                KART-RIDER <span className="text-yellow-400 font-black">ANIME</span>
              </h1>
              <p className="text-cyan-405 text-cyan-400 text-[10px] font-black uppercase tracking-widest mt-0.5">
                ⚡ 초고속 실시간 멀티플레이어 레이싱 ⚡
              </p>
            </div>

            {/* User nickname card & Gold displays */}
            <div className="flex items-center space-x-3 bg-slate-900/90 border-2 border-slate-705 p-2 rounded-2xl shadow-lg">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-500 flex items-center justify-center text-white font-bold shadow-md">
                <Trophy size={15} />
              </div>
              <div className="text-left font-mono">
                <div className="text-[10px] text-gray-400 font-bold uppercase flex items-center">
                  <User size={10} className="mr-1 text-pink-500" />
                  <input 
                    type="text" 
                    value={playerNameInput}
                    onChange={(e) => setPlayerNameInput(e.target.value)}
                    className="bg-transparent text-white outline-none border-b border-dashed border-pink-500/40 focus:border-pink-500 font-semibold py-0.5 text-xs w-32"
                    placeholder="라이더 이름"
                  />
                </div>
                <div className="flex items-center text-yellow-350 text-yellow-400 font-black text-md">
                  <Coins className="mr-1 text-yellow-400" size={14} />
                  <span>{gold} Gold</span>
                </div>
              </div>
            </div>
          </div>

          {/* DYNAMIC TAB NAVIGATION BAR */}
          <div className="w-full max-w-7xl mx-auto z-10 my-4">
            <div className="flex flex-wrap bg-slate-950 p-1.5 rounded-2xl border border-slate-800/90 gap-1.5 justify-center md:justify-start">
              <button
                type="button"
                onClick={() => { triggerAudioInit(); setActiveMenuTab('garage'); }}
                className={`flex items-center space-x-2 py-2 px-3.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                  activeMenuTab === 'garage' 
                    ? 'bg-pink-500 text-slate-950 shadow-[0_0_12px_rgba(244,63,94,0.45)]' 
                    : 'text-gray-400 hover:text-white hover:bg-slate-900/40'
                }`}
              >
                <Trophy size={14} />
                <span>차고 기어</span>
              </button>

              <button
                type="button"
                onClick={() => { triggerAudioInit(); setActiveMenuTab('maps'); }}
                className={`flex items-center space-x-2 py-2 px-3.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                  activeMenuTab === 'maps' 
                    ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.45)]' 
                    : 'text-gray-400 hover:text-white hover:bg-slate-900/40'
                }`}
              >
                <Compass size={14} />
                <span>트랙 맵 선택</span>
              </button>

              <button
                type="button"
                onClick={() => { triggerAudioInit(); setActiveMenuTab('modes'); }}
                className={`flex items-center space-x-2 py-2 px-3.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                  activeMenuTab === 'modes' 
                    ? 'bg-orange-500 text-slate-950 shadow-[0_0_12px_rgba(249,115,22,0.45)]' 
                    : 'text-gray-400 hover:text-white hover:bg-slate-900/40'
                }`}
              >
                <Flame size={14} />
                <span>인게임 모드</span>
              </button>

              <button
                type="button"
                onClick={() => { triggerAudioInit(); setActiveMenuTab('gacha'); }}
                className={`flex items-center space-x-2 py-2 px-3.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                  activeMenuTab === 'gacha' 
                    ? 'bg-yellow-405 bg-yellow-450 bg-yellow-400 text-slate-950 shadow-[0_0_12px_rgba(234,179,8,0.45)]' 
                    : 'text-gray-400 hover:text-white hover:bg-slate-900/40'
                }`}
              >
                <Sparkles size={14} />
                <span>뽑기 상점</span>
              </button>

              <button
                type="button"
                onClick={() => { triggerAudioInit(); setActiveMenuTab('multiplayer'); }}
                className={`flex items-center space-x-2 py-2 px-3.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                  activeMenuTab === 'multiplayer' 
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.5)]' 
                    : 'text-cyan-400 hover:text-white hover:bg-slate-900/40'
                }`}
              >
                <Radio size={14} className="animate-pulse" />
                <span>멀티 대전 (P2P)</span>
              </button>

              <button
                type="button"
                onClick={() => { triggerAudioInit(); setActiveMenuTab('guide'); }}
                className={`flex items-center space-x-2 py-2 px-3.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                  activeMenuTab === 'guide' 
                    ? 'bg-slate-700 text-white shadow' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Info size={14} />
                <span>가이드</span>
              </button>
            </div>
          </div>

          {/* MAIN TABBED CONTROLLER WORKSPACE */}
          <div className="w-full max-w-7xl mx-auto flex-1 z-10 my-1 min-h-[350px] flex flex-col justify-stretch">
            <AnimatePresence mode="wait">
              
              {/* === TAB 1: GARAGE (차고) === */}
              {activeMenuTab === 'garage' && (
                <motion.div
                  key="garage"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-stretch"
                >
                  {/* Left sub-rhythm: Selection list */}
                  <div className="lg:col-span-5 bg-slate-900/80 border-2 border-slate-700/60 rounded-3xl p-5 flex flex-col space-y-4 shadow-xl">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <h3 className="text-sm font-black text-pink-400 flex items-center space-x-2">
                        <Trophy size={16} />
                        <span>내 차고 기어 리스트</span>
                      </h3>
                      <span className="text-[10px] text-gray-405 text-gray-400 font-mono">가챠 소유권: {unlockedKarts.length} / {KARTS.length}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
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
                            className={`p-3 rounded-2xl border text-left cursor-pointer transition-all flex flex-col justify-between h-[85px] relative overflow-hidden ${
                              !isUnlocked 
                                ? 'opacity-35 bg-slate-950/80 border-slate-900 cursor-not-allowed' 
                                : isEquipped 
                                  ? 'bg-pink-950/25 border-pink-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.3)]' 
                                  : 'bg-slate-950 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="text-xs font-black truncate max-w-[130px]">{k.name}</span>
                              <div className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: `#${k.color.toString(16).padStart(6, '0')}` }} />
                            </div>

                            <div className="flex justify-between items-end mt-2">
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                                k.rarity === 'Legendary' ? 'bg-purple-900/30 text-purple-400 border border-purple-800/40' : k.rarity === 'Rare' ? 'bg-cyan-900/30 text-cyan-400 border border-cyan-800/40' : 'bg-slate-800 text-slate-400'
                              }`}>
                                {isUnlocked ? k.rarity : '미획득 LC'}
                              </span>
                              {isUnlocked && isEquipped && (
                                <span className="bg-pink-500 text-slate-950 text-[8px] font-black px-1.5 rounded uppercase font-mono tracking-widest scale-95 origin-right">
                                  EQUIPPED
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right sub-rhythm: Detailed radar status metrics with visual meters */}
                  <div className="lg:col-span-7 bg-slate-900/80 border-2 border-slate-700/60 rounded-3xl p-6 flex flex-col justify-between shadow-xl">
                    <div className="border-b border-white/5 pb-3">
                      <div className="flex items-center justify-between">
                        <span className={`text-[9px] font-black px-2.5 py-0.5 rounded uppercase tracking-wider ${
                          currentKart.rarity === 'Legendary' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : currentKart.rarity === 'Rare' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {currentKart.rarity} 등급 카트바디
                        </span>
                        <div className="flex items-center space-x-1.5 text-xs text-gray-400">
                          <span className="font-bold">기어 컬러:</span>
                          <span className="w-4 h-4 rounded-full border border-white/40 shadow" style={{ backgroundColor: `#${currentKart.color.toString(16).padStart(6, '0')}` }} />
                        </div>
                      </div>
                      <h4 className="text-xl font-black text-white mt-1.5 flex items-center">
                        <Gauge className="mr-2 text-pink-500" size={18} />
                        <span>{currentKart.name}</span>
                      </h4>
                      <p className="text-xs text-slate-300 mt-2 leading-relaxed h-[42px] overflow-hidden">
                        {currentKart.description}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4 font-mono">
                      {/* Metric 1 */}
                      <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-850">
                        <div className="flex justify-between items-center text-xs font-bold mb-1.5 text-gray-400">
                          <span>최고 가속도 성능 (MAX ENTRANCE)</span>
                          <span className="text-pink-400 font-black">{(currentKart.stats.speed * 180).toFixed(0)} km/h</span>
                        </div>
                        <div className="h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                          <div className="h-full bg-pink-500 rounded-full" style={{ width: `${(currentKart.stats.speed / 1.7) * 100}%` }} />
                        </div>
                      </div>

                      {/* Metric 2 */}
                      <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-850">
                        <div className="flex justify-between items-center text-xs font-bold mb-1.5 text-gray-400">
                          <span>추진 가속력 (ACCELERATION)</span>
                          <span className="text-cyan-400 font-black">{(currentKart.stats.accel * 10000).toFixed(0)} CP</span>
                        </div>
                        <div className="h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                          <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${(currentKart.stats.accel / 0.04) * 100}%` }} />
                        </div>
                      </div>

                      {/* Metric 3 */}
                      <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-850">
                        <div className="flex justify-between items-center text-xs font-bold mb-1.5 text-gray-400">
                          <span>드리프트 충전력 (DRIFT ACCEL)</span>
                          <span className="text-yellow-400 font-black">{(currentKart.stats.drift * 50).toFixed(0)} DP</span>
                        </div>
                        <div className="h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                          <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${(currentKart.stats.drift / 3.0) * 100}%` }} />
                        </div>
                      </div>

                      {/* Metric 4 */}
                      <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-850">
                        <div className="flex justify-between items-center text-xs font-bold mb-1.5 text-gray-400">
                          <span>코너링 탈출 감도 (HANDLING RATE)</span>
                          <span className="text-purple-400 font-black">{(currentKart.stats.handling * 1000).toFixed(0)} HP</span>
                        </div>
                        <div className="h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                          <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(currentKart.stats.handling / 0.051) * 100}%` }} />
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-950/80 rounded-2xl p-2 px-4 border border-dashed border-slate-850 flex justify-between items-center text-[10.5px]">
                      <span className="text-gray-450 text-gray-400 font-medium">선택한 카트는 레이싱 중 실시간 3D 가속도 모델로 구현됩니다.</span>
                      <span className="text-pink-500 font-black">★ ACTIVE RETAINED</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* === TAB 2: MAP SLECTION (맵 선택) === */}
              {activeMenuTab === 'maps' && (
                <motion.div
                  key="maps"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-slate-900/80 border-2 border-slate-700/60 rounded-3xl p-5 shadow-xl w-full flex flex-col justify-between"
                >
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/5 pb-2 mb-4 gap-2">
                    <div>
                      <h3 className="text-md font-black text-cyan-400 flex items-center space-x-2">
                        <Compass size={18} />
                        <span>레이싱 트랙 맵 월드 (Select Track Layout)</span>
                      </h3>
                      <p className="text-[11px] text-gray-400 mt-0.5 font-sans">
                        다채로운 3D Catmull-Rom 경로 생성기를 따라 라이벌 혹은 학생들과의 스피스 스피너를 즐길 트랙 서킷을 선택하세요.
                      </p>
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono font-bold tracking-widest uppercase bg-slate-955 px-3 py-1 bg-slate-950 border border-slate-800 rounded-full">
                      MAPS CATALOG: {MAPS.length} CIRCUITS
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {MAPS.map((m) => {
                      const isSelected = selectedMapId === m.id;
                      const difficultyColor = m.difficulty === '★★★' ? 'text-red-500' : m.difficulty === '★★☆' ? 'text-yellow-400' : 'text-green-450 text-green-400';
                      return (
                        <button
                          key={m.id}
                          onClick={() => {
                            triggerAudioInit();
                            setSelectedMapId(m.id);
                          }}
                          className={`relative flex flex-col justify-between text-left p-4 bg-slate-950 rounded-2xl border-2 transition-all min-h-[190px] cursor-pointer group hover:-translate-y-0.5 ${
                            isSelected 
                              ? 'border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.35)] bg-cyan-950/15' 
                              : 'border-slate-800/80 hover:border-slate-600 hover:bg-slate-900'
                          }`}
                        >
                          {/* Colored background layout element */}
                          <div className={`absolute top-0 right-0 w-20 h-20 rounded-full blur-xl opacity-3 group-hover:scale-125 transition-all bg-${m.themeColor}/10`} />

                          <div className="z-10 w-full">
                            <div className="flex justify-between items-center mb-1.5">
                              <span className={`text-[8.5px] font-mono font-bold tracking-widest uppercase ${difficultyColor}`}>
                                난이도: {m.difficulty}
                              </span>
                            </div>
                            <h4 className="text-sm font-black text-white group-hover:text-cyan-300 transition-colors leading-snug">
                              {m.name.split(' (')[0]}
                            </h4>
                            <p className="text-[10.5px] text-slate-400 mt-2 lines-clamp-4 leading-normal font-sans font-medium">
                              {m.description}
                            </p>
                          </div>

                          <div className="mt-4 flex items-center justify-between z-10 w-full pt-2 border-t border-white/5">
                            <span className="text-[9px] text-slate-500 font-semibold tracking-wider font-mono">3D CATMULL</span>
                            {isSelected ? (
                              <span className="bg-cyan-400 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded shadow">
                                PREPARED
                              </span>
                            ) : (
                              <span className="text-[9px] text-gray-500 font-bold group-hover:text-cyan-400/80 transition-colors flex items-center">
                                선택하기 <ChevronRight size={10} className="ml-0.5" />
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* === TAB 3: RACING MODES (게임 시작 모드 선택) === */}
              {activeMenuTab === 'modes' && (
                <motion.div
                  key="modes"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-slate-900/80 border-2 border-slate-700/60 rounded-3xl p-5 shadow-xl w-full flex flex-col justify-between"
                >
                  <div className="border-b border-white/5 pb-2 mb-4">
                    <h3 className="text-md font-black text-orange-500 flex items-center space-x-2">
                      <Flame size={18} className="text-orange-500 animate-pulse" />
                      <span>원하는 레이싱 게임 대결 모드 설정 (In-Game Rules)</span>
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      각 모드는 3D 물리 서브엔진 트랙 내에서 서로 다른 가속도 배율, 트랩 획득 여부, 또는 랩 수가 상이하게 적용됩니다.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {/* Mode 1 */}
                    <button
                      type="button"
                      onClick={() => { triggerAudioInit(); setGameMode('speed'); }}
                      className={`flex flex-col justify-between p-4.5 p-4 rounded-2xl border-2 cursor-pointer transition-all text-left min-h-[170px] ${
                        gameMode === 'speed' 
                          ? 'bg-pink-950/25 border-pink-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.3)]' 
                          : 'bg-slate-950 border-slate-800/80 text-gray-400 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      <div>
                        <span className="text-[9px] font-black tracking-widest text-pink-500 block uppercase mb-1">STABLE SPEED</span>
                        <h4 className="text-sm font-black text-white">클래식 스피드전</h4>
                        <p className="text-[10px] text-slate-450 text-slate-400 mt-2 leading-relaxed">
                          3바퀴를 순수한 드리프트 및 수동 파워 부스터만으로 완주합니다. 극한의 코너 공략 능력을 측정합니다.
                        </p>
                      </div>
                      <span className="text-[9px] font-mono text-slate-500 font-black block mt-2">⏱️ 3바퀴 제한 완주</span>
                    </button>

                    {/* Mode 2 */}
                    <button
                      type="button"
                      onClick={() => { triggerAudioInit(); setGameMode('item'); }}
                      className={`flex flex-col justify-between p-4.5 p-4 rounded-2xl border-2 cursor-pointer transition-all text-left min-h-[170px] ${
                        gameMode === 'item' 
                          ? 'bg-yellow-955 bg-yellow-950/20 border-yellow-500 text-white shadow-[0_0_12px_rgba(234,179,8,0.3)]' 
                          : 'bg-slate-950 border-slate-800/80 text-gray-300 hover:border-slate-705 text-gray-450 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      <div>
                        <span className="text-[9px] font-black tracking-widest text-yellow-500 block uppercase mb-1">ITEM CRASH</span>
                        <h4 className="text-sm font-black text-white">아이템 파괴전</h4>
                        <p className="text-[10px] text-slate-450 text-slate-400 mt-2 leading-relaxed">
                          맵 곳곳에 배치된 3D 아이템 박스를 깨뜨려 미사일(유도 적군 저격), 바나나, 실드, 전방 보조 부스터를 사용합니다.
                        </p>
                      </div>
                      <span className="text-[9px] font-mono text-slate-500 font-black block mt-2">🎁 복합 확률 로테이터</span>
                    </button>

                    {/* Mode 3 */}
                    <button
                      type="button"
                      onClick={() => { triggerAudioInit(); setGameMode('time_attack'); }}
                      className={`flex flex-col justify-between p-4.5 p-4 rounded-2xl border-2 cursor-pointer transition-all text-left min-h-[170px] ${
                        gameMode === 'time_attack' 
                          ? 'bg-cyan-950/25 border-cyan-400 text-white shadow-[0_0_12px_rgba(34,211,238,0.3)]' 
                          : 'bg-slate-950 border-slate-800/80 text-gray-300 hover:border-slate-705 text-gray-450 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      <div>
                        <span className="text-[9px] font-black tracking-widest text-cyan-400 block uppercase mb-1">ONE-LAP SHORT</span>
                        <h4 className="text-sm font-black text-white">1바퀴 타임어택</h4>
                        <p className="text-[10px] text-slate-450 text-slate-400 mt-2 leading-relaxed">
                          단 한 바퀴(1 Lap)의 혼신의 질주로 골인 시간을 측정합니다. 즉각 결과 확인 및 순위표 등록에 이상적입니다.
                        </p>
                      </div>
                      <span className="text-[9px] font-mono text-slate-500 font-black block mt-2">🏁 단 1 Lap 속성 통과</span>
                    </button>

                    {/* Mode 4 */}
                    <button
                      type="button"
                      onClick={() => { triggerAudioInit(); setGameMode('ten_laps'); }}
                      className={`flex flex-col justify-between p-4.5 p-4 rounded-2xl border-2 cursor-pointer transition-all text-left min-h-[170px] ${
                        gameMode === 'ten_laps' 
                          ? 'bg-purple-950/25 border-purple-500 text-white shadow-[0_0_12px_rgba(168,85,247,0.3)]' 
                          : 'bg-slate-950 border-slate-800/80 text-gray-300 hover:border-slate-705 text-gray-455 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      <div>
                        <span className="text-[9px] font-black tracking-widest text-purple-400 block uppercase mb-1">ENDURANCE MARATHON</span>
                        <h4 className="text-sm font-black text-white">마라톤 10 Laps</h4>
                        <p className="text-[10px] text-slate-450 text-slate-400 mt-2 leading-relaxed">
                          집중 주행에 도전합니다. 무려 10 바퀴를 실수없이 완수해야 완주로 판결하며, 높은 Gold 수당이 지급됩니다.
                        </p>
                      </div>
                      <span className="text-[9px] font-mono text-slate-500 font-black block mt-2">🏃 극강 인내가 요구됨</span>
                    </button>

                    {/* Mode 5 */}
                    <button
                      type="button"
                      onClick={() => { triggerAudioInit(); setGameMode('super_nitro'); }}
                      className={`flex flex-col justify-between p-4.5 p-4 rounded-2xl border-2 cursor-pointer transition-all text-left min-h-[170px] ${
                        gameMode === 'super_nitro' 
                          ? 'bg-orange-950/25 border-orange-500 text-white shadow-[0_0_12px_rgba(249,115,22,0.35)]' 
                          : 'bg-slate-950 border-slate-800/80 text-gray-300 hover:border-slate-705 text-gray-455 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      <div>
                        <span className="text-[9px] font-black tracking-widest text-orange-550 text-orange-500 block uppercase mb-1">INFINITE OVERDRIVE</span>
                        <h4 className="text-sm font-black text-white">무제한 부스터 대전</h4>
                        <p className="text-[10px] text-slate-450 text-slate-400 mt-2 leading-relaxed">
                          드리프트 축적 게이지가 없어도 항시 스페이스바를 누를 때마다 무한대의 폭음 가속 부스터를 분사합니다!
                        </p>
                      </div>
                      <span className="text-[9px] font-mono text-slate-500 font-black block mt-2">🚀 6배 한계 속 가속</span>
                    </button>
                  </div>
                </motion.div>
              )}

              {/* === TAB 4: GACHA SHOP (뽑기 상점) === */}
              {activeMenuTab === 'gacha' && (
                <motion.div
                  key="gacha"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-slate-900/80 border-2 border-slate-700/60 rounded-3xl p-6 shadow-xl w-full flex flex-col md:flex-row gap-6 items-stretch"
                >
                  <div className="flex-1 bg-slate-950 p-6 rounded-2xl border-2 border-slate-800 flex flex-col items-center justify-between text-center min-h-[290px] relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-yellow-500 via-rose-500 to-cyan-500" />
                    
                    <div>
                      <span className="text-[9px] font-black text-yellow-400 bg-yellow-400/10 px-3 py-1 rounded-full uppercase tracking-widest mb-2 inline-block">
                        LUCKY TOON PIXELS
                      </span>
                      <h4 className="text-lg font-black text-white mt-1.5">카트 캡슐 행운상자 슈터</h4>
                      <p className="text-xs text-gray-400 mt-1 max-w-[325px] leading-relaxed">
                        1회 <strong>100 Gold</strong>를 투입하여 룰렛을 당깁니다. 만일 이미 내가 획득한 중복 카트인 경우, 보상 차원으로 <strong>50 Gold (50%)</strong>를 차고 기여 환전급으로 자동 편의 반환합니다.
                      </p>
                    </div>

                    <div className="my-4 w-full max-w-[320px]">
                      <div className="bg-slate-900 border-4 border-yellow-500/80 rounded-2xl py-4 px-6 shadow-inner flex justify-center items-center font-mono relative">
                        <div className="absolute top-0 right-2 w-1.5 h-1.5 rounded-full bg-red-500 animate-ping mt-1.5" />
                        {isDrawing ? (
                          <div className="flex flex-col items-center py-2 animate-pulse">
                            <span className="text-yellow-400 font-extrabold text-[9px] uppercase tracking-widest">룰렛 셔플 진행 중</span>
                            <span className="text-white text-lg font-black italic">{gachaIntervalText}</span>
                          </div>
                        ) : drawnKart ? (
                          <div className="flex flex-col items-center w-full">
                            <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider mb-1 shadow-sm ${
                              drawnKart.rarity === 'Legendary' ? 'bg-purple-600 text-white' : drawnKart.rarity === 'Rare' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-350 text-slate-300'
                            }`}>
                              {drawnKart.rarity}
                            </span>
                            <span className="text-white text-md font-black comic-text italic leading-tight">{drawnKart.name}</span>
                            <span className="text-yellow-400 text-[9.5px] font-bold mt-1.5 block">
                              {drawRefund ? '💥 아쉽게도 중복! 50G 환전 환급 처리!' : '🎖️ 신형 머신을 주차 완료했습니다!'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-xs font-medium">하단의 캡슐 슈팅 레버를 터치 또는 발사하세요.</span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleGachaDraw}
                      disabled={isDrawing || gold < 100}
                      className={`w-full max-w-[320px] py-3 px-6 rounded-xl font-black text-xs cursor-pointer shadow-lg active:scale-95 transition-all text-center ${
                        isDrawing || gold < 100
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-850'
                          : 'bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 hover:opacity-90 text-slate-950 animate-bounce'
                      }`}
                    >
                      {gold < 100 ? '골드가 부족합니다' : '100 Gold 소모하여 캡슐 슈팅'}
                    </button>
                  </div>

                  {/* Right side: Draw probability transparency board */}
                  <div className="w-full md:w-[320px] bg-slate-950 p-5 rounded-2xl border border-slate-850 flex flex-col justify-between text-xs font-mono">
                    <div>
                      <span className="text-[10.5px] font-black text-white flex items-center border-b border-white/5 pb-1.5 mb-2.5">
                        <Sparkles size={13} className="mr-1 text-yellow-400" />
                        <span>확률 및 카트 일람 (Rarity Draw)</span>
                      </span>
                      
                      <div className="space-y-2 text-[10.5px] text-slate-300">
                        <div className="flex justify-between items-center bg-slate-900/40 p-1 px-2.5 rounded">
                          <span className="text-purple-400 font-bold">&#9670; 전설 등급 (Legendary)</span>
                          <span className="font-extrabold text-white">10% 확률</span>
                        </div>
                        <div className="flex justify-between items-center bg-slate-900/40 p-1 px-2.5 rounded">
                          <span className="text-cyan-400 font-bold">&#9672; 희귀 등급 (Rare)</span>
                          <span className="font-extrabold text-white">45% 확률</span>
                        </div>
                        <div className="flex justify-between items-center bg-slate-900/40 p-1 px-2.5 rounded">
                          <span className="text-gray-400 font-bold">&#9675; 일반 등급 (Normal)</span>
                          <span className="font-extrabold text-white">45% 확률</span>
                        </div>
                      </div>

                      <div className="mt-4 p-2 bg-yellow-500/5 rounded-xl border border-yellow-500/10 text-[9.5px] text-yellow-400 leading-normal">
                        ★ <b>전설 머신:</b> 최고 속도가 155% 고성능 고속 부팅 휠셋 및 전용 드리프트 게이지 2.2배 세팅이 탑재되어 있습니다.
                      </div>
                    </div>

                    <div className="text-[9.5px] text-slate-500 leading-none pt-2 border-t border-slate-900">
                      가차 보상은 실시간 브라우저 로컬 저장소에 영구 귀속 보존됩니다.
                    </div>
                  </div>
                </motion.div>
              )}

              {/* === TAB 5: MULTIPLAYER CLASSROOM (실시간 멀티 대전) === */}
              {activeMenuTab === 'multiplayer' && (
                <motion.div
                  key="multiplayer"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-slate-900/80 border-2 border-slate-700/60 rounded-3xl p-5 shadow-xl w-full flex flex-col"
                >
                  <div className="flex items-center space-x-2 border-b border-teal-500/20 pb-2 mb-4">
                    <Radio size={18} className="text-teal-400 animate-pulse" />
                    <span className="font-black text-sm text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-300">
                      실시간 대결 멀티플레이 주행 관제국 (Host / Client Classroom System)
                    </span>
                  </div>

                  {!netRole ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch font-mono">
                      {/* Create Host */}
                      <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] text-teal-400 font-extrabold px-2 py-0.5 bg-teal-500/10 rounded border border-teal-500/25">TEACHER / HOST</span>
                            <span className="text-[9.5px] text-gray-500">방장 컨트롤 대시보드</span>
                          </div>
                          <h4 className="text-sm font-black text-white mt-2.5">방장(선생님)으로 경주판 개조하기</h4>
                          <p className="text-[10.5px] text-gray-400 mt-2.5 leading-relaxed">
                            P2P 방을 비직렬 중하위 채널로 개설하여 임의의 참가코드 문자열을 부여받습니다. 모여드는 학생의 실시간 주행 랩 체크와 완주 기록을 한 화면에 취합 관찰합니다.
                          </p>
                        </div>
                        <button 
                          type="button"
                          onClick={handleHostCreate}
                          className="w-full mt-5 py-3 px-4 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-transform active:scale-95 cursor-pointer text-center"
                        >
                          대기방 개설 (Go Host)
                        </button>
                      </div>

                      {/* Join Client */}
                      <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] text-cyan-400 font-extrabold px-2 py-0.5 bg-cyan-500/10 rounded border border-cyan-500/25">STUDENT / CLIENT</span>
                            <span className="text-[9.5px] text-gray-500">클라이언트 접속 모듈</span>
                          </div>
                          <h4 className="text-sm font-black text-white mt-2.5">참여 코드 입력으로 입장하기</h4>
                          
                          <div className="mt-4">
                            <label className="text-[9.5px] text-gray-450 block font-bold mb-1">방 참여 인클로저 코드 (4자리 단축 코드 혹은 상세 고유 키)</label>
                            <input 
                              type="text"
                              value={roomIdInput}
                              onChange={(e) => setRoomIdInput(e.target.value)}
                              placeholder="코드 혹은 전체 키 입력"
                              maxLength={80}
                              className="w-full bg-slate-900 border-2 border-slate-800 rounded-xl px-4 py-2 text-sm text-yellow-300 outline-none focus:border-cyan-500 font-black tracking-widest uppercase text-center font-mono"
                            />
                          </div>
                        </div>
                        <button 
                          type="button"
                          onClick={handleClientJoin}
                          className="w-full mt-5 py-3 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-transform active:scale-95 cursor-pointer text-center"
                        >
                          원격 방 입장 (Join Stream)
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 font-mono">
                      {/* Connection metadata log panel */}
                      <div className="lg:col-span-4 bg-slate-950 p-4.5 p-4 rounded-2xl border border-slate-850 flex flex-col justify-between min-h-[220px]">
                        <div>
                          <span className="text-[9.5px] text-slate-500 block font-bold uppercase">네트워크 연결 기가진</span>
                          <span className="text-[12px] font-black text-teal-450 text-teal-400 block mt-1.5 leading-snug">{netStatus}</span>

                          {netRole === 'host' && (
                            <div className="mt-4 bg-slate-900/60 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
                              <div>
                                <span className="text-[8.5px] text-gray-500 font-bold block">학생 배포용 참여코드</span>
                                <span className="text-lg font-black text-yellow-300 tracking-wider block mt-0.5 select-all">{roomIdLive}</span>
                              </div>
                              <button
                                onClick={copyRoomCode}
                                className="p-2 bg-slate-800 hover:bg-slate-705 bg-slate-950 border border-slate-800 rounded-xl transition cursor-pointer text-gray-300"
                                title="코드 복사"
                              >
                                {copiedCode ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                              </button>
                            </div>
                          )}
                        </div>

                        {netError && (
                          <div className="bg-red-950/40 p-2.5 my-2 border border-red-500/20 rounded-xl text-[10px] text-red-200">
                            ⚠ {netError}
                          </div>
                        )}

                        <button 
                          onClick={handleDisconnectNetwork}
                          className="w-full py-2 bg-red-950/80 hover:bg-red-900 border border-red-505 border-red-505 border-red-500/25 text-red-400 hover:text-white rounded-xl text-xs font-black transition flex items-center justify-center cursor-pointer mt-4"
                        >
                          <LogOut size={13} className="mr-1.5" />
                          멀티 P2P 세션 끊기 (Leave Room)
                        </button>
                      </div>

                      {/* Active real-time student monitoring matrix */}
                      <div className="lg:col-span-8 bg-slate-955 bg-slate-950 p-4.5 p-4 rounded-2xl border border-slate-850">
                        {netRole === 'host' ? (
                          <div className="space-y-3">
                            <div className="flex justify-between items-center text-xs pb-1.5 border-b border-white/5">
                              <span className="font-extrabold text-white flex items-center">
                                <ShieldCheck size={14} className="mr-1 text-teal-400 animate-spin" />
                                참석 중인 학생 레이서 상태 판넬
                              </span>
                              <span className="text-[10px] text-gray-550 text-gray-400 font-bold">인원: {participants.length}명</span>
                            </div>

                            <div className="space-y-1.5 max-h-[170px] overflow-y-auto pr-0.5">
                              {participants.map((p, idx) => {
                                const pKart = KARTS.find(k => k.id === p.kartId) || KARTS[0];
                                const outcome = p.lastOutcome;
                                return (
                                  <div key={p.peerId} className="bg-slate-900 p-2 rounded-xl border border-slate-850 flex items-center justify-between text-xs">
                                    <div className="flex items-center space-x-2">
                                      <span className="w-4 h-4 rounded-full bg-slate-800 font-bold text-[9px] text-center leading-4 text-slate-400">{idx + 1}</span>
                                      <div>
                                        <span className="font-extrabold text-white">{p.name}</span>
                                        {p.peerId === netManagerRef.current?.myInfo.peerId && (
                                          <span className="ml-[5px] bg-teal-500/20 text-teal-400 px-1 text-[8.5px] rounded border border-teal-500/30">방장</span>
                                        )}
                                        <span className="block text-[8.5px] text-gray-500 leading-tight">{pKart.name}</span>
                                      </div>
                                    </div>

                                    <div>
                                      {outcome ? (
                                        <div className="text-right">
                                          <span className="text-[10px] text-green-400 font-extrabold block">🏁 완주 기록 수신</span>
                                          <span className="text-[8px] text-slate-450 text-slate-400 block font-bold">⏱️ {(outcome.finalTime ? (outcome.finalTime / 1000).toFixed(2) + '초' : '--:--')}</span>
                                        </div>
                                      ) : (
                                        <div className="text-right text-[10.5px]">
                                          <span className="text-cyan-405 text-cyan-400 font-bold animate-pulse">대기 / 주행 중</span>
                                          <span className="block text-[8px] text-slate-500 mt-0.5">최저 트랙 진도: Lap {p.currentLap || 1}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                              {participants.length === 0 && (
                                <div className="text-center py-6 text-gray-500 text-xs font-semibold">참가 중인 학생 라이더가 없습니다. 참여 코드를 알려주세요.</div>
                              )}
                            </div>

                            <div className="pt-2">
                              <button
                                onClick={() => launchRace()}
                                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-black text-xs cursor-pointer shadow-lg active:scale-95 transition-all text-center"
                              >
                                🚀 모든 연결 학생 레이서 출발 신호 강제 전송 !!
                              </button>
                            </div>
                          </div>
                        ) : (
                          // Client lobby monitor view
                          <div className="space-y-3">
                            <div className="flex justify-between items-center text-xs pb-1 border-b border-white/5">
                              <span className="font-extrabold text-white flex items-center">
                                <Users size={13} className="mr-1 text-cyan-400" />
                                멀티 세션 참가 리스트
                              </span>
                              <span className="text-[10px] font-bold text-slate-550 text-gray-400">전원: {participants.length}명</span>
                            </div>

                            <div className="space-y-1.5 max-h-[170px] overflow-y-auto pr-0.5">
                              {participants.map((p, idx) => {
                                const pKart = KARTS.find(k => k.id === p.kartId) || KARTS[0];
                                const isHost = p.role === 'host';
                                return (
                                  <div key={p.peerId} className="bg-slate-900 p-2 rounded-xl border border-slate-850 flex items-center justify-between text-xs">
                                    <div className="flex items-center space-x-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                      <div>
                                        <span className={`font-black ${isHost ? 'text-yellow-300' : 'text-slate-200'}`}>{p.name}</span>
                                        {isHost && <span className="ml-[5px] bg-yellow-405 bg-yellow-400/10 text-yellow-300 text-[8.5px] rounded px-1 border border-yellow-500/20">호스트 방장</span>}
                                        {p.peerId === netManagerRef.current?.myInfo.peerId && <span className="ml-[5px] bg-cyan-500/10 text-cyan-450 text-cyan-400 text-[8.5px] rounded px-1">동기화 나</span>}
                                      </div>
                                    </div>
                                    <span className="text-[9.5px] text-slate-550 text-slate-450 font-bold">{pKart.name.split(' (')[0]}</span>
                                  </div>
                                );
                              })}
                            </div>

                            <div className="bg-slate-900 p-3 rounded-xl border border-cyan-500/10 text-center text-cyan-400 text-[10.5px] font-bold animate-pulse leading-relaxed">
                              방장(선생님)의 출발 원격 데이터 패킷을 무지 지연 동조하며 탐색 중입니다. 잠시 기다리시면 레이싱이 자동 개시됩니다.
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* === TAB 7: GUIDE (도움말) === */}
              {activeMenuTab === 'guide' && (
                <motion.div
                  key="guide"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-slate-900/80 border-2 border-slate-700/60 rounded-3xl p-5 shadow-xl w-full grid grid-cols-1 md:grid-cols-2 gap-5 font-sans"
                >
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-black text-rose-500 bg-rose-500/10 px-2.5 py-0.5 rounded uppercase tracking-wider">GUIDEBOOK</span>
                      <h4 className="text-sm font-black text-white mt-1.5 flex items-center">
                        <Keyboard size={15} className="mr-1 text-rose-500" />
                        주행 키보드 세팅 가이드
                      </h4>
                      <div className="mt-3.5 space-y-2.5 text-xs text-slate-300 leading-normal">
                        <div className="flex justify-between items-center bg-slate-900 p-2 rounded-xl">
                          <span className="font-bold">가속 전진 / 코너 리버스</span>
                          <span className="flex space-x-1 font-mono">
                            <kbd className="bg-slate-800 text-white font-black px-1.5 py-0.5 rounded shadow text-[10px]">W</kbd> /
                            <kbd className="bg-slate-800 text-white font-black px-1.5 py-0.5 rounded shadow text-[10px]">S</kbd>
                          </span>
                        </div>
                        <div className="flex justify-between items-center bg-slate-900 p-2 rounded-xl">
                          <span className="font-bold">좌우 조향 커브</span>
                          <span className="flex space-x-1 font-mono">
                            <kbd className="bg-slate-800 text-white font-black px-1.5 py-0.5 rounded shadow text-[10px]">A</kbd> /
                            <kbd className="bg-slate-800 text-white font-black px-1.5 py-0.5 rounded shadow text-[10px]">D</kbd>
                          </span>
                        </div>
                        <div className="flex justify-between items-center bg-slate-900 p-2 rounded-xl">
                          <span className="font-bold">익스트림 드리프트 클러치</span>
                          <span className="font-mono">
                            <kbd className="bg-slate-800 text-white font-black px-2 py-0.5 rounded shadow text-[10px]">Shift</kbd> (방향전환 중 길게 누름)
                          </span>
                        </div>
                        <div className="flex justify-between items-center bg-slate-900 p-2 rounded-xl">
                          <span className="font-bold">파워 부스터 / 수집 아이템 발사</span>
                          <span className="font-mono">
                            <kbd className="bg-slate-800 text-white font-black px-2 py-0.5 rounded shadow text-[10px]">Space</kbd> /
                            <kbd className="bg-slate-800 text-white font-black px-2 py-0.5 rounded shadow text-[10px]">Ctrl</kbd>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-black text-cyan-400 bg-cyan-400/10 px-2.5 py-0.5 rounded uppercase tracking-wider">TACTICS</span>
                      <h4 className="text-sm font-black text-white mt-1.5 flex items-center">
                        <Gauge size={15} className="mr-1 text-cyan-400" />
                        코너 어택 비결 (Drift Mechanics)
                      </h4>
                      <div className="mt-3.5 space-y-2 text-[11px] text-slate-400 leading-relaxed font-sans font-medium">
                        <p>
                          1. <b>체인 드리프트:</b> 커브길 진입 시 가볍게 조향키 <kbd className="bg-slate-900 px-1 rounded text-white font-bold">A/D</kbd>와 <kbd className="bg-slate-905 bg-slate-900 px-1 rounded text-white font-bold">Shift</kbd>를 조합하여 미끄러지며 부스터 게이지를 즉시 축적하세요.
                        </p>
                        <p>
                          2. <b>부스터 탈출 가치:</b> 충전 게이지가 100%에 봉착하면 수동 부스터가 스택 보관되며, 이를 <kbd className="bg-slate-900 px-1 rounded text-white font-bold">Space</kbd>로 시너지 가동하면 순간적 가속력 최고 타격을 기록합니다.
                        </p>
                        <p>
                          3. <b>아이템 시정:</b> 아이템 상자전에서는 획득한 각 아이템(미사일, 바나나, 실드, 미니부스터)을 우연성 연계로 시뮬레이션하여 전략적 승리를 거머쥘 수 있습니다.
                        </p>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-500 text-center leading-none pt-2 border-t border-slate-900 font-mono">
                      V 또는 C 키를 누르면 비주얼 3D 시점(아이소메트릭 / 체이스백 / 1인칭) 변경이 가능합니다.
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* LOWER HUB ACTION STARTER */}
          <div className="w-full max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center bg-slate-900 shadow-xl border-x-2 border-t-2 border-pink-500 rounded-t-3xl px-6 md:px-8 py-4.5 py-4 gap-4 mt-2 z-10">
            <div className="text-center md:text-left">
              <span className="text-[8.5px] text-pink-400 font-black tracking-wider block uppercase">READY RACING ARRANGEMENT</span>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 text-xs text-slate-300 mt-1">
                <span className="font-extrabold text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-800 flex items-center">
                  <MapPin size={11} className="mr-1 text-cyan-400" />
                  {currentMap.name.split(' (')[0]}
                </span>
                <span className="text-slate-750 text-slate-700 font-bold">&#10072;</span>
                <span className="font-extrabold text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-800 flex items-center">
                  <Trophy size={11} className="mr-1 text-pink-500" />
                  {currentKart.name.split(' (')[0]}
                </span>
                <span className="text-slate-755 text-slate-700 font-bold">&#10072;</span>
                <span className="font-extrabold text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-800 flex items-center">
                  <Flame size={11} className="mr-1 text-orange-400" />
                  {gameMode === 'speed' ? '클래식 스피드' : gameMode === 'item' ? '아이템전' : gameMode === 'time_attack' ? '타임어택' : gameMode === 'ten_laps' ? '마라톤 10Laps' : '울트라 무제한 가속'}
                </span>
              </div>
            </div>

            <button
              onClick={() => launchRace()}
              className="w-full md:w-auto bg-gradient-to-r from-pink-500 via-rose-500 to-rose-600 hover:from-pink-405 hover:to-rose-505 hover:from-pink-400 hover:to-rose-500 text-white font-black text-md px-12 py-4.5 py-4 rounded-2xl shadow-xl flex items-center justify-center space-x-3.5 transform transition-all active:scale-[0.98] cursor-pointer"
            >
              <Play fill="white" size={18} />
              <span className="tracking-widest italic font-display font-black text-sm">레이스 스타트 !!</span>
            </button>
          </div>
        </div>
      )}

      {/* --- COUNTDOWN LAYER --- */}
      {gameState === 'countdown' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/85 select-none font-display text-8xl md:text-9xl text-pink-500 font-black">
          <div className="comic-text animate-ping">
            {comicPop ? comicPop.text : 'READY'}
          </div>
        </div>
      )}

      {/* --- 3D CANVAS LAYER --- */}
      <div ref={canvasContainerRef} className="absolute inset-0 w-full h-full z-0 block" />

      {/* --- MAP THEME ATMOSPHERIC OVERLAY --- */}
      {(gameState === 'playing' || gameState === 'countdown') && (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
          {selectedMapId === 'neon_sky_way' && (
            <>
              <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-pink-500/10 to-transparent opacity-80" />
              <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(244,63,94,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(244,63,94,0.8) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
            </>
          )}
          {selectedMapId === 'cyberspace_tunnel' && (
            <>
              <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-cyan-400/8 to-transparent" />
              <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(rgba(34,211,238,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.8) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
            </>
          )}
          {selectedMapId === 'cosmic_highway' && (
            <>
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-900/5 via-transparent to-purple-900/10" />
              <div className="absolute inset-x-0 top-0 bottom-0 pointer-events-none opacity-40">
                <div className="absolute top-[20%] left-[15%] w-1.5 h-1.5 bg-purple-300 rounded-full animate-ping" style={{ animationDuration: '1s' }} />
                <div className="absolute top-[60%] right-[25%] w-2 h-2 bg-indigo-200 rounded-full animate-ping" style={{ animationDuration: '1.8s' }} />
                <div className="absolute bottom-[30%] left-[45%] w-1.5 h-1.5 bg-pink-300 rounded-full animate-ping" style={{ animationDuration: '1.2s' }} />
              </div>
            </>
          )}
          {selectedMapId === 'lava_crevice' && (
            <>
              <div className="absolute inset-0 bg-gradient-to-t from-red-600/10 via-transparent to-yellow-600/5" />
              <div className="absolute inset-0 pointer-events-none opacity-30">
                <div className="absolute bottom-[10%] left-[20%] w-3 h-3 bg-orange-500 rounded-full filter blur-xs animate-bounce" style={{ animationDuration: '2.5s' }} />
                <div className="absolute bottom-[30%] right-[30%] w-4 h-4 bg-red-500 rounded-full filter blur-xs animate-bounce" style={{ animationDuration: '4s' }} />
                <div className="absolute bottom-[15%] left-[60%] w-3.5 h-3.5 bg-yellow-500 rounded-full filter blur-xs animate-bounce" style={{ animationDuration: '3s' }} />
              </div>
            </>
          )}
          {selectedMapId === 'frozen_glacier' && (
            <>
              <div className="absolute inset-0 bg-gradient-to-tr from-cyan-950/10 via-transparent to-blue-300/5" />
              <div className="absolute inset-0 pointer-events-none opacity-50">
                <div className="absolute top-[10%] left-[40%] w-48 h-12 bg-cyan-400/10 rounded-full filter blur-xl animate-pulse" style={{ animationDuration: '5s' }} />
                <div className="absolute top-[15%] left-[25%] w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDuration: '2.4s' }} />
                <div className="absolute top-[40%] right-[20%] w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDuration: '3.6s' }} />
              </div>
            </>
          )}
        </div>
      )}

      {/* --- ACTIVE DRIVING GAME HUD OVERLAY --- */}
      {gameState === 'playing' && (
        <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-4 md:p-6 select-none font-sans">
          
          <div className="flex justify-between items-start w-full">
            <div className="flex flex-col space-y-2 pointer-events-auto">
              <div className="bg-black/80 px-4 py-2 rounded-2xl border-2 border-pink-500 flex items-center space-x-3 shadow-lg font-mono">
                <span className="text-pink-400 text-[10px] font-black font-display tracking-widest">TIME</span>
                <span className="text-lg font-black text-white">{gameTimeFormatted}</span>
              </div>
              <div className="bg-black/80 px-4 py-2 rounded-2xl border-2 border-yellow-405 border-yellow-400 flex items-center space-x-3 shadow-lg font-mono">
                <span className="text-yellow-400 text-[10px] font-black font-display tracking-widest">LAP</span>
                <span className="text-lg font-black text-white">{currentLap} / {gameMode === 'time_attack' ? 1 : gameMode === 'ten_laps' ? 10 : 3}</span>
              </div>
            </div>

            <div className="flex space-x-2.5 pointer-events-auto">
              {gameMode === 'item' && activeItem && (
                <div className="bg-black/90 px-4 py-2.5 rounded-2xl border-2 border-yellow-400 flex items-center space-x-2.5 shadow-lg">
                  <span className="text-[9.5px] text-yellow-400 font-extrabold uppercase">보유 아이템:</span>
                  <span className={`text-xs font-black px-2 py-0.5 rounded font-mono border ${
                    activeItem === 'booster' ? 'bg-cyan-900/30 text-cyan-400 border-cyan-800/40' :
                    activeItem === 'shield' ? 'bg-blue-900/30 text-blue-400 border-blue-800/40' :
                    activeItem === 'banana' ? 'bg-yellow-900/30 text-yellow-500 border-yellow-850' :
                    'bg-red-900/30 text-red-400 border-red-800/40'
                  }`}>
                    {activeItem === 'booster' ? '부스터 [가속]' :
                     activeItem === 'shield' ? '일렉트로실드' :
                     activeItem === 'banana' ? '바나나트랩' :
                     '유도미사일'}
                  </span>
                  <span className="text-[8px] text-slate-500 font-bold tracking-tight">SPACE / CTRL 사격</span>
                </div>
              )}

              {shieldActive && (
                <div className="bg-blue-500/15 border-2 border-blue-500 px-3.5 py-2.5 rounded-2xl text-blue-400 text-xs font-black flex items-center space-x-1.5 animate-pulse shadow-lg font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
                  <span>실드 활성화 중 (SHIELD ENGAGED)</span>
                </div>
              )}
            </div>

            <div className="flex space-x-2 pointer-events-auto">
              <button onClick={toggleEngineCamera} className="bg-slate-900 border border-slate-750 border-slate-700 px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow cursor-pointer text-white">
                <Gauge size={13} className="text-pink-450 text-pink-450 text-pink-455 text-pink-400" />
                <span>시점 (V)</span>
              </button>
              
              <button onClick={quitRace} className="bg-red-950/80 border-2 border-red-500/60 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow text-red-200 hover:bg-red-900 hover:text-white transition-colors">
                <Flame size={13} className="text-red-400 animate-pulse" />
                <span>포기 (ESC)</span>
              </button>
            </div>

            {/* Placement List Sidebar / Dashboard */}
            <div className="bg-black/85 px-4 py-3 rounded-2xl border-2 border-slate-800 w-44 shadow-lg pointer-events-auto">
              <div className="text-[9px] font-black text-slate-400 mb-1.5 border-b border-white/5 pb-1 text-center uppercase tracking-wider">
                {isMultiplayerActive ? '실시간 주행 전광판' : '싱글 주행 상대'}
              </div>
              
              <div className="space-y-1 text-xs font-mono font-bold leading-tight">
                {isMultiplayerActive ? (
                  [...participants]
                    .sort((a, b) => {
                      const lapA = a.currentLap || 1;
                      const lapB = b.currentLap || 1;
                      if (lapA !== lapB) return lapB - lapA;
                      const progA = a.progress || 0;
                      const progB = b.progress || 0;
                      return progB - progA;
                    })
                    .slice(0, 4)
                    .map((p, idx) => (
                      <div key={p.peerId} className="flex justify-between items-center text-white">
                        <span className="truncate max-w-[90px] flex items-center">
                          <span className="w-3.5 h-3.5 rounded-full bg-cyan-500 text-[8.5px] text-slate-950 text-center font-bold mr-1 leading-3.5 inline-block">{idx + 1}</span>
                          {p.name}
                        </span>
                        <span className="text-[9.5px] text-gray-500 font-bold">L{p.currentLap || 1}</span>
                      </div>
                    ))
                ) : (
                  <>
                    <div className={`flex justify-between items-center ${rPosition === '1위' ? 'text-pink-400' : 'text-gray-400'}`}>
                      <span>1. {playerNameInput} (나)</span>
                      <span>{rPosition}</span>
                    </div>
                    <div className={`flex justify-between items-center ${aPosition === '1위' ? 'text-yellow-405 text-yellow-400' : 'text-gray-400'}`}>
                      <span>2. 라이벌 (AI)</span>
                      <span>{aPosition}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Core Speed HUD and control overlays at bottom */}
          <div className="flex justify-between items-end w-full">
            <div className="flex items-end space-x-3 pointer-events-auto">
              <div className="relative bg-black/95 rounded-2xl border-2 border-slate-800 p-1.5 shadow-lg">
                <canvas ref={minimapCanvasRef} width="120" height="120" className="rounded-xl" />
                <span className="absolute -top-3 left-3 bg-pink-500 text-slate-950 text-[8px] font-black px-1.5 py-0.5 rounded tracking-widest">MINIMAP</span>
              </div>

              {gameMode !== 'item' && (
                <div className="flex flex-col justify-between h-[132px] bg-black/90 p-2.5 rounded-2xl border-2 border-pink-500 w-32 shadow-lg text-center font-mono">
                  <span className="text-[8.5px] text-pink-400 font-black border-b border-white/5 pb-1">NITRO CHARGER</span>
                  <div className="flex-grow flex flex-col justify-center">
                    <div className="w-full h-4 bg-slate-955 bg-slate-950 rounded-lg overflow-hidden border border-pink-500/30 relative flex items-center justify-center">
                      <div className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-pink-500 to-cyan-400" style={{ width: `${boosterGauge}%` }} />
                      <span className="absolute text-[8.5px] font-black text-white">{Math.floor(boosterGauge)}%</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-black text-white bg-slate-950 py-1 border border-slate-850 rounded-lg">BOOST: {boosterStock}개</span>
                </div>
              )}
            </div>

            {/* Speedometer display */}
            <div className="flex items-center space-x-5 bg-black/90 px-6 py-3 rounded-2.5xl rounded-2xl border-2 border-pink-500 shadow-xl pointer-events-auto font-mono">
              <div className="relative flex flex-col items-center">
                <span className="font-display text-4xl md:text-5xl font-black text-pink-400">{speedVal}</span>
                <span className="text-[9px] text-gray-500 font-extrabold tracking-widest leading-none mt-0.5">KM/H</span>
              </div>
              <div className="h-12 w-[1px] bg-slate-800" />
              <div className="flex flex-col text-[9px] text-slate-350 text-gray-400 font-bold space-y-0.5 leading-normal">
                <div><span className="text-pink-400 font-mono">W / S</span> 가속 / 엔진브레이크</div>
                <div><span className="text-yellow-400 font-mono">SHIFT</span> 극속 드리프트 클러치</div>
                <div><span className="text-cyan-405 text-cyan-400 font-mono">SPACE</span> 보조 부스터 사용</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- FINISHED OUTCOME CARD LAYOUT --- */}
      {gameState === 'finished' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/95 text-white p-4">
          <div className="bg-gradient-to-b from-[#090d23] to-[#010307] rounded-3xl p-8 border-4 border-pink-400 max-w-lg w-full text-center relative overflow-hidden font-mono shadow-2xl">
            <span className="inline-block px-5 py-1.5 bg-yellow-405 bg-yellow-400/10 border border-yellow-500/20 text-yellow-300 rounded-full font-black text-[10px] tracking-widest mb-4 uppercase">
              🏁 완주 검문라인 통과 (FINISH CONCLUDE)
            </span>

            <h2 className="text-2.5xl text-2xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-400 to-pink-500 mb-5 comic-text">
              레이스 주행을 성공적으로 완료하였습니다!
            </h2>

            {isMultiplayerActive && netRole === 'host' && (
              <div className="mt-2 mb-4 bg-slate-950 p-4 border border-teal-500/20 rounded-2xl text-left">
                <span className="text-[10px] text-teal-400 font-black block mb-2 border-b border-slate-900 pb-1 flex items-center">
                  <ShieldCheck size={12} className="mr-1 text-teal-400" />
                  👨‍🏫 전체 참석 학생 실시간 최종 성적표 (Live Host Scoreboard)
                </span>
                <div className="space-y-1 max-h-[120px] overflow-y-auto">
                  {latestMultiplayerOutcomes.map((item, idx) => (
                    <div key={item.peerId} className="flex justify-between items-center text-xs bg-slate-900/50 p-1.5 rounded border border-slate-900">
                      <span className="font-extrabold text-teal-350 text-teal-300">
                        {idx + 1}위. {item.name}
                      </span>
                      <span className="text-yellow-300 font-bold font-mono">
                        {(item.finalTime ? (item.finalTime / 1000).toFixed(2) + '초' : '결과 판정 대기')}
                      </span>
                    </div>
                  ))}
                  {latestMultiplayerOutcomes.length === 0 && (
                    <span className="text-gray-500 text-[10.5px] block py-3 text-center">
                      완주 보고를 송달해온 학생 라이더가 없습니다.
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2.5 mb-6 bg-slate-950 p-4 rounded-2xl border border-slate-850 text-left text-xs">
              <div className="flex justify-between items-center text-slate-400 font-bold">
                <span>차고 탑재 머신</span>
                <span className="font-extrabold text-white">{currentKart.name}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400 font-bold">
                <span>트랙 선택 맵</span>
                <span className="font-extrabold text-white">{currentMap.name.split(' (')[0]}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400 font-bold">
                <span>공인 레이싱 타임</span>
                <span className="font-extrabold text-yellow-305 text-yellow-300 font-mono text-sm">{finishStats.finalTimeStr}</span>
              </div>
              <div className="flex justify-between items-center text-slate-450 text-slate-400 font-bold border-t border-slate-900 pt-2 flex items-center">
                <span className="text-pink-400 font-bold flex items-center">
                  <Coins size={14} className="mr-1 text-yellow-500" />
                  클래스 주행 골드 수당
                </span>
                <span className="font-extrabold text-green-400">+{finishStats.earnedGold} Gold</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => launchRace()} className="flex-1 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 py-3 rounded-xl text-xs font-black cursor-pointer active:scale-95 transition-all text-white text-center">
                재주행 하기 (Re-Race)
              </button>
              
              <button 
                onClick={() => {
                  setGameState('lobby');
                  setIsMultiplayerActive(false);
                }} 
                className="flex-1 bg-slate-800 hover:bg-slate-705 bg-slate-90 w-full py-3 rounded-xl text-xs font-black cursor-pointer active:scale-95 transition-all border border-slate-800 text-center"
              >
                차고 대합실 복귀
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- HUD MOBILE BUTTON TOAST --- */}
      <AnimatePresence>
        {alertNotify.show && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="absolute bottom-6 right-6 z-50 bg-slate-950 border-2 border-pink-500 rounded-2xl px-5 py-3 flex items-center space-x-3 shadow-2xl backdrop-blur pointer-events-none select-none font-mono"
          >
            <div className="w-8 h-8 rounded-full bg-pink-500/25 text-pink-450 text-pink-450 border border-pink-500 flex items-center justify-center text-pink-400">
              <Info size={14} />
            </div>
            <div>
              <div className="text-[9.5px] font-black text-gray-500 leading-none">{alertNotify.title}</div>
              <div className="text-xs font-black text-white mt-1">{alertNotify.message}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
