export interface Material {
  id: string;
  name: string;
  thumbnail: string; // Color code or image url
  type: 'color' | 'texture';
  category: 'floor' | 'wall' | 'furniture';
}

export interface DesignHistoryItem {
  id: string;
  sourceImage: string;
  sourcePath?: string;
  renderedImage?: string;
  renderedPath?: string;
  timestamp: number;
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
