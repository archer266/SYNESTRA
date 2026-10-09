# Phase 4 compatibility and milestones

Baseline October 9, 2026: no applicable AGENTS.md, no Git repository. Snapshot: C:/Users/Admin/AppData/Local/Temp/synestra-phase4-baseline-sQtzaP. Type-check, lint, 32 tests, build and the full Phase 3 Electron rendering/scene suite passed. Existing bundle/directive warnings remain.

## Confirmed upstream findings before implementation

- npm latest: butterchurn 2.6.7; beta: 3.0.0-beta.5. Presets latest: 2.4.7; beta: 3.0.0-beta.4. Pin stable versions; do not silently mix the beta API with stable code.
- Official README documents WebGL 2, createVisualizer, connectAudio, loadPreset(preset, blendSeconds), setRendererSize and externally scheduled render. Stable package source also accepts null audio context plus render({audioLevels:{timeByteArray,timeByteArrayL,timeByteArrayR},elapsedTime}). This avoids three extra analysers/delay/splitter and any audio connection. Butterchurn still computes its own 1024-sample FFTs and relative bands; those do not replace SYNESTRA's features.
- With null context Butterchurn assumes 44100 Hz. Adapt the existing contiguous pre-gain PCM to 1024 unsigned samples at 44100 Hz; mirror the existing mono analyser input to L/R. Stereo-separated visuals are a limitation, not fabricated stereo analysis.
- Stable renderer does not expose comprehensive dispose. Its resizing/preset shader replacement can abandon GL resources. The adapter must track its exclusive context's allocations, reclaim unreferenced resources after blends/resizes, delete all owned resources on disposal, and release the context. It must not touch another renderer/context.
- Stable timing uses an estimated FPS for its internal clock. Pin an adapter for this version to drive elapsed time/blend progress from the shared scheduler. Individual legacy preset equations/feedback are still partly frame-based; do not claim full deterministic equivalence across FPS.
- Preserve script-src 'self': precompile only four reviewed preset equation strings into static functions at development time. No runtime eval, arbitrary preset import, remote textures or broader CSP. Include upstream MIT notices and preset creator names. Preset distribution license is MIT per official package, not an inferred license for arbitrary third-party presets.
- Reduced motion uses the existing measured waveform fallback because arbitrary MilkDrop feedback cannot reliably remove motion. Restore the selected engine when reduced motion is removed, without autoplay or audio rerouting.
- 4K feedback uses several full-resolution textures and extra passes. Explicit quality limits apply; 4K60 remains a hardware target.

Sources checked: https://github.com/jberg/butterchurn , https://github.com/jberg/butterchurn-presets , package registry metadata and pinned package source/LICENSE. Current upstream master is beta and differs from the installed stable API.

## Reviewable milestones

1. Compatibility/baseline/licensing: complete (above).
2. Engine/audio adapter: register MilkDrop; borrowed contiguous PCM; no graph changes; static curated presets and strict CSP.
3. Lifecycle: shared scheduler/quality/fullscreen/visibility; bounded resources; context-loss fallback/retry and reduced-motion handling.
4. Controls: preset selector, previous/next/random, opt-in cycling/interval, seconds-based transitions, validated persisted selection/cycling; unchanged Pearl/Spectrum controls.
5. Validation: synthetic adapter/controller tests plus Electron music/seek/mute/track/switch/pause/silence/hidden/fullscreen/recovery checks, representative frame timings and genuine 4K buffer where supported.
6. Handoff: type/lint/tests/build, original regressions, README/status/roadmap/PHASE4_VALIDATION and manual listening limits. Stop at Phase 4; no release/publish/push.

## Completion
All six milestones are complete. See [PHASE4_VALIDATION.md](PHASE4_VALIDATION.md) for actual checks, resource/performance measurements and limitations. Only butterchurn 2.6.7 remains installed; four preset JSON sources from 2.4.7 are vendored with hashes and statically compiled. The full presets package is not shipped. Stable UMD export normalization and Math/window helper dependencies are covered by Electron regression checks.
