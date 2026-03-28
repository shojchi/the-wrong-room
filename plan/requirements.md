# Requirements Document

## Introduction

A browser-based game for the Software Mansion x Gemini Hackathon (Track 3: Game Jam). Players use their webcam to scan real-world objects. MediaPipe detects the object in-frame, Gemini Live API recognizes it and generates a creative "superpower" item card based on the object's real-world properties. The player then uses that item to solve three sequential text-based dungeon challenges. Gemini acts as the dungeon master, narrating outcomes based on whether the item's mechanic tag matches the challenge's required tags.

The game is set inside the Software Mansion office in Kraków during the hackathon. The core premise: the Player is a hackathon attendee who opens the wrong door looking for the bathroom, and accidentally steps into a cursed magical dungeon version of the office. The fluorescent lights flicker. The corridor stretches impossibly far. A sticky note on the wall reads: "Welcome to the Dungeon. Wi-Fi password: darkmagic123". Whatever object the Player was holding when they walked in becomes their only weapon — that is the item they scan.

The tone is absurdist comedy blended with dark fantasy and AI humor. Think: GPT-2 security robots, Jira tickets filed by spiders, Clean Code books as cursed tomes, dragons pitching startups.

Win ending: the Player escapes back to the hackathon floor. Loss ending: the Player gets permanently assigned to the dungeon's sprint planning.

The game is entirely text-based and rendered in the browser UI — there is no 3D engine or scene graph. Game flow proceeds linearly: webcam scan → item generation → story intro text → challenge 1 text → bridge text → challenge 2 text → bridge text → challenge 3 text → closing narrative text → win/loss screen.

> Note: This project is developed using Antigravity, Google's AI-driven IDE (similar to Cursor/Kiro, launched November 2025 alongside Gemini 3). Antigravity is the development tool used to build the game — it is not a runtime dependency, game framework, or part of the deployed application.

## Glossary

- **Game**: The browser-based application described in this document.
- **Player**: The human user interacting with the Game via browser and webcam.
- **Scanner**: The webcam capture and MediaPipe object detection subsystem.
- **Detector**: The MediaPipe in-browser object detection model running on the webcam feed.
- **Gemini_Client**: The Gemini Live API integration responsible for object recognition, item generation, and dungeon narration.
- **Item**: A game object derived from a scanned real-world object, consisting of a name, flavor text, superpower description, and mechanic tag.
- **Mechanic_Tag**: A string label (e.g. "slippery", "fire", "shield", "electric") that categorizes an Item's superpower and determines challenge compatibility.
- **Item_Card**: The UI display of an Item, rendered as styled HTML showing the item name, flavor text, superpower description, and Mechanic_Tag.
- **Challenge**: A text-based dungeon scenario presented to the Player, associated with one or more Mechanic_Tags that can solve it.
- **Dungeon_Master**: The Gemini_Client role that evaluates item-challenge matches and narrates outcomes.
- **Phase**: A named stage in the client-side state machine. The Game defines five phases: **scanning** (webcam feed and object detection), **itemCard** (item reveal display), **challenge** (dungeon scenario presentation and resolution), **narrative** (story text display between phases), and **result** (win/loss outcome and replay prompt).
- **Game_State**: A plain TypeScript state object tracking the current Phase, current Item, challenge index, challenge outcomes, and narrative history for the active run.

---

## Requirements

### Requirement 1: Webcam Initialization

**User Story:** As a Player, I want the game to access my webcam on load, so that I can scan real-world objects without manual setup.

#### Acceptance Criteria

1. WHEN the Game loads in the browser, THE Scanner SHALL request webcam access via the browser MediaDevices API.
2. IF the Player denies webcam permission, THEN THE Game SHALL display an error message instructing the Player to grant camera access and reload.
3. WHEN webcam access is granted, THE Scanner SHALL render a live video feed in the scanning phase UI.

---

### Requirement 2: Object Detection via MediaPipe

**User Story:** As a Player, I want MediaPipe to detect objects in my webcam feed in real time, so that I can scan household items to generate game items.

#### Acceptance Criteria

