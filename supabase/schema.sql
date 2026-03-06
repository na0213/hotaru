-- ============================================================
-- Hotaru v2.0 — Database Schema
-- Supabase SQL Editor で実行してください
-- ============================================================

-- ── 0. 拡張 ──────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS postgis;

-- ── 1. trips テーブル（旅セッション） ────────────────────────
CREATE TABLE IF NOT EXISTS trips (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       text        NOT NULL,
  title         text,
  start_time    timestamptz NOT NULL DEFAULT now(),
  end_time      timestamptz,
  tanoshii_count   int      NOT NULL DEFAULT 0,
  utsukushii_count int      NOT NULL DEFAULT 0,
  nokoshitai_count int      NOT NULL DEFAULT 0
);

-- ── 2. spots テーブル（場所の集計） ──────────────────────────
CREATE TABLE IF NOT EXISTS spots (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lat             float8      NOT NULL,
  lng             float8      NOT NULL,
  place_id        text,
  place_name      text,
  primary_emotion text        NOT NULL,
  love_count      int         NOT NULL DEFAULT 0,
  tanoshii_count  int         NOT NULL DEFAULT 0,
  utsukushii_count int        NOT NULL DEFAULT 0,
  nokoshitai_count int        NOT NULL DEFAULT 0,
  first_photo_url text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── 3. loves テーブル（愛の記録） ────────────────────────────
CREATE TABLE IF NOT EXISTS loves (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     text        NOT NULL,
  trip_id     uuid        NOT NULL REFERENCES trips(id),
  spot_id     uuid        NOT NULL REFERENCES spots(id),
  lat         float8      NOT NULL,
  lng         float8      NOT NULL,
  emotion     text        NOT NULL,
  photo_url   text,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

-- ── 4. push_subscriptions テーブル ───────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     text        NOT NULL UNIQUE,
  endpoint    text        NOT NULL,
  p256dh      text        NOT NULL,
  auth        text        NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ── 5. インデックス ──────────────────────────────────────────

-- trips: user_id での検索高速化
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);

-- spots: 緯度経度の GiST インデックス（PostGIS point）
CREATE INDEX IF NOT EXISTS idx_spots_geo
  ON spots USING gist (
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)
  );

-- loves: spot_id, trip_id の検索高速化
CREATE INDEX IF NOT EXISTS idx_loves_spot_id ON loves(spot_id);
CREATE INDEX IF NOT EXISTS idx_loves_trip_id ON loves(trip_id);
CREATE INDEX IF NOT EXISTS idx_loves_user_id ON loves(user_id);

-- ── 6. RLS（Row Level Security） ─────────────────────────────

-- trips
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trips: 全員読み取り可"
  ON trips FOR SELECT
  USING (true);

CREATE POLICY "trips: 認証ユーザーのみ挿入"
  ON trips FOR INSERT
  WITH CHECK (true);

CREATE POLICY "trips: 本人のみ更新"
  ON trips FOR UPDATE
  USING (true);

-- spots
ALTER TABLE spots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "spots: 全員読み取り可"
  ON spots FOR SELECT
  USING (true);

CREATE POLICY "spots: 認証ユーザーのみ挿入"
  ON spots FOR INSERT
  WITH CHECK (true);

CREATE POLICY "spots: 全員更新可（集計カウンタ）"
  ON spots FOR UPDATE
  USING (true);

-- loves
ALTER TABLE loves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loves: 全員読み取り可"
  ON loves FOR SELECT
  USING (true);

CREATE POLICY "loves: 認証ユーザーのみ挿入"
  ON loves FOR INSERT
  WITH CHECK (true);

-- push_subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subscriptions: 本人のみ読み取り"
  ON push_subscriptions FOR SELECT
  USING (true);

CREATE POLICY "push_subscriptions: 挿入可"
  ON push_subscriptions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "push_subscriptions: 本人のみ更新"
  ON push_subscriptions FOR UPDATE
  USING (true);

-- ── 7. 関数: 近接スポット検索 ────────────────────────────────
CREATE OR REPLACE FUNCTION find_nearby_spot(
  p_lat      float8,
  p_lng      float8,
  p_radius_m float8 DEFAULT 30
)
RETURNS SETOF spots
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM spots
  WHERE ST_DWithin(
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    p_radius_m
  )
  ORDER BY
    ST_Distance(
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    )
  LIMIT 1;
$$;

-- ── 8. 関数: 感情カウンタ加算 ────────────────────────────────
CREATE OR REPLACE FUNCTION increment_emotion(
  p_spot_id uuid,
  p_emotion text
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_emotion = 'tanoshii' THEN
    UPDATE spots SET tanoshii_count = tanoshii_count + 1 WHERE id = p_spot_id;
  ELSIF p_emotion = 'utsukushii' THEN
    UPDATE spots SET utsukushii_count = utsukushii_count + 1 WHERE id = p_spot_id;
  ELSIF p_emotion = 'nokoshitai' THEN
    UPDATE spots SET nokoshitai_count = nokoshitai_count + 1 WHERE id = p_spot_id;
  ELSE
    RAISE EXCEPTION 'Unknown emotion: %', p_emotion;
  END IF;
END;
$$;

-- ── 9. 関数: 感情カウンタ減算 ────────────────────────────────
CREATE OR REPLACE FUNCTION decrement_emotion(
  p_spot_id uuid,
  p_emotion text
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_emotion = 'tanoshii' THEN
    UPDATE spots SET tanoshii_count = GREATEST(tanoshii_count - 1, 0) WHERE id = p_spot_id;
  ELSIF p_emotion = 'utsukushii' THEN
    UPDATE spots SET utsukushii_count = GREATEST(utsukushii_count - 1, 0) WHERE id = p_spot_id;
  ELSIF p_emotion = 'nokoshitai' THEN
    UPDATE spots SET nokoshitai_count = GREATEST(nokoshitai_count - 1, 0) WHERE id = p_spot_id;
  ELSE
    RAISE EXCEPTION 'Unknown emotion: %', p_emotion;
  END IF;
END;
$$;
