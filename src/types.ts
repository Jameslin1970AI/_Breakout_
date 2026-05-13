/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Point {
  x: number;
  y: number;
}

export interface Velocity {
  dx: number;
  dy: number;
}

export interface Ball extends Point, Velocity {
  radius: number;
  speed: number;
}

export interface Paddle extends Point {
  width: number;
  height: number;
  isMovingLeft: boolean;
  isMovingRight: boolean;
}

export interface Brick extends Point {
  width: number;
  height: number;
  status: number; // 1 for active, 0 for destroyed
  color: string;
}

export type GameStatus = "START" | "PLAYING" | "PAUSED" | "GAMEOVER" | "WIN";

export interface GameState {
  score: number;
  lives: number;
  status: GameStatus;
}