1. WHILE the scanning phase is active, THE Detector SHALL continuously analyze the webcam feed and identify objects present in the frame.
2. WHEN the Detector identifies an object with a confidence score of 0.6 or higher, THE Scanner SHALL display the detected object label as an overlay on the video feed.
3. WHEN the Player confirms the detected object (via button press), THE Scanner SHALL capture a still image snapshot and the detected object label, then pass both to the Gemini_Client.
4. IF no object is detected within 10 seconds of the scanning phase becoming active, THEN THE Scanner SHALL display a prompt instructing the Player to hold an object clearly in front of the camera.
5. WHEN the Detector identifies an object, THE Gemini_Client SHALL validate whether the detected object is a scannable item (a portable, hand-holdable everyday object such as a pen, phone, charger, banana, bottle, or cup) versus a non-item (wall, floor, ceiling, furniture, room interior, person, etc.).
6. IF the detected object is classified as non-scannable, THEN THE Game SHALL display a message advising the Player to hold up a physical object (e.g. "Hold up something you're carrying — the dungeon needs a proper artifact, not a wall.") and remain in the scanning phase.
7. THE scan-to-item-card flow SHALL complete within 10 seconds of the Player confirming the detected object.

---

### Requirement 3: Item Generation via Gemini Live API

**User Story:** As a Player, I want Gemini to transform my scanned object into a creative game item, so that everyday objects become interesting superpowers.

#### Acceptance Criteria

1. WHEN the Scanner passes an object label and image snapshot to the Gemini_Client, THE Gemini_Client SHALL send a structured prompt to the Gemini Live API requesting an item name, flavor text, superpower description, and a single Mechanic_Tag.
2. THE Gemini_Client SHALL send the actual captured image frame (as base64 or blob) alongside the detected object label to the Gemini Live API, so Gemini can use visual context to generate a more creative item name and superpower.
3. WHEN the Gemini Live API returns a valid response, THE Gemini_Client SHALL parse the response into an Item with the fields: name (string), flavorText (string), superpowerDescription (string), and mechanicTag (string).
4. IF the Gemini Live API returns an error or malformed response, THEN THE Gemini_Client SHALL retry the request once, and if the retry fails, SHALL display a fallback error message and return the Player to the scanning phase.
5. THE Gemini_Client SHALL constrain the Mechanic_Tag to a predefined set: "slippery", "fire", "shield", "electric", "heavy", "sharp", "sticky", "cold".
6. FOR ALL valid object inputs, parsing the Gemini Live API JSON response then re-serializing it SHALL produce an equivalent Item object (round-trip property).

---

### Requirement 4: Item Card Display

**User Story:** As a Player, I want to see a clear item card for my scanned object, so that I know what superpower I have before entering the dungeon.

#### Acceptance Criteria

1. WHEN an Item is generated, THE Game_State SHALL transition to the itemCard phase and THE Item_Card SHALL render the item name, flavor text, superpower description, and Mechanic_Tag as styled HTML in the browser UI.
2. WHEN the Item_Card is displayed, THE Game SHALL show a "Begin Challenges" button that transitions the Game_State to the narrative phase (story introduction).

---

### Requirement 5: Challenge Presentation

**User Story:** As a Player, I want to face three sequential text-based dungeon challenges, so that I can use my item's superpower to progress through the game.

#### Acceptance Criteria

1. THE Game SHALL present exactly 3 Challenges to the Player in sequence.
2. WHEN the Game_State transitions to the challenge phase, THE Game SHALL select a Challenge from the predefined challenge pool and display its scenario text to the Player.
3. THE Game SHALL define each Challenge with a scenario text string and a set of one or more Mechanic_Tags that can solve it.
4. WHEN a Challenge is displayed, THE Game SHALL show the Player's current Item card summary and a "Use Item" button.
5. THE Game_State SHALL track the current challenge index (0–2) and advance it upon each challenge resolution.

---

### Requirement 6: Challenge Resolution via Gemini Dungeon Master

**User Story:** As a Player, I want Gemini to narrate whether my item solves the challenge, so that the outcome feels creative and story-driven rather than a simple pass/fail.

#### Acceptance Criteria

1. WHEN the Player presses "Use Item", THE Dungeon_Master SHALL send the Item's Mechanic_Tag and the Challenge's required Mechanic_Tags to the Gemini Live API with a prompt requesting a narrative outcome.
2. WHEN the Item's Mechanic_Tag matches one of the Challenge's required Mechanic_Tags, THE Dungeon_Master SHALL receive a success narrative from the Gemini Live API and display it to the Player.
3. WHEN the Item's Mechanic_Tag does not match any of the Challenge's required Mechanic_Tags, THE Dungeon_Master SHALL receive a failure narrative from the Gemini Live API and display it to the Player.
4. IF the Gemini Live API returns an error during narration, THEN THE Dungeon_Master SHALL display a generic fallback narrative and resolve the challenge based on the Mechanic_Tag match result.
5. WHEN the narrative is displayed, THE Game SHALL show a "Continue" button to advance to the next challenge or the result phase.
6. THE Game SHALL always present all 3 Challenges to the Player regardless of success or failure on any individual Challenge — there is no game over on a failed Challenge.

