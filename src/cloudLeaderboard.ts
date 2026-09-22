import { RankingRecord } from './supabase';

const CLOUD_OBJECT_ID = 'ff808181a09d98f701a0cb6982d273bf';
const CLOUD_URL = `https://api.restful-api.dev/objects/${CLOUD_OBJECT_ID}`;

// Known bot/AI names to exclude permanently
const AI_BOT_NAMES = [
  '다오', 'dao', '배찌', 'bazzi', '우니', 'wuni', 
  '디지니', 'dizni', '마리드', 'marid', '케피', 'kephi', 
  '에티', 'etti', '모스', 'mos', 'ai rival'
];

export function isBotPlayer(name: string): boolean {
  if (!name) return true;
  const lower = name.toLowerCase().trim();
  return AI_BOT_NAMES.some(bot => lower.includes(bot));
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

export interface CloudRankingItem {
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

/**
 * Fetch real-time live global rankings from the cloud
 * Excludes all AI bots (Dao, Bazzi, etc.)
 */
export async function fetchLiveCloudRankings(): Promise<CloudRankingItem[]> {
  try {
    const res = await fetch(CLOUD_URL, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-cache'
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch cloud rankings: ${res.status}`);
    }

    const json = await res.json();
    const rawRecords: CloudRankingItem[] = json?.data?.records || [];

    // Filter out bots and ensure only real players
    const filtered = rawRecords.filter(item => {
      if (!item || !item.playerName) return false;
      if (item.isPlayer === false) return false;
      if (isBotPlayer(item.playerName)) return false;
      return true;
    });

    // Save cache locally
    localStorage.setItem('kart_real_players_leaderboard', JSON.stringify(filtered));
    return filtered;
  } catch (err) {
    console.warn('Could not fetch cloud rankings, using local cache:', err);
    try {
      const cached = localStorage.getItem('kart_real_players_leaderboard');
      if (cached) {
        const parsed: CloudRankingItem[] = JSON.parse(cached);
        return parsed.filter(p => !isBotPlayer(p.playerName) && p.isPlayer !== false);
      }
    } catch {
      // fallback
    }
    return [];
  }
}

/**
 * Save real player ranking record to the global cloud
 * Synchronizes across all users playing on Vercel or any URL
 */
export async function saveLiveCloudRanking(newRecord: Omit<CloudRankingItem, 'id' | 'date'>): Promise<CloudRankingItem[]> {
  // Reject bot records
  if (isBotPlayer(newRecord.playerName)) {
    return [];
  }

  const now = new Date();
  const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;

  const recordToSave: CloudRankingItem = {
    ...newRecord,
    id: `rec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    date: dateStr,
    isPlayer: true
  };

  try {
    // 1. Fetch current list
    let existingList: CloudRankingItem[] = [];
    try {
      const res = await fetch(CLOUD_URL, { cache: 'no-cache' });
      if (res.ok) {
        const json = await res.json();
        existingList = json?.data?.records || [];
      }
    } catch {
      // ignore
    }

    // 2. Filter out bots and merge with new player record
    const cleaned = existingList.filter(item => item && !isBotPlayer(item.playerName) && item.isPlayer !== false);
    
    // Deduplicate: If same player and map has a worse record, replace it
    const existingIndex = cleaned.findIndex(
      item => item.playerName === recordToSave.playerName && item.mapName === recordToSave.mapName
    );

    if (existingIndex >= 0) {
      if (recordToSave.finalTimeMs < cleaned[existingIndex].finalTimeMs) {
        cleaned[existingIndex] = recordToSave;
      }
    } else {
      cleaned.push(recordToSave);
    }

    // Sort by best time (ascending)
    cleaned.sort((a, b) => a.finalTimeMs - b.finalTimeMs);

    // Keep top 200 records
    const trimmed = cleaned.slice(0, 200);

    // 3. Put back to cloud
    await fetch(CLOUD_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        name: 'real_players_leaderboard_live',
        data: {
          records: trimmed
        }
      })
    });

    localStorage.setItem('kart_real_players_leaderboard', JSON.stringify(trimmed));
    return trimmed;
  } catch (err) {
    console.error('Failed to save ranking to cloud:', err);
    // Cache locally as fallback
    try {
      const cached = localStorage.getItem('kart_real_players_leaderboard');
      const list: CloudRankingItem[] = cached ? JSON.parse(cached) : [];
      list.push(recordToSave);
      list.sort((a, b) => a.finalTimeMs - b.finalTimeMs);
      localStorage.setItem('kart_real_players_leaderboard', JSON.stringify(list));
      return list;
    } catch {
      return [recordToSave];
    }
  }
}
