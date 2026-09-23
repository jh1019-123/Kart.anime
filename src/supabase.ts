import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export interface RankingRecord {
  id: string;
  playerName: string;
  mapName: string;
  gameMode: string;
  kartName: string;
  finalTimeStr: string;
  finalTimeMs: number;
  date: string;
  isPlayer: boolean;
  tier?: string;
  rp?: number;
}

// Format milliseconds into MM:SS.SS
export function formatMsTime(ms: number): string {
  if (isNaN(ms) || ms <= 0) return '00:00.00';
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const centiseconds = Math.floor((ms % 1000) / 10);
  
  const mStr = minutes.toString().padStart(2, '0');
  const sStr = seconds.toString().padStart(2, '0');
  const cStr = centiseconds.toString().padStart(2, '0');
  
  return `${mStr}:${sStr}.${cStr}`;
}

export async function fetchRankingsFromSupabase(): Promise<RankingRecord[]> {
  if (!supabase) return [];
  
  try {
    const { data, error } = await supabase
      .from('rankings')
      .select('*')
      .order('final_time_ms', { ascending: true })
      .limit(200);
      
    if (error) {
      console.error('Error fetching rankings from Supabase:', error);
      return [];
    }
    
    if (!data) return [];
    
    return data.map((row: any) => {
      const createdDate = row.created_at ? new Date(row.created_at) : new Date();
      const dateStr = `${createdDate.getFullYear()}.${String(createdDate.getMonth() + 1).padStart(2, '0')}.${String(createdDate.getDate()).padStart(2, '0')}`;
      
      return {
        id: row.id || `sup-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        playerName: row.player_name || '익명 라이더',
        mapName: row.map_name,
        gameMode: row.game_mode || '스피드전',
        kartName: row.kart_name || '기본 카트',
        finalTimeStr: formatMsTime(Number(row.final_time_ms)),
        finalTimeMs: Number(row.final_time_ms),
        date: dateStr,
        isPlayer: true,
        tier: row.tier,
        rp: row.rp
      };
    });
  } catch (err) {
    console.error('Error in fetchRankingsFromSupabase:', err);
    return [];
  }
}

export async function saveRankingToSupabase(record: {
  playerName: string;
  mapName: string;
  gameMode: string;
  kartName: string;
  finalTimeMs: number;
  isPlayer: boolean;
  tier?: string;
  rp?: number;
}): Promise<boolean> {
  if (!supabase) return false;
  
  try {
    const { error } = await supabase
      .from('rankings')
      .insert([
        {
          player_name: record.playerName,
          map_name: record.mapName,
          final_time_ms: record.finalTimeMs,
          kart_name: record.kartName,
          game_mode: record.gameMode,
          tier: record.tier || 'BRONZE',
          rp: record.rp || 0
        }
      ]);
      
    if (error) {
      console.error('Error saving ranking to Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error in saveRankingToSupabase:', err);
    return false;
  }
}

/**
 * Update player name across all existing records in Supabase
 */
export async function updatePlayerNameInSupabase(oldName: string, newName: string): Promise<boolean> {
  if (!supabase || !oldName || !newName || oldName === newName) return false;
  
  try {
    const { error } = await supabase
      .from('rankings')
      .update({ player_name: newName })
      .eq('player_name', oldName);
      
    if (error) {
      console.error('Error updating player name in Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error in updatePlayerNameInSupabase:', err);
    return false;
  }
}

/**
 * SQL Script to create and configure rankings table in Supabase
 */
export const SUPABASE_SETUP_SQL = `-- 1. 리더보드 랭킹 테이블 생성 (rankings)
CREATE TABLE IF NOT EXISTS public.rankings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_name TEXT NOT NULL,
    map_name TEXT NOT NULL,
    game_mode TEXT DEFAULT '스피드전',
    kart_name TEXT DEFAULT '기본 카트',
    final_time_ms BIGINT NOT NULL,
    tier TEXT DEFAULT 'BRONZE',
    rp INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 검색 및 랭킹 정렬 속도 최적화를 위한 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_rankings_map_time 
    ON public.rankings (map_name, final_time_ms ASC);

CREATE INDEX IF NOT EXISTS idx_rankings_player 
    ON public.rankings (player_name);

CREATE INDEX IF NOT EXISTS idx_rankings_time 
    ON public.rankings (final_time_ms ASC);

-- 3. Row Level Security (RLS) 보안 정책 설정
ALTER TABLE public.rankings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on rankings" ON public.rankings;
DROP POLICY IF EXISTS "Allow public insert on rankings" ON public.rankings;
DROP POLICY IF EXISTS "Allow public update on rankings" ON public.rankings;

CREATE POLICY "Allow public read on rankings" 
    ON public.rankings FOR SELECT USING (true);

CREATE POLICY "Allow public insert on rankings" 
    ON public.rankings FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on rankings" 
    ON public.rankings FOR UPDATE USING (true);

-- 4. 실시간 동기화 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE public.rankings;
`;
