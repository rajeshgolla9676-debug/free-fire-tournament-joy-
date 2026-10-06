CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS tournaments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text NOT NULL,slug text UNIQUE NOT NULL,registration_open boolean NOT NULL DEFAULT true,active boolean NOT NULL DEFAULT true,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS teams(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tournament_id uuid NOT NULL REFERENCES tournaments(id),public_team_code text NOT NULL UNIQUE,name text NOT NULL,name_normalized text NOT NULL,captain_name text NOT NULL,captain_phone text NOT NULL,email text,college text,city text,status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','rejected','cancelled')),created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),deleted_at timestamptz,UNIQUE(tournament_id,name_normalized),UNIQUE(tournament_id,captain_phone));
CREATE TABLE IF NOT EXISTS players(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,tournament_id uuid NOT NULL REFERENCES tournaments(id),slot integer NOT NULL CHECK(slot BETWEEN 1 AND 4),full_name text NOT NULL,ff_uid text NOT NULL,ingame_name text NOT NULL,phone text,UNIQUE(team_id,slot),UNIQUE(tournament_id,ff_uid));
CREATE INDEX IF NOT EXISTS teams_created_idx ON teams(created_at DESC);CREATE INDEX IF NOT EXISTS players_uid_idx ON players(ff_uid);
CREATE OR REPLACE FUNCTION register_team(p_tournament_id uuid,p_code text,p_name text,p_captain_name text,p_captain_phone text,p_email text,p_college text,p_city text,p_players jsonb) RETURNS text LANGUAGE plpgsql AS $$
DECLARE v_team_id uuid;v_player jsonb;
BEGIN
IF jsonb_typeof(p_players)<>'array' OR jsonb_array_length(p_players)<>4 THEN RAISE EXCEPTION 'exactly four players required';END IF;
IF (SELECT count(DISTINCT x->>'uid') FROM jsonb_array_elements(p_players)x)<>4 THEN RAISE EXCEPTION 'duplicate player UID';END IF;
INSERT INTO teams(tournament_id,public_team_code,name,name_normalized,captain_name,captain_phone,email,college,city)VALUES(p_tournament_id,p_code,p_name,lower(regexp_replace(trim(p_name),'\\s+',' ','g')),p_captain_name,p_captain_phone,p_email,p_college,p_city)RETURNING id INTO v_team_id;
FOR v_player IN SELECT * FROM jsonb_array_elements(p_players) LOOP INSERT INTO players(team_id,tournament_id,slot,full_name,ff_uid,ingame_name,phone)VALUES(v_team_id,p_tournament_id,(v_player->>'slot')::integer,v_player->>'fullName',v_player->>'uid',v_player->>'ign',NULLIF(v_player->>'phone',''));END LOOP;
RETURN p_code;END;$$;
INSERT INTO tournaments(name,slug,registration_open,active)VALUES('Community Tournament 2026','community-2026',true,true)ON CONFLICT(slug)DO NOTHING;
