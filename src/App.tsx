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
  Keyboard,
  Music,
  Volume2,
  VolumeX
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
  const [activeMenuTab, setActiveMenuTab] = useState<'garage' | 'maps' | 'modes' | 'gacha' | 'multiplayer' | 'guide' | null>(null);
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
  const [controlMode, setControlMode] = useState<'keyboard' | 'mobile' | null>(() => {
    return localStorage.getItem('kart_control_mode') as 'keyboard' | 'mobile' | null;
  });

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
  const [lobbyBgmPlaying, setLobbyBgmPlaying] = useState<boolean>(true);
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

    // Set Room ID immediately for instant user feedback
    setRoomIdLive(code);

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

    const cleanCode = roomIdInput.trim().toUpperCase();
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

    const handleBlur = () => {
      keysPressedRef.current = {};
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
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
    } else if (gameState === 'lobby' && lobbyBgmPlaying) {
      // Force stop first to prevent duplicate play sequences
      AudioEngine.stopBGM();
      AudioEngine.playBGM('lobby');
    } else {
      AudioEngine.stopBGM();
    }
    return () => {
      AudioEngine.stopBGM();
    };
  }, [gameState, selectedMapId, lobbyBgmPlaying]);

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
    keysPressedRef.current = {};
    
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
          engineRef.current.gameMode = gameMode;
          engineRef.current.onComicPopup = (text: string, color: string) => {
            triggerComicTextPop(text, color);
          };
          engineRef.current.onHUDNotification = (title: string, body: string) => {
            showHUDNotification(title, body);
          };
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
    keysPressedRef.current = {};
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
      {/* Control Selection Modal for first-time or forced startup selection */}
      {controlMode === null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 backdrop-blur-md p-4 text-white font-sans select-none pointer-events-auto">
          <div className="relative max-w-lg w-full bg-slate-900 border-2 border-cyan-500/80 rounded-3xl p-6 md:p-8 shadow-2xl text-center flex flex-col items-center">
            
            {/* Floating neon badge */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-400 to-blue-500 flex items-center justify-center text-white text-3xl font-bold shadow-xl animate-bounce mb-4">
              🏎️
            </div>

            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-yellow-300 uppercase italic">
              KART-RIDER ANIME
            </h2>
            <p className="text-cyan-400 text-xs font-black tracking-widest mt-1 mb-6">
              조작 형태 선택 (CHOOSE CONTROL MODE)
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mb-8">
              {/* Keyboard Mode Choice button */}
              <button
                onClick={() => {
                  triggerAudioInit();
                  localStorage.setItem('kart_control_mode', 'keyboard');
                  setControlMode('keyboard');
                  showHUDNotification('PC 키보드 모드 설정', 'Arrow / WASD 키로 드리프트 레이싱을 진행할 수 있습니다.');
                }}
                className="bg-slate-950 hover:bg-slate-850 p-5 rounded-2xl border-2 border-slate-800 hover:border-pink-500 transition-all flex flex-col items-center text-center cursor-pointer group hover:scale-[1.02]"
              >
                <div className="w-12 h-12 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center mb-3 group-hover:bg-pink-500 group-hover:text-slate-950 transition-colors">
                  <span className="text-xl font-bold">⌨️</span>
                </div>
                <div className="text-sm font-black text-white group-hover:text-pink-400 transition-colors">PC 키보드 모드</div>
                <div className="text-[10.5px] text-gray-400 font-medium leading-relaxed mt-2.5">
                  방향키 / WASD 주행<br />
                  <b>Shift</b> 키 드리프트<br />
                  <b>Space / Ctrl</b> 아이템 사용
                </div>
              </button>

              {/* Mobile Mode Choice button */}
              <button
                onClick={() => {
                  triggerAudioInit();
                  localStorage.setItem('kart_control_mode', 'mobile');
                  setControlMode('mobile');
                  showHUDNotification('모바일 터치 모드 설정', '화면 가상 컨트롤 버튼으로 즉각 조향 및 드리프트가 가능합니다.');
                }}
                className="bg-slate-950 hover:bg-slate-850 p-5 rounded-2xl border-2 border-slate-800 hover:border-cyan-500 transition-all flex flex-col items-center text-center cursor-pointer group hover:scale-[1.02]"
              >
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-3 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-colors">
                  <span className="text-xl font-bold">📱</span>
                </div>
                <div className="text-sm font-black text-white group-hover:text-cyan-400 transition-colors">모바일 터치 모드</div>
                <div className="text-[10.5px] text-gray-400 font-medium leading-relaxed mt-2.5">
                  가상 방향 리모컨 주행<br />
                  가상 <b>DRIFT</b> 코너 공략<br />
                  가상 <b>ITEM / BOOST</b> 탭사격
                </div>
              </button>
            </div>

            <p className="text-[9.5px] text-gray-500 font-bold max-w-xs leading-normal">
              ※ 대합실 화면 우측 상단의 🎮 설정 아이콘을 클릭하여 언제든지 PC/모바일 조작 모드를 전환하실 수 있습니다.
            </p>
          </div>
        </div>
      )}

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
        <div className="absolute inset-0 z-50 flex flex-col justify-between bg-gradient-to-b from-[#020617] via-[#090d1f] to-[#020617] px-4 md:px-8 py-4 overflow-y-auto normal-scrollbar select-none">
          {/* Cybernetic High-Tech Racing Background with multiple natural parallax elements */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Perspective wireframe grid */}
            <div 
              className="absolute inset-0 opacity-20" 
              style={{ 
                backgroundImage: 'radial-gradient(circle at center, transparent 30%, rgba(2, 6, 23, 0.95) 100%), linear-gradient(0deg, transparent 24%, rgba(6, 182, 212, 0.15) 25%, rgba(6, 182, 212, 0.15) 26%, transparent 27%, transparent 74%, rgba(6, 182, 212, 0.15) 75%, rgba(6, 182, 212, 0.15) 76%, transparent 77%), linear-gradient(90deg, transparent 24%, rgba(6, 182, 212, 0.15) 25%, rgba(6, 182, 212, 0.15) 26%, transparent 27%, transparent 74%, rgba(6, 182, 212, 0.15) 75%, rgba(6, 182, 212, 0.15) 76%, transparent 77%)', 
                backgroundSize: '48px 48px' 
              }}
            />
            
            {/* Glowing neon ambient orbs floating/glowing dynamically */}
            <div className="absolute top-[12%] left-[15%] w-96 h-96 rounded-full bg-pink-500/10 filter blur-[90px] animate-pulse" style={{ animationDuration: '6s' }} />
            <div className="absolute bottom-[10%] right-[10%] w-[450px] h-[450px] rounded-full bg-cyan-500/10 filter blur-[110px] animate-pulse" style={{ animationDuration: '9s' }} />
            <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[600px] h-32 rounded-full bg-blue-600/5 filter blur-[70px] animate-pulse" style={{ animationDuration: '12s' }} />

            {/* Racetrack diagonal speed vectors / warm glowing stripes */}
            <div className="absolute bottom-[-150px] left-[-100px] w-[500px] h-[300px] bg-gradient-to-tr from-yellow-500/10 to-transparent skew-x-[-30deg] border-r-4 border-yellow-500/20" />
            <div className="absolute top-[-50px] right-[-100px] w-[600px] h-[250px] bg-gradient-to-bl from-pink-500/10 to-transparent skew-x-[-30deg] border-l-4 border-pink-500/20" />

            {/* Matrix dotted tech grid */}
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #0891b2 1px, transparent 1px)', backgroundSize: '16px 16px' }} />

            {/* Circuit line accents to depict racing paths */}
            <svg className="absolute inset-0 w-full h-full opacity-15" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="circGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ec4899" stopOpacity="0.2" />
                  <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#ec4899" stopOpacity="0.1" />
                </linearGradient>
              </defs>
              <path d="M -100 200 L 400 200 L 600 400 L 1200 400 L 1400 200 L 2000 200" fill="none" stroke="url(#circGrad)" strokeWidth="2" strokeDasharray="10 15" />
              <path d="M -100 500 L 300 500 L 500 700 L 1500 700 L 1700 500 L 2000 500" fill="none" stroke="url(#circGrad)" strokeWidth="1.5" strokeDasharray="5 10" />
            </svg>
          </div>
          
          {/* TOP HEADER STATUS ROW */}
          <div className="flex flex-col md:flex-row justify-between items-center w-full max-w-7xl mx-auto gap-4 z-10 py-3 border-b border-slate-800/80">
            {/* Left helper badge */}
            <div className="hidden md:flex items-center space-x-2 text-[10px] font-black tracking-widest text-cyan-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse border border-emerald-500/50" />
              <span>TOURNAMENT SERVER: ONLINE</span>
            </div>

            {/* Title in the Top Center */}
            <div className="text-center transform -rotate-1 flex-1">
              <h1 className="text-3xl md:text-5xl font-black italic tracking-wider text-yellow-300 drop-shadow-[0_3px_12px_rgba(234,179,8,0.7)] font-display uppercase font-extrabold flex items-center justify-center">
                KART-RIDER <span className="text-white drop-shadow-[0_0_8px_rgba(6,182,212,0.9)] ml-2">ANIME</span>
              </h1>
              <p className="text-cyan-450 text-cyan-400 text-[10px] font-black uppercase tracking-widest mt-1">
                ⚡ 초고속 실시간 멀티플레이어 레이싱 ⚡
              </p>
            </div>

            {/* User nickname card & Gold displays & Control Mode Trigger */}
            <div className="flex flex-wrap items-center gap-3 justify-center">
              {/* BGM Controller Button */}
              <button
                onClick={() => {
                  triggerAudioInit();
                  const nextState = !lobbyBgmPlaying;
                  setLobbyBgmPlaying(nextState);
                  if (nextState) {
                    showHUDNotification('BGM 배경음악 재생', '세련된 오리지널 로비 BGM을 연주합니다.');
                  } else {
                    showHUDNotification('BGM 배경음악 음소거', '배경음악을 일시정지 하였습니다.');
                  }
                }}
                className={`px-3 py-1.5 shadow-md border rounded-xl hover:border-pink-500 transition-all text-[10.5px] font-black cursor-pointer flex items-center space-x-1.5 ${
                  lobbyBgmPlaying 
                    ? 'bg-slate-900 border-pink-500/40 text-pink-400' 
                    : 'bg-slate-950 border-slate-800 text-gray-500'
                }`}
                title="배경음악 재생/정지"
              >
                {lobbyBgmPlaying ? (
                  <>
                    <Volume2 size={13} className="text-pink-500 animate-bounce" />
                    <span className="uppercase text-white font-mono flex items-center gap-1">
                      BGM ON
                      <span className="flex space-x-0.5 items-end h-2.5">
                        <span className="w-0.5 h-1 bg-pink-500 animate-pulse block rounded-full" style={{ animationDelay: '0.1s' }} />
                        <span className="w-0.5 h-2.5 bg-pink-500 animate-pulse block rounded-full" style={{ animationDelay: '0.3s' }} />
                        <span className="w-0.5 h-1.5 bg-pink-500 animate-pulse block rounded-full" style={{ animationDelay: '0.5s' }} />
                      </span>
                    </span>
                  </>
                ) : (
                  <>
                    <VolumeX size={13} />
                    <span className="uppercase font-mono">BGM OFF</span>
                  </>
                )}
              </button>

              <button 
                onClick={() => {
                  triggerAudioInit();
                  const next = controlMode === 'keyboard' ? 'mobile' : 'keyboard';
                  localStorage.setItem('kart_control_mode', next);
                  setControlMode(next);
                  showHUDNotification('조작 모드 전환', next === 'keyboard' ? 'PC 키보드 (WASD/방향키)로 제어합니다.' : '모바일용 가상 컨트롤 패드가 화면에 작동합니다.');
                }}
                className="px-3 py-1.5 bg-slate-900 shadow-md border border-slate-800 rounded-xl hover:border-pink-500 transition-colors text-[10.5px] font-black cursor-pointer text-cyan-400 flex items-center space-x-1.5"
                title="조작 방식 원클릭 변경"
              >
                <span>{controlMode === 'keyboard' ? '⌨️' : '📱'}</span>
                <span className="uppercase text-white font-mono">{controlMode === 'keyboard' ? 'PC 키보드 모드' : '모바일 터치 모드'}</span>
              </button>

              <div className="flex items-center space-x-3 bg-slate-900/90 border-2 border-slate-800 p-2 rounded-2xl shadow-lg">
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
                      className="bg-transparent text-white outline-none border-b border-dashed border-pink-500/40 focus:border-pink-500 font-semibold py-0.5 text-xs w-28"
                      placeholder="라이더 이름"
                    />
                  </div>
                  <div className="flex items-center text-yellow-400 font-black text-sm">
                    <Coins className="mr-1 text-yellow-400" size={13} />
                    <span>{gold} Gold</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* --- THE 3-COLUMN LOBBY DASHBOARD LAYER --- */}
          <div className="w-full max-w-7xl mx-auto flex-1 z-10 my-4 flex flex-col justify-stretch">
            <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch flex-1 min-h-[350px]">
              
              {/* === LEFT COLUMN: MAIN MENU SYSTEMS (Column span: 3) === */}
              <div className="lg:col-span-3 flex flex-col justify-between gap-4">
                <div className="flex flex-col gap-3.5">
                  <div className="text-[10px] font-black uppercase text-pink-400 tracking-widest border-b border-pink-500/10 pb-1.5 flex items-center font-mono">
                    <span className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-ping mr-1.5" />
                    <span>🎮 LOBBY OPERATIONS (대기실 로비 메뉴)</span>
                  </div>

                  {/* Button 1: Gacha Draw */}
                  <button
                    onClick={() => { triggerAudioInit(); setActiveMenuTab('gacha'); }}
                    className="group relative w-full p-4.5 p-4 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950/90 border-2 border-slate-800 hover:border-yellow-400 transition-all cursor-pointer flex items-center space-x-3.5 shadow-lg hover:scale-[1.02] text-left"
                  >
                    <div className="w-12 h-12 rounded-xl bg-yellow-400/10 text-yellow-400 flex items-center justify-center text-2xl shadow border border-yellow-500/20 group-hover:scale-110 transition-transform">
                      🎰
                    </div>
                    <div>
                      <div className="text-[10px] text-yellow-500 font-extrabold uppercase tracking-wide">CAPSULE DRAW</div>
                      <div className="text-white text-xs font-black">행운의 카트 뽑기</div>
                      <div className="text-[9.5px] text-gray-400 font-medium leading-none mt-1">100G 소모 가차 상점</div>
                    </div>
                  </button>

                  {/* Button 2: Map selector */}
                  <button
                    onClick={() => { triggerAudioInit(); setActiveMenuTab('maps'); }}
                    className="group relative w-full p-4.5 p-4 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950/90 border-2 border-slate-800 hover:border-cyan-405 hover:border-cyan-400 transition-all cursor-pointer flex items-center space-x-3.5 shadow-lg hover:scale-[1.02] text-left"
                  >
                    <div className="w-12 h-12 rounded-xl bg-cyan-400/10 text-cyan-455 text-cyan-400 flex items-center justify-center text-2xl shadow border border-cyan-500/20 group-hover:scale-110 transition-transform">
                      🗺️
                    </div>
                    <div>
                      <div className="text-[10px] text-cyan-400 font-extrabold uppercase tracking-wide">CHOOSE TRACK</div>
                      <div className="text-white text-xs font-black">레이싱 트랙 맵 선택</div>
                      <div className="text-[9.5px] text-gray-400 font-medium leading-none mt-1">5종의 3D 서킷 트랙</div>
                    </div>
                  </button>

                  {/* Button 3: Match Modes */}
                  <button
                    onClick={() => { triggerAudioInit(); setActiveMenuTab('modes'); }}
                    className="group relative w-full p-4.5 p-4 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950/90 border-2 border-slate-800 hover:border-orange-500 transition-all cursor-pointer flex items-center space-x-3.5 shadow-lg hover:scale-[1.02] text-left"
                  >
                    <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center text-2xl shadow border border-orange-500/25 group-hover:scale-110 transition-transform">
                      🔥
                    </div>
                    <div>
                      <div className="text-[10px] text-orange-400 font-extrabold uppercase tracking-wide">RULES & MODES</div>
                      <div className="text-white text-xs font-black">인게임 경기 모드 설정</div>
                      <div className="text-[9.5px] text-gray-400 font-medium leading-none mt-1">아이템전/스피드전/마라톤</div>
                    </div>
                  </button>

                  {/* Button 4: My Garage Inventory */}
                  <button
                    onClick={() => { triggerAudioInit(); setActiveMenuTab('garage'); }}
                    className="group relative w-full p-4.5 p-4 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950/90 border-2 border-slate-800 hover:border-pink-500 transition-all cursor-pointer flex items-center space-x-3.5 shadow-lg hover:scale-[1.02] text-left"
                  >
                    <div className="w-12 h-12 rounded-xl bg-pink-500/10 text-pink-405 text-pink-400 flex items-center justify-center text-2xl shadow border border-pink-500/20 group-hover:scale-110 transition-transform">
                      🎒
                    </div>
                    <div>
                      <div className="text-[10px] text-pink-400 font-extrabold uppercase tracking-wide">MY GARAGE</div>
                      <div className="text-white text-xs font-black">보유 카트바디 차고</div>
                      <div className="text-[9.5px] text-gray-400 font-medium leading-none mt-1">획득한 기체 교체 피팅</div>
                    </div>
                  </button>

                  {/* Button 5: Driving guide */}
                  <button
                    onClick={() => { triggerAudioInit(); setActiveMenuTab('guide'); }}
                    className="group relative w-full p-3.5 rounded-xl bg-slate-950/80 border border-slate-850 hover:border-slate-700 transition-all cursor-pointer flex items-center space-x-2.5 hover:bg-slate-900 text-left text-xs"
                  >
                    <span className="text-lg">📔</span>
                    <span className="text-gray-300 font-bold group-hover:text-white">초보자 라이더 길잡이 가이드</span>
                  </button>
                </div>

                {/* Left guidance display */}
                <div className="hidden lg:block bg-slate-950/50 p-3 rounded-2xl border border-slate-850/80 font-mono text-[9.5px] text-gray-400 leading-relaxed">
                  <span className="text-pink-500 font-black block mb-0.5">※ 익스트림 드리프트 수칙</span>
                  미행 곡면 구간 시프트(Shift) 클러치 연타 후, 직진 탈출 시점에 스페이스 바(Space) 파워 부스터를 발동해 순간 대단위 추월 가치를 점유하세요.
                </div>
              </div>

              {/* === CENTER COLUMN: THE BEAUTIFUL 3D DIAGONAL QUARTER-VIEW KART (Column span: 5) === */}
              <div className="lg:col-span-5 bg-gradient-to-b from-slate-950/60 to-slate-900/60 border-2 border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col justify-between items-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.06)_0%,transparent_70%)] pointer-events-none" />
                <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-pink-500/5 filter blur-3xl pointer-events-none" />
                
                <div className="w-full text-center z-10">
                  <span className="text-[8px] font-black uppercase tracking-widest text-[#06b6d4] bg-cyan-950/30 border border-cyan-500/20 px-2.5 py-0.5 rounded-full">
                    🏁 SELECTED KART MODEL
                  </span>
                  <h4 className="text-lg font-black text-white mt-1.5 uppercase tracking-wide flex items-center justify-center">
                    <span className="inline-block w-2.5 h-2.5 rounded-full animate-pulse mr-2" style={{ backgroundColor: `#${currentKart.color.toString(16).padStart(6, '0')}` }} />
                    <span>{currentKart.name}</span>
                  </h4>
                  <span className={`text-[8.5px] font-black px-2 py-0.5 rounded uppercase mt-1 inline-block ${
                    currentKart.rarity === 'Legendary' ? 'bg-purple-900/30 text-purple-400 border border-purple-800/40' : currentKart.rarity === 'Rare' ? 'bg-cyan-900/30 text-cyan-400 border border-cyan-800/40' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {currentKart.rarity} 등급 기체
                  </span>
                </div>

                {/* SLEEK ISOMETRIC 3D INTERACTIVE VISUAL CANVAS */}
                <div className="relative w-64 h-44 flex items-center justify-center z-10 my-2 select-none group-hover:scale-105 transition-all duration-500">
                  <div className="absolute bottom-[5px] w-48 h-10 bg-cyan-500/10 border border-cyan-500/30 rounded-full filter blur-sm transform -rotate-12 animate-pulse" />
                  
                  {/* Cyber grid circle */}
                  <div 
                    className="absolute bottom-[-15px] w-52 h-16 opacity-50 rounded-full border border-dashed animate-spin" 
                    style={{ 
                      borderColor: `#${currentKart.color.toString(16).padStart(6, '0')}80`,
                      animationDuration: '14s',
                      transform: 'rotateX(75deg) rotateY(15deg) rotateZ(0deg)'
                    }} 
                  />

                  {/* 3D-angled Glass Perspective Kart wrapper */}
                  <div 
                    className="relative w-56 h-36 flex items-center justify-center transform transition-all duration-300"
                    style={{
                      transform: 'perspective(500px) rotateX(15deg) rotateY(-22deg) rotateZ(3deg)'
                    }}
                  >
                    <svg className="w-full h-full drop-shadow-[0_12px_18px_rgba(0,0,0,0.85)]" viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <g>
                        {/* Plasma Exhaust flamer particles */}
                        <path d="M10 65 L-25 58 L5 72 Z" fill={`#${currentKart.flameColor.toString(16).padStart(6, '0')}`} className="opacity-75 animate-pulse" />
                        <path d="M8 80 L-28 85 L5 88 Z" fill={`#${currentKart.flameColor.toString(16).padStart(6, '0')}`} className="opacity-80 animate-pulse" />
                        <rect x="12" y="60" width="12" height="15" rx="3" fill="#334155" transform="rotate(-15, 12, 60)" />
                        <rect x="10" y="76" width="12" height="15" rx="3" fill="#1e293b" transform="rotate(-15, 10, 76)" />

                        {/* Spoiler wings */}
                        <path d="M15 40 L65 15 L80 25 L30 50 Z" fill={`#${currentKart.color.toString(16).padStart(6, '0')}`} stroke="#ffffff" strokeWidth="1.2" />
                        <path d="M15 40 L8 55 L30 50 Z" fill="#0f172a" />
                        <path d="M65 15 L58 30 L80 25 Z" fill="#1e293b" />

                        {/* Rear Tires */}
                        <ellipse cx="45" cy="110" rx="19" ry="25" fill="#020617" stroke="#334155" strokeWidth="2" />
                        <ellipse cx="45" cy="110" rx="9" ry="12" fill="#475569" />
                        <circle cx="45" cy="110" r="4" fill="#cbd5e1" />

                        {/* Front left wheel */}
                        <ellipse cx="145" cy="115" rx="13" ry="17" fill="#090d16" stroke="#475569" strokeWidth="1.5" />
                        <ellipse cx="145" cy="115" rx="5" ry="7" fill="#64748b" />

                        {/* Chassis body */}
                        <path d="M38 75 L125 55 L165 95 L50 115 Z" fill={`#${currentKart.color.toString(16).padStart(6, '0')}`} stroke="#ffffff" strokeWidth="1" />
                        <path d="M52 72 L105 60 L120 78 L65 90 Z" fill="#0f172a" stroke="#475569" />
                        <circle cx="82" cy="64" r="5" fill="#e2e8f0" />

                        {/* Direct steering */}
                        <line x1="110" y1="75" x2="125" y2="65" stroke="#f1f5f9" strokeWidth="2" />
                        <ellipse cx="125" cy="65" rx="5" ry="8" fill="#ec4899" />

                        {/* Hood decal and light reflections */}
                        <path d="M115 50 L175 75 L185 85 L125 60 Z" fill={`#${(currentKart.color === 0xff007f ? 0x06b6d4 : 0xec4899).toString(16).padStart(6, '0')}`} />
                        <path d="M150 78 L195 90 L180 102 L132 90 Z" fill={`#${currentKart.color.toString(16).padStart(6, '0')}`} stroke="#ffffff" strokeWidth="1" />
                        <path d="M136 68 L170 85 L155 92 Z" fill="#ffffff" opacity="0.35" />
                        <ellipse cx="120" cy="85" rx="11" ry="14" fill="#020617" opacity="0.75" />
                      </g>
                    </svg>
                  </div>
                  
                  {/* Neon Underglow light */}
                  <div 
                    className="absolute bottom-[-5px] w-36 h-6 rounded-full filter blur-md animate-pulse" 
                    style={{ backgroundColor: `#${currentKart.color.toString(16).padStart(6, '0')}45` }} 
                  />
                </div>

                {/* Carousel controller */}
                <div className="w-full flex justify-between items-center px-3.5 bg-slate-900/60 border border-slate-800 rounded-xl py-1 z-10 max-w-[240px]">
                  <button 
                    onClick={() => {
                      triggerAudioInit();
                      const curIdx = KARTS.findIndex(k => k.id === selectedKartId);
                      const prevIdx = (curIdx - 1 + KARTS.length) % KARTS.length;
                      setSelectedKartId(KARTS[prevIdx].id);
                    }}
                    className="p-1 px-2.5 bg-slate-950 border border-slate-800 hover:border-cyan-400 rounded-lg text-[9.5px] font-black text-gray-300 hover:text-white cursor-pointer transition-colors"
                  >
                    ◀ PREV
                  </button>
                  <span className="text-[9px] text-gray-400 font-mono font-black uppercase">CAROUSEL</span>
                  <button 
                    onClick={() => {
                      triggerAudioInit();
                      const curIdx = KARTS.findIndex(k => k.id === selectedKartId);
                      const nextIdx = (curIdx + 1) % KARTS.length;
                      setSelectedKartId(KARTS[nextIdx].id);
                    }}
                    className="p-1 px-2.5 bg-slate-950 border border-slate-800 hover:border-cyan-400 rounded-lg text-[9.5px] font-black text-gray-300 hover:text-white cursor-pointer transition-colors"
                  >
                    NEXT ▶
                  </button>
                </div>

                {/* Stats indicators */}
                <div className="w-full z-10 grid grid-cols-4 gap-1 pb-1 pt-2.5 text-center border-t border-white/5 font-mono">
                  <div className="bg-slate-950/60 p-1.5 rounded-xl border border-slate-850">
                    <span className="text-[7.5px] text-gray-500 block font-bold leading-none">가속성</span>
                    <span className="text-[10px] font-black text-white block mt-0.5">{(currentKart.stats.speed * 180).toFixed(0)}</span>
                  </div>
                  <div className="bg-slate-950/60 p-1.5 rounded-xl border border-slate-850">
                    <span className="text-[7.5px] text-gray-500 block font-bold leading-none">추진력</span>
                    <span className="text-[10px] font-black text-pink-400 block mt-0.5">{(currentKart.stats.accel * 10000).toFixed(0)}</span>
                  </div>
                  <div className="bg-slate-950/60 p-1.5 rounded-xl border border-slate-850">
                    <span className="text-[7.5px] text-gray-500 block font-bold leading-none">충전율</span>
                    <span className="text-[10px] font-black text-cyan-400 block mt-0.5">{(currentKart.stats.drift * 50).toFixed(0)}</span>
                  </div>
                  <div className="bg-slate-950/60 p-1.5 rounded-xl border border-slate-850">
                    <span className="text-[7.5px] text-gray-500 block font-bold leading-none">핸들링</span>
                    <span className="text-[10px] font-black text-yellow-400 block mt-0.5">{(currentKart.stats.handling * 1000).toFixed(0)}</span>
                  </div>
                </div>

                {/* Locked block overlay inside card to prevent confusion */}
                {!unlockedKarts.includes(currentKart.id) && (
                  <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex flex-col justify-center items-center p-3 z-[15] text-center">
                    <span className="text-2xl mb-1">🔒</span>
                    <span className="text-yellow-400 text-[8.5px] font-black uppercase tracking-wider bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-500/20">미획득 파츠</span>
                    <button
                      onClick={() => { triggerAudioInit(); setActiveMenuTab('gacha'); }}
                      className="mt-3 px-3 py-1 bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-[9px] font-black rounded-lg transition-transform active:scale-95 cursor-pointer shadow"
                    >
                      🎰 행운 뽑기 상점으로 획득
                    </button>
                  </div>
                )}
              </div>

              {/* === RIGHT COLUMN: THE EXTRA-LARGE ONLINE MULTIPLAYER matchmaker (Column span: 4) === */}
              <div className="lg:col-span-4 bg-slate-900 border-2 border-slate-700/60 rounded-3xl p-5 shadow-2xl flex flex-col justify-between items-stretch min-h-[350px] relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-teal-500/5 filter blur-2xl pointer-events-none" />
                
                <div className="z-10 flex flex-col flex-1 justify-between">
                  <div className="border-b border-teal-500/20 pb-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/25 animate-pulse">
                        📡 MATCHMAKING SYSTEM
                      </span>
                      <Radio size={14} className="text-teal-400 animate-pulse" />
                    </div>
                    <h3 className="text-sm font-black text-white mt-1.5">실시간 양방향 멀티 대전</h3>
                    <p className="text-[10.5px] text-gray-400 mt-1.5 leading-relaxed font-sans font-medium">
                      고유 참가 코드를 이용한 매칭. 같은 강의실 또는 다른 기기의 학생 레이서들을 대기실로 원격 소집하여 연계 대전을 즐기세요!
                    </p>
                  </div>

                  {/* Native multiplayer controls always open and beautifully prominent */}
                  <div className="mt-4 flex-1 flex flex-col justify-center">
                    {!netRole ? (
                      <div className="space-y-3 font-mono">
                        {/* Option 1: Host Room */}
                        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850 flex items-center justify-between hover:border-teal-500/40 transition-colors">
                          <div className="text-left">
                            <span className="text-[8.5px] text-teal-400 font-bold block mb-0.5">TEACHER CLIENT</span>
                            <span className="text-xs font-black text-white">대기방 신형 개설</span>
                          </div>
                          <button
                            onClick={handleHostCreate}
                            className="px-3.5 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-[10px] rounded-lg shadow cursor-pointer transition-transform active:scale-95"
                          >
                            방 개설
                          </button>
                        </div>

                        {/* Option 2: Join Room with input code */}
                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 flex flex-col gap-2 hover:border-cyan-500/40 transition-colors">
                          <span className="text-[8.5px] text-cyan-400 font-bold block leading-none">STUDENT CLIENT (참가 코드 입력)</span>
                          <div className="flex gap-2">
                            <input 
                              type="text"
                              value={roomIdInput}
                              onChange={(e) => setRoomIdInput(e.target.value)}
                              placeholder="코드 4자리"
                              maxLength={12}
                              className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-yellow-300 outline-none focus:border-cyan-500 font-black tracking-widest text-center uppercase"
                            />
                            <button
                              onClick={handleClientJoin}
                              className="px-3.5 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-[10px] rounded-lg shadow cursor-pointer transition-transform active:scale-95"
                            >
                              입장
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Active Sync connections display block */
                      <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-850 flex flex-col justify-between h-full min-h-[170px] text-xs font-mono">
                        <div>
                          {netRole && (
                            <div className="mb-3 bg-teal-500/10 border border-teal-500/20 p-2 rounded-xl flex items-center justify-between">
                              <div>
                                <span className="text-[8.5px] text-gray-400 font-bold block">
                                  {netRole === 'host' ? '학생 실시간 참여코드' : '연결된 방 코드'}
                                </span>
                                <span className="text-sm font-black text-yellow-300 tracking-wider block mt-0.5 select-all">{roomIdLive || "생성 중..."}</span>
                              </div>
                              <button
                                onClick={copyRoomCode}
                                className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition cursor-pointer text-gray-300 active:scale-95 flex items-center justify-center"
                                title="코드 복사"
                              >
                                {copiedCode ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                              </button>
                            </div>
                          )}
                          <div className="flex justify-between items-center text-[10px] border-b border-white/5 pb-1 mb-2">
                            <span className="text-teal-400 font-bold uppercase">CONNECT STATUS</span>
                            <span className="font-extrabold text-white">동조 인원: {participants.length}명</span>
                          </div>
                          <div className="text-[10px] text-gray-300 max-h-[85px] overflow-y-auto space-y-1">
                            {participants.map((p, idx) => (
                              <div key={p.peerId} className="flex justify-between items-center bg-slate-900/40 p-1 px-2 rounded">
                                <span className="truncate max-w-[120px]">{p.name} ({p.role === 'host' ? '방장' : '학생'})</span>
                                <span className="text-[8.5px] text-cyan-400">{p.lastOutcome ? '완주🏁' : '대기중'}</span>
                              </div>
                            ))}
                            {participants.length === 0 && (
                              <span className="text-gray-500 block text-center py-2">연결된 대전 라이더가 없습니다.</span>
                            )}
                          </div>
                        </div>

                        {/* Control actions */}
                        <div className="flex gap-2 mt-2 pt-2 border-t border-white/5">
                          {netRole === 'host' && (
                            <button 
                              onClick={() => launchRace()}
                              className="flex-1 py-1.5 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 text-slate-950 font-black text-[10px] cursor-pointer shadow active:scale-95 transition-all text-center"
                            >
                              동시 레이스 시동 🚀
                            </button>
                          )}
                          <button
                            onClick={handleDisconnectNetwork}
                            className="px-2.5 py-1.5 bg-red-950/80 border border-red-500/25 hover:bg-red-900 rounded-lg text-[9.5px] font-black text-red-400 shadow active:scale-95 cursor-pointer text-center"
                          >
                            종료
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tip banner */}
                  <div className="mt-3 bg-slate-950/40 p-2 rounded-xl border border-slate-850/60 text-[9.5px] text-slate-400 leading-normal text-center">
                    💡 <b>Tip:</b> 여러 명이 대전하지 않고 혼자 질주 주행하고 싶다면 하단의 <strong>'레이스 스타트 !!'</strong>를 터치하십시오.
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* MAIN TABBED CONTROLLER WORKSPACE (FLOATING GLASS OVERLAY MODAL) */}
          {activeMenuTab !== null && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
              <div className="relative max-w-4xl w-full bg-slate-900 border-2 border-slate-700 rounded-3xl p-6 shadow-2xl flex flex-col text-white max-h-[85vh] overflow-y-auto normal-scrollbar">
                
                {/* Modal Title / Close Button */}
                <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">
                      {activeMenuTab === 'gacha' ? '🎰' : activeMenuTab === 'maps' ? '🗺️' : activeMenuTab === 'modes' ? '🔥' : activeMenuTab === 'garage' ? '🎒' : '📔'}
                    </span>
                    <h3 className="text-md font-black text-white uppercase tracking-wider">
                      {activeMenuTab === 'gacha' && '카트 캡슐 행운상자 슈터 (Gacha Capsule Shop)'}
                      {activeMenuTab === 'maps' && '레이싱 트랙 맵 서킷 선택 (Choose Track Worlds)'}
                      {activeMenuTab === 'modes' && '게임 대결 경기 규칙 설정 (Setup Game Rules)'}
                      {activeMenuTab === 'garage' && '내 차고 기어 장비 보관소 (My Cart Garage)'}
                      {activeMenuTab === 'guide' && '초보자 레이서 드라이빙 가이드 (Guidebook)'}
                    </h3>
                  </div>
                  <button 
                    onClick={() => { triggerAudioInit(); setActiveMenuTab(null); }}
                    className="w-8 h-8 rounded-full bg-slate-950 border border-slate-800 hover:border-pink-500 hover:text-pink-400 text-gray-400 flex items-center justify-center font-black text-sm cursor-pointer transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <div className="w-full">
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
                      const difficultyColor = (m.difficulty === '★★★' || m.difficulty === '어려움') ? 'text-red-500' : (m.difficulty === '★★☆' || m.difficulty === '중') ? 'text-yellow-400' : 'text-green-450 text-green-400';
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
                        🎰 LUCKY CAPSULE MACHINE
                      </span>
                      <h4 className="text-lg font-black text-white mt-1.5">카트 캡슐 행운상자 슈터</h4>
                      <p className="text-xs text-gray-400 mt-1 max-w-[325px] leading-relaxed">
                        1회 주행 시 획득한 골드를 모아 <strong>100 Gold</strong>로 행운 상자를 뽑으세요. 만일 이미 보유 중인 중복 카트 바디를 획득할 경우, 보상 차원으로 <strong>50 Gold (50%)</strong>가 계정으로 자동 페이백 처리됩니다.
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

                          {netRole && (
                            <div className="mt-4 bg-slate-900/60 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
                              <div>
                                <span className="text-[8.5px] text-gray-500 font-bold block">
                                  {netRole === 'host' ? '학생 배포용 참여코드' : '연결된 방 코드'}
                                </span>
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
                        <p>
                          4. <b>코스 구조와 선택:</b> 커브가 많은 구간은 빨리 달리며 커브를 하기 힘들기에 고속 차량이 불편할 수 있습니다. 맵에 어울리는 스탯의 카트를 매칭해 보세요.
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
              </div>
            </div>
          )}

          {/* LOWER HUB ACTION STARTER */}
          <div className="w-full max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center bg-slate-900 shadow-xl border-x-2 border-t-2 border-pink-500 rounded-t-3xl px-6 md:px-8 py-4.5 py-4 gap-4 mt-2 z-10">
            <div className="text-center md:text-left">
              <span className="text-[9px] text-pink-400 font-black tracking-wider block uppercase font-mono">🏁 MATCH READY SETTINGS</span>
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

          {/* Floating Virtual Touch Controller for Mobile Mode */}
          {controlMode === 'mobile' && (
            <div className="absolute inset-x-0 bottom-28 md:bottom-24 z-40 flex justify-between px-4 sm:px-10 pointer-events-none select-none">
              {/* LEFT SIDE: STEERING BUTTONS */}
              <div className="flex space-x-4 pointer-events-auto">
                {/* TURN LEFT (ArrowLeft) */}
                <button
                  onTouchStart={(e) => { e.preventDefault(); keysPressedRef.current['ArrowLeft'] = true; }}
                  onTouchEnd={(e) => { e.preventDefault(); keysPressedRef.current['ArrowLeft'] = false; }}
                  onTouchCancel={(e) => { e.preventDefault(); keysPressedRef.current['ArrowLeft'] = false; }}
                  onMouseDown={(e) => { e.preventDefault(); keysPressedRef.current['ArrowLeft'] = true; }}
                  onMouseUp={(e) => { e.preventDefault(); keysPressedRef.current['ArrowLeft'] = false; }}
                  onMouseLeave={() => { keysPressedRef.current['ArrowLeft'] = false; }}
                  onPointerDown={(e) => {
                    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
                    keysPressedRef.current['ArrowLeft'] = true;
                  }}
                  onPointerUp={() => { keysPressedRef.current['ArrowLeft'] = false; }}
                  onPointerCancel={() => { keysPressedRef.current['ArrowLeft'] = false; }}
                  onPointerLeave={() => { keysPressedRef.current['ArrowLeft'] = false; }}
                  className="w-20 h-20 rounded-full bg-slate-900/90 active:bg-cyan-500 active:text-slate-950 text-white border-4 border-cyan-500/50 active:border-cyan-400 flex items-center justify-center text-3xl font-black shadow-xl transition-all active:scale-[0.85] select-none touch-none cursor-pointer"
                >
                  ◀
                </button>

                {/* TURN RIGHT (ArrowRight) */}
                <button
                  onTouchStart={(e) => { e.preventDefault(); keysPressedRef.current['ArrowRight'] = true; }}
                  onTouchEnd={(e) => { e.preventDefault(); keysPressedRef.current['ArrowRight'] = false; }}
                  onTouchCancel={(e) => { e.preventDefault(); keysPressedRef.current['ArrowRight'] = false; }}
                  onMouseDown={(e) => { e.preventDefault(); keysPressedRef.current['ArrowRight'] = true; }}
                  onMouseUp={(e) => { e.preventDefault(); keysPressedRef.current['ArrowRight'] = false; }}
                  onMouseLeave={() => { keysPressedRef.current['ArrowRight'] = false; }}
                  onPointerDown={(e) => {
                    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
                    keysPressedRef.current['ArrowRight'] = true;
                  }}
                  onPointerUp={() => { keysPressedRef.current['ArrowRight'] = false; }}
                  onPointerCancel={() => { keysPressedRef.current['ArrowRight'] = false; }}
                  onPointerLeave={() => { keysPressedRef.current['ArrowRight'] = false; }}
                  className="w-20 h-20 rounded-full bg-slate-900/90 active:bg-cyan-500 active:text-slate-950 text-white border-4 border-cyan-500/50 active:border-cyan-400 flex items-center justify-center text-3xl font-black shadow-xl transition-all active:scale-[0.85] select-none touch-none cursor-pointer"
                >
                  ▶
                </button>
              </div>

              {/* RIGHT SIDE: DRIVE & EXTREME BUTTONS */}
              <div className="flex flex-col items-end space-y-4 pointer-events-auto">
                <div className="flex space-x-3">
                  {/* SPEED ITEM SLINGER / BOOST ACTION (Space / triggerItemSlinger) */}
                  <button
                    onTouchStart={(e) => { e.preventDefault(); triggerItemSlinger(); }}
                    onMouseDown={(e) => { e.preventDefault(); triggerItemSlinger(); }}
                    onPointerDown={() => { triggerItemSlinger(); }}
                    className="w-16 h-16 rounded-full bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-500 active:brightness-125 border-4 border-pink-500/40 flex flex-col items-center justify-center text-white font-black shadow-2xl transition-all active:scale-90 animate-pulse cursor-pointer select-none touch-none"
                  >
                    <span className="text-xl leading-none">⚡</span>
                    <span className="text-[8px] font-mono tracking-tight mt-0.5 leading-none">BOOST</span>
                  </button>

                  {/* DRIFT CLUTCH (Shift) */}
                  <button
                    onTouchStart={(e) => { e.preventDefault(); keysPressedRef.current['Shift'] = true; }}
                    onTouchEnd={(e) => { e.preventDefault(); keysPressedRef.current['Shift'] = false; }}
                    onTouchCancel={(e) => { e.preventDefault(); keysPressedRef.current['Shift'] = false; }}
                    onMouseDown={(e) => { e.preventDefault(); keysPressedRef.current['Shift'] = true; }}
                    onMouseUp={(e) => { e.preventDefault(); keysPressedRef.current['Shift'] = false; }}
                    onMouseLeave={() => { keysPressedRef.current['Shift'] = false; }}
                    onPointerDown={(e) => {
                      try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
                      keysPressedRef.current['Shift'] = true;
                    }}
                    onPointerUp={() => { keysPressedRef.current['Shift'] = false; }}
                    onPointerCancel={() => { keysPressedRef.current['Shift'] = false; }}
                    onPointerLeave={() => { keysPressedRef.current['Shift'] = false; }}
                    className="w-20 h-20 rounded-3xl bg-slate-900/90 active:bg-yellow-500 active:text-slate-950 text-white border-4 border-yellow-500/50 active:border-yellow-400 flex flex-col items-center justify-center shadow-xl transition-all active:scale-[0.85] select-none touch-none cursor-pointer"
                  >
                    <span className="text-2xl leading-none">↩</span>
                    <span className="text-[10px] font-bold mt-1 tracking-wider font-display uppercase">DRIFT</span>
                  </button>
                </div>

                <div className="flex space-x-4 items-center">
                  {/* ENGINE BRAKE / REVERSE (ArrowDown) */}
                  <button
                    onTouchStart={(e) => { e.preventDefault(); keysPressedRef.current['ArrowDown'] = true; }}
                    onTouchEnd={(e) => { e.preventDefault(); keysPressedRef.current['ArrowDown'] = false; }}
                    onTouchCancel={(e) => { e.preventDefault(); keysPressedRef.current['ArrowDown'] = false; }}
                    onMouseDown={(e) => { e.preventDefault(); keysPressedRef.current['ArrowDown'] = true; }}
                    onMouseUp={(e) => { e.preventDefault(); keysPressedRef.current['ArrowDown'] = false; }}
                    onMouseLeave={() => { keysPressedRef.current['ArrowDown'] = false; }}
                    onPointerDown={(e) => {
                      try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
                      keysPressedRef.current['ArrowDown'] = true;
                    }}
                    onPointerUp={() => { keysPressedRef.current['ArrowDown'] = false; }}
                    onPointerCancel={() => { keysPressedRef.current['ArrowDown'] = false; }}
                    onPointerLeave={() => { keysPressedRef.current['ArrowDown'] = false; }}
                    className="w-16 h-16 rounded-2xl bg-slate-900/90 active:bg-red-500 active:text-white text-white border-4 border-red-500/50 active:border-red-400 flex items-center justify-center text-2xl font-black shadow-xl transition-all active:scale-[0.85] select-none touch-none cursor-pointer"
                  >
                    ▼
                  </button>

                  {/* ENGINE GO ACCEL (ArrowUp) */}
                  <button
                    onTouchStart={(e) => { e.preventDefault(); keysPressedRef.current['ArrowUp'] = true; }}
                    onTouchEnd={(e) => { e.preventDefault(); keysPressedRef.current['ArrowUp'] = false; }}
                    onTouchCancel={(e) => { e.preventDefault(); keysPressedRef.current['ArrowUp'] = false; }}
                    onMouseDown={(e) => { e.preventDefault(); keysPressedRef.current['ArrowUp'] = true; }}
                    onMouseUp={(e) => { e.preventDefault(); keysPressedRef.current['ArrowUp'] = false; }}
                    onMouseLeave={() => { keysPressedRef.current['ArrowUp'] = false; }}
                    onPointerDown={(e) => {
                      try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
                      keysPressedRef.current['ArrowUp'] = true;
                    }}
                    onPointerUp={() => { keysPressedRef.current['ArrowUp'] = false; }}
                    onPointerCancel={() => { keysPressedRef.current['ArrowUp'] = false; }}
                    onPointerLeave={() => { keysPressedRef.current['ArrowUp'] = false; }}
                    className="w-24 h-24 rounded-full bg-slate-900/90 active:bg-green-500 active:text-slate-950 text-green-450 text-green-400 border-4 border-green-500/50 active:border-green-400 flex flex-col items-center justify-center shadow-2xl transition-all active:scale-[0.85] select-none touch-none cursor-pointer"
                  >
                    <span className="text-[10px] tracking-widest font-black leading-none mb-1">ACCEL</span>
                    <span className="text-3xl leading-none">▲</span>
                  </button>
                </div>
              </div>
            </div>
          )}
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
