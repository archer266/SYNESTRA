import type { MusicalIntelligence } from '../analysis/intelligence';
import type { PresetId } from './milkdrop/catalog';
import type { MusicFeatures } from '../analysis/contracts';
import type { ProgressionState } from './progression';
export type VisualMode='classic'|'pearl'|'spectrum'|'milkdrop';
export type PaletteName='aurora'|'glacier'|'ember';
export interface VisualConfig {
  milkdropPreset:PresetId; milkdropCycle:boolean; milkdropInterval:number; milkdropTransition:number;
  mode: VisualMode; layout: 'linear'|'radial'; palette: PaletteName;
  musicalResponse:number; sensitivity: number; richness: number; smoothing: number; motion: number;
  quality: 'balanced'|'economy'|'high'; resolution:'auto'|'720p'|'1080p'|'1440p'|'2160p'; reducedMotion: boolean;
}
export const defaultVisualConfig: VisualConfig={musicalResponse:.5,milkdropPreset:'aurora',milkdropCycle:false,milkdropInterval:45,milkdropTransition:3,mode:'classic',layout:'radial',palette:'aurora',sensitivity:1,richness:0.7,smoothing:0.5,motion:0.65,quality:'balanced',resolution:'auto',reducedMotion:false};
export interface VisualWorld {
  initialize(container: HTMLElement): void;
  resize(width: number,height: number,pixelRatio: number): void;
  configure(config: VisualConfig): void;
  update(features: Readonly<MusicFeatures>,progression: Readonly<ProgressionState>,deltaSeconds: number,intelligence?:Readonly<MusicalIntelligence>|null): void;
  dispose(): void;
}
export interface VisualDiagnostics {
  intelligence:Readonly<MusicalIntelligence>;
  rms: number; bass: number; mids: number; treble: number; envelope: number;
  activity: number; coverage: number; onsetStrength: number; attackActivity: number;
  stage: string; groove: number; lift: number; peak: number; gated: boolean;
  suppressed: boolean; sampleRate: number; fftSize: number; renderer: string; reducedMotion: boolean;
  mode: VisualMode;
  engine: string; backend: string; renderWidth: number; renderHeight: number;
  pixelRatio: number; frameMs: number; cpuMs: number; fps: number;
  fallbackReason: string|null; cleanupWarning: string|null;
}
