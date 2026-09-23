-- ================================================================
-- Kart Rider Anime Edition - Supabase Database Schema & Setup SQL
-- ================================================================
-- Supabase 대시보드(Dashboard) > SQL Editor > "New Query" 에
-- 아래 코드를 그대로 붙여넣고 [RUN] 버튼을 눌러 실행해주세요.
-- ================================================================

-- 1. 리더보드 랭킹 테이블 생성 (rankings)
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

CREATE INDEX IF NOT EXISTS idx_rankings_created 
    ON public.rankings (created_at DESC);

-- 3. Row Level Security (RLS) 보안 정책 설정
-- 모든 사용자가 실시간으로 기록을 조회(SELECT)하고 완주 기록을 저장(INSERT) 및 닉네임 수정(UPDATE)할 수 있도록 허용
ALTER TABLE public.rankings ENABLE ROW LEVEL SECURITY;

-- 기존 정책이 있을 경우 삭제 후 재생성 (안전한 멱등성 보장)
DROP POLICY IF EXISTS "Allow public read on rankings" ON public.rankings;
DROP POLICY IF EXISTS "Allow public insert on rankings" ON public.rankings;
DROP POLICY IF EXISTS "Allow public update on rankings" ON public.rankings;

-- 조회 허용 정책 (누구나 전세계 랭킹을 열람 가능)
CREATE POLICY "Allow public read on rankings" 
    ON public.rankings 
    FOR SELECT 
    USING (true);

-- 기록 등록 허용 정책 (누구나 완주 기록을 저장 가능)
CREATE POLICY "Allow public insert on rankings" 
    ON public.rankings 
    FOR INSERT 
    WITH CHECK (true);

-- 이름 변경 및 기록 갱신 허용 정책
CREATE POLICY "Allow public update on rankings" 
    ON public.rankings 
    FOR UPDATE 
    USING (true);

-- 4. 실시간 브로드캐스트 (Supabase Realtime) 활성화
-- 실시간으로 다른 유저가 완주했을 때 즉시 리더보드에 동기화되도록 설정
ALTER PUBLICATION supabase_realtime ADD TABLE public.rankings;

-- 5. 설정 확인용 테스트 안내
COMMENT ON TABLE public.rankings IS '실시간 카트라이더 플레이어 공식 랭킹 리더보드 테이블';
