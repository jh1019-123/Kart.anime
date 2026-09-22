import React, { useState, useEffect } from 'react';
import { Sparkles, Trophy, Clock, Gift, Award, CheckCircle2, ChevronRight, User } from 'lucide-react';
import { CloudRankingItem } from '../cloudLeaderboard';
import { AudioEngine } from '../lib/gameEngine';

interface PastelTierRankingProps {
  rankPoints: number;
  realLeaderboard: CloudRankingItem[];
  playerName: string;
  unlockedTitles: string[];
  onUnlockTitle: (title: string) => void;
  onAddGold: (goldAmount: number) => void;
  onNotification: (title: string, message: string) => void;
}

const CYCLE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

const SEASON_TITLE_POOLS = [
  ['바람의 지배자', '질주하는 혜성', '무한궤도 챔피언', '서킷의 황제', '하이퍼 드리프터'],
  ['네온 나이트메어', '폭풍의 라이더', '극광의 마스터', '사이버 스피릿', '황금빛 오버드라이브'],
  ['아스팔트 정복자', '시간 왜곡자', '신화의 질주마', '은하계 에이스', '불꽃의 스트라이커'],
  ['드리프트 연금술사', '천공의 비행자', '다크 매터 드라이버', '크라운 템페스트', '영원의 레이서'],
  ['사운드 배리어', '절대 영도 슬라이더', '볼텍스 팬텀', '불사조의 날개', '월간 챔피언십 MVP']
];

interface TierDef {
  id: string;
  name: string;
  minRp: number;
  maxRp: number;
  icon: string;
  pastelBg: string;
  pastelBorder: string;
  textColor: string;
  badgeBg: string;
  rewardDesc: string;
}

const PASTEL_TIERS: TierDef[] = [
  {
    id: 'grandmaster',
    name: '그랜드마스터',
    minRp: 4000,
    maxRp: Infinity,
    icon: '🌟',
    pastelBg: 'bg-gradient-to-r from-violet-100 via-pink-100 to-amber-100',
    pastelBorder: 'border-violet-200/90 shadow-[0_4px_20px_rgba(221,214,254,0.35)]',
    textColor: 'text-purple-950',
    badgeBg: 'bg-violet-200/80 text-purple-950',
    rewardDesc: '시즌 한정 칭호 100% 확정 + 2,500 Gold'
  },
  {
    id: 'master',
    name: '마스터',
    minRp: 2500,
    maxRp: 3999,
    icon: '👑',
    pastelBg: 'bg-gradient-to-r from-pink-100 via-rose-100 to-purple-100',
    pastelBorder: 'border-pink-200/90 shadow-[0_4px_20px_rgba(244,114,182,0.25)]',
    textColor: 'text-pink-950',
    badgeBg: 'bg-pink-200/80 text-pink-950',
    rewardDesc: '시즌 한정 칭호 100% 확정 + 1,800 Gold'
  },
  {
    id: 'diamond',
    name: '다이아몬드',
    minRp: 1500,
    maxRp: 2499,
    icon: '💎',
    pastelBg: 'bg-gradient-to-r from-sky-100 via-cyan-100 to-blue-100',
    pastelBorder: 'border-sky-200/90 shadow-[0_4px_20px_rgba(125,211,252,0.25)]',
    textColor: 'text-sky-950',
    badgeBg: 'bg-sky-200/80 text-sky-950',
    rewardDesc: '시즌 한정 칭호 100% 확정 + 1,200 Gold'
  },
  {
    id: 'gold',
    name: '골드',
    minRp: 800,
    maxRp: 1499,
    icon: '🥇',
    pastelBg: 'bg-gradient-to-r from-amber-100 via-yellow-100 to-orange-100',
    pastelBorder: 'border-amber-200/90 shadow-[0_4px_20px_rgba(253,224,71,0.25)]',
    textColor: 'text-amber-950',
    badgeBg: 'bg-amber-200/80 text-amber-950',
    rewardDesc: '시즌 한정 칭호 100% 확정 + 800 Gold'
  },
  {
    id: 'silver',
    name: '실버',
    minRp: 300,
    maxRp: 799,
    icon: '🥈',
    pastelBg: 'bg-gradient-to-r from-slate-100 via-indigo-50 to-purple-100',
    pastelBorder: 'border-indigo-100/90 shadow-[0_4px_16px_rgba(199,210,254,0.2)]',
    textColor: 'text-slate-800',
    badgeBg: 'bg-indigo-100/80 text-indigo-950',
    rewardDesc: '시즌 한정 칭호 100% 확정 + 500 Gold'
  },
  {
    id: 'bronze',
    name: '브론즈',
    minRp: 0,
    maxRp: 299,
    icon: '🥉',
    pastelBg: 'bg-gradient-to-r from-orange-100 via-amber-50 to-orange-200',
    pastelBorder: 'border-orange-200/90 shadow-[0_4px_16px_rgba(253,186,116,0.2)]',
    textColor: 'text-orange-950',
    badgeBg: 'bg-orange-200/80 text-orange-950',
    rewardDesc: '시즌 한정 칭호 100% 확정 + 300 Gold'
  }
];

