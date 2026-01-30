export type ViewState = 'landing' | 'upload' | 'visualizer';

export interface Material {
  id: string;
  name: string;
  thumbnail: string; // Color code or image url
  type: 'color' | 'texture';
  category: 'floor' | 'wall' | 'furniture';
}

export interface DesignConfig {
  floor: string;
  walls: string;
  style: string;
}

export enum AppStatus {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  PROCESSING = 'PROCESSING',
  READY = 'READY'
}