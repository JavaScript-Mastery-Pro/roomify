import { Material } from './types';

export const WALL_MATERIALS: Material[] = [
  { id: 'w1', name: 'Polar White', thumbnail: '#f8fafc', type: 'color', category: 'wall' },
  { id: 'w2', name: 'Warm Beige', thumbnail: '#e7e5e4', type: 'color', category: 'wall' },
  { id: 'w3', name: 'Urban Grey', thumbnail: '#52525b', type: 'color', category: 'wall' },
  { id: 'w4', name: 'Midnight Blue', thumbnail: '#1e3a8a', type: 'color', category: 'wall' },
  { id: 'w5', name: 'Sage Green', thumbnail: '#3f6212', type: 'color', category: 'wall' },
];

export const FLOOR_MATERIALS: Material[] = [
  { id: 'f1', name: 'Oak Light', thumbnail: '#d4b996', type: 'texture', category: 'floor' },
  { id: 'f2', name: 'Walnut Dark', thumbnail: '#5d4037', type: 'texture', category: 'floor' },
  { id: 'f3', name: 'Grey Tile', thumbnail: '#9ca3af', type: 'texture', category: 'floor' },
  { id: 'f4', name: 'Polished Concrete', thumbnail: '#4b5563', type: 'texture', category: 'floor' },
];

export const FURNITURE_STYLES: Material[] = [
  { id: 's1', name: 'Modern Minimalist', thumbnail: '#000000', type: 'texture', category: 'furniture' },
  { id: 's2', name: 'Industrial', thumbnail: '#333333', type: 'texture', category: 'furniture' },
  { id: 's3', name: 'Scandinavian', thumbnail: '#ffffff', type: 'texture', category: 'furniture' },
];

export const LIGHTING_OPTIONS = [
  { id: 'morning', name: 'Morning', description: 'Soft, warm morning light, low angle shadows, inviting atmosphere', thumbnail: '#fdb813' },
  { id: 'noon', name: 'Noon', description: 'Bright, neutral daylight, high contrast, clear visibility', thumbnail: '#fff7ed' },
  { id: 'sunset', name: 'Sunset', description: 'Golden hour, dramatic long shadows, warm orange and purple hues', thumbnail: '#f97316' },
  { id: 'night', name: 'Night', description: 'Artificial interior lighting, dark exterior, cozy and intimate ambiance', thumbnail: '#1e1b4b' },
];

export const PUTER_WORKER_URL = import.meta.env.VITE_PUTER_WORKER_URL || '';

export const MOCK_SCENES = {
  initial: "https://picsum.photos/1200/800?grayscale", // Represents the raw sketch feel
  floorPlan: "https://images.unsplash.com/photo-1599694207166-70e6e76870df?auto=format&fit=crop&q=80&w=1000", // Generic floor plan
  rendered: "https://picsum.photos/1200/800?random=1",
};
