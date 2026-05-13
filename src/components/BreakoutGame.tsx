/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  PADDLE_WIDTH, 
  PADDLE_HEIGHT, 
  PADDLE_BOTTOM_MARGIN,
  PADDLE_SPEED,
  BALL_RADIUS,
  INITIAL_BALL_SPEED,
  BRICK_ROWS,
  BRICK_COLS,
  BRICK_PADDING,
  BRICK_OFFSET_TOP,
  BRICK_OFFSET_LEFT,
  BRICK_HEIGHT,
  COLORS
} from "@/src/constants";
import { Ball, Paddle, Brick, GameStatus, GameState } from "@/src/types";
import { Trophy, Play, RotateCcw, Heart } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function BreakoutGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number | null>(null);
  
  // Game Objects (using refs for performance)
  const ballRef = useRef<Ball>({
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT - PADDLE_BOTTOM_MARGIN - PADDLE_HEIGHT - BALL_RADIUS,
    dx: INITIAL_BALL_SPEED,
    dy: -INITIAL_BALL_SPEED,
    radius: BALL_RADIUS,
    speed: INITIAL_BALL_SPEED
  });

  const paddleRef = useRef<Paddle>({
    x: (CANVAS_WIDTH - PADDLE_WIDTH) / 2,
    y: CANVAS_HEIGHT - PADDLE_BOTTOM_MARGIN - PADDLE_HEIGHT,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    isMovingLeft: false,
    isMovingRight: false
  });

  const bricksRef = useRef<Brick[]>([]);
  
  // UI State
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    lives: 3,
    status: "START"
  });

  // Initialize Bricks
  const initBricks = useCallback(() => {
    const bricks: Brick[] = [];
    const brickWidth = (CANVAS_WIDTH - BRICK_OFFSET_LEFT * 2 - (BRICK_COLS - 1) * BRICK_PADDING) / BRICK_COLS;
    
    for (let r = 0; r < BRICK_ROWS; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        bricks.push({
          x: BRICK_OFFSET_LEFT + c * (brickWidth + BRICK_PADDING),
          y: BRICK_OFFSET_TOP + r * (BRICK_HEIGHT + BRICK_PADDING),
          width: brickWidth,
          height: BRICK_HEIGHT,
          status: 1,
          color: COLORS.BRICKS[r % COLORS.BRICKS.length]
        });
      }
    }
    bricksRef.current = bricks;
  }, []);

  const resetBallAndPaddle = () => {
    ballRef.current = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT - PADDLE_BOTTOM_MARGIN - PADDLE_HEIGHT - BALL_RADIUS,
      dx: INITIAL_BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
      dy: -INITIAL_BALL_SPEED,
      radius: BALL_RADIUS,
      speed: INITIAL_BALL_SPEED
    };
    paddleRef.current.x = (CANVAS_WIDTH - PADDLE_WIDTH) / 2;
  };

  const startGame = () => {
    initBricks();
    resetBallAndPaddle();
    setGameState({ score: 0, lives: 3, status: "PLAYING" });
  };

  const restartGame = () => {
    startGame();
  };

  // Input Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") paddleRef.current.isMovingLeft = true;
      if (e.key === "ArrowRight") paddleRef.current.isMovingRight = true;
      if (e.key === " ") {
        setGameState(prev => {
          if (prev.status === "PLAYING") return { ...prev, status: "PAUSED" };
          if (prev.status === "PAUSED") return { ...prev, status: "PLAYING" };
          return prev;
        });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") paddleRef.current.isMovingLeft = false;
      if (e.key === "ArrowRight") paddleRef.current.isMovingRight = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const relativeX = e.clientX - canvasRef.current.getBoundingClientRect().left;
      if (relativeX > 0 && relativeX < CANVAS_WIDTH) {
        paddleRef.current.x = relativeX - paddleRef.current.width / 2;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  // Update Logic
  const update = useCallback(() => {
    if (gameState.status !== "PLAYING") return;

    const ball = ballRef.current;
    const paddle = paddleRef.current;
    const bricks = bricksRef.current;

    // Move Paddle
    if (paddle.isMovingLeft && paddle.x > 0) {
      paddle.x -= PADDLE_SPEED;
    }
    if (paddle.isMovingRight && paddle.x < CANVAS_WIDTH - paddle.width) {
      paddle.x += PADDLE_SPEED;
    }

    // Move Ball
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Wall Collision
    if (ball.x + ball.dx > CANVAS_WIDTH - ball.radius || ball.x + ball.dx < ball.radius) {
      ball.dx = -ball.dx;
    }
    if (ball.y + ball.dy < ball.radius) {
      ball.dy = -ball.dy;
    } else if (ball.y + ball.dy > CANVAS_HEIGHT - ball.radius) {
      // Bottom Collision
      if (ball.x > paddle.x && ball.x < paddle.x + paddle.width) {
        // Paddle Hit - Calculate hit angle based on where on the paddle it hit
        const hitPoint = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
        ball.dx = hitPoint * ball.speed;
        ball.dy = -ball.dy;
      } else {
        // Fall down
        setGameState(prev => {
          const newLives = prev.lives - 1;
          if (newLives === 0) {
            return { ...prev, status: "GAMEOVER", lives: 0 };
          } else {
            resetBallAndPaddle();
            return { ...prev, lives: newLives };
          }
        });
      }
    }

    // Brick Collision
    let activeBricks = 0;
    for (let i = 0; i < bricks.length; i++) {
      const b = bricks[i];
      if (b.status === 1) {
        activeBricks++;
        if (
          ball.x > b.x && 
          ball.x < b.x + b.width && 
          ball.y > b.y && 
          ball.y < b.y + b.height
        ) {
          ball.dy = -ball.dy;
          b.status = 0;
          setGameState(prev => ({ ...prev, score: prev.score + 10 }));
        }
      }
    }

    if (activeBricks === 0 && gameState.status === "PLAYING") {
      setGameState(prev => ({ ...prev, status: "WIN" }));
    }
  }, [gameState.status]);

  // Render Logic
  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Bricks
    bricksRef.current.forEach(brick => {
      if (brick.status === 1) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(brick.x, brick.y, brick.width, brick.height, 4);
        ctx.fillStyle = brick.color;
        
        // Add glow effect to bricks
        ctx.shadowBlur = 15;
        ctx.shadowColor = brick.color;
        
        ctx.fill();
        ctx.restore();
      }
    });

    // Draw Paddle
    ctx.save();
    const paddle = paddleRef.current;
    const gradient = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x + paddle.width, paddle.y);
    gradient.addColorStop(0, "#22d3ee"); // cyan-400
    gradient.addColorStop(1, "#2563eb"); // blue-600
    
    ctx.beginPath();
    ctx.roundRect(paddle.x, paddle.y, paddle.width, paddle.height, 10);
    ctx.fillStyle = gradient;
    ctx.shadowBlur = 15;
    ctx.shadowColor = "rgba(34, 211, 238, 0.5)";
    ctx.fill();
    
    // Paddle inner highlight
    ctx.beginPath();
    ctx.roundRect(paddle.x + paddle.width * 0.25, paddle.y + 2, paddle.width * 0.5, 2, 1);
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.fill();
    ctx.restore();

    // Draw Ball
    ctx.save();
    ctx.beginPath();
    ctx.arc(ballRef.current.x, ballRef.current.y, ballRef.current.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.shadowBlur = 20;
    ctx.shadowColor = "#ffffff";
    ctx.fill();
    
    // Ball outer ring
    ctx.beginPath();
    ctx.arc(ballRef.current.x, ballRef.current.y, ballRef.current.radius + 4, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

  }, []);

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    update();
    draw(ctx);
    
    requestRef.current = requestAnimationFrame(gameLoop);
  }, [update, draw]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [gameLoop]);

  return (
    <div className="flex flex-col h-screen w-full bg-slate-950 text-white font-sans overflow-hidden select-none">
      {/* Top HUD Bar */}
      <div className="h-20 bg-slate-900/80 border-b border-slate-700 flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">STAGE</span>
            <span className="text-2xl font-black text-cyan-400">STAGE 01</span>
          </div>
          <div className="h-8 w-px bg-slate-700"></div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">High Score</span>
            <span className="text-2xl font-black">124,500</span>
          </div>
        </div>
        
        <div className="text-center">
          <div className="px-6 py-1 bg-yellow-500 rounded-full text-slate-950 font-black text-sm animate-pulse">
            MISSION ACTIVE
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Current Score</span>
            <span className="text-3xl font-black text-yellow-400">{gameState.score.toString().padStart(6, '0')}</span>
          </div>
          <div className="flex gap-2 text-rose-500 text-2xl">
            {Array.from({ length: 3 }).map((_, i) => (
              <span key={i} className={i < gameState.lives ? "opacity-100" : "opacity-20"}>❤</span>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="flex flex-1 p-6 gap-6 overflow-hidden">
        
        {/* Left Sidebar: Stats & Info */}
        <div className="w-48 flex flex-col gap-4 hidden lg:flex">
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
            <h3 className="text-xs font-bold text-slate-500 mb-3 tracking-tighter">DATA STREAM</h3>
            <div className="space-y-3 font-mono text-[10px]">
              <div className="flex items-center justify-between text-slate-400">
                <span>FPS:</span>
                <span className="text-emerald-400">60.0</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>SPEED:</span>
                <span className="text-cyan-400">{(ballRef.current?.speed || 0).toFixed(1)}x</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>X-VEL:</span>
                <span className="text-amber-400">{Math.abs(ballRef.current?.dx || 0).toFixed(1)}</span>
              </div>
            </div>
          </div>
          
          <div className="mt-auto bg-cyan-900/20 p-4 rounded-xl border border-cyan-800/50">
            <p className="text-[10px] text-cyan-400 font-bold mb-1">CONTROLS</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              [←][→] or MOUSE to move<br/>
              [Space] to pause<br/>
            </p>
          </div>
        </div>

        {/* Game Canvas Area */}
        <div className="flex-1 bg-black rounded-2xl border-4 border-slate-800 relative shadow-2xl overflow-hidden flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="cursor-none max-w-full max-h-full transition-all"
          />

          {/* Overlay Modals */}
          <AnimatePresence>
            {gameState.status !== "PLAYING" && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center"
              >
                {gameState.status === "START" && (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="space-y-8"
                  >
                    <div className="relative">
                      <h2 className="text-7xl font-black mb-2 tracking-tighter italic text-white mix-blend-overlay">BREAKOUT</h2>
                      <h2 className="text-7xl font-black mb-2 tracking-tighter italic absolute top-0 left-0 animate-pulse text-cyan-400/50">BREAKOUT</h2>
                    </div>
                    <p className="text-slate-400 uppercase tracking-[0.3em] font-bold">Initiating Simulation Sequence</p>
                    <button 
                      onClick={startGame}
                      className="group relative px-12 py-5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-full font-black text-xl transition-all active:scale-95 shadow-[0_0_30px_rgba(6,182,212,0.4)]"
                    >
                      LAUNCH MISSION
                    </button>
                  </motion.div>
                )}

                {gameState.status === "PAUSED" && (
                  <div className="space-y-6">
                    <h2 className="text-6xl font-black italic tracking-widest text-yellow-400">SIMULATION PAUSED</h2>
                    <button 
                      onClick={() => setGameState(prev => ({ ...prev, status: "PLAYING" }))}
                      className="px-8 py-4 bg-white text-slate-950 rounded-full font-black text-xl hover:bg-cyan-400 transition-colors"
                    >
                      RESUME
                    </button>
                  </div>
                )}

                {gameState.status === "GAMEOVER" && (
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    className="space-y-6"
                  >
                    <h2 className="text-7xl font-black text-rose-500 tracking-tighter">MISSION FAILED</h2>
                    <div className="text-2xl font-mono text-slate-400">
                      CRITICAL FAILURE AT SCORE: <span className="text-white">{gameState.score}</span>
                    </div>
                    <button 
                      onClick={restartGame}
                      className="px-10 py-5 bg-rose-500 hover:bg-rose-400 text-white rounded-full font-black text-xl flex items-center gap-2 mx-auto"
                    >
                      REBOOT SYSTEM
                    </button>
                  </motion.div>
                )}

                {gameState.status === "WIN" && (
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    className="space-y-6"
                  >
                    <h2 className="text-7xl font-black text-emerald-400 tracking-tighter">MISSION CLEAR</h2>
                    <div className="text-2xl font-mono text-slate-400">
                      OPTIMAL EFFICIENCY REACHED: <span className="text-white">{gameState.score}</span>
                    </div>
                    <button 
                      onClick={restartGame}
                      className="px-10 py-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-full font-black text-xl flex items-center gap-2 mx-auto"
                    >
                      NEXT STAGE
                    </button>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Sidebar: Engine Info */}
        <div className="w-48 flex flex-col gap-4 hidden xl:flex">
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
            <h3 className="text-xs font-bold text-slate-500 mb-3 tracking-tighter">LEADERBOARD</h3>
            <div className="space-y-4">
              <div className="flex flex-col">
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-yellow-500">1. NEO_X</span>
                  <span>240k</span>
                </div>
                <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-500 w-[95%]"></div>
                </div>
              </div>
              <div className="flex flex-col">
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-300">2. GHOST</span>
                  <span>185k</span>
                </div>
                <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-500 w-[70%]"></div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
            <h3 className="text-xs font-bold text-slate-500 mb-2">ENGINE LOG</h3>
            <div className="font-mono text-[9px] text-emerald-500 space-y-1">
              <p>&gt; VITE_READY: 2ms</p>
              <p>&gt; PHYSICS: 60FPS</p>
              <p>&gt; RENDER: CANVAS_2D</p>
              <p className="animate-pulse">_</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer Status Area */}
      <div className="h-12 bg-slate-900 px-8 flex items-center justify-between border-t border-slate-800 shrink-0">
        <div className="flex gap-6 items-center">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div>
            <span className="text-[10px] text-slate-400 font-bold uppercase">System Normal</span>
          </div>
          <div className="text-[10px] text-slate-500">REACT 19 • TS 5.8</div>
        </div>
        <div className="text-[10px] text-slate-500 font-mono tracking-widest hidden md:block">
          COORD: X:{Math.floor(ballRef.current?.x || 0)} Y:{Math.floor(ballRef.current?.y || 0)} | OP_STATUS: {gameState.status}
        </div>
      </div>
    </div>
  );
}
