# SYNESTRA - Project status

## Current direction: Classic Lightflow

October 9, 2026: focus is visual quality, not completing the old roadmap. Added one Classic light-trail world through the existing WorldAdapter and engine registry, with bounded geometry/particles, smoothed pre-gain audio response, current tuning/fullscreen/quality/recovery support. Pearl, Spectrum and MilkDrop remain. Player, desktop services and the saved analysis implementation are untouched by this change. New users default to Classic; valid existing preferences remain.

The previously stopped Phase 5 work is preserved. Its documentation below is historical and should not be read as the current implementation state. Source snapshot before Classic: C:/Users/Admin/AppData/Local/Temp/synestra-classic-baseline-MTd6b6. No dependencies, publishing or release changes.

Validation: type-check, lint, 52 tests and production build passed. Real MP3 desktop/compact captures were reviewed and the first faint-trail version was refined with broader glow and light sources. Final GPU/player checks are recorded in docs/classic/VALIDATION.md.

## Historical Phase 4 handoff

**Phase 4 - MilkDrop / Butterchurn: complete.** October 9, 2026. Version remains 0.2.6. No package, release, push, tag or publication was made. Work is confined to Synestra; Resolve was not modified.

## Baseline and preservation

No applicable AGENTS.md or Git repository was found. Pre-change snapshot: C:/Users/Admin/AppData/Local/Temp/synestra-phase4-baseline-sQtzaP. Type-check, lint, 32 tests, build and the complete Phase 3 rendering/scene suite passed before edits. Existing bundle/directive warnings were recorded separately. Phase 3 history remains in [PHASE3_VALIDATION.md](docs/PHASE3_VALIDATION.md).

Hash comparison confirms player, Electron, shared desktop contracts, original tests, analysis processor, Pearl/Spectrum implementations and index.html CSP are unchanged. Existing regression scripts refresh their screenshot artifacts. Audio still owns one persistent element and one source -> analyser -> gain -> destination graph. Native import, opaque registry, byte-range streaming, transport and atomic library references are preserved. Named playlist management is absent from the baseline.

## Milestones

1. Compatibility/licensing - PASS. Stable Butterchurn 2.6.7 API and MIT licenses inspected before implementation; version-specific limitations documented in [PHASE4_COMPATIBILITY.md](docs/PHASE4_COMPATIBILITY.md).
2. Engine/audio - PASS. Registry-selectable MilkDrop, lazy WebGL2 adapter, borrowed contiguous pre-gain PCM, zero new audio nodes/contexts, four statically compiled MIT presets with attribution.
3. Lifecycle - PASS. Shared scheduler, dimensions/quality, visibility/fullscreen, explicit recovery and deterministic cleanup. Allocation tracking remains bounded across repeated switches. Reduced motion and Motion zero use the measured waveform fallback and restore the selected engine afterward.
4. Controls - PASS. Preset selector, previous/next/random, opt-in cycling and interval, seconds-based blend duration, validated persistence, palette/motion/quality and existing tuning. Switching preserves playback and analysis.
5. Validation - PASS. Real-library MP3 and synthetic tracks, mute/pre-gain response, pause, silence, repeated seeking, modes/settings, minimize/restore, fullscreen, context loss/retry and forced shader failure. Actual 4K buffers for all four presets. Real-track screenshots and silent motion recording reviewed through captures/decoded frame.
6. Handoff - PASS. Type-check, lint, 42 tests, production build, desktop/analysis/rendering regression suites, MilkDrop suite and optional art capture. Documentation records measured results separately from hardware targets.

## Architecture

The Phase 3 engine/session/scheduler/sizing/director boundaries remain. AnalysisService exposes its existing contiguous PCM buffer through VisualFrame; no additional analyser read or graph is introduced. visuals/milkdrop owns the pinned library adapter, PCM conversion, clock, curated presets and exclusive GL resource tracker. The director owns an elapsed-time preset cycle controller; UI receives only configuration changes and low-rate diagnostics. No per-frame arrays enter React state. The library is loaded only when needed. Static preset compilation preserves the strict CSP.

## Roadmap

| Phase | Status | Dependency |
| --- | --- | --- |
| 3 Shared Rendering Architecture | Complete | Existing player/analysis |
| 4 MilkDrop / Butterchurn | Complete | 3 |
| 5 Musical Intelligence | Next, not implemented | 3; evaluate with 4 |
| 6 Cinematic Shaders | Planned | 3 + 5 |
| 7 Album Art Integration | Planned | 3 + 6 |
| 8 Living Pearl | Planned | 3 + 5 + 6; optional 7 |
| 9 Visual Preset Studio | Planned | 3 + 4 + 6 + 7 + 8 |

## Limits and readiness

Ready for Phase 5 planning on the shared signal contract; intelligence remains null and no BPM/beat-grid/instrument claims are invented. Butterchurn internally computes FFTs from 8-bit resampled mono PCM; no external-spectrum path exists in the pinned stable API. Legacy feedback/equations are partly frame-dependent even though transition timing is corrected. Multi-pass 4K feedback can be expensive. Stable API internals, helper functions and GL cleanup must be revalidated on upgrades.

All presets produced genuine 3840 x 2160 buffers on the reported RX 6800 XT; short scheduling samples were about 16.7 ms median / 16.8 ms p95. This is not sustained physical-4K certification. Long-session memory/pacing, audible listening, other GPUs and mixed-DPI displays remain manual. Reduced motion deliberately uses fallback. Existing release artifacts are old. Production audit has zero advisories; eight moderate tooling advisories predate this change. See [PHASE4_VALIDATION.md](docs/PHASE4_VALIDATION.md) for evidence and remaining checks.
