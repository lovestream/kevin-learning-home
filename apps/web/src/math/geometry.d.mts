export interface Point {
  x: number;
  y: number;
  depth: number;
}
export interface Face {
  id: number;
  points: number[][];
}
export interface ProjectedFace {
  id: number;
  key: number;
  points: Point[];
  depth: number;
  shade: number;
}
export const faces: { id: number; name: string; color: string; mark: string }[];
export function boxFaces(
  width?: number,
  height?: number,
  depth?: number,
  origin?: number[],
): Face[];
export function projectPoint(
  point: number[],
  azimuth?: number,
  elevation?: number,
): Point;
export function composeSolid(
  solid: Face[],
  azimuth: number,
  elevation: number,
): { scale: number; faces: ProjectedFace[] };
export function tint(hex: string, factor: number): string;
