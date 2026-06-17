import React from 'react';

interface KartStats {
  speed: number;
  accel: number;
  drift: number;
  handling: number;
}

interface KartRadarChartProps {
  baseStats: KartStats;
  upgradedStats: KartStats;
  colorHex?: string;
}

export const KartRadarChart: React.FC<KartRadarChartProps> = ({
  baseStats,
  upgradedStats,
  colorHex = '#22d3ee'
}) => {
  // Center of SVG (240x220 canvas coordinates)
  const cx = 120;
  const cy = 110;
  const maxRadius = 68;

  // Angles for pentagon vertices: starting from top (-Math.PI / 2) and clockwise
  const angles = [
    -Math.PI / 2,                  // 0: 드리프트 (Top)
    -Math.PI / 2 + (2 * Math.PI) / 5,  // 1: 가속도 (Top-Right)
    -Math.PI / 2 + (4 * Math.PI) / 5,  // 2: 커브 (Bottom-Right)
    -Math.PI / 2 + (6 * Math.PI) / 5,  // 3: 가속 시간 (Bottom-Left)
    -Math.PI / 2 + (8 * Math.PI) / 5,  // 4: 게이지 속도 (Top-Left)
  ];

  // Helper to normalize values between 0.35 and 0.95 for a nice pentagon shape
  const getNormalizeRatios = (stats: KartStats) => {
    // scale speed (base ~1.1, max upgraded ~1.5) -> 가속 시간
    const speedRatio = Math.min(0.95, Math.max(0.35, (stats.speed - 0.7) / 1.0));
    
    // scale accel (base ~0.02, max upgraded ~0.045) -> 가속도
    const accelRatio = Math.min(0.95, Math.max(0.35, (stats.accel - 0.01) / 0.04));
    
    // scale drift (base ~1.5, max upgraded ~3.6) -> 드리프트
    const driftRatio = Math.min(0.95, Math.max(0.35, (stats.drift - 0.8) / 3.0));
    
    // scale handling (base ~0.025, max upgraded ~0.055) -> 커브
    const curveRatio = Math.min(0.95, Math.max(0.35, (stats.handling - 0.015) / 0.045));
    
    // scale drift charge rate -> 게이지 속도
    const gaugeRatio = Math.min(0.95, Math.max(0.35, (stats.drift - 1.0) / 2.8));

    return [
      driftRatio,          // Top
      accelRatio,          // Top Right
      curveRatio,          // Bottom Right
      speedRatio,          // Bottom Left (Acceleration Time)
      gaugeRatio,          // Top Left (Gauge Speed)
    ];
  };

  const baseRatios = getNormalizeRatios(baseStats);
  const upgradedRatios = getNormalizeRatios(upgradedStats);

  // Helper to construct polygon point string
  const getPointsString = (ratios: number[]) => {
    return ratios
      .map((ratio, index) => {
        const radius = ratio * maxRadius;
        const x = cx + radius * Math.cos(angles[index]);
        const y = cy + radius * Math.sin(angles[index]);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const basePoints = getPointsString(baseRatios);
  const upgradedPoints = getPointsString(upgradedRatios);

  // Pre-calculated outer coordinates for background lines
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];

  return (
    <div className="flex flex-col items-center justify-center font-mono select-none" id="kart-radar-chart">
      {/* Container display frame */}
      <div className="relative bg-slate-950/80 p-3 rounded-2.5xl rounded-3xl border border-slate-800 shadow-[0_0_15px_rgba(0,0,0,0.6)] w-[250px] h-[230px] flex items-center justify-center overflow-hidden">
        
        {/* Futursitic blueprint grid in background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.015)_1px,transparent_1px)] bg-[size:10px_10px] pointer-events-none" />

        {/* Glow filter definition */}
        <svg className="w-full h-full" viewBox="0 0 240 220">
          <defs>
            <radialGradient id="glow-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={colorHex} stopOpacity="0.25" />
              <stop offset="100%" stopColor="#000" stopOpacity="0" />
            </radialGradient>
            <filter id="radar-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Centered radial glow ring */}
          <circle cx={cx} cy={cy} r={maxRadius} fill="url(#glow-grad)" className="animate-pulse" style={{ animationDuration: '4s' }} />

          {/* Pentagon Web Background (Concentric Circles/Pentagons) */}
          {gridLevels.map((level, levelIdx) => {
            const r = level * maxRadius;
            const points = angles
              .map((angle) => {
                const x = cx + r * Math.cos(angle);
                const y = cy + r * Math.sin(angle);
                return `${x.toFixed(1)},${y.toFixed(1)}`;
              })
              .join(' ');

            return (
              <polygon
                key={levelIdx}
                points={points}
                fill="none"
                stroke={levelIdx === 4 ? colorHex : 'rgba(255, 255, 255, 0.08)'}
                strokeWidth={levelIdx === 4 ? 1.5 : 0.8}
                strokeDasharray={levelIdx !== 4 ? '2 2' : undefined}
              />
            );
          })}

          {/* Pentagon Axis lines radiating from Center */}
          {angles.map((angle, index) => {
            const x = cx + maxRadius * Math.cos(angle);
            const y = cy + maxRadius * Math.sin(angle);
            return (
              <line
                key={index}
                x1={cx}
                y1={cy}
                x2={x}
                y2={y}
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth="0.8"
              />
            );
          })}

          {/* Base Specs Area Polygon (Dimmer/Lower Level) */}
          <polygon
            points={basePoints}
            fill="rgba(34, 211, 238, 0.12)"
            stroke="rgba(34, 211, 238, 0.35)"
            strokeWidth="1.2"
            strokeDasharray="1 1"
          />

          {/* Upgraded Spec Area Polygon (Brighter Glow Panel Area) */}
          <polygon
            points={upgradedPoints}
            fill="rgba(34, 211, 238, 0.30)"
            stroke={colorHex}
            strokeWidth="2.2"
            filter="url(#radar-glow)"
            className="transition-all duration-500"
          />

          {/* Markers / Outer Dots at Upgraded Spec Nodes */}
          {upgradedRatios.map((ratio, index) => {
            const radius = ratio * maxRadius;
            const x = cx + radius * Math.cos(angles[index]);
            const y = cy + radius * Math.sin(angles[index]);
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="3.5"
                fill="#ffffff"
                stroke={colorHex}
                strokeWidth="1.5"
                className="shadow-md"
              />
            );
          })}

          {/* Interactive Vertex Labels */}
          {/* Label 0 (Top): 드리프트 */}
          <text
            x={cx}
            y={cy - maxRadius - 10}
            textAnchor="middle"
            fill="#e2e8f0"
            fontSize="10"
            fontWeight="bold"
            className="font-sans font-black tracking-wider fill-white"
          >
            드리프트
          </text>

          {/* Label 1 (Top-Right): 가속도 */}
          <text
            x={cx + maxRadius * Math.cos(angles[1]) + 20}
            y={cy + maxRadius * Math.sin(angles[1]) + 2}
            textAnchor="start"
            fill="#a5f3fc"
            fontSize="9"
            fontWeight="bold"
            className="font-sans font-black tracking-normal fill-cyan-300"
          >
            가속도
          </text>

          {/* Label 2 (Bottom-Right): 커브 */}
          <text
            x={cx + maxRadius * Math.cos(angles[2]) + 10}
            y={cy + maxRadius * Math.sin(angles[2]) + 12}
            textAnchor="start"
            fill="#fef08a"
            fontSize="9"
            fontWeight="bold"
            className="font-sans font-black tracking-normal fill-yellow-300"
          >
            커브
          </text>

          {/* Label 3 (Bottom-Left): 가속 시간 */}
          <text
            x={cx + maxRadius * Math.cos(angles[3]) - 10}
            y={cy + maxRadius * Math.sin(angles[3]) + 12}
            textAnchor="end"
            fill="#fbcfe8"
            fontSize="9"
            fontWeight="bold"
            className="font-sans font-black tracking-normal fill-pink-300"
          >
            가속 시간
          </text>

          {/* Label 4 (Top-Left): 게이지 속도 */}
          <text
            x={cx + maxRadius * Math.cos(angles[4]) - 20}
            y={cy + maxRadius * Math.sin(angles[4]) + 2}
            textAnchor="end"
            fill="#c084fc"
            fontSize="9"
            fontWeight="bold"
            className="font-sans font-black tracking-normal fill-purple-300"
          >
            게이지 속도
          </text>
        </svg>

        {/* Small center decorative dot */}
        <div className="absolute w-2 h-2 rounded-full bg-white border border-slate-900 pointer-events-none" style={{ left: `${cx - 4}px`, top: `${cy - 4}px` }} />
      </div>
    </div>
  );
};