export const PastelTierRanking: React.FC<PastelTierRankingProps> = ({
  rankPoints,
  realLeaderboard,
  playerName,
  unlockedTitles,
  onUnlockTitle,
  onAddGold,
  onNotification
}) => {
  // Current 7-day Season Number
  const seasonNumber = Math.floor((Date.now() - 1700000000000) / CYCLE_MS) + 1;
  const storageClaimKey = `kart_season_reward_claimed_s${seasonNumber}`;

  // Time remaining in current 7-day period
  const [timeLeftStr, setTimeLeftStr] = useState<string>('');
  const [isClaimed, setIsClaimed] = useState<boolean>(() => {
    return localStorage.getItem(storageClaimKey) === 'true';
  });

  // Calculate the 5 random titles for this season
  const currentPool = SEASON_TITLE_POOLS[(seasonNumber - 1) % SEASON_TITLE_POOLS.length];
  const seasonalTitles = currentPool.map(name => `[시즌${seasonNumber}] ${name}`);

  // Find user's current tier
  const currentTier = PASTEL_TIERS.find(t => rankPoints >= t.minRp && rankPoints <= t.maxRp) || PASTEL_TIERS[PASTEL_TIERS.length - 1];

  // Update countdown every second
  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const elapsed = (now - 1700000000000) % CYCLE_MS;
      const msLeft = CYCLE_MS - elapsed;

      const days = Math.floor(msLeft / (1000 * 60 * 60 * 24));
      const hours = Math.floor((msLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((msLeft % (1000 * 60)) / 1000);

      setTimeLeftStr(`${days}일 ${hours.toString().padStart(2, '0')}시간 ${minutes.toString().padStart(2, '0')}분 ${seconds.toString().padStart(2, '0')}초`);
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, []);

  // Handle claiming season rewards
  const handleClaimSeasonReward = () => {
    try {
      AudioEngine.playBoost();
    } catch {
      // ignore
    }

    if (isClaimed) {
      onNotification('보상 수령 완료', '이번 주간 시즌 보상을 이미 수령하셨습니다!');
      return;
    }

    // Pick 1 of the 5 season titles
    const randomTitle = seasonalTitles[Math.floor(Math.random() * seasonalTitles.length)];

    // Check if title already owned
    const alreadyOwns = unlockedTitles.includes(randomTitle);

    if (alreadyOwns) {
      // Duplicate reward: 1,000 Gold
      onAddGold(1000);
      onNotification(
        '중복 칭호 환전 보상 지급!',
        `이미 보유 중인 시즌 한정판 칭호 [${randomTitle}]입니다! 중복 보상으로 [1,000 Gold]가 지급되었습니다!`
      );
    } else {
      // Unlock new title
      onUnlockTitle(randomTitle);
      onNotification(
        `🎉 시즌 ${seasonNumber} 한정판 칭호 획득!`,
        `축하합니다! 이번 시즌 한정 칭호 [${randomTitle}]를 획득하여 프로필에 장착할 수 있습니다!`
      );
    }

    localStorage.setItem(storageClaimKey, 'true');
    setIsClaimed(true);
  };

  return (
    <div className="space-y-6 animate-fadeIn select-none">
      {/* 7-DAY SEASON RESET BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 border border-indigo-500/40 rounded-3xl p-5 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-400/50 flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(99,102,241,0.5)]">
            ♻️
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 font-mono text-[10px] font-black uppercase tracking-wider border border-indigo-400/40">
                시즌 {seasonNumber}기 (7일 주기)
              </span>
              <span className="text-yellow-400 text-xs font-bold">주간 랭킹 실록</span>
            </div>
            <h3 className="text-white text-base md:text-lg font-black tracking-tight mt-0.5 flex items-center space-x-2">
              <span>시즌 주간 초기화 상태</span>
              <span className="text-indigo-400 text-xs font-mono font-normal">({CYCLE_MS / (1000 * 60 * 60 * 24)}일 기준 정산)</span>
            </h3>
            <div className="flex items-center space-x-2 text-xs text-gray-300 font-mono mt-1">
              <Clock size={13} className="text-pink-400 animate-pulse" />
              <span>남은 초기화 시간:</span>
              <strong className="text-pink-300 font-extrabold tracking-wider bg-slate-950/70 px-2 py-0.5 rounded border border-pink-500/30">
                {timeLeftStr || '계산 중...'}
              </strong>
            </div>
          </div>
        </div>

        {/* CLAIM SEASON REWARD BUTTON */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="text-right text-xs hidden sm:block">
            <span className="text-slate-400 block text-[10px]">내 배틀 레이팅 (RP)</span>
            <span className="text-yellow-400 font-black font-mono text-sm">{rankPoints} RP ({currentTier.name})</span>
          </div>

          <button
            onClick={handleClaimSeasonReward}
            disabled={isClaimed}
            className={`w-full sm:w-auto px-5 py-3 rounded-2xl font-black text-xs transition-all shadow-lg active:scale-95 flex items-center justify-center space-x-2 cursor-pointer ${
              isClaimed
                ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-750'
                : 'bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 text-white hover:brightness-110 shadow-[0_0_20px_rgba(244,63,94,0.6)] animate-pulse'
            }`}
          >
            <Gift size={15} />
            <span>{isClaimed ? '이번 주간 보상 수령 완료' : '매 시즌 한정판 칭호 받기'}</span>
          </button>
        </div>
      </div>

      {/* 5 EXCLUSIVE SEASON TITLES POOL PREVIEW */}
      <div className="bg-slate-950/80 border border-slate-850 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-black text-slate-200 flex items-center space-x-1.5">
            <Award size={14} className="text-yellow-400" />
            <span>시즌 {seasonNumber} 한정판 칭호 5종 풀 (매 시즌 랜덤 5종 갱신)</span>
          </span>
          <span className="text-[10px] text-amber-300 font-medium">
            💡 중복 획득 시 보상: <strong>1,000 Gold 즉시 지급!</strong>
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          {seasonalTitles.map((t, idx) => {
            const owned = unlockedTitles.includes(t);
            return (
              <div 
                key={idx}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${
                  owned 
                    ? 'bg-indigo-950/40 border-indigo-400/50 text-indigo-200 shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-300'
                }`}
              >
                <span className="text-[11px] font-black tracking-tight">{t}</span>
                <span className={`text-[9px] font-mono mt-1 ${owned ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
                  {owned ? '✓ 보유 중 (중복 시 1000G)' : '미보유 (획득 가능)'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* PASTEL TEXTURED TIER LEADERBOARD */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-black text-white flex items-center space-x-2">
            <Sparkles size={16} className="text-pink-400" />
            <span>파스텔 질감 티어 순위표 (Pastel Tier Standings)</span>
          </h4>
          <span className="text-[10.5px] text-slate-400 font-mono">
            내 소속 티어: <strong className="text-pink-400">{currentTier.icon} {currentTier.name}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {PASTEL_TIERS.map((tier) => {
            const isUserTier = currentTier.id === tier.id;
            
            // Find real players who fall into this tier based on rankPoints or approximate top records
            const playersInTier = realLeaderboard.filter(p => {
              if (tier.id === 'grandmaster') return p.finalTimeMs <= 25000;
              if (tier.id === 'master') return p.finalTimeMs > 25000 && p.finalTimeMs <= 27000;
              if (tier.id === 'diamond') return p.finalTimeMs > 27000 && p.finalTimeMs <= 30000;
              if (tier.id === 'gold') return p.finalTimeMs > 30000 && p.finalTimeMs <= 34000;
              if (tier.id === 'silver') return p.finalTimeMs > 34000 && p.finalTimeMs <= 40000;
              return p.finalTimeMs > 40000;
            }).slice(0, 3); // top 3 for preview

            return (
              <div
                key={tier.id}
                className={`relative rounded-3xl p-4 transition-all duration-300 border-2 overflow-hidden ${tier.pastelBg} ${tier.pastelBorder} ${
                  isUserTier ? 'ring-4 ring-pink-400/50 scale-[1.02]' : 'hover:scale-[1.01]'
                }`}
              >
                {/* User Current Tier Flag */}
                {isUserTier && (
                  <div className="absolute top-3 right-3 bg-pink-500 text-white font-black text-[9px] px-2 py-0.5 rounded-full shadow-md animate-pulse">
                    CURRENT TIER
                  </div>
                )}

                {/* Tier Header */}
                <div className="flex items-center space-x-3 mb-2.5">
                  <div className="w-11 h-11 rounded-2xl bg-white/70 shadow-sm flex items-center justify-center text-2xl border border-white">
                    {tier.icon}
                  </div>
                  <div>
                    <h5 className={`text-base font-black tracking-tight ${tier.textColor}`}>
                      {tier.name}
                    </h5>
                    <span className="text-[10px] font-bold text-slate-700 bg-white/60 px-2 py-0.5 rounded-full font-mono">
                      {tier.minRp} RP {tier.maxRp === Infinity ? '이상' : `~ ${tier.maxRp} RP`}
                    </span>
                  </div>
                </div>

                {/* Tier Reward Benefit */}
                <div className="bg-white/70 rounded-2xl p-2.5 border border-white/80 mb-3 shadow-inner">
                  <span className="text-[9px] font-black text-slate-600 block uppercase tracking-wider mb-0.5">
                    🎁 시즌 주간 보상 (7일 주기)
                  </span>
                  <p className={`text-xs font-black ${tier.textColor}`}>
                    {tier.rewardDesc}
                  </p>
                </div>

                {/* Real Player Standings in this Tier */}
                <div className="space-y-1.5">
                  <span className="text-[9.5px] font-bold text-slate-700 block">
                    실시간 랭커 ({playersInTier.length}명 등재)
                  </span>
                  {playersInTier.length > 0 ? (
                    playersInTier.map((player, idx) => (
                      <div
                        key={`${player.id}-${idx}`}
                        className="bg-white/80 rounded-xl p-1.5 px-2.5 flex items-center justify-between text-xs border border-white/90 shadow-sm"
                      >
                        <div className="flex items-center space-x-1.5 overflow-hidden">
                          <span className="font-mono font-black text-slate-600 text-[10px]">#{idx + 1}</span>
                          <span className={`font-black truncate text-xs ${tier.textColor}`}>
                            {player.playerName}
                          </span>
                        </div>
                        <span className="font-mono font-black text-slate-800 bg-white px-2 py-0.5 rounded text-[10px] shadow-sm">
                          {player.finalTimeStr}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="bg-white/40 rounded-xl p-2 text-center text-[10px] text-slate-600 font-medium">
                      도전 대기 중! 레이스를 완주하여 첫 주인공이 되세요
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
