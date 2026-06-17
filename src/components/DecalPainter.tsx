import React, { useState, useRef } from 'react';
import { Trash2, Palette, ChevronDown, RotateCcw, Paintbrush, ShieldCheck } from 'lucide-react';

interface DecalPainterProps {
  pixels: string[];
  onChange: (newPixels: string[]) => void;
}

export const DecalPainter: React.FC<DecalPainterProps> = ({ pixels, onChange }) => {
  const [selectedColor, setSelectedColor] = useState<string>('#22d3ee');
  const [activeTool, setActiveTool] = useState<'pencil' | 'eraser' | 'bucket'>('pencil');
  const [isMirrorX, setIsMirrorX] = useState<boolean>(false);
  const isDrawingRef = useRef<boolean>(false);

  const colors = [
    '#22d3ee', // Cyan
    '#ec4899', // Pink
    '#eab308', // Yellow
    '#a855f7', // Purple
    '#ef4444', // Red
    '#22c55e', // Green
    '#f97316', // Orange
    '#ffffff', // White
    '#000000', // Black
  ];

  const gridSize = 12; // 12x12 grid = 144 pixels

  // Bucket fill algorithm
  const floodFill = (grid: string[], startIndex: number, targetColor: string, replacementColor: string) => {
    if (targetColor === replacementColor) return;
    
    const queue = [startIndex];
    const visited = new Set<number>();
    
    // Convert index to coordinates
    const getCoord = (idx: number) => ({
      x: idx % gridSize,
      y: Math.floor(idx / gridSize)
    });

    const getIndex = (x: number, y: number) => y * gridSize + x;

    while (queue.length > 0) {
      const currIdx = queue.shift()!;
      if (visited.has(currIdx)) continue;
      visited.add(currIdx);

      if (grid[currIdx] === targetColor) {
        grid[currIdx] = replacementColor;
        const { x, y } = getCoord(currIdx);

        // Check 4 directions
        if (x > 0) queue.push(getIndex(x - 1, y));
        if (x < gridSize - 1) queue.push(getIndex(x + 1, y));
        if (y > 0) queue.push(getIndex(x, y - 1));
        if (y < gridSize - 1) queue.push(getIndex(x, y + 1));
      }
    }
  };

  const handlePixelAction = (index: number) => {
    const nextPixels = [...pixels];
    const colorToApply = activeTool === 'eraser' ? 'transparent' : selectedColor;

    if (activeTool === 'bucket') {
      const targetColor = nextPixels[index];
      floodFill(nextPixels, index, targetColor, colorToApply);
      onChange(nextPixels);
    } else {
      // Pencil or Eraser
      nextPixels[index] = colorToApply;
      
      // Mirror drawing on X-axis (ideal for symmetrical car decals!)
      if (isMirrorX) {
        const x = index % gridSize;
        const y = Math.floor(index / gridSize);
        const mirroredX = gridSize - 1 - x;
        const mirroredIndex = y * gridSize + mirroredX;
        nextPixels[mirroredIndex] = colorToApply;
      }

      onChange(nextPixels);
    }
  };

  const handleMouseDown = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    isDrawingRef.current = true;
    handlePixelAction(index);
  };

  const handleMouseEnter = (index: number) => {
    if (isDrawingRef.current && activeTool !== 'bucket') {
      handlePixelAction(index);
    }
  };

  const handleMouseUpGlobal = () => {
    isDrawingRef.current = false;
  };

  // Add global mouse up listener so it doesn't get stuck drawing if user releases muscle outside
  React.useEffect(() => {
    window.addEventListener('mouseup', handleMouseUpGlobal);
    window.addEventListener('touchend', handleMouseUpGlobal);
    return () => {
      window.removeEventListener('mouseup', handleMouseUpGlobal);
      window.removeEventListener('touchend', handleMouseUpGlobal);
    };
  }, []);

  const handleTouchStart = (index: number, e: React.TouchEvent) => {
    isDrawingRef.current = true;
    handlePixelAction(index);
  };

  const handleClear = () => {
    if (window.confirm('그린 데칼 디자인을 초기화하시겠습니까?')) {
      onChange(Array(gridSize * gridSize).fill('transparent'));
    }
  };

  const preloadSamplePattern = (type: 'heart' | 'checker' | 'stripes') => {
    const sample = Array(gridSize * gridSize).fill('transparent');
    
    if (type === 'heart') {
      // Draw a simple heart
      const heartIndices = [
        14, 15, 17, 18,
        25, 26, 27, 28, 29, 30,
        37, 38, 39, 40, 41, 42, 43, 44,
        49, 50, 51, 52, 53, 54, 55, 56, 57, 58,
        61, 62, 63, 64, 65, 66, 67, 68, 69, 70,
        74, 75, 76, 77, 78, 79, 80, 81,
        87, 88, 89, 90, 91, 92,
        100, 101, 102, 103,
        113, 114
      ];
      heartIndices.forEach(idx => {
        if (idx < sample.length) sample[idx] = '#ef4444';
      });
    } else if (type === 'checker') {
      for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
          const idx = y * gridSize + x;
          if ((x + y) % 2 === 0) {
            sample[idx] = '#ffffff';
          } else {
            sample[idx] = '#000000';
          }
        }
      }
    } else if (type === 'stripes') {
      for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
          const idx = y * gridSize + x;
          if (x % 3 === 0) {
            sample[idx] = '#22d3ee';
          } else if (x % 3 === 1) {
            sample[idx] = '#ec4899';
          } else {
            sample[idx] = 'transparent';
          }
        }
      }
    }
    onChange(sample);
  };

  return (
    <div className="flex flex-col bg-slate-950/90 border border-slate-800 rounded-2xl p-4.5 w-full space-y-4" id="decal-painter-widget">
      
      {/* Title block */}
      <div className="flex justify-between items-center border-b border-white/5 pb-2">
        <h4 className="text-xs font-black text-cyan-405 text-cyan-400 flex items-center space-x-1.5 uppercase tracking-wider">
          <Palette size={14} />
          <span>나만의 커스텀 데칼 드로잉</span>
        </h4>
        <span className="text-[8px] bg-cyan-950 text-cyan-400 px-1.5 py-0.5 rounded font-mono font-bold">12 x 12 GRID</span>
      </div>

      {/* Main interactive grid canvas */}
      <div className="flex justify-center items-center">
        <div 
          className="grid gap-[2px] bg-slate-900 border-2 border-slate-700/80 p-2.5 rounded-xl cursor-crosshair shadow-lg overflow-hidden select-none"
          style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`, width: '190px', height: '190px' }}
        >
          {pixels.map((color, index) => {
            const hasColor = color !== 'transparent';
            return (
              <div
                key={index}
                onMouseDown={(e) => handleMouseDown(index, e)}
                onMouseEnter={() => handleMouseEnter(index)}
                onTouchStart={(e) => handleTouchStart(index, e)}
                className="w-full h-full rounded-[2px] border transition-colors relative"
                style={{
                  backgroundColor: hasColor ? color : 'transparent',
                  borderColor: 'rgba(255, 255, 255, 0.05)',
                  backgroundImage: !hasColor ? 'linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)' : undefined,
                  backgroundSize: !hasColor ? '6px 6px' : undefined,
                  backgroundPosition: !hasColor ? '0 0, 0 3px, 3px -3px, -3px 0px' : undefined
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Drawing Toolbar and Controls */}
      <div className="flex flex-col space-y-3 font-sans">
        
        {/* Tool selector */}
        <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl justify-around text-[10.5px]">
          <button
            onClick={() => setActiveTool('pencil')}
            className={`flex-1 py-1 px-1.5 font-bold rounded-lg transition-all flex items-center justify-center space-x-1 ${
              activeTool === 'pencil' ? 'bg-cyan-500 text-slate-950 font-black shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>✏️</span>
            <span>연필</span>
          </button>
          <button
            onClick={() => setActiveTool('eraser')}
            className={`flex-1 py-1 px-1.5 font-bold rounded-lg transition-all flex items-center justify-center space-x-1 ${
              activeTool === 'eraser' ? 'bg-pink-500 text-white font-black shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🧹</span>
            <span>지우개</span>
          </button>
          <button
            onClick={() => setActiveTool('bucket')}
            className={`flex-1 py-1 px-1.5 font-bold rounded-lg transition-all flex items-center justify-center space-x-1 ${
              activeTool === 'bucket' ? 'bg-purple-500 text-white font-black shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🪣</span>
            <span>채우기</span>
          </button>
        </div>

        {/* Symmetry toggle */}
        <div className="flex items-center justify-between px-1">
          <label className="text-[10px] text-gray-400 font-bold flex items-center space-x-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={isMirrorX}
              onChange={(e) => setIsMirrorX(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0 focus:ring-offset-0 focus:outline-none"
            />
            <span>데칼 좌우 대칭 그리기 (Symmetry)</span>
          </label>
        </div>

        {/* Color Palette Strip */}
        <div className="flex flex-wrap gap-1.5 justify-center py-1">
          {colors.map((c) => (
            <button
              key={c}
              onClick={() => {
                setSelectedColor(c);
                if (activeTool === 'eraser') setActiveTool('pencil');
              }}
              className={`w-6 h-6 rounded-full border-2 transition-transform active:scale-90 ${
                selectedColor === c && activeTool !== 'eraser' ? 'border-white scale-110 shadow-md' : 'border-slate-800 hover:scale-105'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        {/* Samples & Preset quick injectors */}
        <div className="flex items-center justify-between space-x-1.5 text-[9.5px]">
          <span className="text-gray-500 font-bold shrink-0">샘플 스킨:</span>
          <div className="flex space-x-1">
            <button
              onClick={() => preloadSamplePattern('heart')}
              className="bg-slate-900 hover:bg-slate-850 hover:text-cyan-405 border border-slate-800 text-gray-300 px-1.5 py-0.5 rounded transition-all font-semibold"
            >
              하트❤️
            </button>
            <button
              onClick={() => preloadSamplePattern('checker')}
              className="bg-slate-900 hover:bg-slate-850 hover:text-cyan-405 border border-slate-800 text-gray-300 px-1.5 py-0.5 rounded transition-all font-semibold"
            >
              체커🏁
            </button>
            <button
              onClick={() => preloadSamplePattern('stripes')}
              className="bg-slate-900 hover:bg-slate-850 hover:text-cyan-405 border border-slate-800 text-gray-300 px-1.5 py-0.5 rounded transition-all font-semibold"
            >
              스트라이프
            </button>
          </div>
        </div>

        {/* Action button bar */}
        <div className="flex space-x-2 pt-2 border-t border-white/5">
          <button
            onClick={handleClear}
            className="flex-1 py-1 rounded bg-slate-900 hover:bg-red-950/40 border border-slate-800 hover:border-red-900/40 text-red-400 text-[10px] font-bold transition-all flex items-center justify-center space-x-1 active:scale-95 cursor-pointer"
          >
            <Trash2 size={12} />
            <span>데칼 초기화</span>
          </button>
          <div className="text-[8px] text-gray-500 font-medium font-mono text-right flex items-center px-1">
            데칼 이펙트가 게임 플레이 시 3D 기포 오라와 보드에 반영됩니다!
          </div>
        </div>

      </div>

    </div>
  );
};
