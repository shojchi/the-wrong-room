import { useState } from "react";
import { Scanner } from "./components/Scanner";
import { ItemCard } from "./components/ItemCard";
import { generateArtifactFromObject } from "./lib/geminiStandard";
import { transition, initialState } from "./lib/stateMachine";
import type { GameState } from "./lib/stateMachine";
import { motion, AnimatePresence } from "framer-motion";
import { fetchLiveApiToken } from "./lib/tokenManager";
import { audioPlayer } from "./lib/audioPlayer";
import { GeminiLiveSession } from "./lib/geminiLive";
import { NarrativePhase } from "./components/NarrativePhase";
import { SCANNABLE_LABELS } from "./lib/scannableItems";

function App() {
  const [gameState, setGameState] = useState<GameState>(initialState);
  const [isGenerating, setIsGenerating] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [activeLiveSession, setActiveLiveSession] =
    useState<GeminiLiveSession | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Derive dynamic background colors based on the current artifact
  let bgColors = "bg-purple-900/10";
  let bgColors2 = "bg-blue-900/10";

  if (gameState.generatedItem) {
    switch (gameState.generatedItem.mechanicTag) {
      case "combat":
        bgColors = "bg-red-900/20";
        bgColors2 = "bg-orange-900/20";
        break;
      case "utility":
        bgColors = "bg-emerald-900/20";
        bgColors2 = "bg-teal-900/20";
        break;
      case "magic":
        bgColors = "bg-blue-900/20";
        bgColors2 = "bg-cyan-900/20";
        break;
    }
  }

  // When Scanning completes, we trigger the Game State transition
  const handleObjectDetected = async (label: string) => {
    // Transition state from scanning -> item
    const stateWithItem = transition(gameState, {
      type: "OBJECT_DETECTED",
      label,
    });
    setGameState(stateWithItem);

    // Hit Gemini standard API to forge the Dark Artifact
    setIsGenerating(true);
    setGlobalError(null);
    try {
      const item = await generateArtifactFromObject(label);
      // Once forged, transition state from item -> narrative
      setGameState((prevState) =>
        transition(prevState, { type: "ITEM_GENERATED", item }),
      );

      // START THE LIVE STORYTELLING
      startStorytelling(item.name, item.description);
    } catch (err: any) {
      console.error(err);
      setGlobalError(
        err.message || "The darkness resisted. Failed to forge artifact.",
      );
      setGameState(initialState); // Reset if generation fails
    } finally {
      setIsGenerating(false);
    }
  };

  const startStorytelling = async (itemName: string, itemDesc: string) => {
    try {
      setLiveTranscript("");
      setIsAudioPlaying(false);

      const token = await fetchLiveApiToken();
      await audioPlayer.init();

      const live = new GeminiLiveSession(token, {
        onConnected: () => {
          console.log("🟢 Connected to Live API!");
        },
        onSetupComplete: () => {
          console.log("✅ Setup Handshake Finished!");
          setTimeout(() => {
            live.sendUserMessage(`The player just stumbled into the magic room while you (a sys admin) were sleeping at your desk trying to fix a prod outage on a Friday. They found an artifact: ${itemName}. ${itemDesc}. 
              Introduce yourself as the Game Master (but hint at being a stressed IT guy) and describe this item's absurd history in ONE SHORT, PUNCHY sentence. 
              Be brief, somewhat bewildered, and highly absurd. Do not include sound effect text.`);
          }, 500);
        },
        onAudioData: (pcmBase64: string) => {
          setIsAudioPlaying(true);
          audioPlayer.playPcmChunk(pcmBase64);
        },
        onTranscript: (text: string) => {
          setLiveTranscript((prev) => prev + text);
        },
        onTurnComplete: () => {
          console.log("🟠 Turn complete.");
          setIsAudioPlaying(false);
          setGameState((prev) => {
            if (prev.phase === 'resolving') {
               if (prev.challengeStep < 3) {
                 return transition(prev, { type: 'NEXT_CHALLENGE' });
               } else {
                 return transition(prev, { type: 'END_STORY' });
               }
            }
            return prev;
          });
        },
        onClosed: () => {
          console.log("🔴 Connection closed");
          audioPlayer.stop();
          setActiveLiveSession(null);
        },
        onError: (e: Error) => {
          console.error("Live API Error:", e);
          setGlobalError("The Game Master's connection was severed.");
          activeLiveSession?.disconnect();
          audioPlayer.stop();
          setGameState(initialState);
        },
      });

      setActiveLiveSession(live);

      live.connect(
        "You are the Game Master of the 'Wrong Room'. You are actually a sys admin who tried to fix prod late on a Friday night, fell asleep, and woke up trapped in this forsaken magic room that the player just entered. You speak with a mix of world-weary IT guy exhaustion, panic about the ongoing prod outage, and confusion about the surreal magic around you. Speak QUICKLY and CONCISELY. You are deeply bewildered and just want to go home.",
      );
    } catch (e: any) {
      console.error("Failed to start storytelling:", e);
      setGlobalError("Failed to summon the GM's voice. Check API tokens.");
      setGameState(initialState);
    }
  };

  const handleChoiceSubmit = (choice: string) => {
    setGameState(transition(gameState, { type: "SUBMIT_CHOICE" }));
    setLiveTranscript("");
    
    setTimeout(() => {
      const step = gameState.challengeStep;
      if (step < 3) {
        activeLiveSession?.sendUserMessage(
          `The player chose ${choice}. Describe the immediate consequences in ONE short, punchy sentence. 
          Then present Challenge ${step + 1} of 3 based on this consequence. At the end, you MUST explicitly say "Option A: [description]" and "Option B: [description]". Keep it highly absurd and short.`
        );
      } else {
        activeLiveSession?.sendUserMessage(
          `The player chose ${choice}. This is the final choice. 
          Provide a wrapping up narrative summarizing all of their previous choices and this final outcome. 
          Tell the player explicitly if they achieved a HAPPY-END or an UNHAPPY-END based on their decisions. 
          Keep it thematic, absurd, and final. Do not present any more choices.`
        );
      }
    }, 100);
  };

  return (
    <div className="min-h-screen bg-[#07090e] bg-gradient-radial from-[#121826] to-[#07090e] text-white selection:bg-purple-900 flex justify-center pb-20 overflow-x-hidden">
      {/* Dynamic Background Ambience UI */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden mix-blend-screen transition-colors duration-1000">
        <div
          className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] blur-[120px] rounded-full transition-colors duration-1000 ${bgColors}`}
        ></div>
        <div
          className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] blur-[120px] rounded-full transition-colors duration-1000 ${bgColors2}`}
        ></div>
      </div>

      <div className="max-w-md w-full relative z-10 flex flex-col p-4 min-h-screen">
        {/* Header */}
        <header className="mb-4 pt-4 text-center shrink-0">
          <p className="text-gray-500 uppercase tracking-[0.4em] text-[10px] font-semibold mb-1 shadow-black drop-shadow-md">
            The Descent
          </p>
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-linear-to-r from-purple-400 via-fuchsia-300 to-indigo-500 tracking-tight drop-shadow-[0_0_15px_rgba(168,85,247,0.3)] pb-1">
            Wrong Room
          </h1>

          {['challenge', 'resolving'].includes(gameState.phase) && (
            <div className="mt-4 flex flex-col items-center gap-2">
              <span className="text-xs bg-purple-900/40 border border-purple-500/30 px-4 py-1.5 rounded-full text-purple-200 font-bold tracking-widest uppercase shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                Challenge {gameState.challengeStep} of 3
              </span>
            </div>
          )}

          {/* Global Error Alert */}
          <AnimatePresence>
            {globalError && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mt-6 p-4 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-sm shadow-[0_0_20px_rgba(239,68,68,0.3)] flex items-center justify-between"
              >
                <span>⚠️ {globalError}</span>
                <button
                  onClick={() => setGlobalError(null)}
                  className="ml-4 hover:text-white cursor-pointer"
                >
                  ×
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {/* Dynamic Game Content Layer */}
        <main className="w-full grow flex flex-col items-center justify-center relative">
          <AnimatePresence mode="wait">
            {/* 1. IDLE (Start Menu) */}
            {gameState.phase === "idle" && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
                className="flex flex-col items-center"
              >
                <div className="w-24 h-24 mb-10 rounded-full border border-purple-500/30 flex items-center justify-center shadow-[0_0_50px_rgba(168,85,247,0.15)] relative">
                  <div className="w-16 h-16 bg-linear-to-tr from-purple-600 to-blue-600 rounded-full animate-pulse blur-sm"></div>
                  <div className="absolute inset-0 bg-black/40 rounded-full"></div>
                  <i className="absolute text-2xl">👁️</i>
                </div>

                <p className="text-gray-400 text-center mb-10 px-6 font-serif leading-relaxed italic">
                  "Scan an object from your reality to bind it into this realm."
                </p>

                <button
                  onClick={() =>
                    setGameState(transition(gameState, { type: "START_SCAN" }))
                  }
                  className="px-10 py-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xl cursor-pointer shadow-[0_0_30px_rgba(168,85,247,0.4)] transition-all hover:scale-[1.03] active:scale-95 border border-purple-400/30 overflow-hidden relative group"
                >
                  <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                  Begin Connection
                </button>
              </motion.div>
            )}

            {/* 2. SCANNING MODE */}
            {gameState.phase === "scanning" && (
              <motion.div
                key="scanner"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full relative flex flex-col items-center"
              >
                <div className="text-center mb-6">
                  <h3 className="text-purple-400 uppercase tracking-widest text-sm font-bold animate-pulse">
                    Scanning Reality...
                  </h3>
                  <p className="text-gray-500 text-xs mt-1">
                    Point your camera at a mundane object
                  </p>
                </div>

                <div className="rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-gray-700/50 w-full bg-black leading-none">
                  <Scanner onDetected={handleObjectDetected} />
                </div>

                {/* Scannable Suggestions */}
                <div className="mt-8 w-full">
                  <p className="text-[10px] text-gray-500 uppercase tracking-[0.3em] font-bold text-center mb-4 opacity-70">
                    Recognized Reality Patterns:
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 max-w-sm mx-auto">
                    {SCANNABLE_LABELS.map((item) => (
                      <span 
                        key={item.label}
                        className="px-3 py-1 bg-purple-900/10 border border-purple-500/20 rounded-full text-[10px] text-purple-400/80 uppercase tracking-widest font-bold shadow-[0_0_10px_rgba(168,85,247,0.05)] hover:border-purple-500/40 transition-colors"
                      >
                        {item.icon} {item.label}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    activeLiveSession?.disconnect();
                    audioPlayer.stop();
                    setGameState(initialState);
                  }}
                  className="mt-8 px-6 py-2 border border-rose-900/50 text-rose-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg cursor-pointer transition-colors text-sm uppercase tracking-wider font-semibold"
                >
                  Sever Connection
                </button>
              </motion.div>
            )}

            {/* 3. ITEM GENERATION & DISPLAY */}
            {gameState.phase === "item" && (
              <motion.div
                key="item-result"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, y: -40, filter: "blur(5px)" }}
                className="w-full flex flex-col items-center justify-center min-h-[400px]"
              >
                {isGenerating && (
                  <div className="flex flex-col items-center gap-8">
                    <div className="relative w-20 h-20">
                      <div className="absolute inset-0 border-4 border-purple-500/20 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.5)] rounded-full text-2xl bg-purple-900/20">
                        ✨
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-purple-400 font-serif italic text-xl tracking-widest drop-shadow-lg mb-2">
                        Forging Artifact...
                      </p>
                      <p className="text-gray-500 text-xs uppercase tracking-widest">
                        Binding '{gameState.scannedLabel}' to the darkness
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* 3.5 NARRATIVE PHASE (GM SPEAKS) */}
            {gameState.phase === "narrative" && (
              <motion.div
                key="narrative"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full"
              >
                <NarrativePhase
                  transcript={liveTranscript}
                  isAudioPlaying={isAudioPlaying}
                  canContinue={liveTranscript.length > 10 && !isAudioPlaying}
                  onContinue={() => {
                    // Transition to challenge phase
                    setGameState(
                      transition(gameState, { type: "NARRATIVE_DONE" }),
                    );
                    setLiveTranscript(""); // Clear the intro transcript!

                    // Immediately trigger challenge prompt
                    setTimeout(() => {
                      activeLiveSession?.sendUserMessage(
                        `Entering Challenge 1 of 3. Describe a life-or-death scenario where the player must use the ${gameState.generatedItem?.name}. 
                        The scenario MUST take place in this weird magic server room dimension (futuristic IT infrastructure meets medieval fantasy). Make the challenge highly absurd, unpredictable, and full of entropy from your failing prod servers.
                        At the end, you MUST explicitly say "Option A: [description]" and "Option B: [description]". Keep it very short and punchy.`
                      );
                    }, 500);
                  }}
                />
              </motion.div>
            )}

            {/* 4. CHALLENGE / AUDIO PLACEHOLDER */}
            {gameState.phase === "challenge" && (
              <motion.div
                key="challenge"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center w-full flex flex-col items-center"
              >
                <AnimatePresence mode="wait">
                  {gameState.generatedItem && (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="mb-4 w-full flex justify-center"
                    >
                      <ItemCard item={gameState.generatedItem} />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="w-12 h-12 bg-red-900/20 rounded-full flex items-center justify-center border border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.2)] mb-2 animate-pulse text-base">
                  ⚔️
                </div>

                <h2 className="text-lg text-red-500 font-bold mb-2 font-serif italic">
                  The Trial
                </h2>

                {/* GM's Challenge Transcript */}
                <p className="text-gray-300 mb-4 max-w-xs mx-auto text-sm leading-relaxed italic bg-red-950/20 p-4 rounded-xl border border-red-500/10">
                  {liveTranscript ||
                    "The darkness gathers... speak your choice."}
                </p>

                <div className="flex flex-col gap-3 w-full max-w-[250px]">
                  <button
                    onClick={() => handleChoiceSubmit("Option A")}
                    className="px-6 py-3 bg-black/40 border border-indigo-500/30 hover:bg-indigo-900/40 hover:border-indigo-400/60 hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] rounded-xl cursor-pointer font-bold text-indigo-200 hover:text-white transition-all duration-300 w-full backdrop-blur-sm"
                  >
                    Option A
                  </button>
                  <button
                    onClick={() => handleChoiceSubmit("Option B")}
                    className="px-6 py-3 bg-black/40 border border-indigo-500/30 hover:bg-indigo-900/40 hover:border-indigo-400/60 hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] rounded-xl cursor-pointer font-bold text-indigo-200 hover:text-white transition-all duration-300 w-full backdrop-blur-sm"
                  >
                    Option B
                  </button>
                </div>
              </motion.div>
            )}

            {/* 4.5 RESOLVING PHASE (GM RESPONDS TO CHOICE) */}
            {gameState.phase === "resolving" && (
              <motion.div
                key="resolving"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full flex flex-col items-center justify-center p-8 bg-black/40 rounded-3xl border border-indigo-500/20 backdrop-blur-md text-center"
              >
                <div className="w-16 h-16 rounded-full border border-indigo-500/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                  <div className={`w-8 h-8 rounded-full bg-indigo-500 ${isAudioPlaying ? 'animate-ping' : 'animate-pulse'}`}></div>
                </div>
                <h3 className="text-xl text-indigo-400 font-serif italic mb-6">
                  {gameState.challengeStep === 3 ? "The Final Fate is Decided..." : "The Game Master Responds..."}
                </h3>
                <p className="text-indigo-100/90 leading-relaxed font-serif text-lg">
                  {liveTranscript || "Listening to the shifting darkness..."}
                </p>
              </motion.div>
            )}

            {/* 5. STORY COMPLETE */}
            {gameState.phase === "story_complete" && (
              <motion.div
                key="story_complete"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center bg-black/50 p-10 rounded-3xl border border-purple-900/30 backdrop-blur-md"
              >
                <h2 className="text-5xl text-purple-400 font-black mb-4 tracking-widest uppercase drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]">
                  Story Complete
                </h2>
                <p className="text-gray-300 font-serif italic mb-8 max-w-sm mx-auto p-4 bg-purple-900/20 rounded-xl border border-purple-500/20">
                  {liveTranscript || "The darkness settles once again."}
                </p>
                <button
                  onClick={() => {
                    activeLiveSession?.disconnect();
                    audioPlayer.stop();
                    setGameState(initialState);
                  }}
                  className="px-8 py-3 bg-white text-black font-bold uppercase tracking-wider rounded-lg hover:bg-gray-200 transition-colors cursor-pointer w-full"
                >
                  Restart Loop
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Footer Ambience */}
        <footer className="mt-auto pt-10 text-center opacity-30">
          <p className="text-[10px] tracking-[0.2em] font-serif">
            A DeepMind Experiment
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
