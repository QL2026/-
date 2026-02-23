/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Point {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  x: number;
  y: number;
}

export interface Rocket extends Entity {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  progress: number;
  speed: number;
}

export interface Interceptor extends Entity {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  progress: number;
  speed: number;
}

export interface Explosion extends Entity {
  radius: number;
  maxRadius: number;
  expanding: boolean;
  done: boolean;
}

export interface City extends Entity {
  destroyed: boolean;
}

export interface Turret extends Entity {
  ammo: number;
  maxAmmo: number;
  destroyed: boolean;
}

export type GameStatus = 'START' | 'PLAYING' | 'ROUND_END' | 'WIN' | 'LOSE';

export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;
