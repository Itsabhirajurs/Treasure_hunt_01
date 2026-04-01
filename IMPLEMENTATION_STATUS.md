# OJAS 2026 Treasure Hunt - Implementation Status

Date: 2026-04-01

## Completed in this workspace

- Full React + Vite frontend scaffold with pages:
  - Landing
  - Register/Login
  - Hunt
  - Leaderboard
  - Admin
  - Victory
- Shared components added:
  - ClueCard, HintSystem, BadgePopup, LiveLeaderboard, Timer, MapProgress, ParticleEffect, Navbar, LoadingSpinner
- Router integration and protected routes
- GameContext with localStorage persistence and actions
- Pirate theme CSS with animations and utility classes
- Flask backend scaffold:
  - app.py, config.py
  - routes: auth, game, admin
  - services: scoring, anomaly, gemini
- .env files populated with provided Supabase and Gemini values
- Backend hardening updates:
  - Multi-origin CORS for local frontend ports
  - JSON error responses instead of debug HTML crashes
  - Lazy Supabase client getter to avoid stale import state
  - Schema check endpoint: GET /api/admin/schema-status

## Verified working

- Frontend server renders locally
- Backend server boots locally on port 5000
- API health endpoint returns OK
- Clue endpoint returns round data

## Remaining blocker (external setup)

Supabase schema is not yet created in your project. Current status endpoint reports:

- ready: false
- reason: public.teams table not found (PGRST205)

This blocks register/login/submit/admin leaderboard persistence.

## Required one-time Supabase SQL (Prompt 0)

Run this in Supabase SQL Editor:

CREATE TABLE IF NOT EXISTS teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  current_round INT DEFAULT 1,
  total_score INT DEFAULT 0,
  badges TEXT[] DEFAULT '{}',
  hints_used_total INT DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id),
  round_num INT NOT NULL,
  answer_submitted TEXT,
  is_correct BOOLEAN DEFAULT false,
  time_elapsed_seconds INT,
  hints_used INT DEFAULT 0,
  score_awarded INT DEFAULT 0,
  anomaly_flagged BOOLEAN DEFAULT false,
  submitted_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clues (
  id SERIAL PRIMARY KEY,
  round_num INT UNIQUE NOT NULL,
  clue_text TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  category TEXT,
  difficulty INT DEFAULT 1
);

ALTER PUBLICATION supabase_realtime ADD TABLE teams;
ALTER PUBLICATION supabase_realtime ADD TABLE submissions;

## After SQL, re-check

- Open: GET /api/admin/schema-status
- Expected: { "ready": true, ... }

Then full smoke test should pass:

- register team -> fetch clue -> submit correct answer -> team score/round update -> leaderboard/admin reads