---

### Requirement 7: Win/Loss State

**User Story:** As a Player, I want to see a win or loss screen after all three challenges, so that I know how well my item performed.

#### Acceptance Criteria

1. WHEN all 3 Challenges have been resolved, THE Game_State SHALL transition to the result phase.
2. WHEN the Player solved 2 or more Challenges successfully, THE Game SHALL display a win state with a victory message referencing the Player escaping back to the hackathon floor.
3. WHEN the Player solved fewer than 2 Challenges successfully, THE Game SHALL display a loss state with a defeat message referencing the Player being permanently assigned to the dungeon's sprint planning.
4. WHEN the result phase is displayed, THE Game SHALL show a "Play Again" button that resets the Game_State and returns the Player to the scanning phase.

---

### Requirement 8: Client-Side State Machine

**User Story:** As a developer, I want a simple client-side state machine to manage game flow, so that phase transitions are predictable and easy to reason about.

#### Acceptance Criteria

1. THE Game SHALL manage all state in a plain TypeScript Game_State object — no external state management library is required.
2. THE Game_State SHALL track the following fields: currentPhase (one of: "scanning", "itemCard", "challenge", "narrative", "result"), currentItem (Item or null), challengeIndex (0–2), challengeOutcomes (array of boolean), and narrativeHistory (ordered array of narrative strings generated in the current run).
3. WHEN a phase transition is triggered, THE Game SHALL update the Game_State's currentPhase field and re-render the UI to reflect the new phase.
4. THE Game SHALL initialize the Game_State to currentPhase "scanning" and all other fields to their empty defaults on application startup and on "Play Again".

---

### Requirement 9: Predefined Challenge Pool

**User Story:** As a developer, I want a hardcoded set of challenges with mechanic tags, so that the game is completable within the hackathon build time without dynamic challenge generation.

#### Acceptance Criteria

1. THE Game SHALL include a challenge pool of exactly 8 predefined Challenges, each with scenario text and a set of Mechanic_Tags that can solve it.
2. WHEN selecting Challenges for a run, THE Game SHALL randomly select 3 non-repeating Challenges from the pool.
3. THE Game SHALL include the following 8 Challenges:

   **Challenge 1 — "The Frozen Server Room Gate"**
   Scenario: "A massive iron gate blocks the server room corridor, sealed shut by ancient ice magic and a Post-it note that says 'DO NOT OPEN (from IT dept)'. The gate has not been opened since 1987."
   Mechanic tags that solve it: fire, electric, heavy

   **Challenge 2 — "The Oily Kitchen Corridor"**
   Scenario: "The kitchen corridor floor is covered in suspiciously fresh olive oil — someone knocked over the team lunch supplies. A skeleton at the far end holds a sign: 'Slipped. 10/10 would not recommend.' You need to cross."
   Mechanic tags that solve it: sticky, sharp, heavy

   **Challenge 3 — "The GPT-2 Security Robot"**
   Scenario: "A security robot powered by GPT-2 (the budget version) blocks the hallway. It keeps asking you to solve a CAPTCHA and won't accept your answer. Its weak point is clearly its power supply."
   Mechanic tags that solve it: electric, slippery, cold

   **Challenge 4 — "The Sticky Web in the Open Space"**
   Scenario: "The open-space ceiling is covered in a massive magical spider web. Unfortunately you are tall and keep getting stuck. The spider has a Jira ticket open: 'Ceiling web — status: In Progress (since 2019)'."
   Mechanic tags that solve it: fire, sharp, electric

   **Challenge 5 — "The Bard Blocking the Meeting Room"**
   Scenario: "A medieval bard has booked Meeting Room B for 'a quick sync' and is blocking the bridge to the next corridor, performing an endless ballad about his ex. He will not move until emotionally destabilized. He has been here for 3 weeks."
   Mechanic tags that solve it: slippery, sticky, cold

   **Challenge 6 — "The Haunted Bookshelf"**
   Scenario: "A bookshelf full of cursed tomes is slowly rolling toward you on its wheels. Every book is a variation of 'Clean Code'. You have seconds to act before you are buried in best practices."
   Mechanic tags that solve it: heavy, sharp, fire

   **Challenge 7 — "The Melting Ice Throne in the CEO's Office"**
   Scenario: "The CEO's office contains an enchanted ice throne that is rapidly melting, flooding the room ankle-deep. The villain is standing on a chair yelling 'THIS IS FINE' while holding a MacBook above his head."
   Mechanic tags that solve it: cold, shield, sticky

   **Challenge 8 — "The Overconfident Dragon in the Pitch Room"**
   Scenario: "A small dragon (startup founder, Series A) is blocking the exit in the pitch room. He keeps pitching you his 'disrupting dungeons' idea and breathes fire whenever interrupted. His deck is 47 slides long."
   Mechanic tags that solve it: shield, fire, electric

