# Implementation Plan: The Wrong Room

## Legend
- `[ ]` uncompleted tasks
- `[/]` in progress tasks
- `[x]` completed tasks

## Tasks

### Phase 1: Foundation & Spikes (De-risking)
- [x] 1.1 Scaffold project
  - [x] Initialize Vite + React + TypeScript 
  - [x] Initialize minimal Express server in `server/` with `@google/genai` for ephemeral tokens
  - [x] Install dependencies (`@google/genai`, `@mediapipe/tasks-vision`, `framer-motion`, `tailwindcss`, `fast-check`)
  - [x] Configure Tailwind CSS for dark fantasy aesthetic
- [x] 1.2 Implement Live Audio Player
  - [x] Create `src/lib/audioPlayer.ts` using Web Audio API to schedule PCM chunks
- [x] 1.3 Implement MediaPipe Object Detector
  - [x] Configure Vite `optimizeDeps.exclude` to serve `@mediapipe/tasks-vision` WASM correctly
  - [x] Create `src/lib/detector.ts` and `Scanner.tsx` to verify webcam feed + detection works
  - [x] Implement `isScannableItem` local COCO whitelist

### Phase 2: Core Game State & Standard API
- [x] 2.1 State Machine
  - [x] Implement `src/lib/stateMachine.ts` with states: `scan -> item -> narrative -> challenge -> gameover`
  - [x] Write property-based tests for state transitions
- [x] 2.2 Standard Gemini Client (Item Generation)
  - [x] Implement `src/lib/geminiStandard.ts` for structured JSON item generation
  - [x] Define Zod/JSON schema for `Item` creation based on `ScanResult`
- [x] 2.3 UI Components (Initial)
  - [x] Build `ItemCard.tsx` component with mechanic tags

### Phase 3: Live API Audio Integration
- [x] 3.1 Live API Client
  - [x] Implement `GET /api/token` in Express backend
  - [x] Implement `src/lib/geminiLive.ts` to establish `Modality.AUDIO` WebSocket connection
- [x] 3.2 Narrative Playback
  - [x] Receive binary audio chunks, send to `audioPlayer.ts`
  - [x] Capture internal "Thoughts" or transcripts to display as subtitles
  - [x] Build `NarrativePhase.tsx` with audio visualization (waveform/pulse)

### Phase 4: Challenges & Gameplay Loop
- [x] 4.1 Challenge System
  - [x] GM dynamically generates a life-or-death scenario based on the forged item
  - [x] Display GM's live transcript and choice options (A/B) in the UI
- [x] 4.2 Soul Tracking (Health/Sanity)
  - [x] Implement `SanityBar.tsx` for health tracking
  - [x] Link soul fragment loss to challenge failures
- [x] 4.3 Progression Loop
  - [x] Complete core loop: scan object -> get artifact -> survive challenge -> repeat or perish

### Phase 5: Polish & Final Touches
- [x] 5.1 Visual Polish
  - [x] Framer Motion page transitions between game phases
  - [x] Implement global error handling (API failures/Camera denied)
- [x] 5.2 Dynamic Backgrounds
  - [x] Update background colors/effects based on the current artifact's `mechanicTag`
