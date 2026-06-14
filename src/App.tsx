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

export interface AuraInfo {
  id: string;
  name: string;
  desc: string;
  price: number;
  color: string;
  hexColor: string;
  ambientText: string;
}

export const AURAS: AuraInfo[] = [
  {
    id: 'none',
    name: '기본 접지 하부 그늘',
    desc: '기본 제공되는 하부 디테일 그림자로 기체의 컴팩트한 밀착 지면 주행감을 돕습니다.',
    price: 0,
    color: 'text-slate-400',
    hexColor: '#475569',
    ambientText: '시작 기본 제공'
  },
  {
    id: 'neon_cyan',
    name: '사이버 사이언 네온 글로우',
    desc: '기체 밑면에서 지면으로 강렬한 네온 광원을 일렁이는 라이트 블루 미래형 서클.',
    price: 150,
    color: 'text-cyan-400',
    hexColor: '#06b6d4',
    ambientText: '150G 일시 구매'
  },
  {
    id: 'magma_ember',
    name: '붉은 마그마 펄스 코어',
    desc: '뜨거운 활화산 코어 용암의 에너지가 하부에서 분출되고 순환하는 마그마 구역.',
    price: 250,
    color: 'text-rose-500',
    hexColor: '#f43f5e',
    ambientText: '250G 일시 구매'
  },
  {
    id: 'cosmic_nebula',
    name: '스타더스트 오로라 네뷸라',
    desc: '오로라 성운과 은하 스타더스트 빔 성운을 띄워내는 초차원 퍼플 글로우 서클.',
    price: 450,
    color: 'text-purple-400',
    hexColor: '#a855f7',
    ambientText: '450G 일시 구매'
  },
  {
    id: 'golden_champion',
    name: '황금 엠퍼러 로열 이펙트',
    desc: '최고 영예인 황금 옥타곤 씰 스파클 격자 무늬가 휘돌아 수놓는 챔피언 광신 효과.',
    price: 650,
    color: 'text-yellow-400',
    hexColor: '#eab308',
    ambientText: '650G 일시 구매'
  }
];

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

  // Mobile virtual drag-steering state
  const [mobileSteerRatio, _setMobileSteerRatio] = useState<number>(0);
  const mobileSteerRatioRef = useRef<number>(0);
  const setMobileSteerRatio = (val: number) => {
    mobileSteerRatioRef.current = val;
    _setMobileSteerRatio(val);
  };

  // --- Extended Profile, Progression, Achievements & Ghost States ---
  const [level, setLevel] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('anime_level');
      return saved ? parseInt(saved, 10) : 1;
    } catch (e) { return 1; }
  });
  const [xp, setXp] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('anime_xp');
      return saved ? parseInt(saved, 10) : 0;
    } catch (e) { return 0; }
  });
  const [rankPoints, setRankPoints] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('anime_rank_points');
      return saved ? parseInt(saved, 10) : 350; // starts at Silver III
    } catch (e) { return 350; }
  });
  const [selectedTitle, setSelectedTitle] = useState<string>(() => {
    return localStorage.getItem('anime_selected_title') || '초보 라이더';
  });
  const [unlockedTitles, setUnlockedTitles] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('anime_unlocked_titles');
      return saved ? JSON.parse(saved) : ['초보 라이더', '동네 한바퀴'];
    } catch (e) { return ['초보 라이더', '동네 한바퀴']; }
  });
  const [selectedSkinColor, setSelectedSkinColor] = useState<string>(() => {
    return localStorage.getItem('anime_selected_skin') || 'default';
  });
  const [unlockedSkins, setUnlockedSkins] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('anime_unlocked_skins');
      return saved ? JSON.parse(saved) : ['default'];
    } catch (e) { return ['default']; }
  });
  const [selectedAuraId, setSelectedAuraId] = useState<string>(() => {
    return localStorage.getItem('anime_selected_aura') || 'none';
  });
  const [unlockedAuras, setUnlockedAuras] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('anime_unlocked_auras');
      return saved ? JSON.parse(saved) : ['none'];
    } catch (e) { return ['none']; }
  });
  const [bestTimes, setBestTimes] = useState<Record<string, { timeMs: number, timeStr: string, date: string }>>(() => {
    try {
      const saved = localStorage.getItem('anime_best_times');
      return saved ? JSON.parse(saved) : {};
    } catch (e) { return {}; }
  });
  const [selectedGhostMode, setSelectedGhostMode] = useState<'none' | 'my_best' | 'friend_ghost' | 'rival_1st'>('none');
  const [mapRecommendations, setMapRecommendations] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('anime_map_recs');
      return saved ? JSON.parse(saved) : {
        neon_sky_way: 124,
        cyberspace_tunnel: 245,
        cosmic_highway: 382,
        lava_crevice: 189,
        frozen_glacier: 156
      };
    } catch (e) {
      return { neon_sky_way: 124, cyberspace_tunnel: 245, cosmic_highway: 382, lava_crevice: 189, frozen_glacier: 156 };
    }
  });

  const [rankingsSubTab, setRankingsSubTab] = useState<'profile' | 'leaderboard' | 'achievements'>('profile');
  const [rankingFilter, setRankingFilter] = useState<'global' | 'friends' | 'time_attack' | 'season'>('global');
  const [crashCountThisRace, setCrashCountThisRace] = useState<number>(0);

  const [achievements, setAchievements] = useState<Array<{
    id: string;
    name: string;
    desc: string;
    target: number;
    current: number;
    completed: boolean;
    rewardClaimed: boolean;
    rewardGold: number;
    rewardTitle?: string;
    rewardSkin?: string;
  }>>(() => {
    const defaultAchievements = [
      { id: 'drift_count', name: '드리프트 매니아', desc: '코너 길목 드리프트 15회 주행 달성', target: 15, current: 0, completed: false, rewardClaimed: false, rewardGold: 300, rewardTitle: '아스팔트 마스터' },
      { id: 'use_booster', name: '질풍노도', desc: '순간 가속 질주 부스터 10회 점화', target: 10, current: 0, completed: false, rewardGold: 400, rewardTitle: '포뮬러 라이더' },
      { id: 'maps_cleared', name: '그랜드 투어러', desc: '서킷 완주 5회 완료', target: 5, current: 0, completed: false, rewardClaimed: false, rewardGold: 600, rewardTitle: '바람의 지배자', rewardSkin: 'magma_red' },
      { id: 'gacha_spins', name: '차고지 대부', desc: '행운의 뽑기 상점 3회 참여', target: 3, current: 0, completed: false, rewardClaimed: false, rewardGold: 200, rewardTitle: '수집 대마왕' },
      { id: 'time_under_65', name: '한계 돌파', desc: '스카이 웨이 완주 리포트 65초 미만 돌파', target: 1, current: 0, completed: false, rewardClaimed: false, rewardGold: 800, rewardTitle: '빛의 속도', rewardSkin: 'diamond_silver' },
      { id: 'no_crash_finish', name: '무결점 드라이버', desc: '기물이나 외벽 충돌 0회 상태로 레이스 완주', target: 1, current: 0, completed: false, rewardClaimed: false, rewardGold: 1000, rewardTitle: '신의 경지', rewardSkin: 'emerald_gold' },
      { id: 'all_maps_under_28', name: '한계 속도의 군주', desc: '모든 5개 트랙 각각 28초 이내 완주 기록 달성', target: 5, current: 0, completed: false, rewardClaimed: false, rewardGold: 2000, rewardTitle: '광속 지배자', rewardSkin: 'neon_pulse' }
    ];

    try {
      const saved = localStorage.getItem('anime_achievements');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const merged = defaultAchievements.map(def => {
            const existing = parsed.find(p => p.id === def.id);
            if (existing) {
              return { 
                ...def, 
                current: existing.current, 
                completed: existing.completed, 
                rewardClaimed: existing.rewardClaimed 
              };
            }
            return def;
          });
          return merged;
        }
      }
    } catch (e) {}
    return defaultAchievements;
  });

  // --- UI Layout & Navigation States ---
  // Reorganized lobby as unified full-width tabs
  const [activeMenuTab, setActiveMenuTab] = useState<'garage' | 'maps' | 'modes' | 'gacha' | 'multiplayer' | 'guide' | 'rankings' | null>(null);
  const [garageSubTab, setGarageSubTab] = useState<'kart' | 'aura' | 'tuning'>('kart');

  // --- Engine Tuning Upgrade States ---
  const [tuningUpgrades, setTuningUpgrades] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('anime_kart_tuning_v4');
      return saved ? JSON.parse(saved) : { speed: 1, accel: 1, handling: 1, drift: 1 };
    } catch {
      return { speed: 1, accel: 1, handling: 1, drift: 1 };
    }
  });

  useEffect(() => {
    localStorage.setItem('anime_kart_tuning_v4', JSON.stringify(tuningUpgrades));
  }, [tuningUpgrades]);

  const getUpgradedStats = (baseStats: { speed: number; accel: number; drift: number; handling: number }) => {
    if (!baseStats) return { speed: 1.15, accel: 0.02, drift: 1.8, handling: 0.03 };
    return {
      speed: baseStats.speed + (tuningUpgrades.speed - 1) * 0.045,
      accel: baseStats.accel + (tuningUpgrades.accel - 1) * 0.0016,
      drift: baseStats.drift + (tuningUpgrades.drift - 1) * 0.12,
      handling: baseStats.handling + (tuningUpgrades.handling - 1) * 0.0018,
    };
  };
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
  const [showFirstLaunchGuide, setShowFirstLaunchGuide] = useState<boolean>(() => {
    try {
      return localStorage.getItem('anime_has_seen_controls_v3') !== 'true';
    } catch {
      return true;
    }
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
    earnedXp?: number;
    levelUpAward?: string;
    earnedRp?: number;
    recordComparisonText?: string;
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
  }, [selectedKartId]);

  useEffect(() => {
    localStorage.setItem('anime_selected_map', selectedMapId);
    if (netManagerRef.current && netRole === 'host') {
      netManagerRef.current.hostSyncLobbyState(selectedMapId, gameMode);
    }
  }, [selectedMapId, gameMode, netRole]);

  useEffect(() => {
    localStorage.setItem('network_player_name', playerNameInput);
  }, [playerNameInput]);

  useEffect(() => {
    localStorage.setItem('anime_level', level.toString());
  }, [level]);

  useEffect(() => {
    localStorage.setItem('anime_xp', xp.toString());
  }, [xp]);

  useEffect(() => {
    localStorage.setItem('anime_rank_points', rankPoints.toString());
  }, [rankPoints]);

  useEffect(() => {
    localStorage.setItem('anime_selected_title', selectedTitle);
  }, [selectedTitle]);

  useEffect(() => {
    localStorage.setItem('anime_unlocked_titles', JSON.stringify(unlockedTitles));
  }, [unlockedTitles]);

  useEffect(() => {
    localStorage.setItem('anime_selected_skin', selectedSkinColor);
  }, [selectedSkinColor]);

  useEffect(() => {
    localStorage.setItem('anime_unlocked_skins', JSON.stringify(unlockedSkins));
  }, [unlockedSkins]);

  useEffect(() => {
    localStorage.setItem('anime_selected_aura', selectedAuraId);
  }, [selectedAuraId]);

  useEffect(() => {
    localStorage.setItem('anime_unlocked_auras', JSON.stringify(unlockedAuras));
  }, [unlockedAuras]);

  // Sync personal choices packet to other players in active multiplayer lobbies
  useEffect(() => {
    if (netManagerRef.current) {
      netManagerRef.current.updateMyStatus({
        kartId: selectedKartId,
        selectedAuraId: selectedAuraId,
        selectedSkinColor: selectedSkinColor,
        selectedTitle: selectedTitle,
        name: playerNameInput
      });
    }
  }, [selectedKartId, selectedAuraId, selectedSkinColor, selectedTitle, playerNameInput]);

  useEffect(() => {
    localStorage.setItem('anime_map_recs', JSON.stringify(mapRecommendations));
  }, [mapRecommendations]);

  // Unified progression & helper functions
  const getTierInfo = (points: number) => {
    if (points < 200) return { name: '브론즈 III', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', icon: '🥉', min: 0, max: 199 };
    if (points < 400) return { name: '브론즈 II', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', icon: '🥉', min: 200, max: 399 };
    if (points < 600) return { name: '브론즈 I', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', icon: '🥉', min: 400, max: 599 };
    if (points < 800) return { name: '실버 III', color: 'text-slate-350 bg-slate-300/10 border-slate-300/20', icon: '🥈', min: 600, max: 799 };
    if (points < 1000) return { name: '실버 II', color: 'text-slate-350 bg-slate-300/10 border-slate-300/20', icon: '🥈', min: 800, max: 999 };
    if (points < 1200) return { name: '실버 I', color: 'text-slate-350 bg-slate-300/10 border-slate-300/20', icon: '🥈', min: 1000, max: 1199 };
    if (points < 1500) return { name: '골드 III', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-500/20', icon: '🥇', min: 1200, max: 1499 };
    if (points < 1800) return { name: '골드 II', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-500/20', icon: '🥇', min: 1500, max: 1799 };
    if (points < 2100) return { name: '골드 I', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-500/20', icon: '🥇', min: 1800, max: 2099 };
    if (points < 2500) return { name: '플래티넘 III', color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20', icon: '💎', min: 2100, max: 2499 };
    if (points < 2900) return { name: '플래티넘 II', color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20', icon: '💎', min: 2500, max: 2889 };
    if (points < 3300) return { name: '플래티넘 I', color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20', icon: '💎', min: 2900, max: 3299 };
    if (points < 3800) return { name: '다이아몬드 III', color: 'text-violet-400 bg-violet-400/10 border-violet-400/25', icon: '👑', min: 3300, max: 3799 };
    if (points < 4300) return { name: '다이아몬드 II', color: 'text-violet-400 bg-violet-400/10 border-violet-400/25', icon: '👑', min: 3800, max: 4299 };
    return { name: '다이아몬드 I', color: 'text-rose-400 bg-rose-400/10 border-rose-400/25', icon: '🔥', min: 4300, max: 99999 };
  };

  const getSkinOverride = (skinId: string, baseColor: number, baseFlameColor: number) => {
    switch (skinId) {
      case 'magma_red':
        return { color: 0xff2222, flameColor: 0xff5500 };
      case 'diamond_silver':
        return { color: 0xe2e8f0, flameColor: 0xa5f3fc };
      case 'midnight_obsidian':
        return { color: 0x090d16, flameColor: 0xa855f7 };
      case 'emerald_gold':
        return { color: 0x10b981, flameColor: 0xeab308 };
      case 'neon_pulse':
        return { color: 0x06b6d4, flameColor: 0xf43f5e }; // Cyan body, Rose/pink flame
      default:
        return { color: baseColor, flameColor: baseFlameColor };
    }
  };

  const updateAchievementProgress = (id: string, amount: number, setAbsolute = false) => {
    setAchievements(prev => {
      const updated = prev.map(ach => {
        if (ach.id === id && !ach.completed) {
          const newCurrent = setAbsolute ? Math.min(ach.target, amount) : Math.min(ach.target, ach.current + amount);
          const completed = newCurrent >= ach.target;
          if (completed && !ach.completed) {
            triggerComicTextPop('🏆 업적 완수!', '#22c55e');
            showHUDNotification('업적 수당 갱신!', `[${ach.name}] 업적 조건을 완수했습니다!`);
          }
          return { ...ach, current: newCurrent, completed };
        }
        return ach;
      });
      localStorage.setItem('anime_achievements', JSON.stringify(updated));
      return updated;
    });
  };

  // Synchronize 'all_maps_under_28' progress based on best times
  useEffect(() => {
    const maps = ['neon_sky_way', 'cyberspace_tunnel', 'cosmic_highway', 'lava_crevice', 'frozen_glacier'];
    const count = maps.filter(mId => {
      const record = bestTimes[mId];
      return record && record.timeMs <= 28000;
    }).length;
    if (count > 0) {
      updateAchievementProgress('all_maps_under_28', count, true);
    }
  }, [bestTimes]);

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

  const activeSkin = getSkinOverride(selectedSkinColor, currentKart.color, currentKart.flameColor);
  const activeKartColor = activeSkin.color;
  const activeKartFlameColor = activeSkin.flameColor;

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
    netManager.myInfo.kartId = selectedKartId;
    netManager.myInfo.selectedAuraId = selectedAuraId;
    netManager.myInfo.selectedSkinColor = selectedSkinColor;
    netManager.myInfo.selectedTitle = selectedTitle;
    netManager.lobbyMapId = selectedMapId;
    netManager.lobbyGameMode = gameMode;
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
      showHUDNotification('완주 결과', `${outcome.name} 레이서가 완주를 완료했습니다.`);
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
    setRoomIdLive(cleanCode);
    const netManager = new PeerNetworkManager(playerNameInput);
    netManager.myInfo.kartId = selectedKartId;
    netManager.myInfo.selectedAuraId = selectedAuraId;
    netManager.myInfo.selectedSkinColor = selectedSkinColor;
    netManager.myInfo.selectedTitle = selectedTitle;
    netManagerRef.current = netManager;

    netManager.onConnectionStatus = (status) => setNetStatus(status);
    netManager.onPeerError = (err) => setNetError(err);
    netManager.onParticipantsChange = (list) => setParticipants(list);
    netManager.onRoomIdAssigned = (assignedId) => setRoomIdLive(assignedId);
    
    netManager.onLobbyStateReceived = (mapId, mode) => {
      setSelectedMapId(mapId);
      const matchedMode = mode as any;
      if (['speed','item','time_attack','ten_laps','coin_rush'].includes(matchedMode)) {
        setGameMode(matchedMode);
      }
    };

    netManager.onGameStartReceived = (mapId, mode) => {
      setSelectedMapId(mapId);
      const matchedMode = mode as any;
      if (['speed','item','time_attack','ten_laps','coin_rush'].includes(matchedMode)) {
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
        const keysToSend: Record<string, any> = { ...keysPressedRef.current };
        if (controlMode === 'mobile') {
          if (!keysToSend['ArrowDown']) {
            keysToSend['ArrowUp'] = true;
          }
          keysToSend['steerRatio'] = mobileSteerRatioRef.current;
        }
        engineRef.current.update(keysToSend, getUpgradedStats(currentKart.stats).drift);

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
  }, [gameState, currentKart, isMultiplayerActive, netRole, controlMode]);

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

    // Show the profile vs screen first
    setGameState('vsscreen');

    setTimeout(() => {
      // Transition to countdown after the matchup screen
      setGameState('countdown');
      setCurrentLap(1);
      setSpeedVal(0);
      setBoosterGauge(0);
      setBoosterStock(0);
      setActiveItem(null);
      setShieldActive(false);
      setCrashCountThisRace(0);

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

            // Compute ghost configuration if selected
            let ghostConfigParam = undefined;
            if (selectedGhostMode !== 'none') {
              let targetMs = 60000; // default 60s
              let colorHex = 0x22d3ee; // cyan for my best
              
              if (selectedGhostMode === 'my_best') {
                const personalBest = bestTimes[currentMap.id];
                targetMs = personalBest ? personalBest.timeMs : 75000;
                colorHex = 0x22d3ee; // cyan
              } else if (selectedGhostMode === 'friend_ghost') {
                const pTimes: Record<string, number> = {
                  neon_sky_way: 63500,
                  cyberspace_tunnel: 74200,
                  cosmic_highway: 81100,
                  lava_crevice: 71500,
                  frozen_glacier: 76800,
                };
                targetMs = pTimes[currentMap.id] || 75000;
                colorHex = 0xd946ef; // magenta/pink
              } else if (selectedGhostMode === 'rival_1st') {
                const pTimes: Record<string, number> = {
                  neon_sky_way: 52000,
                  cyberspace_tunnel: 61000,
                  cosmic_highway: 69000,
                  lava_crevice: 58000,
                  frozen_glacier: 64000,
                };
                targetMs = pTimes[currentMap.id] || 55000;
                colorHex = 0xeab308; // gorgeous gold
              }
              
              // Adjust factor according to gameMode lap multiplier limits
              const baseLaps = 3;
              const activeLaps = gameMode === 'time_attack' ? 1 : gameMode === 'ten_laps' ? 10 : 3;
              targetMs = Math.round(targetMs * (activeLaps / baseLaps));

              ghostConfigParam = {
                isGhost: true,
                targetTimeMs: targetMs,
                ghostColorHex: colorHex
              };
            }

            engineRef.current = new GameEngine(
              canvasContainerRef.current,
              currentMap,
              activeKartColor,
              activeKartFlameColor,
              selectedGhostMode !== 'none' ? (ghostConfigParam?.ghostColorHex || 0xfacc15) : 0xfacc15,
              getUpgradedStats(currentKart.stats),
              (lap) => {
                setCurrentLap(lap);
                triggerComicTextPop(`LAP ${lap}!`, '#22d3ee');
                const finalLapNumber = gameMode === 'time_attack' ? 1 : gameMode === 'ten_laps' ? 10 : 3;
                if (lap === finalLapNumber) {
                  showHUDNotification('FINAL LAP 돌입!', '마지막 완주를 시작하세요!');
                } else {
                  showHUDNotification(`LAP ${lap} 진입!`, '페이스를 높여 가속하세요!');
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
                showHUDNotification('피격 성공!', '라이벌 기체를 스핀시켰습니다.');
              },
              () => {
                triggerComicTextPop('CRASH!', '#ef4444');
                showHUDNotification('충돌 발생!', '벽이나 유도 트랩에 충돌했습니다.');
                setCrashCountThisRace(prev => prev + 1);
              },
              ghostConfigParam,
              gameMode,
              selectedAuraId
            );

            // Set coin collected callback inside Coin Rush Mode
            engineRef.current.onCoinCollected = () => {
              setGold(prev => prev + 3);
              triggerComicTextPop('+3 GOLD!', '#ffb700');
            };

            if (gameMode === 'time_attack') {
              engineRef.current.maxLaps = 1;
            } else if (gameMode === 'ten_laps') {
              engineRef.current.maxLaps = 10;
            } else {
              engineRef.current.maxLaps = 3;
            }

            engineRef.current.isSuperNitro = false;
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
    }, 3205);
  };

  const concludeRaceOutcome = (playerWon: boolean, finalTime: number) => {
    // Proportional gold formula scaled by target duration by game mode
    // Ensures a balanced economy around maximum 70 coins.
    const timeInSec = finalTime / 1000;
    
    // Set target expected durations for each mode (in seconds)
    let targetDurationSec = 75; // Standard 3 Laps (Speed/Item)
    if (gameMode === 'time_attack') {
      targetDurationSec = 25; // 1 Lap Time Attack
    } else if (gameMode === 'ten_laps') {
      targetDurationSec = 250; // 10 Laps Endurance
    } else if (gameMode === 'coin_rush') {
      targetDurationSec = 45; // Coin Rush Mode duration
    }

    // Time efficiency score ratio: is higher when player completes the race quick or around target duration.
    // Prevents exploiting long idling to stack up infinite time-based gold.
    const speedRatio = Math.max(0.1, Math.min(1.0, targetDurationSec / Math.max(8, timeInSec)));
    
    // Base gold reward depending on achievement of goal (won/succeeded or finished)
    // Scaled down to match the maximum limit of 70 coins.
    const baseCompletionGold = playerWon ? 40 : 25;
    
    // Efficiency/performance top-up gold (maximum 30 gold)
    const performanceGold = Math.round(speedRatio * 30);
    
    let rawGoldAwarded = baseCompletionGold + performanceGold;

    // Coin Rush game mode balance scale
    if (gameMode === 'coin_rush') {
      rawGoldAwarded = Math.min(45, rawGoldAwarded);
    }

    // Strictly cap the maximum race completion reward to 70 Gold (coins) as requested!
    const finalGoldAwarded = Math.min(70, rawGoldAwarded);

    const mins = Math.floor(finalTime / 60000);
    const secs = Math.floor((finalTime % 60000) / 1000);
    const mils = Math.floor((finalTime % 1000) / 10);
    const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${mils.toString().padStart(2, '0')}`;

    // Compute XP progressions & levels
    const earnedXp = 45;
    let finalLvl = level;
    let finalXp = xp + earnedXp;
    let lvlUpAlertStr = '';
    const xpRequired = level * 120;
    
    if (finalXp >= xpRequired) {
      finalXp -= xpRequired;
      finalLvl += 1;
      const lvlUpBonus = finalLvl * 150;
      setGold(prev => prev + lvlUpBonus);
      lvlUpAlertStr = `🎉 LEVEL UP! Lvl. ${finalLvl} 등급으로 특별 승격 (+${lvlUpBonus} Gold 수당 지급!)`;
      triggerComicTextPop('LEVEL UP!', '#22c55e');
      showHUDNotification('LEVEL UP!', `Lv. ${finalLvl} 드라이버 등급으로 승격되었습니다!`);
    }
    setLevel(finalLvl);
    setXp(finalXp);

    // Compute Rank Points (RP) Gained
    const earnedRp = playerWon ? 35 : 12;
    setRankPoints(prev => prev + earnedRp);

    // Record calculations & comparison vs previous personal bests
    const mapId = currentMap.id;
    const prevBestObj = bestTimes[mapId];
    let recordText = '';
    const todayStr = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\s/g, '').slice(0, -1);
    
    if (!prevBestObj || finalTime < prevBestObj.timeMs) {
      const newBestRecord = {
        timeMs: finalTime,
        timeStr: timeStr,
        date: todayStr
      };
      setBestTimes(prev => {
        const u = { ...prev, [mapId]: newBestRecord };
        localStorage.setItem('anime_best_times', JSON.stringify(u));
        return u;
      });

      if (prevBestObj) {
        const deltaSec = ((prevBestObj.timeMs - finalTime) / 1000).toFixed(2);
        const deltaPct = (((prevBestObj.timeMs - finalTime) / prevBestObj.timeMs) * 100).toFixed(1);
        recordText = `⚡ 최고기록 경신! 이전 대비 -${deltaSec}초 단축 (-${deltaPct}% 향상!) ⚡`;
      } else {
        recordText = `✨ 첫 완주 공식 기록 등록 완료! [${timeStr}] ✨`;
      }
    } else {
      const deltaSec = ((finalTime - prevBestObj.timeMs) / 1000).toFixed(2);
      const deltaPct = (((finalTime - prevBestObj.timeMs) / prevBestObj.timeMs) * 100).toFixed(1);
      recordText = `🐢 최고 기록 대비 +${deltaSec}초 지연 (+${deltaPct}% 격차) 🐢`;
    }

    // Trigger achievements increments
    try {
      updateAchievementProgress('maps_cleared', 1);
      updateAchievementProgress('drift_count', 4);
      updateAchievementProgress('use_booster', 3);
      if (currentMap.id === 'neon_sky_way' && finalTime < 65000) {
        updateAchievementProgress('time_under_65', 1);
      }
      if (crashCountThisRace === 0) {
        updateAchievementProgress('no_crash_finish', 1);
      }
    } catch (err) {
      console.error('Achievements update error:', err);
    }

    setFinishStats({
      playerWon,
      finalTimeStr: timeStr,
      earnedGold: finalGoldAwarded,
      earnedXp: earnedXp,
      levelUpAward: lvlUpAlertStr,
      earnedRp: earnedRp,
      recordComparisonText: recordText
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
      updateAchievementProgress('gacha_spins', 1);

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
              const legendaries = KARTS.filter(k => k.rarity === 'Legendary');
              finalKart = legendaries[Math.floor(Math.random() * legendaries.length)] || KARTS[KARTS.length - 1];
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

              <div className="flex items-stretch bg-slate-900/95 border-2 border-slate-800 p-2 text-white p-2 border-2 p-2.5 rounded-2xl shadow-xl space-x-3">
                <div className="flex flex-col justify-between items-center rounded-xl bg-gradient-to-tr from-indigo-700 to-violet-600 p-2 text-white font-black text-center min-w-[50px] shadow-md border border-violet-500/20">
                  <span className="text-[8px] uppercase opacity-75 font-mono">LEVEL</span>
                  <span className="text-md leading-none mt-0.5">{level}</span>
                  <span className="text-[7.5px] bg-slate-950/40 px-1 py-0.5 rounded mt-1.5 font-mono">{Math.floor((xp / (level * 120)) * 100)}%</span>
                </div>
                <div className="text-left font-mono flex flex-col justify-center">
                  <div className="text-[8.5px] text-pink-400 font-extrabold flex items-center space-x-1.5 mb-0.5 select-none">
                    <span className="bg-pink-500/10 border border-pink-500/20 px-1.5 py-0.5 rounded">🏷️ {selectedTitle}</span>
                    <span className="bg-violet-500/15 border border-violet-500/20 text-violet-400 px-1.5 py-0.5 rounded">{getTierInfo(rankPoints).icon} {getTierInfo(rankPoints).name}</span>
                  </div>
                  <div className="text-[10px] text-gray-400 font-bold uppercase flex items-center">
                    <User size={10} className="mr-1 text-pink-500" />
                    <input 
                      type="text" 
                      value={playerNameInput}
                      onChange={(e) => setPlayerNameInput(e.target.value)}
                      className="bg-transparent text-white outline-none border-b border-dashed border-pink-500/40 focus:border-pink-500 font-semibold py-0.5 text-xs w-28 font-sans"
                      placeholder="라이더 이름"
                    />
                  </div>
                  <div className="flex items-center text-yellow-400 font-black text-xs leading-none mt-1">
                    <Coins className="mr-1 text-yellow-400" size={12} />
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

                  {/* Button 4.5: Profiles, Rankings & Achievements */}
                  <button
                    onClick={() => { triggerAudioInit(); setActiveMenuTab('rankings'); }}
                    className="group relative w-full p-4.5 p-4 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950/90 border-2 border-slate-800 hover:border-violet-500 transition-all cursor-pointer flex items-center space-x-3.5 shadow-lg hover:scale-[1.02] text-left"
                  >
                    <div className="w-12 h-12 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center text-2xl shadow border border-violet-500/20 group-hover:scale-110 transition-transform">
                      🏆
                    </div>
                    <div>
                      <div className="text-[10px] text-violet-400 font-extrabold uppercase tracking-wide">LEAGUE RANKINGS</div>
                      <div className="text-white text-xs font-black">시즌 랭크 & 업적 달성</div>
                      <div className="text-[9.5px] text-gray-400 font-medium leading-none mt-1">티어 상태, 전적 비교, 고스트 가이드</div>
                    </div>
                    {achievements.some(a => a.completed && !a.rewardClaimed) && (
                      <span className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                    )}
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
                      {activeMenuTab === 'gacha' ? '🎰' : activeMenuTab === 'maps' ? '🗺️' : activeMenuTab === 'modes' ? '🔥' : activeMenuTab === 'garage' ? '🎒' : activeMenuTab === 'rankings' ? '🏆' : '📔'}
                    </span>
                    <h3 className="text-md font-black text-white uppercase tracking-wider">
                      {activeMenuTab === 'gacha' && '카트 캡슐 행운상자 슈터 (Gacha Capsule Shop)'}
                      {activeMenuTab === 'maps' && '레이싱 트랙 맵 서킷 선택 (Choose Track Worlds)'}
                      {activeMenuTab === 'modes' && '게임 대결 경기 규칙 설정 (Setup Game Rules)'}
                      {activeMenuTab === 'garage' && '내 차고 기어 장비 보관소 (My Cart Garage)'}
                      {activeMenuTab === 'guide' && '초보자 레이서 드라이빙 가이드 (Guidebook)'}
                      {activeMenuTab === 'rankings' && '시즌 랭킹 요약 및 드라이버 업적 훈련원 (Profiles & Season League)'}
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
              
              {activeMenuTab === 'garage' && (
                <motion.div
                  key="garage"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col space-y-5 w-full"
                >
                  {/* Aura Customization Navigation Sub-Tabs */}
                  <div className="flex bg-slate-950/80 p-1 border border-slate-800 rounded-2xl space-x-2 w-fit">
                    <button
                      onClick={() => { triggerAudioInit(); setGarageSubTab('kart'); }}
                      className={`px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 ${
                        garageSubTab === 'kart'
                          ? 'bg-pink-500 text-slate-950 shadow-md font-bolder'
                          : 'text-gray-400 hover:text-white hover:bg-slate-900'
                      }`}
                    >
                      <span>🏎️</span>
                      <span>보유 엔진 카트바디 ({unlockedKarts.length})</span>
                    </button>
                    <button
                      onClick={() => { triggerAudioInit(); setGarageSubTab('aura'); }}
                      className={`px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 ${
                        garageSubTab === 'aura'
                          ? 'bg-cyan-400 text-slate-950 shadow-md font-bolder'
                          : 'text-gray-400 hover:text-white hover:bg-slate-900'
                      }`}
                    >
                      <span>✨</span>
                      <span>카트 하부 데코 오우라 ({unlockedAuras.length})</span>
                    </button>
                    <button
                      onClick={() => { triggerAudioInit(); setGarageSubTab('tuning'); }}
                      className={`px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 ${
                        garageSubTab === 'tuning'
                          ? 'bg-amber-400 text-slate-950 shadow-md font-bolder'
                          : 'text-gray-400 hover:text-white hover:bg-slate-900'
                      }`}
                    >
                      <span>🔧</span>
                      <span>기체 엔진 성능 영구 튜닝 (Upgrades)</span>
                    </button>
                  </div>

                  {garageSubTab === 'aura' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-stretch">
                      {/* Left Column: List of All Auras */}
                      <div className="lg:col-span-5 bg-slate-900/80 border-2 border-slate-700/60 rounded-3xl p-5 flex flex-col space-y-4 shadow-xl">
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                          <h3 className="text-sm font-black text-cyan-400 flex items-center space-x-2">
                            <Sparkles size={16} />
                            <span>카트 하부 네온 데코 (Auras)</span>
                          </h3>
                          <span className="text-[10px] text-gray-400 font-mono">획득: {unlockedAuras.length} / {AURAS.length}</span>
                        </div>

                        <div className="flex flex-col space-y-3 max-h-[300px] overflow-y-auto pr-1">
                          {AURAS.map((aur) => {
                            const isUnlocked = unlockedAuras.includes(aur.id);
                            const isEquipped = selectedAuraId === aur.id;
                            return (
                              <div
                                key={aur.id}
                                className={`p-3 rounded-2xl border text-left flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${
                                  isEquipped
                                    ? 'bg-slate-950/90 border-cyan-500 shadow-[0_0_15px_rgba(34,211,238,0.25)]'
                                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                                }`}
                              >
                                <div className="flex items-start justify-between w-full">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2">
                                      <span className={`text-xs font-black ${aur.color}`}>{aur.name}</span>
                                      {isEquipped && (
                                        <span className="bg-cyan-405 text-slate-950 text-[7px] px-1 font-black rounded font-mono uppercase tracking-wider animate-pulse" style={{ backgroundColor: '#22d3ee' }}>
                                          ACTIVE
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-1 max-w-[200px] leading-tight">
                                      {aur.desc}
                                    </p>
                                  </div>
                                  
                                  <div className="flex flex-col items-end space-y-2">
                                    <span className="text-[8px] font-mono font-bold text-gray-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                      {aur.ambientText}
                                    </span>
                                    {isUnlocked ? (
                                      isEquipped ? (
                                        <span className="text-cyan-400 font-black text-[9px] flex items-center space-x-0.5 mt-1">
                                          <span>✓ 장착중</span>
                                        </span>
                                      ) : (
                                        <button
                                          onClick={() => {
                                            triggerAudioInit();
                                            setSelectedAuraId(aur.id);
                                            showHUDNotification('데코 정밀 장착', `${aur.name} 오우라 장착 완료!`);
                                          }}
                                          className="text-[9px] cursor-pointer bg-slate-850 hover:bg-slate-800 border border-slate-700 text-gray-300 hover:text-white px-2 py-1 rounded-lg font-bold transition-all"
                                        >
                                          장착하기
                                        </button>
                                      )
                                    ) : (
                                      <button
                                        onClick={() => {
                                          triggerAudioInit();
                                          if (gold >= aur.price) {
                                            setGold(prev => prev - aur.price);
                                            const updated = [...unlockedAuras, aur.id];
                                            setUnlockedAuras(updated);
                                            localStorage.setItem('anime_unlocked_auras', JSON.stringify(updated));
                                            setSelectedAuraId(aur.id);
                                            showHUDNotification('오우라 구매 성공', `${aur.name}를 해금하고 장착했습니다!`);
                                            triggerComicTextPop('UNLOCK!', '#22d3ee');
                                          } else {
                                            showHUDNotification('골드 부족', '상점 아이템을 구매하기 위한 골드가 부족합니다.');
                                            triggerComicTextPop('NO GOLD', '#ef4444');
                                          }
                                        }}
                                        className="text-[9px] cursor-pointer bg-cyan-400 hover:bg-cyan-300 text-slate-950 px-2 py-1 rounded-lg font-black transition-all flex items-center space-x-1 shadow-md hover:shadow-cyan-500/20"
                                      >
                                        <span>🛒</span>
                                        <span>{aur.price}G 구매</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Right Column: Holographic preview simulated box */}
                      <div className="lg:col-span-7 bg-slate-900/80 border-2 border-slate-700/60 rounded-3xl p-6 flex flex-col justify-between shadow-xl">
                        <div className="border-b border-white/5 pb-3">
                          <span className="text-[9px] font-black px-2.5 py-0.5 rounded uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            하부 특수 조명 파티클 엔진
                          </span>
                          
                          {(() => {
                            const activeAura = AURAS.find(a => a.id === selectedAuraId) || AURAS[0];
                            return (
                              <>
                                <h4 className="text-xl font-black text-white mt-1.5 flex items-center">
                                  <Sparkles className="mr-2 text-cyan-400" size={18} />
                                  <span>{activeAura.name}</span>
                                </h4>
                                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                                  {activeAura.desc}
                                </p>
                              </>
                            );
                          })()}
                        </div>

                        {/* Interactive Holographic Wireframe Kart Spinning Over Aura simulation */}
                        <div className="my-4 bg-slate-950 rounded-2xl border border-slate-850 p-4 relative flex flex-col items-center justify-center min-h-[160px] overflow-hidden">
                          {(() => {
                            const activeAura = AURAS.find(a => a.id === selectedAuraId) || AURAS[0];
                            return (
                              <div 
                                className="absolute w-[220px] h-[75px] rounded-[50%] blur-2xl opacity-45 mix-blend-screen animate-pulse pointer-events-none transition-all duration-700"
                                style={{ 
                                  backgroundColor: activeAura.hexColor,
                                  bottom: '5%',
                                  transform: 'scaleY(0.4)'
                                }}
                              />
                            );
                          })()}

                          <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.03)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)]" />

                          {(() => {
                            const activeAura = AURAS.find(a => a.id === selectedAuraId) || AURAS[0];
                            if (activeAura.id === 'none') {
                              return (
                                <div className="z-10 w-24 h-6 border-2 border-dashed border-slate-850 rounded-[50%] flex items-center justify-center transform -rotate-12 mt-12 mb-4" />
                              );
                            }
                            return (
                              <motion.div
                                animate={{ rotateX: 68, rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 4.8, ease: "linear" }}
                                style={{ borderColor: activeAura.hexColor }}
                                className="z-10 w-24 h-24 border-4 border-double rounded-full flex items-center justify-center transform mt-4 mb-2 shadow-[0_0_20px_inset_rgba(34,211,238,0.1)] relative"
                              >
                                <div 
                                  style={{ borderColor: activeAura.hexColor }}
                                  className="w-[72%] h-[72%] border border-dashed rounded-full animate-spin [animation-duration:3s]" 
                                />
                                <span className="absolute w-2 h-2 rounded-full -top-1 left-8 animate-ping" style={{ backgroundColor: activeAura.hexColor }} />
                                <span className="absolute w-1.5 h-1.5 rounded-full bottom-4 -right-1" style={{ backgroundColor: activeAura.hexColor }} />
                              </motion.div>
                            );
                          })()}

                          <div className="z-10 mt-2 text-[8px] font-mono tracking-widest text-slate-500 flex items-center space-x-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-bounce" />
                            <span>TUNING PREVIEW MODULE / ACTIVE REALTIME</span>
                          </div>
                        </div>

                        <div className="bg-slate-950/80 rounded-2xl p-2 px-4 border border-dashed border-slate-850 flex justify-between items-center text-[10.5px]">
                          <span className="text-gray-400 font-medium font-mono">가챠 상점 및 맵 미션 보상 골드로 하부 아우라 튜닝 키트를 추가로 수집하십시오.</span>
                          <span className="text-cyan-400 font-black">★ TUNING ENABLED</span>
                        </div>
                      </div>
                    </div>
                  ) : garageSubTab === 'tuning' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-stretch">
                      {/* Left Column: Currently Equipped Kart & Status Indicators */}
                      <div className="lg:col-span-5 bg-slate-900/80 border-2 border-slate-700/60 rounded-3xl p-5 flex flex-col space-y-4 shadow-xl justify-between">
                        <div>
                          <div className="border-b border-white/5 pb-2">
                            <h3 className="text-sm font-black text-amber-400 flex items-center space-x-2">
                              <span>🏎️</span>
                              <span>튜닝 대상 기어 사양</span>
                            </h3>
                          </div>
                          <div className="mt-4 bg-slate-950 p-4 rounded-2xl border border-slate-850 relative overflow-hidden">
                            <div className="absolute top-3 right-3 flex items-center space-x-1.5">
                              <span className="w-2.5 h-2.5 rounded-full border border-white/40 shadow shadow-[0_0_8px_rgba(255,255,255,0.4)]" style={{ backgroundColor: `#${currentKart.color.toString(16).padStart(6, '0')}` }} />
                            </div>
                            <span className="text-[9px] font-mono tracking-widest text-slate-500 block uppercase">TUNING ACTIVE TARGET</span>
                            <h4 className="text-lg font-black text-white mt-1">{currentKart.name}</h4>
                            <p className="text-[10.5px] text-slate-400 mt-1 lines-clamp-2 leading-relaxed h-[36px] overflow-hidden">
                              {currentKart.description}
                            </p>
                          </div>
                        </div>

                        {/* Tuning Statistics Preview */}
                        <div className="space-y-4 font-mono mt-2">
                          <span className="text-[10px] font-black text-amber-400 block tracking-widest border-b border-white/5 pb-1 uppercase">★ REALTIME UPGRADED LAUNCH SPECS</span>
                          
                          {/* Stat item 1 */}
                          <div>
                            <div className="flex justify-between text-[11px] mb-1">
                              <span className="text-gray-400">최고 속도 성능 (SPEED)</span>
                              <div className="flex space-x-1.5 items-center">
                                <span className="text-gray-500 line-through">{(currentKart.stats.speed * 180).toFixed(0)}</span>
                                <span className="text-pink-400 font-extrabold">→ {(getUpgradedStats(currentKart.stats).speed * 180).toFixed(0)} km/h</span>
                              </div>
                            </div>
                            <div className="h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-850 flex items-center p-[1px]">
                              <div className="h-full bg-slate-800 rounded-full" style={{ width: `${(currentKart.stats.speed / 1.8) * 100}%` }} />
                              <div className="h-full bg-pink-500 rounded-full animate-pulse" style={{ width: `${((getUpgradedStats(currentKart.stats).speed - currentKart.stats.speed) / 1.8) * 100}%` }} />
                            </div>
                          </div>

                          {/* Stat item 2 */}
                          <div>
                            <div className="flex justify-between text-[11px] mb-1">
                              <span className="text-gray-400">추진 가속력 (ACCELERATION)</span>
                              <div className="flex space-x-1.5 items-center">
                                <span className="text-gray-500 line-through">{(currentKart.stats.accel * 10000).toFixed(0)}</span>
                                <span className="text-cyan-400 font-extrabold">→ {(getUpgradedStats(currentKart.stats).accel * 10000).toFixed(0)} CP</span>
                              </div>
                            </div>
                            <div className="h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-850 flex items-center p-[1px]">
                              <div className="h-full bg-slate-800 rounded-full" style={{ width: `${(currentKart.stats.accel / 0.05) * 100}%` }} />
                              <div className="h-full bg-cyan-400 rounded-full animate-pulse" style={{ width: `${((getUpgradedStats(currentKart.stats).accel - currentKart.stats.accel) / 0.05) * 100}%` }} />
                            </div>
                          </div>

                          {/* Stat item 3 */}
                          <div>
                            <div className="flex justify-between text-[11px] mb-1">
                              <span className="text-gray-400">드리프트 게이지 효율 (DRIFT)</span>
                              <div className="flex space-x-1.5 items-center">
                                <span className="text-gray-500 line-through font-normal">{(currentKart.stats.drift * 50).toFixed(0)}</span>
                                <span className="text-yellow-400 font-extrabold">→ {(getUpgradedStats(currentKart.stats).drift * 50).toFixed(0)} DP</span>
                              </div>
                            </div>
                            <div className="h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-850 flex items-center p-[1px]">
                              <div className="h-full bg-slate-800 rounded-full" style={{ width: `${(currentKart.stats.drift / 4.0) * 100}%` }} />
                              <div className="h-full bg-yellow-400 rounded-full animate-pulse" style={{ width: `${((getUpgradedStats(currentKart.stats).drift - currentKart.stats.drift) / 4.0) * 100}%` }} />
                            </div>
                          </div>

                          {/* Stat item 4 */}
                          <div>
                            <div className="flex justify-between text-[11px] mb-1">
                              <span className="text-gray-400">코너 핸들링 감도 (HANDLING)</span>
                              <div className="flex space-x-1.5 items-center">
                                <span className="text-gray-500 line-through">{(currentKart.stats.handling * 1000).toFixed(0)}</span>
                                <span className="text-purple-400 font-extrabold">→ {(getUpgradedStats(currentKart.stats).handling * 1000).toFixed(0)} HP</span>
                              </div>
                            </div>
                            <div className="h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-850 flex items-center p-[1px]">
                              <div className="h-full bg-slate-800 rounded-full" style={{ width: `${(currentKart.stats.handling / 0.06) * 100}%` }} />
                              <div className="h-full bg-purple-500 rounded-full animate-pulse" style={{ width: `${((getUpgradedStats(currentKart.stats).handling - currentKart.stats.handling) / 0.06) * 100}%` }} />
                            </div>
                          </div>
                        </div>

                        <div className="bg-slate-950 p-2.5 rounded-2xl text-[9.5px] border border-slate-850 text-gray-400 font-mono text-center mt-2">
                          💡 튜닝 강화 레벨은 차고 내 전체 카트바디 기체에 공통 영구 적용됩니다.
                        </div>
                      </div>

                      {/* Right Column: Interactive Upgrade Control */}
                      <div className="lg:col-span-7 bg-slate-900/80 border-2 border-slate-700/60 rounded-3xl p-6 flex flex-col justify-between shadow-xl">
                        <div className="border-b border-white/5 pb-2.5 flex items-center justify-between">
                          <h4 className="text-sm font-black text-white flex items-center space-x-2">
                            <span>🔧</span>
                            <span>성능 엔지니어링 메인 프레임</span>
                          </h4>
                          <span className="text-[10px] font-mono text-amber-400 font-black tracking-wider px-2.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/25 animate-pulse">
                            ACTIVE STAGE POWER: Level {(Object.values(tuningUpgrades) as number[]).reduce((a, b) => a + b, 0)}
                          </span>
                        </div>

                        {/* Upgrade Selection Rows */}
                        <div className="flex-1 flex flex-col justify-center space-y-3.5 py-3 font-mono">
                          {(() => {
                            const upgradeFields = [
                              { key: 'speed', title: '엔진 보어업 대구경 튜닝 (Speed)', icon: '⚡', color: 'bg-pink-500', desc: '기체의 최고 한계 속도를 대폭 증강 제어합니다.' },
                              { key: 'accel', title: '나이트로 하이퍼 부스터 인젝션 (Accel)', icon: '🚀', color: 'bg-cyan-405', desc: '초동 가속 반응속도 및 부스터 연소 추진 속도를 한계 돌파시킵니다.', customCyan: true },
                              { key: 'drift', title: '특수 하중 재분배 섀시 경량화 (Drift)', icon: '↩', color: 'bg-yellow-405', desc: '코너 드리프트 활주 시 부스터 게이지의 충전 차징 속도를 촉진합니다.', customYellow: true },
                              { key: 'handling', title: '초밀착 레이싱 소프트 타이어 (Handling)', icon: '🌀', color: 'bg-purple-500', desc: '미끄러짐 계수를 낮추고 곡선 조향 시 미장 반사 응답율을 강화합니다.', customPurple: true }
                            ];

                            const getCost = (lvl: number) => {
                              if (lvl === 1) return 250;
                              if (lvl === 2) return 450;
                              if (lvl === 3) return 700;
                              if (lvl === 4) return 1200;
                              return 0; // Max level
                            };

                            return upgradeFields.map((field) => {
                              const currentLevel = tuningUpgrades[field.key] || 1;
                              const cost = getCost(currentLevel);
                              const isMax = currentLevel >= 5;

                              const handleUpgradeAction = () => {
                                triggerAudioInit();
                                if (isMax) return;
                                if (gold >= cost) {
                                  setGold(prev => prev - cost);
                                  const updated = { ...tuningUpgrades, [field.key]: currentLevel + 1 };
                                  setTuningUpgrades(updated);
                                  showHUDNotification('기체 영구 튜닝 성공', `${field.title} Lv.${currentLevel + 1} 강화 성공!`);
                                  triggerComicTextPop('SUCCESS!', '#eab308');
                                  try {
                                    AudioEngine.playBoost();
                                  } catch (e) {}
                                } else {
                                  showHUDNotification('강화 크리스탈 부족', '개조 및 성능 부품을 튜닝하기 위한 보유 골드가 부족합니다.');
                                  triggerComicTextPop('NO GOLD', '#ef4444');
                                }
                              };

                              return (
                                <div key={field.key} className="bg-slate-950 p-3 rounded-2xl border border-slate-850 flex items-center justify-between space-x-3 hover:border-slate-750 transition-colors">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2 flex-wrap gap-1">
                                      <span className="text-base">{field.icon}</span>
                                      <span className="text-xs font-black text-white truncate max-w-[180px] sm:max-w-none">{field.title}</span>
                                      <span className="text-[9px] font-black text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 font-mono">Lv.{currentLevel}</span>
                                    </div>
                                    <p className="text-[9px] text-gray-400 mt-1 leading-relaxed max-w-[340px] truncate sm:whitespace-normal">
                                      {field.desc}
                                    </p>

                                    {/* Level Dots Track */}
                                    <div className="flex space-x-1 mt-2">
                                      {[1, 2, 3, 4, 5].map((lvl) => (
                                        <div 
                                          key={lvl} 
                                          className={`w-[26px] h-1.5 rounded-full transition-all duration-300 ${
                                            lvl <= currentLevel 
                                              ? field.customCyan ? 'bg-cyan-400' : field.customYellow ? 'bg-yellow-400' : field.customPurple ? 'bg-purple-500' : 'bg-pink-500'
                                              : 'bg-slate-800'
                                          }`} 
                                        />
                                      ))}
                                    </div>
                                  </div>

                                  <div className="shrink-0">
                                    {isMax ? (
                                      <span className="text-[9px] font-black text-emerald-450 text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 px-2.5 py-1.5 rounded-xl uppercase tracking-wider block text-center">
                                        MAXED
                                      </span>
                                    ) : (
                                      <button
                                        onClick={handleUpgradeAction}
                                        className="px-3 py-1.5 cursor-pointer rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 active:scale-95 text-slate-950 text-[10.5px] font-black flex items-center space-x-1 shadow-md hover:shadow-yellow-500/10 transition-all whitespace-nowrap"
                                      >
                                        <span>⚙️</span>
                                        <span>{cost}G 강화</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-stretch">
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
                          <span className="text-gray-450 text-gray-400 font-medium font-mono">선택한 카트는 레이싱 중 실시간 3D 가속도 모델로 구현됩니다.</span>
                          <span className="text-pink-500 font-black">★ ACTIVE RETAINED</span>
                        </div>
                      </div>
                    </div>
                  )}
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
                      const recCount = mapRecommendations[m.id] || 0;
                      const personalBest = bestTimes[m.id];
                      const bestTimeStr = personalBest ? personalBest.timeStr : '기록 없음';

                      return (
                        <button
                          key={m.id}
                          onClick={() => {
                            triggerAudioInit();
                            setSelectedMapId(m.id);
                          }}
                          className={`relative flex flex-col justify-between text-left p-4 bg-slate-950 rounded-2xl border-2 transition-all min-h-[220px] cursor-pointer group hover:-translate-y-0.5 ${
                            isSelected 
                              ? 'border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.35)] bg-cyan-950/15' 
                              : 'border-slate-800/80 hover:border-slate-600 hover:bg-slate-900'
                          }`}
                        >
                          <div className={`absolute top-0 right-0 w-20 h-20 rounded-full blur-xl opacity-3 group-hover:scale-125 transition-all bg-${m.themeColor}/10`} />

                          <div className="z-10 w-full">
                            <div className="flex justify-between items-center mb-1.5">
                              <span className={`text-[8.5px] font-mono font-bold tracking-widest uppercase ${difficultyColor}`}>
                                난이도: {m.difficulty}
                              </span>
                              
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  triggerAudioInit();
                                  setMapRecommendations(prev => {
                                    const updated = { ...prev, [m.id]: (prev[m.id] || 0) + 1 };
                                    localStorage.setItem('anime_map_recs', JSON.stringify(updated));
                                    return updated;
                                  });
                                  showHUDNotification('수려한 코스 추천 👍', `[${m.name.split(' (')[0]}] 트랙에 응원의 에너지를 보냈습니다!`);
                                }}
                                className="text-[10px] text-pink-400 font-extrabold flex items-center space-x-1 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/20 px-1.5 py-0.5 rounded transition-colors"
                                title="코스 추천하기"
                              >
                                <span>👍</span>
                                <span className="font-mono">{recCount}</span>
                              </div>
                            </div>

                            <h4 className="text-sm font-black text-white group-hover:text-cyan-300 transition-colors leading-snug">
                              {m.name.split(' (')[0]}
                            </h4>

                            <div className="text-[9.5px] text-emerald-400 font-bold font-mono mt-1 flex items-center">
                              <span className="mr-1">⏱️ Best:</span>
                              <span className="bg-emerald-950/35 border border-emerald-500/20 px-1 py-0.2 rounded">{bestTimeStr}</span>
                            </div>

                            <p className="text-[10px] text-slate-400 mt-2.5 line-clamp-3 leading-relaxed font-sans">
                              {m.description}
                            </p>
                          </div>

                          <div className="mt-4 flex items-center justify-between z-10 w-full pt-1.5 border-t border-white/5">
                            <span className="text-[9px] text-slate-500 font-semibold tracking-wider font-mono">3D CATMULL</span>
                            {isSelected ? (
                              <span className="bg-cyan-400 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded shadow">
                                READY
                              </span>
                            ) : (
                              <span className="text-[9px] text-gray-400 font-bold group-hover:text-cyan-400/80 transition-colors flex items-center">
                                선택 <ChevronRight size={10} className="ml-0.5" />
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Dynamic Ghost Partner Setup Dock */}
                  <div className="mt-5 bg-slate-950/70 p-4 border border-slate-800 rounded-2xl">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-sm">👻</span>
                      <h4 className="text-xs font-black uppercase tracking-wider text-cyan-400 font-mono">
                        고스트 드라이버 연동 (Time Attack Ghost)
                      </h4>
                    </div>
                    <p className="text-[10px] text-slate-400 mb-3.5 leading-snug font-sans">
                      내가 달렸던 최고 기록이나 가상의 고스트 가이드 차량을 소환하여 코너링과 기록 단축을 함께 주행하며 연습합니다.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      {[
                        { id: 'none', label: '고스트 가이드 없음', desc: '고스트 없이 라이벌 AI 차량과 일대일 대결을 진행합니다.', icon: '❌', theme: 'border-slate-800 hover:border-slate-700' },
                        { id: 'my_best', label: '내 최고기록 클론', desc: `내 예전 최고 완주 시간 (${bestTimes[selectedMapId]?.timeStr || '기록 없음'}) 패턴과 매치합니다.`, icon: '👤', theme: 'border-cyan-500/20 hover:border-cyan-400/40' },
                        { id: 'friend_friend', label: '초대 친구 가이드', desc: '초대한 동료 레이서가 앞서 달린 주행라인을 복제하여 추종합니다.', icon: '👥', theme: 'border-pink-500/20 hover:border-pink-400/40' },
                        { id: 'rival_top', label: '서킷 월드 챔피언', desc: '서킷 최고 기록 챔피언의 절대 주행선 궤적을 뒤따르며 선을 깎아갑니다.', icon: '👑', theme: 'border-yellow-500/20 hover:border-yellow-400/40' }
                      ].map((opt) => {
                        const optionIdMapped = opt.id === 'friend_friend' ? 'friend_ghost' : opt.id === 'rival_top' ? 'rival_1st' : opt.id;
                        const isGhostActive = selectedGhostMode === optionIdMapped;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              triggerAudioInit();
                              setSelectedGhostMode(optionIdMapped as any);
                              showHUDNotification('고스트 가이드 동조', `[${opt.label}] 시그널이 다음 주행에 준비되었습니다.`);
                            }}
                            className={`p-2.5 rounded-xl bg-slate-900 border-2 text-left cursor-pointer transition-all ${
                              isGhostActive 
                                ? 'border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.15)] bg-cyan-950/10' 
                                : opt.theme
                            }`}
                          >
                            <div className="flex items-center space-x-1 mb-1">
                              <span className="text-xs">{opt.icon}</span>
                              <span className={`text-[10.5px] font-black ${isGhostActive ? 'text-cyan-400' : 'text-white'}`}>
                                {opt.label}
                              </span>
                            </div>
                            <p className="text-[9px] text-gray-400 leading-normal">
                              {opt.desc}
                            </p>
                          </button>
                        );
                      })}
                    </div>
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
                      <span>원하는 레이싱 경기 규칙 설정 (Play Modes)</span>
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      각 모드는 주행 조건, 완주 바퀴 수, 트랙 내 특수 상자나 수집용 골드 코인 배치 여부가 각기 상이합니다.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {/* Mode 1 */}
                    <button
                      type="button"
                      onClick={() => { triggerAudioInit(); setGameMode('speed'); }}
                      className={`flex flex-col justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all text-left min-h-[170px] ${
                        gameMode === 'speed' 
                          ? 'bg-pink-950/25 border-pink-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.3)]' 
                          : 'bg-slate-950 border-slate-800/80 text-gray-400 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      <div>
                        <span className="text-[9px] font-black tracking-widest text-pink-500 block uppercase mb-1">STABLE SPEED</span>
                        <h4 className="text-sm font-black text-white">클래식 스피드전</h4>
                        <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                          순수한 드리프트 컨트롤과 매끄러운 수동 부스터 활용도만으로 3바퀴 서킷을 전력 완주하며 기록을 세우는 공식 주행 모드입니다.
                        </p>
                      </div>
                      <span className="text-[9px] font-mono text-slate-500 font-black block mt-2">⏱️ 3바퀴 제한 완주</span>
                    </button>

                    {/* Mode 2 */}
                    <button
                      type="button"
                      onClick={() => { triggerAudioInit(); setGameMode('item'); }}
                      className={`flex flex-col justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all text-left min-h-[170px] ${
                        gameMode === 'item' 
                          ? 'bg-yellow-950/20 border-yellow-500 text-white shadow-[0_0_12px_rgba(234,179,8,0.3)]' 
                          : 'bg-slate-950 border-slate-800/80 text-gray-300 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      <div>
                        <span className="text-[9px] font-black tracking-widest text-yellow-500 block uppercase mb-1">ITEM CRASH</span>
                        <h4 className="text-sm font-black text-white">아이템 대전</h4>
                        <p className="text-[10px] text-slate-450 text-slate-400 mt-2 leading-relaxed">
                          트랙 도처의 아이템 상자를 획득하여 유도 미사일, 방어용 실드, 속도 부스터, 미끄러짐 바나나 등으로 난투를 펼칩니다.
                        </p>
                      </div>
                      <span className="text-[9px] font-mono text-slate-500 font-black block mt-2">🎁 복합 아이템전</span>
                    </button>

                    {/* Mode 3 */}
                    <button
                      type="button"
                      onClick={() => { triggerAudioInit(); setGameMode('time_attack'); }}
                      className={`flex flex-col justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all text-left min-h-[170px] ${
                        gameMode === 'time_attack' 
                          ? 'bg-cyan-950/25 border-cyan-400 text-white shadow-[0_0_12px_rgba(34,211,238,0.3)]' 
                          : 'bg-slate-950 border-slate-800/80 text-gray-300 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      <div>
                        <span className="text-[9px] font-black tracking-widest text-cyan-400 block uppercase mb-1">ONE-LAP SHORT</span>
                        <h4 className="text-sm font-black text-white">1바퀴 타임어택</h4>
                        <p className="text-[10px] text-slate-450 text-slate-400 mt-2 leading-relaxed">
                          길거나 지루한 분리 없이, 깔금하게 한 바퀴(1 Lap) 전 주행으로 코스를 돌파해 즉시 기록 우위를 경신해보세요.
                        </p>
                      </div>
                      <span className="text-[9px] font-mono text-slate-500 font-black block mt-2">🏁 단 1바퀴 스핀 런</span>
                    </button>

                    {/* Mode 4 */}
                    <button
                      type="button"
                      onClick={() => { triggerAudioInit(); setGameMode('ten_laps'); }}
                      className={`flex flex-col justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all text-left min-h-[170px] ${
                        gameMode === 'ten_laps' 
                          ? 'bg-purple-950/25 border-purple-500 text-white shadow-[0_0_12px_rgba(168,85,247,0.3)]' 
                          : 'bg-slate-950 border-slate-800/80 text-gray-300 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      <div>
                        <span className="text-[9px] font-black tracking-widest text-purple-400 block uppercase mb-1">ENDURANCE MARATHON</span>
                        <h4 className="text-sm font-black text-white">마라톤 10 Laps</h4>
                        <p className="text-[10px] text-slate-450 text-slate-400 mt-2 leading-relaxed">
                          무려 10바퀴에 달하는 마라톤 레이스입니다. 노련한 전용 드리프트 선형과 끈기 있는 집중력으로 장거리 완주 보너스를 획득하세요.
                        </p>
                      </div>
                      <span className="text-[9px] font-mono text-slate-500 font-black block mt-2">🏃 10바퀴 집중 주행 코스</span>
                    </button>

                    {/* Mode 5 */}
                    <button
                      type="button"
                      onClick={() => { triggerAudioInit(); setGameMode('coin_rush'); }}
                      className={`flex flex-col justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all text-left min-h-[170px] ${
                        gameMode === 'coin_rush' 
                          ? 'bg-amber-950/25 border-amber-500 text-white shadow-[0_0_12px_rgba(245,158,11,0.35)]' 
                          : 'bg-slate-950 border-slate-850/80 text-gray-400 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      <div>
                        <span className="text-[9px] font-black tracking-widest text-amber-550 text-amber-500 block uppercase mb-1">COIN RUSH MODE</span>
                        <h4 className="text-sm font-black text-white">코인 수집 대전</h4>
                        <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                          트랙마다 보석처럼 생겨나는 연쇄 코인들을 직접 충돌 수집하는 보너스 파밍 대전입니다. 대량의 골드를 쉽게 파밍할 수 있습니다.
                        </p>
                      </div>
                      <span className="text-[9px] font-mono text-slate-500 font-black block mt-2">💰 황금 코인 레이스</span>
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

              {/* === TAB 5: LEAGUE RANKINGS, PROFILE, MISSIONS (시즌 랭크 전적실) === */}
              {activeMenuTab === 'rankings' && (
                <motion.div
                  key="rankings"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-slate-900/90 border-2 border-slate-700/60 rounded-3xl p-5 shadow-xl w-full flex flex-col font-sans"
                >
                  {/* Top inner navigator tab structure */}
                  <div className="flex border-b border-slate-800 pb-3 mb-5 space-x-1 sm:space-x-4">
                    <button
                      onClick={() => { triggerAudioInit(); setRankingsSubTab('profile'); }}
                      className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center space-x-1.5 ${
                        rankingsSubTab === 'profile'
                          ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
                          : 'text-gray-400 hover:text-white hover:bg-slate-800/50'
                      }`}
                    >
                      <span>👤</span>
                      <span>내 정보 & 가죽 커스터마이징</span>
                    </button>
                    <button
                      onClick={() => { triggerAudioInit(); setRankingsSubTab('leaderboard'); }}
                      className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center space-x-1.5 ${
                        rankingsSubTab === 'leaderboard'
                          ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
                          : 'text-gray-400 hover:text-white hover:bg-slate-800/50'
                      }`}
                    >
                      <span>🏆</span>
                      <span>시즌 월간 랭킹 실록</span>
                    </button>
                    <button
                      onClick={() => { triggerAudioInit(); setRankingsSubTab('achievements'); }}
                      className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center space-x-1.5 relative ${
                        rankingsSubTab === 'achievements'
                          ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
                          : 'text-gray-400 hover:text-white hover:bg-slate-800/50'
                      }`}
                    >
                      <span>📜</span>
                      <span>훈련 미션 및 업적 수당</span>
                      {achievements.some(a => a.completed && !a.rewardClaimed) && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                      )}
                    </button>
                  </div>

                  {/* SUB-TAB 1: PROFILE MANAGEMENT */}
                  {rankingsSubTab === 'profile' && (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 font-sans">
                      
                      {/* Left: Player Profile Details */}
                      <div className="md:col-span-4 bg-slate-950/70 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center space-x-3 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-white text-xl font-black shadow-md border border-white/10">
                              {playerNameInput.slice(0, 1) || 'R'}
                            </div>
                            <div>
                              <div className="flex items-center space-x-1">
                                <span className="bg-indigo-600/30 text-indigo-400 text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-indigo-500/20 uppercase">LV.{level}</span>
                                <span className="bg-violet-600/30 text-violet-400 text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-violet-500/25">{getTierInfo(rankPoints).icon} {getTierInfo(rankPoints).name}</span>
                              </div>
                              <h4 className="text-sm font-black text-white mt-0.5">{playerNameInput}</h4>
                            </div>
                          </div>

                          {/* XP Bar */}
                          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl mb-4 text-xs">
                            <div className="flex justify-between items-center text-[10.5px] font-bold text-gray-400 mb-1.5 uppercase font-mono">
                              <span>Driver XP Progress</span>
                              <span>{xp} / {level * 120} XP ({Math.floor((xp / (level * 120)) * 100)}%)</span>
                            </div>
                            <div className="w-full bg-slate-950 border border-slate-850 h-3.5 rounded-full overflow-hidden p-0.5">
                              <div 
                                className="bg-gradient-to-r from-cyan-400 via-indigo-600 via-indigo-550 to-pink-505 h-full rounded-full transition-all duration-500 shadow animate-pulse"
                                style={{ width: `${Math.min(100, (xp / (level * 120)) * 100)}%` }}
                              />
                            </div>
                            <p className="text-[9.5px] text-slate-500 mt-2 leading-snug font-sans flex items-start">
                              주행 완수 시 45 XP가 가산됩니다. 레벨 업 시 드라이버 특별 장려 칭호 및 금화 수당이 지급됩니다.
                            </p>
                          </div>

                          {/* Stat summaries */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/60">
                              <div className="text-[9.5px] text-gray-400">누적 골드 잔고</div>
                              <div className="text-white font-mono font-black text-xs mt-0.5">{gold} Gold</div>
                            </div>
                            <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/60">
                              <div className="text-[9.5px] text-gray-400">배틀 레이팅 RP</div>
                              <div className="text-white font-mono font-black text-xs mt-0.5">{rankPoints} RP</div>
                            </div>
                            <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/60 col-span-2">
                              <span className="text-[9.5px] text-gray-400 font-bold block mb-1">👑 드라이버 액티브 호칭 (Equipped Title)</span>
                              <span className="text-pink-400 font-extrabold text-[11px] block bg-pink-500/10 border border-pink-500/20 px-2.5 py-1 rounded-lg text-center font-sans">
                                🎖️ {selectedTitle}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Reset simulator data */}
                        <div className="mt-5 pt-3.5 border-t border-slate-850">
                          <button
                            onClick={() => {
                              if (confirm('모든 랭킹 점수, 스킨, 레벨, 최고 기록을 초기화하시겠습니까? (로컬 데이터 리셋)')) {
                                localStorage.clear();
                                window.location.reload();
                              }
                            }}
                            className="w-full py-2 rounded-xl text-[10px] text-slate-500 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 border border-slate-850 font-black tracking-widest uppercase transition-colors cursor-pointer"
                          >
                            초기 훈련생 데이터 완전 리셋 (Reset Data)
                          </button>
                        </div>
                      </div>

                      {/* Right: Titles and Skins customizer */}
                      <div className="md:col-span-8 flex flex-col space-y-5">
                        
                        {/* Title list */}
                        <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                          <h4 className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400 uppercase tracking-widest font-mono mb-2.5">
                            🎖️ 내가 장착 가능한 드라이버 고유 칭호 (Rider Titles)
                          </h4>
                          <span className="text-[10px] text-slate-400 leading-normal block mb-4 font-sans">
                            업적 및 미션을 충실히 훈련하면 희귀 칭호들이 잠금해제됩니다. 아래 칭호를 장착하여 로비에 즉시 전시하세요!
                          </span>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            {[
                              { id: '초보 라이더', label: '초보 라이더', desc: '초기 기본 제공 칭호' },
                              { id: '동네 한바퀴', label: '동네 한바퀴', desc: '트랙 산책이 특기' },
                              { id: '아스팔트 마스터', label: '아스팔트 마스터', desc: '드리프트 매니아 15회 보상' },
                              { id: '포뮬러 라이더', label: '포뮬러 라이더', desc: '질풍노도 부스터 10회 보상' },
                              { id: '바람의 지배자', label: '바람의 지배자', desc: '그랜드 투어러 서킷 5회 보상' },
                              { id: '수집 대마왕', label: '수집 대마왕', desc: '차고지 대부 뽑기 3회 보상' },
                              { id: '빛의 속도', label: '빛의 속도', desc: '한계 돌파 65초 미만 보상' },
                              { id: '신의 경지', label: '신의 경지', desc: '무결점 드라이버 무충돌 보상' },
                              { id: '광속 지배자', label: '광속 지배자', desc: '모든 맵 28초 이내 완주 보상' }
                            ].map((tit) => {
                              const isOwned = unlockedTitles.includes(tit.id);
                              const isEquipped = selectedTitle === tit.id;
                              return (
                                <div 
                                  key={tit.id}
                                  className={`p-2.5 bg-slate-900 border rounded-xl flex flex-col justify-between transition-colors ${
                                    isEquipped 
                                      ? 'border-pink-500 bg-pink-955/10 bg-pink-950/20' 
                                      : isOwned ? 'border-slate-800 hover:border-slate-700' : 'border-slate-900/45 opacity-55'
                                  }`}
                                >
                                  <div>
                                    <div className="text-[11px] font-black text-white">{tit.label}</div>
                                    <div className="text-[9px] text-gray-500 mt-0.5">{tit.desc}</div>
                                  </div>
                                  <div className="mt-2">
                                    {isEquipped ? (
                                      <span className="text-[9px] text-pink-400 font-extrabold flex items-center justify-center bg-pink-500/10 py-1 border border-pink-500/20 rounded-md font-sans">
                                        장착완료 (ACTIVE)
                                      </span>
                                    ) : isOwned ? (
                                      <button
                                        onClick={() => {
                                          triggerAudioInit();
                                          setSelectedTitle(tit.id);
                                          showHUDNotification('칭호 변경 완료', `[🏷️ ${tit.label}] 호칭을 장비했습니다.`);
                                        }}
                                        className="w-full py-1 bg-slate-850 hover:bg-slate-800 text-[9px] font-extrabold rounded-md text-white border border-slate-750 transition-colors cursor-pointer"
                                      >
                                        장착하기 (Equip)
                                      </button>
                                    ) : (
                                      <span className="text-[9px] text-slate-600 block text-center py-1 bg-slate-950/60 rounded border border-transparent">
                                        🔒 잠겨있음
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Skin customization list */}
                        <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                          <h4 className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-amber-405 to-amber-400 uppercase tracking-widest font-mono mb-2.5">
                            🎨 3D 카트바디 특수 도색 가죽 스킨 (Chassis Coating Visuals)
                          </h4>
                          <span className="text-[10px] text-slate-400 leading-normal block mb-4 font-sans">
                            차고의 카트 바디 실시간 도색을 변경하는 고농도 특수 알루미늄 나노 입자 스킨 시스템입니다. 게임 실행 시 카트에 즉각 반영됩니다!
                          </span>

                           <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                            {[
                              { id: 'default', label: '오리지널 엔진', desc: '고유 카트 기본 배색', hex: '#6366f1' },
                              { id: 'magma_red', label: '화염 마그마 레드', desc: '붉은 화산 특수 도장', hex: '#ef4444' },
                              { id: 'diamond_silver', label: '다이아 플래티넘', desc: '백금 실버 실린더 도장', hex: '#cbd5e1' },
                              { id: 'midnight_obsidian', label: '미드나잇 흑옵', desc: '매혹적인 밤하늘 흑색', hex: '#090d16' },
                              { id: 'emerald_gold', label: '에메랄드 포레스트', desc: '신비의 옥색 골드 배색', hex: '#10b981' },
                              { id: 'neon_pulse', label: '네온 펄스', desc: '도전 특전 초광속 핑크&사이언 도색', hex: '#06b6d4' }
                            ].map((sk) => {
                              const isOwned = unlockedSkins.includes(sk.id);
                              const isEquipped = selectedSkinColor === sk.id;
                              return (
                                <div 
                                  key={sk.id}
                                  className={`p-2 bg-slate-900 border rounded-xl flex flex-col justify-between transition-colors ${
                                    isEquipped 
                                      ? 'border-amber-400 bg-amber-950/5' 
                                      : isOwned ? 'border-slate-850 hover:border-slate-700' : 'border-slate-900/40 opacity-55'
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-center space-x-1 mb-1">
                                      <span className="w-2.5 h-2.5 rounded-full border border-white/20" style={{ backgroundColor: sk.hex }} />
                                      <span className="text-[10px] font-black text-white">{sk.label}</span>
                                    </div>
                                    <div className="text-[8px] text-gray-500 leading-snug">{sk.desc}</div>
                                  </div>
                                  <div className="mt-3">
                                    {isEquipped ? (
                                      <span className="text-[8px] text-amber-500 font-extrabold flex items-center justify-center bg-amber-500/10 py-1 border border-amber-500/20 rounded-md font-sans">
                                        ACTIVE
                                      </span>
                                    ) : isOwned ? (
                                      <button
                                        onClick={() => {
                                          triggerAudioInit();
                                          setSelectedSkinColor(sk.id);
                                          showHUDNotification('스킨 변경 완료', `[🎨 ${sk.label}] 컬러 배색을 기체에 동사 연동 완료!`);
                                        }}
                                        className="w-full py-1 bg-slate-850 hover:bg-slate-800 hover:border-amber-500 text-[8px] font-extrabold rounded-md text-white border border-slate-750 transition-colors cursor-pointer font-sans"
                                      >
                                        도장하기
                                      </button>
                                    ) : (
                                      <span className="text-[8px] text-slate-600 block text-center py-1 bg-slate-950/60 rounded border border-transparent">
                                        🔒 잠겨있음
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                      </div>
                    </div>
                  )}

                  {/* SUB-TAB 2: LEADERBOARD MATRIX */}
                  {rankingsSubTab === 'leaderboard' && (
                    <div className="flex flex-col space-y-4 font-sans">
                      
                      {/* Sub-tab Filter Header */}
                      <div className="flex bg-slate-950 border border-slate-850 p-1.5 rounded-2xl space-x-1.5 self-start">
                        {[
                          { id: 'global', label: '🏆 월간 리그 전체 랭킹', icon: '🌍' },
                          { id: 'friends', label: '👥 실시간 친구 랭크', icon: '👦' },
                          { id: 'time_attack', label: '🗺️ 트랙 타임어택 랭킹', icon: '⏱️' },
                          { id: 'season', label: '🔥 시즌 주간 초기화 상태', icon: '♻️' }
                        ].map((fil) => {
                          const isFilterActive = rankingFilter === fil.id;
                          return (
                            <button
                              key={fil.id}
                              onClick={() => { triggerAudioInit(); setRankingFilter(fil.id as any); }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center space-x-1 ${
                                isFilterActive 
                                  ? 'bg-slate-850 text-white border border-slate-750' 
                                  : 'text-gray-400 hover:text-white hover:bg-slate-900/50'
                              }`}
                            >
                              <span>{fil.icon}</span>
                              <span>{fil.label}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Display filters depending on selection */}
                      {rankingFilter === 'global' && (
                        <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 font-sans">
                          <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-3.5">
                            <span className="text-[11px] text-pink-400 font-extrabold uppercase tracking-wide">GLOBAL USER LEAGUE (전교 유저 랭킹 리그)</span>
                            <span className="text-[9.5px] text-gray-500 font-bold">1위부터 상위 최고 랭커 진열</span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto normal-scrollbar pr-1">
                            {[
                              { rank: 1, name: '은하계엔진킹_지호', title: '황제 드라이버', rp: 5240, level: 32, kart: '아발란체' },
                              { rank: 2, name: '드리프트전설', title: '드리프트 달인', rp: 4910, level: 29, kart: '세이버 익스트림' },
                              { rank: 3, name: '태양의질주', title: '은하계 타키온', rp: 4320, level: 27, kart: '솔리드 캐논' },
                              { rank: 4, name: `${playerNameInput} (나)`, title: selectedTitle, rp: rankPoints, level: level, kart: currentKart.name.split(' (')[0], isMe: true },
                              { rank: 5, name: '카트선생님', title: '초보 구원자', rp: 1450, level: 15, kart: '블루 스피너' },
                              { rank: 6, name: '연습카딩구', title: '초보 레이서', rp: 820, level: 9, kart: '스타트 라인' }
                            ].sort((a, b) => b.rp - a.rp).map((item, idx) => {
                              const updatedIndex = idx + 1;
                              const isMe = item.isMe;
                              const medalColor = updatedIndex === 1 ? 'bg-amber-400 animate-pulse' : updatedIndex === 2 ? 'bg-slate-300' : updatedIndex === 3 ? 'bg-amber-600' : 'bg-slate-800';
                              return (
                                <div 
                                  key={item.name}
                                  className={`flex justify-between items-center p-3 rounded-xl border transition-colors ${
                                    isMe 
                                      ? 'border-pink-500 bg-pink-955/10 bg-pink-950/15' 
                                      : 'border-slate-900 bg-slate-900/60'
                                  }`}
                                >
                                  <div className="flex items-center space-x-3">
                                    <div className={`w-6 h-6 rounded-md ${medalColor} text-slate-950 font-black flex items-center justify-center text-xs shadow-sm`}>
                                      {updatedIndex}
                                    </div>
                                    <div>
                                      <div className="flex items-center space-x-1">
                                        <span className="text-white text-xs font-black">{item.name}</span>
                                        <span className="bg-slate-850 px-1 py-0.2 rounded text-[8.5px] text-pink-400 font-extrabold border border-white/5">{item.title}</span>
                                      </div>
                                      <div className="text-[9px] text-gray-400 font-mono mt-0.5">Lv.{item.level} ⬝ 기체: {item.kart}</div>
                                    </div>
                                  </div>
                                  <div className="flex bg-slate-950 px-2.5 py-1 border border-slate-850 rounded-lg text-right min-w-[70px] justify-center items-center">
                                    <div className="text-amber-422 font-mono font-black text-xs text-yellow-400">{item.rp} RP</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {rankingFilter === 'friends' && (
                        <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 font-sans">
                          <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-3.5">
                            <span className="text-[11px] text-cyan-400 font-extrabold uppercase tracking-wide">FRIENDS LEAGUE (실시간 절친 매칭 랭킹)</span>
                            <span className="text-[9.5px] text-gray-500 font-bold">인기 드라이버 친우 리스트 정보</span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {[
                              { rank: 1, name: '엔진마스터_지훈', title: '은하계 타키온', rp: 1980, level: 16, online: true },
                              { rank: 2, name: `${playerNameInput} (나)`, title: selectedTitle, rp: rankPoints, level: level, online: true, isMe: true },
                              { rank: 3, name: '카트소라사랑', title: '초보 레이서', rp: 640, level: 7, online: false },
                              { rank: 4, name: '우주핵폭탄민준', title: '초보 레이서', rp: 310, level: 4, online: true },
                              { rank: 5, name: '꿈나무레이서서현', title: '초보 레이서', rp: 180, level: 3, online: false }
                            ].sort((a, b) => b.rp - a.rp).map((item, idx) => {
                              const updatedIndex = idx + 1;
                              const isMe = item.isMe;
                              return (
                                <div 
                                  key={item.name}
                                  className={`flex justify-between items-center p-3 rounded-xl border ${
                                    isMe 
                                      ? 'border-pink-500 bg-pink-955/15 bg-pink-950/15' 
                                      : 'border-slate-900 bg-slate-900/60'
                                  }`}
                                >
                                  <div className="flex items-center space-x-2.5">
                                    <span className="text-gray-400 font-black font-mono text-xs w-4 text-center">{updatedIndex}</span>
                                    <div>
                                      <div className="flex items-center space-x-1.5">
                                        <span className="text-white text-xs font-black">{item.name}</span>
                                        <span className={`w-1.5 h-1.5 rounded-full ${item.online ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
                                      </div>
                                      <div className="text-[8.5px] text-gray-500 font-mono">Lv.{item.level} • {item.online ? '대기실 접속중' : '부재중 (로그아웃)'}</div>
                                    </div>
                                  </div>
                                  <div className="text-xs font-mono font-bold text-gray-300">{item.rp} RP</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {rankingFilter === 'time_attack' && (
                        <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 font-sans">
                          <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-3.5">
                            <span className="text-[11px] text-cyan-400 font-extrabold uppercase tracking-wide font-mono">MAP TIME ATTACK WORLD RECORDS ([{currentMap.name.split(' (')[0]}] 트랙 랭킹)</span>
                            <span className="text-[9.5px] text-gray-500 font-bold">전용 타임어택 서킷 최강자 목록</span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {[
                              { rank: 1, name: '카트의전설신짱', time: '00:52.41', date: '2026.06.01' },
                              { rank: 2, name: '스피드머신러', time: '01:01.14', date: '2026.06.03' },
                              { rank: 3, name: `${playerNameInput} (나의 최고기록)`, time: bestTimes[currentMap.id]?.timeStr || '기록 없음', date: bestTimes[currentMap.id]?.date || '-', isMe: true },
                              { rank: 4, name: '스핏선배민우', time: '01:14.50', date: '2025.12.28' },
                              { rank: 5, name: '광속주행정복자', time: '01:21.80', date: '2026.04.14' }
                            ].map((item, idx) => {
                              const isMe = item.isMe;
                              return (
                                <div 
                                  key={item.name}
                                  className={`flex justify-between items-center p-3 rounded-xl border ${
                                    isMe 
                                      ? 'border-pink-500 bg-pink-955/15' 
                                      : 'border-slate-900 bg-slate-900/60'
                                  }`}
                                >
                                  <div className="flex items-center space-x-2">
                                    <span className="text-gray-500 font-bold font-mono text-xs w-4">{idx + 1}</span>
                                    <div>
                                      <div className="text-white text-xs font-black">{item.name}</div>
                                      <div className="text-[8.5px] text-gray-500 font-mono">{item.date} 서킷 등록</div>
                                    </div>
                                  </div>
                                  <p className="text-xs font-mono font-black text-indigo-400 bg-indigo-950/30 px-2 py-0.5 rounded border border-indigo-500/25 animate-pulse">
                                    {item.time}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {rankingFilter === 'season' && (
                        <div className="bg-slate-950/70 p-5 rounded-xl border border-slate-800 text-center flex flex-col items-center justify-center py-8 font-sans">
                          <span className="text-4xl mb-3">♻️</span>
                          <h4 className="text-sm font-black text-white uppercase tracking-wider mb-2">시즌 리그 주간/월간 타임테이블 스케줄러</h4>
                          <p className="text-[10.5px] text-gray-400 max-w-md mx-auto leading-relaxed mb-4">
                            매주 월요일 00:00에 실시간 전체 유저 및 맵별 최고 기록이 공식 초기화되며, 축적된 드라이버 배틀 레이팅(RP) 티어에 따라 기체 치장 칭호와 전교 공인 코인 보상이 격주로 우편 지급됩니다.
                          </p>
                          <div className="bg-slate-900 border border-slate-850 rounded-xl p-3 text-left w-full max-w-xs text-[10px] font-mono space-y-1.5 text-gray-400 mx-auto">
                            <div className="flex justify-between text-white"><span>남은 정산 시간:</span> <span className="text-pink-400 font-extrabold">2일 14시간 52분</span></div>
                            <div className="flex justify-between"><span>예상 달성 등급:</span> <span className="text-violet-400">{getTierInfo(rankPoints).name}</span></div>
                            <div className="flex justify-between"><span>수령 가능 티어 보상:</span> <span className="text-yellow-400 font-extrabold">1,500 Gold + 한정판 스킨</span></div>
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                  {/* SUB-TAB 3: MISSIONS AND ACHIEVEMENTS */}
                  {rankingsSubTab === 'achievements' && (
                    <div className="flex flex-col space-y-4 font-sans">
                      <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                        <span className="text-[11px] text-pink-400 font-extrabold uppercase block tracking-wider font-mono">⚔️ 드라이버 리그 승격 미션 및 특별 성과 성취</span>
                        <span className="text-[10px] text-slate-400 leading-normal block mt-1">
                          완수된 항목의 우측 [보상 수령] 단추를 누르면 골드와 타이틀 및 스킨이 인벤토리에 즉각 해금 배부됩니다! 
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {achievements.map((ach) => {
                          const progressPct = Math.floor((ach.current / ach.target) * 100);
                          return (
                            <div 
                              key={ach.id}
                              className={`p-3.5 rounded-2xl border-2 transition-colors flex justify-between items-stretch bg-slate-950/90 ${
                                ach.completed 
                                  ? ach.rewardClaimed 
                                    ? 'border-slate-850/80 opacity-70' 
                                    : 'border-green-500 bg-green-950/5 shadow-[0_0_8px_rgba(34,197,94,0.1)]' 
                                  : 'border-slate-850'
                              }`}
                            >
                              <div className="flex flex-col justify-between flex-1 pr-4">
                                <div>
                                  <div className="flex items-center space-x-1.5 mb-1">
                                    <span className="text-sm">{ach.completed ? '✅' : '⚙️'}</span>
                                    <span className="text-xs font-black text-white">{ach.name}</span>
                                  </div>
                                  <p className="text-[10px] text-slate-400 leading-snug font-sans">
                                    {ach.desc}
                                  </p>
                                </div>

                                <div className="mt-3">
                                  <div className="flex justify-between text-[9px] text-gray-500 font-mono font-semibold mb-1">
                                    <span>훈련 진행도</span>
                                    <span>{ach.current} / {ach.target} ({progressPct}%)</span>
                                  </div>
                                  <div className="w-full bg-slate-900 border border-slate-850 h-2 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full transition-all duration-300 ${ach.completed ? 'bg-green-500' : 'bg-slate-600'}`}
                                      style={{ width: `${Math.min(100, progressPct)}%` }}
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="w-[110px] bg-slate-900/60 p-2 border border-slate-850 rounded-xl flex flex-col justify-between text-center">
                                <div className="text-[9.5px]">
                                  <div className="text-gray-500 font-bold uppercase font-mono">REWARDS</div>
                                  <span className="text-yellow-400 font-bold font-mono text-[10px] block mt-0.5">+{ach.rewardGold}G</span>
                                  {ach.rewardTitle && <span className="text-pink-400 bg-pink-500/10 px-1 py-0.2 rounded text-[7.5px] block truncate mt-1">🏷️ {ach.rewardTitle}</span>}
                                  {ach.rewardSkin && <span className="text-amber-400 bg-amber-500/10 px-1 py-0.2 rounded text-[7.5px] block truncate mt-1">🎨 Skin 도색</span>}
                                </div>

                                <div className="mt-2.5 font-sans">
                                  {ach.rewardClaimed ? (
                                    <span className="text-[9px] text-gray-500 block text-center py-1 bg-slate-950 border border-transparent rounded-lg">
                                      수령완료
                                    </span>
                                  ) : ach.completed ? (
                                    <button
                                      onClick={() => {
                                        triggerAudioInit();
                                        setGold(prev => prev + ach.rewardGold);
                                        if (ach.rewardTitle) {
                                          setUnlockedTitles(prev => {
                                            const updated = prev.includes(ach.rewardTitle!) ? prev : [...prev, ach.rewardTitle!];
                                            localStorage.setItem('anime_unlocked_titles', JSON.stringify(updated));
                                            return updated;
                                          });
                                        }
                                        if (ach.rewardSkin) {
                                          setUnlockedSkins(prev => {
                                            const updated = prev.includes(ach.rewardSkin!) ? prev : [...prev, ach.rewardSkin!];
                                            localStorage.setItem('anime_unlocked_skins', JSON.stringify(updated));
                                            return updated;
                                          });
                                        }
                                        setAchievements(prev => {
                                          const updated = prev.map(a => a.id === ach.id ? { ...a, rewardClaimed: true } : a);
                                          localStorage.setItem('anime_achievements', JSON.stringify(updated));
                                          return updated;
                                        });
                                        triggerComicTextPop('REWARD CLEARED!', '#10b981');
                                        showHUDNotification('업적 특별 보상 획득!', `[${ach.rewardGold} Gold] 성취 수당을 정기 금고에 연동 배부했습니다!`);
                                      }}
                                      className="w-full py-1 bg-gradient-to-r from-emerald-500 to-green-500 text-white font-black hover:shadow-lg transition-all rounded-lg text-[10px] cursor-pointer"
                                    >
                                      보상 수령
                                    </button>
                                  ) : (
                                    <span className="text-[9px] text-slate-655 text-slate-605 text-slate-600 block text-center py-1 bg-slate-950/30 border border-transparent rounded-lg">
                                      진행중
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

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

      {/* --- VS SCREEN LAYER --- */}
      {gameState === 'vsscreen' && (
        <div className="absolute inset-0 z-50 overflow-hidden bg-slate-950 flex flex-col justify-between p-6 md:p-12 select-none">
          {/* Top banner */}
          <div className="text-center w-full mt-4 animate-fade-in">
            <span className="text-[10px] font-black tracking-widest text-cyan-400 uppercase bg-cyan-950/50 px-4 py-1.5 border border-cyan-850 border-cyan-800/30 rounded-full font-mono">
              MATCH UP PROFILE MATCH
            </span>
            <h2 className="text-3xl mt-3 font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-500 to-amber-400 italic tracking-wider font-display">
              {currentMap?.name || '레이서 매치업'}
            </h2>
            <p className="text-[11px] text-gray-400 mt-1">곧 경기가 시작됩니다! 양측 드라이버 정보가 조율 중입니다.</p>
          </div>

          {/* Grid matching */}
          <div className="my-auto grid grid-cols-1 md:grid-cols-11 gap-4 items-center max-w-5xl mx-auto w-full relative">
            
            {/* Player 1 (Left Rider) */}
            <div className="col-span-1 md:col-span-4 bg-slate-900/60 border-2 border-cyan-500/40 p-6 rounded-3xl backdrop-blur-lg shadow-[0_0_25px_rgba(6,182,212,0.15)] flex flex-col items-center text-center">
              <div className="relative w-24 h-24 rounded-full flex items-center justify-center bg-cyan-950 border-4 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                {/* Visual Avatar color representation based on skin */}
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl font-display" style={{ 
                  backgroundColor: selectedSkinColor === 'magma_red' ? '#ef4444' : 
                                   selectedSkinColor === 'diamond_silver' ? '#cbd5e1' : 
                                   selectedSkinColor === 'midnight_obsidian' ? '#090d16' : 
                                   selectedSkinColor === 'emerald_gold' ? '#10b981' : 
                                   selectedSkinColor === 'neon_pulse' ? '#06b6d4' : '#6366f1'
                }}>
                  👤
                </div>
                {/* Aura Indicator Name Badge */}
                {selectedAuraId !== 'none' && (
                  <span className="absolute -bottom-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full border border-cyan-300/30 uppercase animate-pulse font-mono">
                    {AURAS.find(a => a.id === selectedAuraId)?.name || 'AURA'}
                  </span>
                )}
              </div>
              <h3 className="text-xl font-black text-white mt-4">{playerNameInput || '플레이어'}</h3>
              <span className="text-xs text-yellow-400 font-bold bg-yellow-400/10 px-3 py-1 rounded-full border border-yellow-500/15 mt-1.5 font-sans">
                🏷️ {selectedTitle || '초보 라이더'}
              </span>

              <div className="w-full mt-4 bg-slate-950/80 p-3 rounded-2xl border border-slate-800 text-left text-xs text-slate-300">
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-500 text-[11px]">카트 바디</span>
                  <span className="font-extrabold text-white text-[11px]">{currentKart.name}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500 text-[11px]">라이드 테마 스킨</span>
                  <span className="font-extrabold text-cyan-400 text-[11px]">
                    {selectedSkinColor === 'default' ? '오리지널 엔진' : 
                     selectedSkinColor === 'magma_red' ? '화염 마그마' : 
                     selectedSkinColor === 'diamond_silver' ? '다이아 실버' : 
                     selectedSkinColor === 'midnight_obsidian' ? '미드나잇 블랙' : 
                     selectedSkinColor === 'emerald_gold' ? '에메랄드 특장' : '네온 펄스 스킨'}
                  </span>
                </div>
              </div>
            </div>

            {/* VS CENTER MOTIONS */}
            <div className="col-span-1 md:col-span-3 text-center flex flex-col justify-center items-center py-4">
              <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-rose-600 rounded-3xl flex items-center justify-center transform rotate-45 shadow-[0_0_30px_rgba(244,63,94,0.45)]">
                <span className="text-3xl font-black text-white italic transform -rotate-45 tracking-widest font-display text-stroke text-shadow">VS</span>
              </div>
              <span className="text-[10px] text-pink-400 font-mono tracking-widest font-bold uppercase mt-6 bg-pink-950/50 px-3 py-1 rounded-full border border-pink-900/30">
                {gameMode === 'speed' ? '스피드 매치' : gameMode === 'item' ? '아이템 대전' : gameMode === 'coin_rush' ? '골드 코인 수집전' : gameMode === 'ten_laps' ? '10바퀴 레이싱' : '타임어택 트라이얼'}
              </span>
            </div>

            {/* Player 2 (Right Rider) */}
            <div className="col-span-1 md:col-span-4 bg-slate-900/60 border-2 border-rose-500/40 p-6 rounded-3xl backdrop-blur-lg shadow-[0_0_25px_rgba(244,63,94,0.15)] flex flex-col items-center text-center">
              {(() => {
                let p2Name = '라이벌 AI';
                let p2Title = '폭풍의 독주 주행마';
                let p2Kart = '블랙 팬서 (Rival Mode)';
                let p2SkinColor = 'default';
                let p2Aura = 'none';

                if (isMultiplayerActive) {
                  const other = participants.find(p => p.peerId !== netManagerRef.current?.myInfo.peerId);
                  if (other) {
                    p2Name = other.name || '동료 초대 레이서';
                    p2Title = other.selectedTitle || '경기 초대자';
                    const otKart = KARTS.find(k => k.id === other.kartId) || KARTS[0];
                    p2Kart = otKart.name;
                    p2SkinColor = other.selectedSkinColor || 'default';
                    p2Aura = other.selectedAuraId || 'none';
                  }
                }

                return (
                  <>
                    <div className="relative w-24 h-24 rounded-full flex items-center justify-center bg-rose-950 border-4 border-rose-550 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)]">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl font-display" style={{ 
                        backgroundColor: p2SkinColor === 'magma_red' ? '#ef4444' : 
                                         p2SkinColor === 'diamond_silver' ? '#cbd5e1' : 
                                         p2SkinColor === 'midnight_obsidian' ? '#090d16' : 
                                         p2SkinColor === 'emerald_gold' ? '#10b981' : 
                                         p2SkinColor === 'neon_pulse' ? '#06b6d4' : '#ec4899'
                      }}>
                        👤
                      </div>
                      {p2Aura !== 'none' && (
                        <span className="absolute -bottom-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full border border-rose-300/30 uppercase animate-pulse font-mono">
                          {AURAS.find(a => a.id === p2Aura)?.name || 'AURA'}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-black text-white mt-4">{p2Name}</h3>
                    <span className="text-xs text-yellow-400 font-bold bg-yellow-400/10 px-3 py-1 rounded-full border border-yellow-500/15 mt-1.5 font-sans">
                      🏷️ {p2Title}
                    </span>

                    <div className="w-full mt-4 bg-slate-950/80 p-3 rounded-2xl border border-slate-800 text-left text-xs text-slate-300">
                      <div className="flex justify-between py-1 border-b border-white/5">
                        <span className="text-gray-500 text-[11px]">카트 바디</span>
                        <span className="font-extrabold text-white text-[11px]">{p2Kart}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-gray-500 text-[11px]">라이드 테마 스킨</span>
                        <span className="font-extrabold text-rose-400 text-[11px]">
                          {p2SkinColor === 'default' ? '오리지널 엔진' : 
                           p2SkinColor === 'magma_red' ? '화염 마그마' : 
                           p2SkinColor === 'diamond_silver' ? '다이아 실버' : 
                           p2SkinColor === 'midnight_obsidian' ? '미드나잇 블랙' : 
                           p2SkinColor === 'emerald_gold' ? '에메랄드 특장' : '네온 펄스 스킨'}
                        </span>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Spacer */}
          <div className="text-center pb-4 text-[10px] text-slate-500 tracking-wide font-mono">
            READY TO DRIVE... 트랙 라인을 주입하며 대기 시그널을 동조화하고 있습니다.
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
              {/* LEFT SIDE: STEERING OVAL DRAG PAD */}
              <div className="flex items-center pointer-events-auto">
                <div
                  id="mobile-steer-pad"
                  className="relative w-56 h-20 bg-slate-950/95 border-4 border-cyan-500/40 rounded-full flex items-center justify-between px-6 shadow-[0_0_20px_rgba(6,182,212,0.3)] overflow-hidden cursor-pointer select-none touch-none"
                  onTouchStart={(e) => {
                    e.preventDefault();
                    const rect = e.currentTarget.getBoundingClientRect();
                    const touch = e.targetTouches[0];
                    const x = touch.clientX - rect.left;
                    let ratio = (x / rect.width) * 2 - 1;
                    ratio = Math.max(-1, Math.min(1, ratio));
                    setMobileSteerRatio(ratio);
                    
                    if (ratio < -0.15) {
                      keysPressedRef.current['ArrowLeft'] = true;
                      keysPressedRef.current['ArrowRight'] = false;
                    } else if (ratio > 0.15) {
                      keysPressedRef.current['ArrowRight'] = true;
                      keysPressedRef.current['ArrowLeft'] = false;
                    } else {
                      keysPressedRef.current['ArrowLeft'] = false;
                      keysPressedRef.current['ArrowRight'] = false;
                    }
                  }}
                  onTouchMove={(e) => {
                    e.preventDefault();
                    const rect = e.currentTarget.getBoundingClientRect();
                    const touch = e.targetTouches[0];
                    const x = touch.clientX - rect.left;
                    let ratio = (x / rect.width) * 2 - 1;
                    ratio = Math.max(-1, Math.min(1, ratio));
                    setMobileSteerRatio(ratio);
                    
                    if (ratio < -0.15) {
                      keysPressedRef.current['ArrowLeft'] = true;
                      keysPressedRef.current['ArrowRight'] = false;
                    } else if (ratio > 0.15) {
                      keysPressedRef.current['ArrowRight'] = true;
                      keysPressedRef.current['ArrowLeft'] = false;
                    } else {
                      keysPressedRef.current['ArrowLeft'] = false;
                      keysPressedRef.current['ArrowRight'] = false;
                    }
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    setMobileSteerRatio(0);
                    keysPressedRef.current['ArrowLeft'] = false;
                    keysPressedRef.current['ArrowRight'] = false;
                  }}
                  onTouchCancel={(e) => {
                    e.preventDefault();
                    setMobileSteerRatio(0);
                    keysPressedRef.current['ArrowLeft'] = false;
                    keysPressedRef.current['ArrowRight'] = false;
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const rect = e.currentTarget.getBoundingClientRect();
                    const onMouseMove = (moveEvent: MouseEvent) => {
                      const x = moveEvent.clientX - rect.left;
                      let ratio = (x / rect.width) * 2 - 1;
                      ratio = Math.max(-1, Math.min(1, ratio));
                      setMobileSteerRatio(ratio);
                      if (ratio < -0.15) {
                        keysPressedRef.current['ArrowLeft'] = true;
                        keysPressedRef.current['ArrowRight'] = false;
                      } else if (ratio > 0.15) {
                        keysPressedRef.current['ArrowRight'] = true;
                        keysPressedRef.current['ArrowLeft'] = false;
                      } else {
                        keysPressedRef.current['ArrowLeft'] = false;
                        keysPressedRef.current['ArrowRight'] = false;
                      }
                    };
                    const onMouseUp = () => {
                      window.removeEventListener('mousemove', onMouseMove);
                      window.removeEventListener('mouseup', onMouseUp);
                      setMobileSteerRatio(0);
                      keysPressedRef.current['ArrowLeft'] = false;
                      keysPressedRef.current['ArrowRight'] = false;
                    };
                    window.addEventListener('mousemove', onMouseMove);
                    window.addEventListener('mouseup', onMouseUp);
                    
                    const x = e.clientX - rect.left;
                    let ratio = (x / rect.width) * 2 - 1;
                    ratio = Math.max(-1, Math.min(1, ratio));
                    setMobileSteerRatio(ratio);
                    if (ratio < -0.15) {
                      keysPressedRef.current['ArrowLeft'] = true;
                      keysPressedRef.current['ArrowRight'] = false;
                    } else if (ratio > 0.15) {
                      keysPressedRef.current['ArrowRight'] = true;
                      keysPressedRef.current['ArrowLeft'] = false;
                    } else {
                      keysPressedRef.current['ArrowLeft'] = false;
                      keysPressedRef.current['ArrowRight'] = false;
                    }
                  }}
                  onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
                >
                  <span className={`text-xl font-black transition-colors ${mobileSteerRatio < -0.15 ? 'text-cyan-400 scale-110 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'text-slate-700'}`}>◀</span>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest pointer-events-none">STEER</span>
                  <span className={`text-xl font-black transition-colors ${mobileSteerRatio > 0.15 ? 'text-cyan-400 scale-110 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'text-slate-700'}`}>▶</span>
                  
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-[100px] h-[3px] bg-slate-800 rounded-full relative">
                      <div 
                        className="absolute top-0 bottom-0 bg-gradient-to-r from-teal-400 to-cyan-400 rounded-full"
                        style={{
                          left: mobileSteerRatio < 0 ? `${50 + mobileSteerRatio * 50}%` : '50%',
                          right: mobileSteerRatio > 0 ? `${50 - mobileSteerRatio * 50}%` : '50%'
                        }}
                      />
                    </div>
                  </div>

                  <div 
                    className="absolute top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-gradient-to-b from-cyan-400 to-indigo-500 shadow-[0_0_12px_rgba(6,182,212,0.6)] flex items-center justify-center transition-all duration-75 ease-out pointer-events-none select-none touch-none"
                    style={{
                      left: `calc(50% + ${mobileSteerRatio * 32}% - 24px)`
                    }}
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-950 flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT SIDE: TOUCH DRIVE SYSTEM WITHOUT ACCEL (AUTO-ACCEL ACTIVE) */}
              <div className="flex flex-col items-end space-y-4 pointer-events-auto">
                <div className="flex items-center space-x-3 pr-4">
                  {/* SPEED ITEM SLINGER / BOOST ACTION */}
                  <button
                    onTouchStart={(e) => { e.preventDefault(); triggerItemSlinger(); }}
                    onMouseDown={(e) => { e.preventDefault(); triggerItemSlinger(); }}
                    onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    className="w-18 h-18 rounded-full bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-500 active:brightness-125 border-4 border-pink-500/40 flex flex-col items-center justify-center text-white font-black shadow-2xl transition-all active:scale-95 animate-pulse cursor-pointer select-none touch-none"
                  >
                    <span className="text-xl leading-none">⚡</span>
                    <span className="text-[8px] font-mono tracking-tight mt-0.5 leading-none">BOOST</span>
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
                    onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    className="w-20 h-20 rounded-2xl bg-slate-950/90 border-4 border-red-500/50 active:bg-red-500 active:border-red-400 active:text-white text-red-500 flex items-center justify-center text-2xl font-black shadow-xl transition-all active:scale-90 select-none touch-none cursor-pointer"
                  >
                    ▼
                  </button>

                  {/* DRIFT CLUTCH (Shift) - DRIFT PLACED AT ACCEL HAND REACH POSITION & EXTRA ENLARGED */}
                  <button
                    onTouchStart={(e) => { e.preventDefault(); keysPressedRef.current['Shift'] = true; }}
                    onTouchEnd={(e) => { e.preventDefault(); keysPressedRef.current['Shift'] = false; }}
                    onTouchCancel={(e) => { e.preventDefault(); keysPressedRef.current['Shift'] = false; }}
                    onMouseDown={(e) => { e.preventDefault(); keysPressedRef.current['Shift'] = true; }}
                    onMouseUp={(e) => { e.preventDefault(); keysPressedRef.current['Shift'] = false; }}
                    onMouseLeave={() => { keysPressedRef.current['Shift'] = false; }}
                    onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    className="w-32 h-32 rounded-full bg-slate-950/95 border-4 border-yellow-500 text-yellow-400 shadow-[0_0_25px_rgba(234,179,8,0.45)] active:bg-yellow-500 active:text-slate-950 flex flex-col items-center justify-center transition-all duration-75 active:scale-90 select-none touch-none cursor-pointer"
                  >
                    <span className="text-4xl leading-none">↩</span>
                    <span className="text-xs font-black mt-2 tracking-widest font-display uppercase">DRIFT</span>
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

      {/* === FIRST TIME CONTROLS GUIDE DIALOG OVERLAY (처음 시작 조작 설명창) === */}
      <AnimatePresence>
        {showFirstLaunchGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md select-none"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 180 }}
              className="bg-slate-900 border-2 border-slate-700/80 rounded-3xl p-6 shadow-[0_0_50px_rgba(34,211,238,0.25)] max-w-2xl w-full text-slate-200 font-sans"
            >
              {/* Header Title with animated stars / logo */}
              <div className="text-center border-b border-slate-800 pb-4 mb-5">
                <span className="text-[10px] font-black text-cyan-400 bg-cyan-400/10 px-3 py-1 rounded-full uppercase tracking-widest font-mono border border-cyan-400/25 animate-pulse">
                  🏁 WELCOME TO THE ANIME KART RACING!
                </span>
                <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-amber-300 to-pink-500 mt-2">
                  초보 레이서 드라이빙 가이드
                </h2>
                <p className="text-xs text-slate-400 mt-1 font-mono">레이스 출발 전, 조작법을 숙지하여 서킷의 지배자가 되세요!</p>
              </div>

              {/* Grid content columns: Keyboards vs Mobile Touch */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                
                {/* Keyboard Controls card */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center space-x-1.5 border-b border-slate-900 pb-2 mb-3">
                      <span className="text-sm">⌨️</span>
                      <h3 className="text-xs font-black text-pink-400">PC 키보드 모드 조작</h3>
                    </div>
                    <div className="space-y-2.5 text-xs text-slate-300 font-mono">
                      <div className="flex justify-between items-center bg-slate-900/55 p-1.5 px-2.5 rounded-xl">
                        <span>전방 가속 / 후진</span>
                        <span className="font-bold text-white text-[10px] bg-slate-800 px-1.5 py-0.5 rounded shadow">W / S</span>
                      </div>
                      <div className="flex justify-between items-center bg-slate-900/55 p-1.5 px-2.5 rounded-xl">
                        <span>곡선 좌우 조향</span>
                        <span className="font-bold text-white text-[10px] bg-slate-800 px-1.5 py-0.5 rounded shadow">A / D</span>
                      </div>
                      <div className="flex justify-between items-center bg-slate-900/55 p-1.5 px-2.5 rounded-xl">
                        <span>익스트림 드리프트</span>
                        <span className="font-bold text-white text-[10px] bg-slate-800 px-1.5 py-0.5 rounded shadow">Left Shift</span>
                      </div>
                      <div className="flex justify-between items-center bg-slate-900/55 p-1.5 px-2.5 rounded-xl">
                        <span>질주 부스터 가속</span>
                        <span className="font-bold text-white text-[9px] bg-slate-800 px-1.5 py-0.5 rounded shadow">Space / Ctrl</span>
                      </div>
                      <div className="flex justify-between items-center bg-slate-900/55 p-1.5 px-2.5 rounded-xl">
                        <span>카메라 뷰 변경</span>
                        <span className="font-bold text-white text-[10px] bg-slate-800 px-1.5 py-0.5 rounded shadow">V / C Key</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile / Touch Controls card */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center space-x-1.5 border-b border-slate-900 pb-2 mb-3">
                      <span className="text-sm">📱</span>
                      <h3 className="text-xs font-black text-cyan-400">모바일 터치 모드 조작</h3>
                    </div>
                    <div className="space-y-4 text-xs font-sans">
                      <div className="bg-cyan-950/20 border border-cyan-500/20 p-2.5 rounded-xl text-[11px] leading-relaxed text-cyan-300">
                        <span className="font-black text-cyan-400 block mb-1">🚀 가속 페달 자동 제어 (오토 런)</span>
                        모바일에서는 엑셀 버튼을 일일이 누르지 않아도 **기본 기능인 항시 최고 속도로 자동 전진**합니다!
                      </div>
                      <div className="space-y-1.5 text-[10.5px] text-slate-400 pl-1">
                        <div className="flex items-start space-x-1">
                          <span className="text-cyan-400 mt-0.5">●</span>
                          <span><b>좌측 조향 드래그 바:</b> 좌우로 밀어서 미세 조향</span>
                        </div>
                        <div className="flex items-start space-x-1">
                          <span className="text-cyan-400 mt-0.5">●</span>
                          <span><b>우측 [↩ DRIFT]:</b> 회전 구간에서 드리프트 트리거</span>
                        </div>
                        <div className="flex items-start space-x-1">
                          <span className="text-cyan-400 mt-0.5">●</span>
                          <span><b>우측 [⚡ BOOST]:</b> 순간 가속 질주 분사</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Tips section at the bottom */}
              <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-850 text-center text-xs text-slate-350 leading-normal mb-6 flex flex-col justify-center items-center">
                <span className="font-black text-amber-400 block text-[10px] uppercase font-mono tracking-wider mb-0.5">🌟 BEST PRO-RACER TIP</span>
                코너 방향키를 드래그한 상태에서 오른쪽 [↩ DRIFT] 키를 터치 후 떼면, 하이퍼 드리프트 게이지가 순식간에 차오르며 질주용 파워 부스터를 획득할 수 있습니다!
              </div>

              {/* Close Button Action */}
              <div className="flex justify-center">
                <button
                  onClick={() => {
                    triggerAudioInit();
                    try {
                      localStorage.setItem('anime_has_seen_controls_v3', 'true');
                    } catch (e) {}
                    setShowFirstLaunchGuide(false);
                    showHUDNotification('레이싱 준비 완료', '조작법 가이드가 저장되었습니다. 서킷을 재미있게 질주해보세요!');
                  }}
                  className="px-8 py-3.5 cursor-pointer rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-600 hover:brightness-110 active:scale-95 text-white font-black text-sm shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center space-x-2 transition-all duration-150"
                >
                  <Check size={16} className="text-white" />
                  <span>그럼, 신나게 달려볼까요! (스타트)</span>
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
