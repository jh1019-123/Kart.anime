import React, { useEffect, useState, useRef } from 'react';
import { KartInfo } from '../types';
import { Sparkles, Trophy } from 'lucide-react';
import { AudioEngine } from '../lib/gameEngine';

interface GachaRouletteProps {
  isDrawing: boolean;
  drawnKart: KartInfo | null;
  drawRefund: boolean;
  gold: number;
  onDraw: () => void;
  karts: KartInfo[];
  unlockedKarts: string[];
}

export const GachaRoulette: React.FC<GachaRouletteProps> = ({
  isDrawing,
  drawnKart,
  drawRefund,
  gold,
  onDraw,
  karts,
  unlockedKarts,
}) => {
  // Candidate pool excluding developer secret car
  const pool = karts.filter(k => k.id !== 'outrage_supreme_dev');
  
  // Rotating roulette items (long sequence to simulate spinning conveyor wheel)
  const [rouletteItems, setRouletteItems] = useState<KartInfo[]>([]);
  const [spinOffset, setSpinOffset] = useState<number>(0);
  const [revealed, setRevealed] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate roulette strip whenever drawing starts
  useEffect(() => {
    if (isDrawing) {
      setRevealed(false);
      // Create a 40-item strip ending on a random selection
      const strip: KartInfo[] = [];
      for (let i = 0; i < 40; i++) {
        const pick = pool[Math.floor(Math.random() * pool.length)];
        strip.push(pick);
      }
      setRouletteItems(strip);
      setSpinOffset(0);

      // Animation variables
      let currentOffset = 0;
      let speed = 42;
      let tickCounter = 0;
      let animId: number;

      const animateRoulette = () => {
        currentOffset += speed;
        setSpinOffset(currentOffset);

        tickCounter++;
        if (tickCounter % 3 === 0) {
          try {
            AudioEngine.playShuffleTick();
          } catch {
            // ignore
          }
        }

        // Gradual deceleration
        if (speed > 3) {
          speed *= 0.985;
          animId = requestAnimationFrame(animateRoulette);
        } else if (speed > 0.4) {
          speed *= 0.96;
          animId = requestAnimationFrame(animateRoulette);
        }
      };

      animId = requestAnimationFrame(animateRoulette);

      return () => {
        cancelAnimationFrame(animId);
      };
    } else if (drawnKart) {
      setRevealed(true);
    }
  }, [isDrawing, drawnKart]);

  // Initial random strip when idle
  useEffect(() => {
    if (rouletteItems.length === 0) {
      const initial: KartInfo[] = [];
      for (let i = 0; i < 15; i++) {
        initial.push(pool[i % pool.length]);
      }
      setRouletteItems(initial);
    }
  }, [pool, rouletteItems.length]);

  return (
    <div className="flex flex-col items-center w-full select-none">
      {/* ROULETTE STAGE WINDOW */}
      <div className="relative w-full max-w-[460px] h-[210px] bg-slate-950 border-4 border-yellow-500/80 rounded-3xl overflow-hidden shadow-[0_0_35px_rgba(234,179,8,0.25)] flex flex-col justify-between p-3 font-mono">
        {/* Top & Bottom Accent Lights */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

        {/* Center Target Indicator Needle */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-none">
          <div className="w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-t-[14px] border-t-yellow-400 filter drop-shadow-[0_0_8px_rgba(250,204,21,1)]" />
          <div className="w-0.5 h-full border-r-2 border-dashed border-yellow-400/50" />
        </div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-none">
          <div className="w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-b-[14px] border-b-yellow-400 filter drop-shadow-[0_0_8px_rgba(250,204,21,1)]" />
        </div>

        {/* Status Header */}
        <div className="flex justify-between items-center z-20 px-2 text-[10px]">
          <span className="flex items-center space-x-1 text-yellow-400 font-black tracking-wider">
            <Sparkles size={12} className={isDrawing ? 'animate-spin' : ''} />
            <span>{isDrawing ? '🎰 실루엣 룰렛 회전 중...' : drawnKart ? '✨ 당첨 머신 확인' : '🎲 캡슐 룰렛 대기'}</span>
          </span>
          <span className="bg-slate-900/90 px-2 py-0.5 rounded-full border border-slate-750 text-slate-400 text-[9px]">
            100 GOLD / 1회
          </span>
        </div>

        {/* MAIN ROULETTE DISPLAY */}
        <div className="relative flex-1 flex items-center justify-center overflow-hidden my-1">
          {/* Subtle Vignette Gradient Shadows */}
          <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-slate-950 to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-slate-950 to-transparent z-10 pointer-events-none" />

          {/* SPINNING SILHOUETTES CONVEYOR */}
          {isDrawing ? (
            <div 
              ref={containerRef}
              className="flex items-center space-x-4 absolute will-change-transform"
              style={{
                transform: `translateX(-${spinOffset % 2800}px)`,
                transition: 'none'
              }}
            >
              {/* Duplicate array twice for seamless looping */}
              {[...rouletteItems, ...rouletteItems, ...rouletteItems].map((kart, idx) => (
                <div 
                  key={`${kart.id}-${idx}`}
                  className="flex-shrink-0 w-28 h-28 rounded-2xl bg-gradient-to-b from-slate-900 to-black border-2 border-slate-700/70 p-2 flex flex-col items-center justify-center relative shadow-lg"
                >
                  {/* Glowing Silhouette Underglow */}
                  <div className="w-16 h-4 bg-cyan-500/20 rounded-full blur-sm absolute bottom-4" />
                  
                  {/* Black Vehicle Silhouette */}
                  <div className="relative w-20 h-14 flex items-center justify-center">
                    <svg viewBox="0 0 100 50" className="w-full h-full filter drop-shadow-[0_0_6px_rgba(6,182,212,0.4)]">
                      {/* Stylized sleek aerodynamic supercar / kart silhouette */}
                      <path 
                        d="M 5 35 Q 12 35 15 28 Q 25 15 50 15 Q 70 15 82 25 L 95 28 Q 98 32 95 38 L 5 38 Z" 
                        fill="#050811" 
                        stroke="#06b6d4" 
                        strokeWidth="1.5"
                      />
                      {/* Silhouette Cabin Glass line */}
                      <path 
                        d="M 35 20 Q 52 18 65 24 L 75 25 Q 65 20 48 18 Z" 
                        fill="#0e7490" 
                        opacity="0.6"
                      />
                      {/* Silhouette Wheels */}
                      <circle cx="22" cy="36" r="7" fill="#000000" stroke="#38bdf8" strokeWidth="1.5" />
                      <circle cx="76" cy="36" r="7" fill="#000000" stroke="#38bdf8" strokeWidth="1.5" />
                      <circle cx="22" cy="36" r="2.5" fill="#38bdf8" />
                      <circle cx="76" cy="36" r="2.5" fill="#38bdf8" />
                      {/* Rear Spoiler */}
                      <path d="M 8 22 L 14 22 L 18 28 L 6 28 Z" fill="#0284c7" />
                    </svg>
                  </div>

                  {/* Mystery Question / Model Name text */}
                  <span className="text-[9px] font-black text-cyan-400/80 mt-1 uppercase tracking-tighter">
                    SILHOUETTE
                  </span>
                </div>
              ))}
            </div>
          ) : drawnKart && revealed ? (
            /* REVEALED PRIZE DISPLAY (Dramatic illumination from silhouette into real kart) */
            <div className="flex flex-col items-center justify-center animate-fadeIn w-full px-4">
              <div className="flex items-center space-x-4">
                {/* 3D-angled Vehicle Visual */}
                <div 
                  className="w-24 h-20 rounded-2xl bg-gradient-to-br from-slate-900 to-black border-2 flex items-center justify-center relative shadow-[0_0_25px_rgba(250,204,21,0.6)]"
                  style={{ borderColor: `#${drawnKart.color.toString(16).padStart(6, '0')}` }}
                >
                  <div 
                    className="w-16 h-5 rounded-full filter blur-sm absolute bottom-2 opacity-70"
                    style={{ backgroundColor: `#${drawnKart.flameColor.toString(16).padStart(6, '0')}` }}
                  />
                  {/* Revealed Kart Icon / Vector */}
                  <div className="text-3xl filter drop-shadow-md">🏎️</div>
                </div>

                {/* Information */}
                <div className="flex flex-col text-left">
                  <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider w-fit shadow-sm ${
                    drawnKart.rarity === 'Legendary' ? 'bg-purple-600 text-white' : drawnKart.rarity === 'Rare' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-200'
                  }`}>
                    {drawnKart.rarity}
                  </span>
                  <span className="text-white text-base font-black italic tracking-tight mt-0.5">
                    {drawnKart.name}
                  </span>
                  <span className="text-yellow-300 text-[10px] font-bold mt-1">
                    {drawRefund ? '💥 이미 보유 중인 중복 기체! 50G 환급!' : '🎉 신규 기체 획득! 차고에 즉시 등록!'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* IDLE PREVIEW: Sleek Rotating 3D Black Vehicle Silhouette */
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="relative w-40 h-20 flex items-center justify-center">
                {/* Neon circular pedestal */}
                <div className="absolute bottom-1 w-32 h-6 border border-cyan-400/40 rounded-full animate-pulse transform -rotate-12 bg-cyan-500/10" />
                
                {/* Mysterious Black Silhouette Supercar */}
                <div className="relative w-32 h-16 flex items-center justify-center filter drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]">
                  <svg viewBox="0 0 100 50" className="w-full h-full">
                    <path 
                      d="M 5 35 Q 12 35 15 28 Q 25 15 50 15 Q 70 15 82 25 L 95 28 Q 98 32 95 38 L 5 38 Z" 
                      fill="#030712" 
                      stroke="#38bdf8" 
                      strokeWidth="1.8"
                    />
                    <path 
                      d="M 35 20 Q 52 18 65 24 L 75 25 Q 65 20 48 18 Z" 
                      fill="#0284c7" 
                      opacity="0.7"
                    />
                    <circle cx="22" cy="36" r="7" fill="#000000" stroke="#67e8f9" strokeWidth="1.8" />
                    <circle cx="76" cy="36" r="7" fill="#000000" stroke="#67e8f9" strokeWidth="1.8" />
                    <circle cx="22" cy="36" r="2.5" fill="#38bdf8" />
                    <circle cx="76" cy="36" r="2.5" fill="#38bdf8" />
                    <path d="M 8 22 L 14 22 L 18 28 L 6 28 Z" fill="#06b6d4" />
                  </svg>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 font-sans">
                버튼을 눌러 <strong>검은 차량 실루엣 룰렛</strong>을 회전시키세요!
              </span>
            </div>
          )}
        </div>

        {/* Bottom Ticker Info */}
        <div className="flex justify-between items-center z-20 px-2 pt-1 border-t border-slate-850 text-[9px] text-slate-400">
          <span>내 보유 골드: <strong className="text-yellow-400">{gold} G</strong></span>
          <span>보유 기체: <strong className="text-cyan-400">{unlockedKarts.length} / {karts.length}대</strong></span>
        </div>
      </div>

      {/* DRAW BUTTON */}
      <button
        type="button"
        onClick={onDraw}
        disabled={isDrawing || gold < 100}
        className={`w-full max-w-[460px] mt-3 py-3 px-6 rounded-2xl font-black text-xs cursor-pointer shadow-lg active:scale-95 transition-all text-center flex items-center justify-center space-x-2 font-mono ${
          isDrawing || gold < 100
            ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-850'
            : 'bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 hover:opacity-90 text-slate-950 animate-bounce'
        }`}
      >
        <Sparkles size={14} className={isDrawing ? 'animate-spin' : ''} />
        <span>{gold < 100 ? '골드가 부족합니다 (100G 필요)' : isDrawing ? '룰렛 회전 중...' : '100 Gold 소모하여 실루엣 룰렛 슈팅!'}</span>
      </button>
    </div>
  );
};
