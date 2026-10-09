# Phase 3 validation

Validated October 9, 2026 on Windows x64 with the repository's locked Electron 44.7 / React 19 / Vite 8 / Three 0.186 stack and Node 24.21.0. Generated MP3 fixtures and isolated profiles preserved the user's music/library.

## Baseline versus final

| Check | Before edits | Final |
| --- | --- | --- |
| npm.cmd run type-check | PASS | PASS |
| npm.cmd run lint | PASS | PASS |
| npm.cmd test | 21 passed | 32 passed |
| npm.cmd run build | PASS | PASS |
| npm.cmd run test:desktop | PASS | PASS |
| npm.cmd run test:visuals | PASS | PASS |
| Scene regression suite | PASS (test:scenes) | PASS (complete suite also executed by test:rendering) |
| npm.cmd run test:rendering | New | PASS |

No baseline code failures. Pre-existing issues: stale README/status describing Fused Bubbles (corrected), Vite >500 kB bundle warning and lucide 'use client' directives (remain). No unresolved introduced check failures.

Resolved during development: first fullscreen check failed because existing permissions denied fullscreen; added exact-document/main-frame-only permission and negative tests. The native minimized window reported document.visibilityState='visible'; added a typed native visibility subscription, confirmed zero animation callbacks while minimized and continuing audio. Initial TypeScript integration errors (readonly frame assignment and Electron overload/context typing) were fixed before the final build. A transient test against an old build was not counted as final evidence; the final rendering suite ran after a successful production build.

## Evidence

- New tests cover registry validation/capabilities; borrowed frame identity/timing/playback; active/inactive lifecycle; switching order; partial initialization and render failure; stale GPU callbacks; explicit retry; cleanup exceptions; unavailable GPU and Canvas fallback; idempotent disposal; single pending RAF including handle zero; stop/resume without hidden elapsed time; disposal inside a callback; quality/DPR/aspect/resolution bounds and validated preferences; fullscreen permission denial for other permissions/frames/documents.
- Original synthetic analysis tests remain: silence/subgate, frequency mapping at 44.1/48 kHz, low/high tones, sustained/percussive fixtures, sparse/broad RMS matching, finite bounded signals, pause decay and reset behavior. Existing Pearl motion/progression/queue/media-range tests remain.
- Actual Electron desktop: cancel/import with picker results stubbed; four repeated long-track seeks; pause/keyboard focus; volume; shuffle; repeat one/all/off and natural completion; previous/next; damaged-file recovery; resize; queue; stable library persistence and no autoplay. Sandboxing/context isolation and disabled renderer Node integration verified.
- Audio analysis regression: signal/coverage, layouts/tuning with uninterrupted audio, reduced motion, pause decay, GPU creation/context-loss fallback. RMS before/after mute: **0.1882 / 0.1880**, confirming pre-volume analysis within signal variation.
- Scene/rendering suite: repeated Pearl/Spectrum switching preserves exactly one source/analyser/gain, playback position, queue and volume; all settings preserve playback; palettes verified using rendered pixel color; both Spectrum layouts, compact non-overlap, shader-failure fallback, saved preferences without autoplay.
- Phase 3 additions: High quality and explicit resolution limits, fullscreen entry/exit with one canvas, native minimize/restore with zero animation callbacks while hidden and advancing audio, same-engine context-loss retry, diagnostics, saved 1080p limit. A real WebGL canvas allocated and rendered **3840 x 2160** in an oversized host while audio remained intact.

Final profiles: desktop `C:/Users/Admin/AppData/Local/Temp/synestra-desktop-FHgxfd`, analysis `C:/Users/Admin/AppData/Local/Temp/synestra-phase2-QSp6Tm`, rendering `C:/Users/Admin/AppData/Local/Temp/synestra-scenes-sMNHWR`. Profiles/MP3 fixtures remain for inspection.

## Rendering observations, not a benchmark

Native desktop screenshot: 3440 x 1440. Fullscreen canvas: **3438 x 1408**, DPR 1. Oversized host test: **3840 x 2160** actual WebGL buffer; not a physical 4K monitor test. Short-run windowed diagnostic observed **16.8 ms / 59.6 FPS**, a scheduling sample rather than sustained GPU performance. No GPU timer, hardware-model certification, long-run percentile or 4K60 guarantee is claimed.

High-DPI scene test after resolution/preferences changes: Balanced 663,552 pixels; Economy 294,624 pixels, both below budgets. Pure sizing tests cover native 4K, larger/high-DPI inputs and all resolution caps. Buffers never exceed the active dimension/pixel/DPR limits.

Reviewed full application [diagnostics screenshot](phase3-diagnostics.png), [fullscreen screenshot](phase3-fullscreen.png), and compact/scene captures produced by the regression suite. Existing Pearl composition and Spectrum controls are retained. The diagnostics panel scrolls independently; controls remain outside the canvas. Earlier phase2.5 filenames are retained by the original screenshot harness and are not evidence that Fused Bubbles is still implemented.

## Files changed

- New architecture: src/visuals/engine.ts, registry.ts, adapter.ts, frame.ts, session.ts, scheduler.ts, sizing.ts.
- Integration: src/visuals/director.ts, contracts.ts, preferences.ts, palettes.ts, pearl.ts, spectrum.ts, fallback.ts; src/analysis/service.ts (read-only spectrum access only).
- UI: src/ui/App.tsx, SpectrumStage.tsx, VisualSettings.tsx, styles.css.
- Desktop visibility/fullscreen: electron/main.ts, preload.ts, permissions.ts; shared/contracts.ts.
- Validation: tests/rendering.test.ts, permissions.test.ts; scripts/phase25-smoke.mjs; package.json test:rendering script.
- Documentation: README.md, PROJECT_STATUS.md, IMPLEMENTATION_PLAN.md and this report; generated build output/screenshots.

Comparison with the pre-change snapshot confirms player/audioGraph, feature processing, Pearl shader/motion, progression, native library/media streaming and existing unit tests are unchanged. Dependency versions/lockfile are unchanged. No unrelated project was modified.

## Short manual listening / viewing checklist

1. Launch with npm.cmd run dev, import several real MP3s and exercise play/pause, repeated long-track seeks, queue selection, shuffle/repeat and completion. Verify mute changes hearing but not visual strength.
2. Switch Pearl and Spectrum/Linear/Radial during playback; change palette, motion, sensitivity, smoothing, richness and quality. Confirm audio/position/queue remain intact.
3. Open Signals, try High + 2160p, enter fullscreen, exit with Escape, minimize/restore and move across mixed-DPI monitors. Confirm buffer dimensions and observe pacing on the target hardware.
4. Listen to quiet/sparse and energetic/broad tracks; pause and resume. Check smooth settling, reduced-motion behavior and fallback/retry on target GPUs.
5. Run an extended 4K session while measuring GPU/CPU/memory and frame pacing. Relaunch and verify visual preferences return without autoplay.

Named playlist management is absent in the baseline and was not implemented as part of this phase. Native picker interaction and subjective listening remain manual; automated tests substitute picker results and use generated music. Existing packaged executables were not rebuilt or published.
