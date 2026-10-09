import type { MusicalIntelligence } from '../analysis/intelligence';
import type { MusicFeatures } from '../analysis/contracts';
import type { ProgressionState } from './progression';
import type { VisualConfig } from './contracts';
export interface RenderSize {
  cssWidth: number; cssHeight: number; pixelRatio: number;
  width: number; height: number; devicePixelRatio: number;
}
export interface EngineCapabilities {
  backend: 'webgl2'|'canvas2d'; spectrum: boolean; waveform: boolean;
  reducedMotion: boolean; layouts: readonly string[];
}
export interface VisualFrame {
  /** Borrowed buffers: valid only until the next render, never mutate/retain contents. */
  features: Readonly<MusicFeatures>;
  spectrum: { readonly decibels: Readonly<Float32Array>; readonly logBands: Readonly<Float32Array>; readonly frequenciesHz: Readonly<Float32Array> };
  waveform: Readonly<Float32Array>;
  /** Contiguous pre-gain PCM at features.sampleRate, distinct from the decimated display waveform. */
  rawWaveform: Readonly<Float32Array>;
  progression: Readonly<ProgressionState>;
  timing: { now: number; delta: number; elapsed: number; frame: number };
  playback: { playing: boolean; paused: boolean; seeking: boolean; loading: boolean; ended: boolean; position: number; duration: number; trackId: string|null };
  /** Borrowed analysis-cadence frame; null when unavailable. */
  intelligence: Readonly<MusicalIntelligence>|null;
}
export interface EngineContext { container: HTMLElement; reportFailure(reason: string): void }
export interface VisualEngine {
  initialize(context: EngineContext): void;
  configure(config: Readonly<VisualConfig>): void;
  resize(size: Readonly<RenderSize>): void;
  activate(): void;
  render(frame: Readonly<VisualFrame>): void;
  deactivate(): void;
  /** Must release owned graphics/listeners even after partial initialization. Idempotent. */
  dispose(): void;
}
export interface EngineDefinition {
  id: string; name: string; selectable: boolean;
  capabilities: Readonly<EngineCapabilities>;
  create(): VisualEngine;
}
/** Pure registry. Future engines need no dependency on Three.js or the audio graph. */
export class EngineRegistry {
  private definitions=new Map<string,EngineDefinition>();
  register(definition: EngineDefinition){
    if(!/^[a-z][a-z0-9-]*$/.test(definition.id)||this.definitions.has(definition.id))throw new Error('Invalid or duplicate engine ID: '+definition.id);
    this.definitions.set(definition.id,definition);return this;
  }
  get(id: string){const definition=this.definitions.get(id);if(!definition)throw new Error('Unknown visual engine: '+id);return definition;}
  list(){return [...this.definitions.values()].filter(item=>item.selectable);}
}
