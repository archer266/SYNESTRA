# SYNESTRA

A standalone Windows MP3 player focused on classic music-visualizer artwork. Choose **Classic - Lightflow** for flowing luminous trails, soft color fields and drifting sparks that respond to your music. Pearl, Spectrum and MilkDrop remain available. Existing saved modes are respected; new installations start in Classic.

## Windows release

Download [SYNESTRA 1.0.1 installer for Windows x64](https://github.com/scryingorb/SYNESTRA/releases/tag/v1.0.1), run setup, then open SYNESTRA from its Start menu or desktop shortcut. No Node.js, npm or developer tools are needed. See [installation, usage, uninstall and known limitations](docs/releases/1.0.1.md). This build is unsigned; clean-machine testing remains pending.

## Development setup

Use Node.js 24 and npm on Windows x64:

```powershell
Set-Location 'C:\Users\Admin\Desktop\Coding Projects\Synestra'
npm.cmd ci
npm.cmd run dev
```

Development starts Vite at 127.0.0.1:5179 and an actual Electron desktop window. Close the window or use Ctrl+C to stop. Renderer changes reload; restart for main/preload changes. The first install needs internet access to download dependencies and Electron.

For the built application:

```powershell
npm.cmd run build
npm.cmd start
```

If your shell explicitly sets ELECTRON_RUN_AS_NODE, remove it before starting Electron: `Remove-Item Env:\ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue`. The development launcher already clears it. The current installer is release/1.0.1/SYNESTRA-Setup-1.0.1-x64.exe; the 1.0.0 ZIP remains a historical release.

## Listen
**Import music** opens Windows' native multi-file picker. Cancel leaves the collection unchanged; duplicate paths are ignored. Click a queue item to play. Importing and relaunching never start playback.

The preserved transport supports play/pause, previous/next, elapsed/duration, seeking, volume, shuffle and repeat off/all/one. Previous restarts after three seconds, otherwise selects the previous track. Manual Next advances even with repeat-one. Shuffle visits a permutation of the queue; repeat-all wraps it. Errors stop on the affected file; select a valid track to recover.

Outside controls/editable fields: **Space** toggles playback, **Left/Right** seeks five seconds, **N/P** selects next/previous. Focused sliders keep their native keyboard behavior. Open/close Queue from the header; it starts collapsed. Escape closes the open side panel.

Stable IDs and absolute source references persist atomically in `library.json` under Electron's SYNESTRA user-data directory (normally `%APPDATA%\SYNESTRA`). Music stays in its original location and is never changed or uploaded. A moved/deleted file becomes unavailable; import its new location. Playback position and transport preferences remain session-only. Valid visual preferences are saved in renderer local storage under synestra.visual-preferences.v1. This stores mode, Spectrum layout, palette, sensitivity, richness, smoothing, motion, quality, resolution limit, MilkDrop preset, cycling interval/enabled state and transition duration; it never stores an autoplay request. Invalid values are discarded and unavailable storage falls back to session preferences.

## Watch and tune

**Classic - Lightflow** is the new focused visual direction, inspired by classic iTunes. It is one authored composition, not a new preset collection. Bass gently expands its paths, transients widen the light, measured waveform adds fine detail, and energy controls flow and illumination. Tune adjusts palette, richness, sensitivity, smoothing, motion and quality. Reduced motion freezes decorative travel. Use High / 2160p for capable hardware; inspect actual dimensions in Signals. [Current capture](docs/classic/frame-2.png).

The old phase roadmap is historical, not the active development plan. Saved Phase 5 work is preserved without claiming its unfinished handoff is complete. No new dependencies, audio routes or player changes were needed for Classic.

Switch Pearl/Spectrum/MilkDrop in the header without changing audio, queue, volume or playback position. The small header/dock logo stays branding; the large scene is procedural.

- **Pearl:** exactly three separate translucent shader bubbles in a triangle. Left responds to bass, upper center to mids, right to treble. Flow, breathing and highlights are time-smoothed. This existing Pearl is the baseline for the later Living Pearl phase.
- **Spectrum:** the original dimensional bars, faceted core, measured waveform traces, orbits and bounded satellite detail. Its Linear/Radial layout control remains available.
- **MilkDrop:** ten distinct curated feedback presets: Aurora, Cosmic layers, Liquid color, Kaleidoscope, Chrome tunnel, Psychedelic glowsticks, Starburst, Spiral dreams, Reaction pools and Mindblob geometry. The stage and Signals identify the preset actually loaded; select MilkDrop explicitly if your saved mode is Pearl or Classic. Open Tune for preset selection, previous/next/random, opt-in automatic cycling (15-300 seconds) and smooth transitions (1-8 seconds). Cycling advances only during audible, unsuppressed playback in the active MilkDrop scene; pause, silence, hidden windows and fallback do not consume its interval. Selection and cycling preferences survive relaunch without autoplay.
- **Palette:** Aurora, Glacier or Ember changes the current scene's colors. MilkDrop labels these Original, Cool hue shift and Warm hue shift; richness controls color saturation, sensitivity/smoothing shape its audio input and quality changes its mesh density.
- **Sensitivity:** 0.5-2x bounded visual strength; it never changes listening gain or lowers the physical silence gate.
- **Richness:** supporting scene detail/internal light. **Smoothing:** time-based feature attack/release. **Motion:** independent decorative flow/rotation/deformation; zero retains measured response in Pearl/Spectrum. MilkDrop uses the measured waveform fallback for Motion zero or OS reduced motion, then restores automatically when that constraint is removed. Arbitrary feedback presets cannot reliably eliminate motion.
- **Quality / resolution:** independent render-cost controls, saved with valid visual preferences. The effective buffer is bounded by all limits below, preserves aspect ratio and does not upscale beyond device DPR.

| Quality | Maximum DPR | Pixel budget | Scene detail |
| --- | --- | --- | --- |
| Economy | 1 | 850,000 | Lower shader/detail work |
| Balanced (default) | 1.5 | 1,600,000 | Full existing scene detail |
| High | 2 | 8,294,400 | Full detail with up to 4K resolution |

Resolution limits: Auto (up to 3840 x 2160), 1280 x 720, 1920 x 1080, 2560 x 1440, 3840 x 2160. Selecting 2160p with Economy still uses Economy's lower budget. High does not force 4K on a smaller stage. CSS controls stay sharp independently of render resolution.

Use **Enter fullscreen** on the stage; Exit fullscreen or Escape returns to the player. Fullscreen displays the visual stage, not the transport. **Tune > Signals** reports measured audio, active engine/backend, actual canvas dimensions, effective pixel ratio, smoothed RAF interval/FPS, CPU submission time, fallback reason and cleanup errors. CPU submission is not GPU execution time. 3840 x 2160 at 60 FPS is a hardware validation target, not a guarantee.

GPU initialization/shader/render/context-loss failures switch to measured Canvas 2D waveform rendering without stopping audio. **Retry graphics** reconstructs the selected engine, or change modes to retry. Retries are explicit to avoid repeated context allocation on a failing driver. If Canvas 2D is also unavailable, diagnostics report it and playback remains usable.

See [MilkDrop refinement and validation](docs/MILKDROP_REFINEMENT.md) for the collection, attribution, measured results and viewing checklist.

## Analysis contract and tuning
The player still owns one persistent HTMLAudioElement and one graph:

**media element source → analyser → volume gain → destination**

The analyser uses FFT size 4096 and its actual AudioContext sample rate. Built-in FFT smoothing is zero; analysis owns time-based smoothing. Measurement precedes output gain, so mute/volume cannot change the visual input. The service is passive and creates no audio nodes or animation loop.

`src/analysis/contracts.ts` defines one borrowed `MusicFeatures` frame. The frame and its typed arrays are reused; consumers must not mutate them or retain array contents across samples.

| Field | Meaning |
| --- | --- |
| timestamp, sampleRate, fftSize | Sampling time in seconds and actual graph format; format is unknown before first playback |
| rms | Measured pre-gain PCM RMS, bounded 0–1 |
| loudness, envelope | Fast normalized energy and slower energy envelope, 0–1 |
| bass, mids, treble | Smoothed normalized regional magnitude derived from summed linear power |
| bands, bandFrequencies | 64 log-spaced normalized bands and their center frequencies in Hz |
| waveform | 512 actual PCM samples, uniformly decimated from the 4096-sample frame; fades on inactivity |
| spectralFlux, onsetStrength | Positive relative spectral change and threshold-relative attack strength, 0–1 |
| attack | Single-frame detected transient flag |
| attackActivity | Decaying recent-attack activity, 0–1 |
| coverage, activity | Active-band coverage and the bounded fullness proxy, 0–1 |
| gated, suppressed | Physical silence gate and transition-settling state |

Bass starts at 35–180 Hz, mids at 180–2500 Hz, and treble at 2500–12000 Hz, clamped to Nyquist. Bin width is sampleRate/fftSize. Frequency regions integrate fractional bin overlap rather than assigning every narrow log band an entire repeated bin. Decibels convert with `10^(dB/20)`; squared magnitudes are summed as power. Non-finite frequency silence values become zero.

Initial tuning:
- Gate opens above RMS 0.001 (−60 dBFS) and closes below 0.00063 (about −64 dBFS). Sensitivity never lowers this physical gate.
- Bounded normalization is `1 - exp(-14 × sensitivity × amplitude)`.
- Fast attack: 25–115 ms; release: 160–600 ms, controlled by smoothing.
- Slow energy envelope: 450 ms attack / 1.1 s release.
- Positive log-magnitude spectral flux uses an adaptive mean/deviation threshold and a 180 ms cooldown.
- Seek/track/restart events clear detector history and suppress fresh input/attacks for 220 ms. Existing visual envelopes fade through the transition. Pause, silence and completion decay toward rest.
- Activity combines gated normalized energy with the square root of active log-band coverage and recent attack activity. A loud sparse tone cannot reach the same fullness as a broad active spectrum.

## Shared rendering architecture

The audio route remains one persistent element -> media source -> analyser -> volume gain -> destination. Analysis is pre-gain, so mute and volume changes do not weaken the visuals. No new contexts, audio nodes or audio routes were introduced.

| Module | Ownership / boundary |
| --- | --- |
| src/player/ | Sole audio element/graph and media-event playback state; unchanged |
| src/analysis/ | Existing passive analyser consumer and reused feature buffers; raw dB and contiguous pre-gain PCM buffers are exposed read-only |
| visuals/engine.ts | VisualEngine, capabilities, registry types, RenderSize and borrowed VisualFrame; no Three.js dependency |
| visuals/registry.ts, adapter.ts | Pearl/Spectrum/MilkDrop/2D registrations; adapter preserves existing VisualWorld behavior and isolates graphics |
| visuals/milkdrop/ | Pinned Butterchurn adapter, PCM conversion, preset clock/cycling, static presets and exclusive GL resource ownership |
| visuals/session.ts | Initialize/configure/resize/activate/render/deactivate/dispose, switching, partial-init cleanup, generation-scoped failures and retry |
| visuals/scheduler.ts, sizing.ts | Single cancellable RAF, frame timing, centralized DPR/aspect/pixel/dimension limits |
| visuals/frame.ts, director.ts | Shared analysis/progression/playback frame, host integration, scalar diagnostics at 4 Hz |
| src/ui/ | Controls and fullscreen; no per-frame analyser arrays in React state |
| electron/, shared/ | Existing native files/streaming plus narrow native visibility subscription and trusted-main-frame fullscreen permission |

VisualEngine initialization receives only a container and failure reporter. A new engine owns its graphics and listeners, accepts resolved sizing/configuration, renders only when active and releases all owned resources even after partial initialization. It must not create its own scheduling loop or audio route. The registry exposes backend, spectrum/waveform, reduced-motion and layout capabilities; the mode picker reads selectable registrations. Existing worlds use WorldAdapter; a future engine can implement VisualEngine directly without importing Three.js. Adding selectable engines also requires extending validated preferences/configuration deliberately.

VisualFrame borrows the same feature/spectrum/waveform buffers until the next frame. It also exposes rawWaveform: the contiguous analyser PCM used by MilkDrop, alongside the decimated display waveform. It contains raw FFT decibels (negative infinity is legitimate silence), normalized log bands and center Hz, measured PCM, MusicFeatures (RMS/regions/envelopes/attacks), progression, timing (now/delta/elapsed/frame) and actual playback fields (playing/paused/seeking/loading/ended/position/duration/track ID). Consumers must not mutate/retain borrowed arrays. Frame shells are reused. The intelligence field is explicitly null; no BPM, beat grid or instrument separation is invented.

The host stops scheduling and deactivates graphics when the document or native window is hidden/minimized. Audio continues. On return it resets analysis transition history and resumes with a fresh timing origin; hidden wall time does not advance visual elapsed time. Native visibility notifications cover Electron sessions whose document.visibilityState remains visible while minimized. Pause, silence and completion keep the visible loop running so measured features and composition decay smoothly. Reduced motion retains music measurements while removing decorative motion. Delta is bounded at 100 ms to avoid suspension jumps. ResizeObserver, display-DPR checks, resize and fullscreen events resolve sizes centrally.

Progression remains an independent Quiet/Groove/Lift/Peak controller, with continuous layer weights, hysteresis, approximately 650 ms growth and 1.45 s recession. Engine switches dispose only graphics; analysis/progression/audio remain alive. Stale failure callbacks cannot replace a newer engine. Disposal cancels scheduling, observers, subscriptions and listeners before freeing graphics.

IPC validates argument count, sender webContents, main frame and exact app URL. Only user-initiated fullscreen from the trusted main document is allowed; other permissions, subframes and other documents are denied. Node integration stays off, sandbox/context isolation/web security stay on. Registered opaque media IDs, secure byte ranges, disk streaming and atomic library persistence are unchanged.

## MilkDrop compatibility and licensing

Butterchurn 2.6.7 is pinned and lazy-loaded. Its WebGL2 renderer receives the existing pre-gain PCM through the stable audioLevels interface with a null AudioContext. No extra audio context, analyser, splitter or route is created. The adapter reuses a 1024-byte buffer, linearly resamples to the library's assumed 44.1 kHz and mirrors mono input to L/R. Butterchurn still computes three internal FFTs for its own preset semantics; SYNESTRA analysis remains unchanged. This is 8-bit mono visual input, not stereo separation.

The host supplies all scheduling, sizes, visibility and transitions. An adapter corrects stable Butterchurn's estimated-FPS clock so blends use elapsed seconds; some legacy equations and feedback remain frame-dependent. Exclusive GL allocation tracking reclaims abandoned resize/preset resources and deletes all resources on disposal. This integration is version-specific and needs regression testing before upgrading Butterchurn.

The ten presets come from the official butterchurn-presets 2.4.7 MIT distribution; full creator credits and local adaptations are listed in [the refinement report](docs/MILKDROP_REFINEMENT.md). Source JSON and hashes are retained; npm.cmd run presets:compile reproducibly creates static functions. There is no runtime eval, arbitrary preset import, remote texture loading or CSP relaxation. Creator names remain visible. [Compatibility investigation](docs/PHASE4_COMPATIBILITY.md) links upstream sources; notices are in public/licenses and included in built assets. The full presets package is not a dependency.

## Validation and next steps

```powershell
npm.cmd run type-check
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd run test:desktop
npm.cmd run test:visuals
npm.cmd run test:scenes
npm.cmd run test:rendering
npm.cmd run test:milkdrop
node scripts/milkdrop-collection-smoke.mjs
node scripts/milkdrop-performance.mjs
node scripts/milkdrop-curation.mjs --record
```

The Electron checks need an interactive desktop and a built app. They generate MP3s in isolated temporary profiles and stub picker results. test:rendering includes the complete scene suite plus Phase 3 lifecycle/quality/fullscreen/recovery checks. Existing art capture tooling is retained; older named Fused Bubbles captures are historical, not current visualizer evidence.

Current MilkDrop refinement: 56 tests, type-check, lint, build and the affected MilkDrop suite pass. All ten presets were rendered under quiet/bass/dense/silent fixtures and at actual 1080p/4K buffer sizes. [Current results and visual review](docs/MILKDROP_REFINEMENT.md).

Historical records: [Phase 4 validation and manual checklist](docs/PHASE4_VALIDATION.md), [implementation plan](docs/IMPLEMENTATION_PLAN.md), and [project status](PROJECT_STATUS.md). Phase 4 baseline: 32 tests and relevant checks passed. Final: 42 tests, type-check, lint, build, original Electron regressions and the MilkDrop suite pass. Real-library music, quiet/silence, mute, repeated seeks, transitions, engine switching, compact controls, fullscreen and recovery were exercised. Screenshots and a silent motion recording are under docs/milkdrop. Optional art capture needs a valid track in the local library and reads it without modification.

All ten current presets rendered genuine 3840 x 2160 buffers on the reported Radeon RX 6800 XT. Short 90-frame samples measured approximately 16.7 ms median / 16.8 ms p95 scheduling intervals, not GPU timings or sustained physical 4K/60 FPS. Long listening sessions, actual 4K displays, other GPUs and mixed-DPI monitors remain manual checks. Existing Vite bundle-size and lucide directive warnings remain. The historical Phase 4 audit reported zero production and eight moderate tooling advisories; an audit was not rerun for this dependency-unchanged refinement.

The old phase roadmap is historical and is not being resumed. The stopped Musical Intelligence implementation remains preserved. Named playlist management is absent from the baseline; the existing persistent library and queue are preserved.