---

### Requirement 10: AI-Generated Narrative Story Framing

**User Story:** As a Player, I want Gemini to weave a cohesive story around my item and challenges, so that the game feels like a unified adventure rather than isolated interactions.

#### Acceptance Criteria

1. WHEN an Item is generated and before the first Challenge begins, THE Gemini_Client SHALL send a prompt to the Gemini Live API requesting a story introduction of 10–15 sentences that sets the scene and introduces the Player's Item as a legendary artifact.
2. WHEN the story introduction is received, THE Game SHALL display it as styled narrative text in the UI before transitioning to the first Challenge.
3. WHEN a Challenge is resolved and a subsequent Challenge remains, THE Gemini_Client SHALL send a prompt to the Gemini Live API requesting a narrative bridge of 5–10 sentences that connects the outcome of the completed Challenge to the next Challenge, including the Item name, the challenge outcome (success or failure), and all narrative segments generated so far in the current run.
4. WHEN a narrative bridge is received, THE Game SHALL display it as styled narrative text in the UI before transitioning to the next Challenge.
5. WHEN all 3 Challenges have been resolved, THE Gemini_Client SHALL send a prompt to the Gemini Live API requesting a closing narrative of 10–15 sentences that concludes the story based on the Player's overall win or loss outcome, including the Item name, the number of Challenges solved, and all prior narrative segments.
6. WHEN the closing narrative is received, THE Game SHALL display it as styled narrative text in the result phase before showing the win or loss state.
7. THE Gemini_Client SHALL include the following context in every narrative generation request: the Item name and superpower description, the ordered list of narrative segments generated so far in the current run, and the outcome of each resolved Challenge.
8. IF the Gemini Live API returns an error during any narrative generation, THEN THE Game SHALL skip the narrative display for that segment and proceed to the next phase without blocking the Player.
9. THE Gemini_Client narrative prompts SHALL instruct Gemini to maintain the Software Mansion office dungeon setting and absurdist comedy, dark fantasy, and AI humor tone throughout all narrative segments.
10. THE Gemini_Client SHALL limit the combined narrativeHistory context sent to Gemini to a maximum of 1500 tokens to avoid excessive token consumption, truncating older segments if necessary while always preserving the most recent segment and the item description.

---

### Requirement 11: Stretch Goal — Smelter Video Overlay

**User Story:** As a Player, I want to see my item card composited over my webcam feed in real time, so that the scanning experience feels immersive.

#### Acceptance Criteria

1. WHERE Smelter integration is enabled, THE Game SHALL use Smelter to composite the Item_Card overlay onto the live webcam feed in real time.
2. WHERE Smelter integration is enabled, THE Game SHALL render the composited video stream in the scanning phase in place of the raw webcam feed.

---

### Requirement 12: Stretch Goal — Fishjam Multiplayer

**User Story:** As a Player, I want to share my item scanning session with another player over WebRTC, so that we can compare items and play together.

#### Acceptance Criteria

1. WHERE Fishjam integration is enabled, THE Game SHALL use Fishjam to establish a WebRTC peer connection between two Players.
2. WHERE Fishjam integration is enabled, WHEN a Player generates an Item, THE Game SHALL broadcast the Item data to all connected peers.
3. WHERE Fishjam integration is enabled, THE Game SHALL display connected peers' Item cards alongside the local Player's Item card during the challenge phase.

---

### Requirement 13: Stretch Goal — TypeGPU Visual Item Card Effects

**User Story:** As a Player, I want to see WebGL visual effects on my item card reveal, so that the moment of item discovery feels dramatic and polished.

#### Acceptance Criteria

1. WHERE TypeGPU integration is enabled, THE Item_Card SHALL render a glowing border effect via TypeGPU WebGL shaders on the browser canvas in place of the default styled HTML border.
2. WHERE TypeGPU integration is enabled, THE Item_Card SHALL display a particle effect rendered via TypeGPU that plays for 2 seconds upon card reveal.
3. WHERE TypeGPU integration is enabled, THE Game SHALL fall back to the default styled HTML Item_Card if the browser does not support WebGPU.
