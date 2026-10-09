# Phase 4 validation - October 9, 2026

## Baseline and final checks

No applicable AGENTS.md or Git repository was found. Source preservation snapshot: C:/Users/Admin/AppData/Local/Temp/synestra-phase4-baseline-sQtzaP. Baseline type-check, lint, 32 tests, build and test:rendering (including original scenes) passed. No baseline code failure was observed. Existing Vite large-chunk and lucide use-client warnings remain.

| Check | Final result |
| --- | --- |
| npm.cmd run type-check | PASS |
| npm.cmd run lint | PASS |
| npm.cmd test | PASS, 42 tests (32 preserved + 10 new) |
| npm.cmd run build | PASS, production Electron/renderer assets |
| npm.cmd run test:desktop | PASS, native registry/range/playback regression |
| npm.cmd run test:visuals | PASS, analysis/volume regression |
| npm.cmd run test:rendering | PASS, includes full original scene suite and Phase 3 lifecycle checks |
| npm.cmd run test:milkdrop | PASS, full Phase 4 suite |
| npm.cmd run test:milkdrop-art -- --record | PASS, real-library artwork captures and silent video |
| npm audit --omit=dev | Zero advisories |

Full npm audit reports eight moderate tooling advisories in @electron/get, app-builder-lib, dmg-builder, electron-builder, electron-builder-squirrel-windows, global-agent, roarr and sprintf-js. Their versions match the preservation snapshot; they were not introduced by Butterchurn. No unrelated forced dependency upgrade was made.

Final MilkDrop isolated profile: C:/Users/Admin/AppData/Local/Temp/synestra-milkdrop-mB8OO8. Original regression profiles: synestra-desktop-llx7oX, synestra-phase2-MSp8P2 and synestra-scenes-12zN95 under the same temporary directory. User library/profile was not used for persistence writes. The real source MP3's SHA-256 remained unchanged.

## Milestone evidence

1. Compatibility: official stable source and licenses inspected before integration; [investigation](PHASE4_COMPATIBILITY.md).
2. Engine: actual Electron loaded the lazy stable UMD bundle and rendered all four static presets under the existing CSP. Instrumentation observed one AudioContext, one media source, one analyser and one output gain across modes. Null-context Butterchurn received borrowed pre-gain PCM without connecting audio.
3. Lifecycle: all presets and rapid preset changes retained 177 tracked live GL allocations; replaced canvases disconnected. Unit tests cover late async completion after disposal, partial allocation failure and idempotent cleanup. Electron checks cover context loss/retry, shader-link failure fallback, minimize/restore, fullscreen and playback continuity. Stable allocation counts are not a substitute for a long GPU-memory soak.
4. Controls: selection, wraparound previous/next, random excluding current, cycling, transition duration and validated persistence pass. Cycle/clock tests compare 30/60/144 Hz. Pause, silence and inactive/fallback states do not advance the cycle. Reduced motion and Motion zero show the measured waveform and restore MilkDrop when removed. Existing Pearl/Spectrum palettes/layouts remain functional.
5. Music and visuals: generated rhythmic/quiet/silent MP3 fixtures and Bartender (Instrumental).mp3 from the local library were exercised. Repeated seeks to 65, 12 and 110 seconds, track changes, pause, mute, volume, real-track seek to 40 seconds, settings and mode changes preserve playback. Muting leaves pre-gain RMS active; original analysis regression measured approximately 0.188 before and 0.1878 after mute. Real-track screenshots were inspected at 1280 x 820 and compact 780 x 600; compact Tune controls scroll. Preset curation was refined after viewing captures to remove dark/less suitable candidates.
6. Handoff: checks above pass; README, status and implementation plan updated. No later phase engine, release, push, publication or tag was created.

New unit coverage: preference validation; preset navigation/random; cycle eligibility/timing/reset; seconds-based blending across frame rates/motion; PCM frequency conversion at 44.1/48 kHz and centered silence; static preset function shape; resource reachability/deletion; asynchronous cancellation; reduced-motion allocation policy; shader failure/partial cleanup.

Development issues resolved before final checks: stable UMD double-default export normalization, generated-source encoding, and seek-test commit semantics. There are no unresolved introduced check failures. Build still reports the pre-existing large main bundle; Butterchurn is a separate lazy chunk (about 197 kB before compression).

## Performance measurements

Hardware reported by WebGL: ANGLE, AMD Radeon RX 6800 XT, Direct3D11 vs_5_0 ps_5_0. Each sample uses 90 RAF intervals after a 1.2-second settling period. All returned GL error zero.

