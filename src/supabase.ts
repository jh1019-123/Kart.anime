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
}

// Format milliseconds into MM:SS.SS
export function formatMsTime(ms: number): string {
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
      .limit(100);
      
    if (error) {
      console.error('Error fetching rankings from Supabase:', error);
      return [];
    }
    
    if (!data) return [];
    
    return data.map((row: any) => {
      // Format the date nicely
      const createdDate = new Date(row.created_at);
      const dateStr = `${createdDate.getFullYear()}.${String(createdDate.getMonth() + 1).padStart(2, '0')}.${String(createdDate.getDate()).padStart(2, '0')}`;
      
      return {
        id: row.id,
        playerName: row.player_name,
        mapName: row.map_name,
        gameMode: row.game_mode || '스피드전',
        kartName: row.kart_name || '기본 카트',
        finalTimeStr: formatMsTime(row.final_time_ms),
        finalTimeMs: row.final_time_ms,
        date: dateStr,
        isPlayer: true
      };
    });
  } catch (err) {
    console.error('Error in fetchRankingsFromSupabase:', err);
    return [];
  }
}

export async function saveRankingToSupabase(record: Omit<RankingRecord, 'id' | 'date' | 'finalTimeStr'>): Promise<boolean> {
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
          game_mode: record.gameMode
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
