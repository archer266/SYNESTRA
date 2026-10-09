/** One reused frame, valid until the next sample(). Consumers must not mutate or retain arrays. */
export interface MusicFeatures {
  timestamp: number;
  sampleRate: number;
  fftSize: number;
  rms: number;                 // Actual pre-gain RMS, 0..1 (not an instrument estimate).
  loudness: number;            // Gated, normalized, fast envelope, 0..1.
  envelope: number;            // Slower loudness envelope, 0..1.
  bass: number; mids: number; treble: number;
  waveform: Float32Array;      // Measured PCM, signed -1..1; fades on inactivity.
  bands: Float32Array;         // Logarithmic, smoothed magnitude, 0..1.
  bandFrequencies: Float32Array;
  spectralFlux: number;        // Positive relative flux, 0..1.
  onsetStrength: number;       // Threshold-relative strength, 0..1.
  attack: boolean;             // Single-frame detected attack. NOT a beat grid.
  attackActivity: number;      // Recent attack envelope, 0..1.
  coverage: number;            // Fraction of active log bands, 0..1.
  activity: number;            // Musical fullness proxy, 0..1.
  gated: boolean;
  suppressed: boolean;         // Post-seek/track-change settling window.
}
export interface AnalysisConfig { sensitivity: number; smoothing: number }
export interface MusicFeatureSource {
  sample(timeSeconds: number): Readonly<MusicFeatures>;
  configure(config: Partial<AnalysisConfig>): void;
  reset(): void;
  dispose(): void;
}
