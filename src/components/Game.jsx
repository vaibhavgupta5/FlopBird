"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import CharacterSelector from "./CharacterSelector";

// Game Constants
const GRAVITY = 0.6;
const JUMP_STRENGTH = -10;
const PIPE_WIDTH = 80;
const PIPE_SPACING = 350;
const BASE_SPEED = 3;

const LEVELS = {
  1: { name: "Lvl 01", gap: 250, speed: 3 },
  2: { name: "Lvl 02", gap: 220, speed: 4 },
  3: { name: "Lvl 03", gap: 190, speed: 5 },
  4: { name: "Lvl 04", gap: 170, speed: 6 },
  5: { name: "Lvl 05", gap: 150, speed: 7 },
  6: { name: "MAX", gap: 130, speed: 9 },
};

export default function Game() {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState("START"); // START, PLAYING, GAME_OVER
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [character, setCharacter] = useState({ type: "emoji", value: "🐦" });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Game Refs
  const birdRef = useRef({ y: 300, velocity: 0, width: 40, height: 40 });
  const pipesRef = useRef([]);
  const scoreRef = useRef(0);
  const gameLoopRef = useRef(null);
  const startTimeRef = useRef(0);
  const gracePeriodRef = useRef(0);

  // Audio Context
  const audioCtxRef = useRef(null);

  // Initialize Audio
  useEffect(() => {
    const storedHighScore = localStorage.getItem("flappyHighScore");
    if (storedHighScore) setHighScore(parseInt(storedHighScore));

    const initAudio = () => {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext ||
          window.webkitAudioContext)();
      }
    };
    window.addEventListener("click", initAudio);
    window.addEventListener("touchstart", initAudio);
    window.addEventListener("keydown", initAudio);
    return () => {
      window.removeEventListener("click", initAudio);
      window.removeEventListener("touchstart", initAudio);
      window.removeEventListener("keydown", initAudio);
    };
  }, []);

  // Handle Resize with padding adjustment
  useEffect(() => {
    const handleResize = () => {
      // p-8 = 2rem = 32px per side -> 64px total
      // We subtract a bit more to be safe and ensure it fits nicely
      setDimensions({
        width: window.innerWidth - 64,
        height: window.innerHeight - 64,
      });
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const playSound = useCallback((type) => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "jump") {
      osc.type = "square";
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === "score") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === "crash") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(100, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  }, []);

  const resetGame = useCallback(() => {
    // Use actual canvas height if available to ensure sync
    let startY = 300;
    if (canvasRef.current && canvasRef.current.height > 100) {
      startY = canvasRef.current.height / 2;
    } else if (dimensions.height > 100) {
      startY = dimensions.height / 2;
    }

    birdRef.current = {
      y: startY,
      velocity: 0,
      width: 40,
      height: 40,
    };
    pipesRef.current = [];
    scoreRef.current = 0;
    setScore(0);
    setGameState("PLAYING");
    startTimeRef.current = Date.now();
    gracePeriodRef.current = 0;
    console.log("Game Reset. StartY:", startY, "Time:", startTimeRef.current);
  }, [dimensions.height]);

  const gameOver = useCallback(() => {
    console.log("Game Over triggered!");
    setGameState("GAME_OVER");
    playSound("crash");
    if (scoreRef.current > highScore) {
      setHighScore(scoreRef.current);
      localStorage.setItem("flappyHighScore", scoreRef.current.toString());
    }
  }, [highScore, playSound]);

  const jump = useCallback(() => {
    if (gameState !== "PLAYING") return;
    birdRef.current.velocity = JUMP_STRENGTH;
    playSound("jump");
  }, [gameState, playSound]);

  const handleInput = useCallback(
    (e) => {
      // In game, only specific keys
      if (gameState === "PLAYING") {
        if (
          e.type === "keydown" &&
          (e.code === "Space" || e.code === "ArrowUp")
        ) {
          jump();
        }
        return;
      }

      // In Menu/GameOver, ANY key starts game
      if (gameState === "START" || gameState === "GAME_OVER") {
        if (e.type === "keydown") {
          resetGame();
        }
      }
    },
    [gameState, jump, resetGame]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleInput);
    return () => window.removeEventListener("keydown", handleInput);
  }, [handleInput]);

  const draw = useCallback(
    (ctx, width, height) => {
      // Clear Canvas
      ctx.clearRect(0, 0, width, height);

      // Draw Background (Solid Tech Dark)
      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, width, height);

      // Draw Grid (Tech effect)
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 1;
      const gridSize = 50;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw Pipes (Tech Style)
      ctx.shadowBlur = 0;
      pipesRef.current.forEach((pipe) => {
        // Top Pipe
        ctx.fillStyle = "#1a1a1a";
        ctx.strokeStyle = "#00ff00"; // Neon Green
        ctx.lineWidth = 2;

        // Top
        ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
        ctx.strokeRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);

        // Bottom
        const bottomY = pipe.topHeight + LEVELS[level].gap;
        const bottomHeight = height - bottomY;
        ctx.fillRect(pipe.x, bottomY, PIPE_WIDTH, bottomHeight);
        ctx.strokeRect(pipe.x, bottomY, PIPE_WIDTH, bottomHeight);

        // Tech details on pipes
        ctx.fillStyle = "#00ff00";
        ctx.fillRect(pipe.x + 10, pipe.topHeight - 20, PIPE_WIDTH - 20, 5); // Stripe
        ctx.fillRect(pipe.x + 10, bottomY + 15, PIPE_WIDTH - 20, 5); // Stripe
      });

      // Draw Bird
      const bird = birdRef.current;
      ctx.save();
      // Use fixed X position for drawing
      const birdX = width * 0.2;
      ctx.translate(birdX, bird.y);

      // Rotate bird
      const rotation = Math.min(
        Math.PI / 4,
        Math.max(-Math.PI / 4, bird.velocity * 0.1)
      );
      ctx.rotate(rotation);

      if (character.type === "emoji") {
        ctx.font = "40px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(character.value, 0, 0);
      } else if (character.type === "image") {
        const img = new Image();
        img.src = character.value;
        try {
          ctx.drawImage(img, -20, -20, 40, 40);
        } catch (e) {
          ctx.fillStyle = "#00ff00";
          ctx.fillRect(-20, -20, 40, 40);
        }
      }
      ctx.restore();

      // Draw Grace Period Text
      if (gracePeriodRef.current < 60 && gameState === "PLAYING") {
        ctx.fillStyle = "#00ff00";
        ctx.font = "20px monospace";
        ctx.textAlign = "center";
        ctx.fillText("SYSTEM REBOOTING...", width / 2, height / 2 + 80);
      }

      // Draw Ground (Tech Line)
      ctx.fillStyle = "#000";
      ctx.fillRect(0, height - 20, width, 20);
      ctx.beginPath();
      ctx.moveTo(0, height - 20);
      ctx.lineTo(width, height - 20);
      ctx.strokeStyle = "#00ff00";
      ctx.lineWidth = 2;
      ctx.stroke();
    },
    [character, level, gameState]
  );

  // Sync Canvas Size with Dimensions
  useEffect(() => {
    if (canvasRef.current && dimensions.width > 0) {
      canvasRef.current.width = dimensions.width;
      canvasRef.current.height = dimensions.height;
      // Redraw if not playing to avoid blank screen on resize/init
      if (gameState !== "PLAYING") {
        draw(
          canvasRef.current.getContext("2d"),
          dimensions.width,
          dimensions.height
        );
      }
    }
  }, [dimensions, gameState, draw]);

  const update = useCallback(
    (width, height) => {
      // Safety check
      if (!width || !height) return;

      const bird = birdRef.current;
      const currentLevel = LEVELS[level];
      const birdX = width * 0.2;

      // Physics
      bird.velocity += GRAVITY;
      bird.y += bird.velocity;

      // Grace Period (120 frames ~ 2 sec) - prevent death on start
      gracePeriodRef.current++;
      if (gracePeriodRef.current < 60) {
        // Keep bird centered during grace period
        bird.y = height > 100 ? height / 2 : 300;
        bird.velocity = 0;
        return;
      }

      // Pipe Generation
      if (
        pipesRef.current.length === 0 ||
        width - pipesRef.current[pipesRef.current.length - 1].x >= PIPE_SPACING
      ) {
        const minPipeHeight = 50;
        const maxPipeHeight = height - currentLevel.gap - minPipeHeight - 20;
        const topHeight =
          Math.floor(Math.random() * (maxPipeHeight - minPipeHeight + 1)) +
          minPipeHeight;

        pipesRef.current.push({
          x: width,
          topHeight,
          passed: false,
        });
      }

      // Pipe Movement & Collision
      const dynamicSpeed = currentLevel.speed + scoreRef.current * 0.2;

      for (let i = pipesRef.current.length - 1; i >= 0; i--) {
        const pipe = pipesRef.current[i];
        pipe.x -= dynamicSpeed;

        // Remove off-screen
        if (pipe.x + PIPE_WIDTH < 0) {
          pipesRef.current.splice(i, 1);
          continue;
        }

        // Collision
        const birdLeft = birdX - 15;
        const birdRight = birdX + 15;
        const birdTop = bird.y - 15;
        const birdBottom = bird.y + 15;

        const pipeLeft = pipe.x;
        const pipeRight = pipe.x + PIPE_WIDTH;
        const topPipeBottom = pipe.topHeight;
        const bottomPipeTop = pipe.topHeight + currentLevel.gap;

        if (birdRight > pipeLeft && birdLeft < pipeRight) {
          if (birdTop < topPipeBottom || birdBottom > bottomPipeTop) {
            console.log("Collision with Pipe!");
            gameOver();
          }
        }

        // Score
        if (!pipe.passed && birdLeft > pipeRight) {
          pipe.passed = true;
          scoreRef.current += 1;
          setScore(scoreRef.current);
          playSound("score");
        }
      }

      // Ground/Ceiling
      if (bird.y + 20 >= height - 20 || bird.y - 20 <= 0) {
        console.log("Collision with Ground/Ceiling!", bird.y, height);
        gameOver();
      }
    },
    [level, gameOver, playSound]
  );

  // Main Loop
  useEffect(() => {
    const loop = () => {
      if (gameState !== "PLAYING") return;

      const canvas = canvasRef.current;
      if (canvas) {
        update(canvas.width, canvas.height);
        draw(canvas.getContext("2d"), canvas.width, canvas.height);
      }
      gameLoopRef.current = requestAnimationFrame(loop);
    };

    if (gameState === "PLAYING") {
      gameLoopRef.current = requestAnimationFrame(loop);
    } else {
      cancelAnimationFrame(gameLoopRef.current);
      if (canvasRef.current && dimensions.width > 0) {
        draw(
          canvasRef.current.getContext("2d"),
          dimensions.width,
          dimensions.height
        );
      }
    }
    return () => cancelAnimationFrame(gameLoopRef.current);
  }, [gameState, dimensions, draw, update]);

  return (
    <div className="fixed inset-0 bg-black overflow-hidden font-mono select-none flex items-center justify-center">
      {/* Canvas Container with Border/Glow for Tech Look */}
      <div className="relative w-full h-full border-2 border-green-500/30 rounded-xl overflow-hidden shadow-[0_0_50px_rgba(74,222,128,0.1)] bg-black">
        <canvas
          ref={canvasRef}
          className="block w-full h-full"
          onClick={() => {
            if (gameState === "PLAYING") jump();
          }}
          onTouchStart={(e) => {
            if (gameState === "PLAYING") jump();
          }}
        />

        {/* UI Overlay */}
        {gameState !== "PLAYING" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10 p-4">
            {gameState === "START" && (
              <div className="flex flex-col items-center max-w-lg w-full animate-in fade-in zoom-in duration-300">
                <h1
                  className="text-6xl md:text-6xl font-black text-transparent bg-clip-text bg-linear-to-b from-green-400 to-green-600 mb-2 tracking-tighter"
                  style={{ textShadow: "0 0 20px rgba(74, 222, 128, 0.5)" }}
                >
                  FLOP_BIRD
                </h1>
                <p className="text-green-500/70 mb-8 tracking-widest text-sm animate-pulse">
                  PRESS ANY KEY TO INITIALIZE
                </p>

                <div className="w-full bg-black border border-green-900/50 p-6 mb-6 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-green-500/20"></div>
                  <label className="text-green-500 block mb-4 text-xs font-bold uppercase tracking-widest">
                    Select Difficulty Protocol
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(LEVELS).map(([lvl, data]) => (
                      <button
                        key={lvl}
                        onClick={(e) => {
                          e.stopPropagation();
                          setLevel(Number(lvl));
                        }}
                        className={`py-2 px-1 text-xs font-mono border transition-all ${
                          level === Number(lvl)
                            ? "bg-green-500 text-black border-green-500 font-bold shadow-[0_0_15px_rgba(74,222,128,0.4)]"
                            : "bg-transparent text-green-500/50 border-green-900/50 hover:border-green-500/50 hover:text-green-500"
                        }`}
                      >
                        {data.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div onClick={(e) => e.stopPropagation()}>
                  <CharacterSelector
                    onSelect={setCharacter}
                    currentPlayer={character}
                  />
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    resetGame();
                  }}
                  className="mt-8 px-12 cursor-pointer py-3 bg-green-600 hover:bg-green-500 text-black font-black text-xl tracking-widest border border-green-400 shadow-[0_0_20px_rgba(74,222,128,0.6)] hover:shadow-[0_0_40px_rgba(74,222,128,0.8)] transition-all uppercase skew-x-[-10deg]"
                >
                  Initialize
                </button>
              </div>
            )}

            {gameState === "GAME_OVER" && (
              <div className="flex flex-col items-center animate-in zoom-in duration-300">
                <h2
                  className="text-4xl font-black text-red-500 mb-2 tracking-tighter"
                  style={{ textShadow: "0 0 20px rgba(239, 68, 68, 0.5)" }}
                >
                  SYSTEM FAILURE
                </h2>
                <div className="border border-red-900/50 bg-black/50 p-8 min-w-[300px] text-center mb-8 backdrop-blur-sm">
                  <div className="mb-4">
                    <p className="text-red-500/50 text-xs uppercase tracking-widest mb-1">
                      Current Score
                    </p>
                    <p className="text-5xl font-mono text-white">{score}</p>
                  </div>
                  <div className="h-px bg-red-900/50 w-full my-4"></div>
                  <div>
                    <p className="text-green-500/50 text-xs uppercase tracking-widest mb-1">
                      High Score
                    </p>
                    <p className="text-3xl font-mono text-green-400">
                      {highScore}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    resetGame();
                  }}
                  className="px-10 py-3 bg-white text-black font-bold text-lg tracking-widest hover:bg-gray-200 transition-all uppercase"
                >
                  Reboot System
                </button>
                <p className="mt-4 text-white/40 text-xs animate-pulse">
                  PRESS ANY KEY TO REBOOT
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setGameState("START");
                  }}
                  className="mt-6 text-green-500/50 hover:text-green-500 text-xs uppercase tracking-widest transition-colors"
                >
                  &lt; Return to Terminal
                </button>
              </div>
            )}
          </div>
        )}

        {/* HUD */}
        {gameState === "PLAYING" && (
          <>
            <div className="absolute top-8 left-0 right-0 flex justify-center pointer-events-none z-0">
              <div className="text-8xl font-mono font-bold text-white/10 select-none">
                {score}
              </div>
            </div>
            <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none z-0">
              <div className="text-xs font-mono font-bold text-green-500/60 tracking-[0.2em]">
                SPEED: {(LEVELS[level].speed + score * 0.2).toFixed(1)}
              </div>
            </div>
          </>
        )}

        {/* Mobile Controls Hint */}
        {gameState === "START" && (
          <div className="absolute bottom-4 text-green-500/30 text-[10px] uppercase tracking-[0.2em]">
            v.1.0.0 // OPTIMIZED FOR TOUCH & KEYBOARD
          </div>
        )}
      </div>
    </div>
  );
}