| Preset | Quality / limit | Actual render buffer | Median / p95 interval |
| --- | --- | --- | --- |
| Galaxy | Economy / 720p | 1229 x 691 | 16.7 / 16.8 ms |
| Galaxy | Balanced / 1080p | 1686 x 948 | 16.7 / 16.8 ms |
| Galaxy | High / 1440p | 2560 x 1440 | 16.7 / 16.8 ms |
| Galaxy | High / 2160p | 3840 x 2160 | 16.7 / 16.8 ms |
| Aurora, Liquid, Crystal (each) | High / 2160p | 3840 x 2160 | 16.7 / 16.8 ms |

Raw data: [phase4-measurements.json](phase4-measurements.json). These are short scheduling samples, not GPU timer results or a sustained physical 4K/60 FPS claim. The actual desktop was 3440 x 1440; fullscreen measured 3438 x 1408. An oversized test host verifies genuine 3840 x 2160 GPU buffers. Pixel budgets and DPR caps still apply in ordinary embedded viewing. Multi-pass feedback uses several full-resolution textures and is more expensive than a single canvas buffer.

## Visual evidence

- [Aurora real track](milkdrop/aurora-real-track.png), [cosmic layers](milkdrop/galaxy-real-track.png), [liquid motion](milkdrop/liquid-real-track.png), [energetic geometry](milkdrop/crystal-real-track.png).
- [Compact controls](milkdrop/compact-controls.png), [fullscreen](phase4-fullscreen.png).
- [Silent motion recording](milkdrop/real-track-motion.webm), [decoded transition frame](milkdrop/motion-frame.png). Screenshots and a decoded recording frame were reviewed; this is not a claim of a complete audible listening session.

## Licensing and compatibility limits

[Butterchurn](https://github.com/jberg/butterchurn) 2.6.7 and [official preset distribution](https://github.com/jberg/butterchurn-presets/blob/master/LICENSE) 2.4.7 are MIT licensed. Full notices are in public/licenses and copied into dist/licenses. The four unchanged vendored JSON files retain creator names and SHA-256 hashes. Static compilation avoids eval and preserves script-src self. No arbitrary preset importer, remote texture loading or full preset-package dependency is introduced. Transitive babel-runtime and math-extensions attribution is included; the latter declares MIT but ships no license file, documented in its notice.

Pinned stable API limitations: WebGL2 required; no complete native dispose; FPS-estimated time; no borrowed-spectrum input. SYNESTRA adapts the existing mono PCM into a reused 1024-sample unsigned-byte buffer at 44.1 kHz using linear interpolation. Butterchurn performs three internal FFTs and relative-band analysis. No stereo separation is claimed. Listening gain does not affect this pre-gain signal. The adapter fixes transition/animation time, but legacy equations and feedback may still vary with frame rate. Its stable internals, UMD shape and Math/window helpers require revalidation on upgrades. Reduced motion deliberately selects the waveform fallback instead of promising arbitrary presets can be made motionless.

## Changed files and preservation

- New src/visuals/milkdrop/: engine, PCM bridge, clock, cycle controller, GL resource tracker, types, catalog, static generated presets and four vendored sources/hashes.
- Shared integration: analysis/service.ts (borrow existing PCM only); visuals/engine.ts, frame.ts, contracts.ts, registry.ts, session.ts, director.ts and preferences.ts.
- UI: MilkDropControls.tsx (new), App.tsx, SpectrumStage.tsx, VisualSettings.tsx and styles.css.
- Tooling: package.json/lock (pinned dependency and scripts), eslint.config.mjs (generated third-party code exclusion), compile-milkdrop-presets.mjs, phase4-smoke.mjs, milkdrop-art.mjs and tests/milkdrop.test.ts.
- Attribution/docs: public/licenses, README, PROJECT_STATUS, implementation plan, compatibility/validation reports, measurement JSON and visual captures. Existing regression screenshot artifacts were refreshed by their original scripts.

Snapshot comparison confirms src/player, electron, shared, original test sources, analysis processor, Pearl/Spectrum implementations and index.html unchanged. No named playlist feature existed to migrate; persistent library/queue behavior was tested. No files in Resolve were modified.

## Remaining manual listening checklist

1. Launch with npm.cmd run dev (or npm.cmd run build then npm.cmd start), import several real tracks and compare all four MilkDrop presets at quiet and energetic passages. Check comfortable brightness and blends; Aurora is the calmer default, not a no-flash guarantee.
2. Seek repeatedly, pause/resume, mute, adjust volume and switch Pearl/Spectrum/MilkDrop. Listen for uninterrupted audio and verify visual response remains active when muted. Enable cycling and relaunch: saved preferences should return without autoplay.
3. On a physical 4K display choose High / 2160p, enter fullscreen, inspect actual dimensions/timing in Signals, then test mixed-DPI moves and reduced motion. Lower quality if pacing degrades.
4. Play for at least an hour with cycling and occasional minimize/restore. Observe GPU memory, CPU, frame pacing, transitions and audible quality. Other GPU vendors and prolonged physical-4K performance remain unmeasured.
