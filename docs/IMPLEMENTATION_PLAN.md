# SYNESTRA implementation plan - corrected roadmap

## Confirmed baseline (before Phase 3)
Inspected ancestor/repository instruction locations: no applicable AGENTS.md found. No Git repository is present. Existing source was preserved at C:/Users/Admin/AppData/Local/Temp/synestra-phase3-baseline-TB3ZsS before editing.

The repository is Electron/React/TypeScript/Vite with Three.js, version 0.2.6. Pearl already replaces Fused Bubbles; Spectrum Linear/Radial remain. Existing code owns one persistent media element, one pre-volume Web Audio analyser graph, a passive AnalysisService, reused MusicFeatures arrays, shared progression and a SceneDirector RAF. Worlds currently own their own renderers and duplicate resolution policy. Existing contracts lack activation/capabilities/registry; diagnostics lack actual render size/timing. Library references and a play queue exist; named playlist management does not. No Butterchurn, musical intelligence model, album art extraction or preset editor is implemented.

Baseline: type-check, lint, 21 tests, production build, test:desktop, test:visuals and test:scenes all PASS. No baseline code failures observed. README/PROJECT_STATUS incorrectly describe retired Fused Bubbles and version 0.2.5; this is a pre-existing documentation discrepancy. Vite large-bundle and lucide client-directive warnings are pre-existing.

## Phase 3 milestones (completed history)
1. Baseline/preservation - complete. Acceptance: source snapshot and separate baseline results.
2. Contracts and registry. Define engine capabilities and initialize/configure/resize/activate/render/deactivate/dispose. Borrow a consistent frame with features, log spectrum, waveform, timing and actual playback state; future intelligence remains unavailable/null. Add pure resolution policy. Acceptance: registry validation, sizing and frame semantics tests; type-check.
3. Lifecycle and migration (depends on 2). Central engine session, one scheduler, bounded elapsed time, visibility suspension, activation, deterministic disposal, context-loss fallback and explicit GPU retry. Adapt Pearl/Spectrum/fallback behind the engine contract; engines retain isolated renderer resources and receive centrally resolved dimensions. Preserve audio ownership. Acceptance: fake-engine lifecycle/failure/cleanup tests, deterministic RAF tests and existing desktop suites.
4. Quality, fullscreen and diagnostics (depends on 3). Economy/Balanced/High quality, independent render-resolution limits through 3840x2160, real buffer dimensions/DPR, RAF timing/FPS, CPU submission time, active engine/capabilities and fallback reason. Stage fullscreen with Escape and resize handling; no autoplay. Acceptance: UI persistence, full-screen entry/exit, high-DPI/budget checks, hidden/resume and retry during playback.
5. Validation/handoff (depends on 2-4). Run type-check, lint, all tests/build, original Electron suites and a focused architecture suite. Update README/PROJECT_STATUS and record measured outcomes separately from targets. No push, publishing or later-phase engines.

## Module boundaries
- player/audioGraph: sole audio element/context/routing owner; unchanged.
- analysis: passive pre-gain feature processing; no renderer or extra clock.
- visuals/engine: renderer-neutral borrowed-frame and capability contract.
- visuals/registry + adapters: discoverable engines, isolated graphics ownership; no library-specific renderer type in the shared contract.
- visuals/session: switching/activation/disposal/failure containment.
- visuals/scheduler + sizing: sole RAF/clock and centralized bounded canvas policy.
- visuals/director: integration with player, analysis, progression, browser visibility/fullscreen/DPR and scalar diagnostics.
- ui: declarative configuration, stage controls and low-rate diagnostics. No frame arrays in React state.
- desktop services: native files/registry/streaming/persistence untouched. Narrow native-window visibility notifications and trusted main-frame fullscreen permission support the host lifecycle.

## Corrected dependency-aware roadmap (Phases 3-4 complete; 5-9 proposed)
| Phase | Depends on | Proposed milestone and acceptance |
| --- | --- | --- |
| 3 Shared Rendering Architecture | existing player/analysis | Complete: tested lifecycle and adapters, measured diagnostics, safe engine switching. |
| 4 MilkDrop / Butterchurn | 3 | Complete: pinned stable API/license investigation, isolated adapter and curated static presets. Validated with no duplicate audio route/context, switch/cleanup tests, capability/fallback behavior and measured GPU cost. |
| 5 Musical Intelligence | 3; evaluate against 4 | Build validated tempo/section/confidence features over the shared signal. Accept synthetic/real-fixture accuracy and confidence/unknown states; no fabricated BPM. |
| 6 Cinematic Shaders | 3 + 5; optional 4 presets | Bounded custom shader engine using validated feature contracts. Accept resource budgets, reset/reduced-motion behavior and measured resolution tiers. |
| 7 Album Art Integration | 3 + 6 | Desktop metadata/art acquisition, bounded textures and art-derived color inputs. Accept absent/corrupt art, caching/lifetime and privacy/file-access tests. |
| 8 Living Pearl | 3 + 5 + 6; optional 7 | Evolve existing Pearl using musical intelligence and cinematic/art inputs. Accept graceful motion, listening evaluation and measured performance; current Pearl is only the baseline scene. |
| 9 Visual Preset Studio | 3 + 4 + 6 + 7 + 8 | Versioned preset schemas/editor, capability-aware controls, preview and migration. Accept safe validation/import, deterministic persistence, undo/recovery and compatibility tests. |

## Performance targets and risks
Target embedded 60 FPS with bounded pixel tiers; target 3840x2160 at 60 FPS (16.67 ms frame budget) only on measured suitable hardware. High resolution is opt-in, not automatic. Diagnostics distinguish RAF frame intervals from CPU render submission; neither is a GPU timer nor a physical-display certification. Record dimensions and hardware context for any measurement.

Risks: context creation/driver failures, asynchronous stale callbacks after switching, hidden-window RAF suspension, different future engine ownership assumptions, high-DPI pixel explosions, 4K GPU fill cost and noisy short-run timing. Mitigate with generation-scoped failures, one cancellable scheduler, activation gates, explicit sizing limits, fallback/retry, pure tests and real Electron regression checks. Butterchurn stable compatibility is now implemented with a pinned adapter; upgrades require renewed API, clock, CSP and resource-lifetime validation.

Manual acceptance still required for actual 4K fullscreen on the target display, sustained frame pacing/memory on multiple GPUs, audible quality and mixed-DPI transitions. Preserve existing player semantics and explicitly report absent named playlists rather than inventing them.

## Milestone outcomes
All five milestones are complete. Baseline passed 21 tests; final passed 32. Contract/session/scheduler tests, production build and actual Electron playback/rendering checks pass. See PHASE3_VALIDATION.md for evidence, resolved development failures and remaining hardware/manual acceptance.

## Phase 4 completed milestones

The Phase 4 entry baseline was 32 passing tests with type-check, lint, build and Phase 3 Electron regressions passing. A separate preservation snapshot was taken before edits. Official stable-source/API and MIT investigation preceded implementation; see PHASE4_COMPATIBILITY.md.

1. Compatibility (complete): pin 2.6.7; establish null-context audioLevels support, internal FFT requirement, mono/44.1 kHz conversion, stable clock/disposal limitations and MIT preset distribution.
2. Adapter (depends on 1, complete): MilkDrop registration, raw PCM borrowed frame, reused input buffer, static vetted presets and unchanged strict CSP. Acceptance: no new audio context/node/route, PCM tests and actual Electron load.
3. Lifecycle (depends on 2, complete): host-only scheduling/sizing, async cancellation, exclusive GL tracking, visibility, fallback/retry, reduced-motion policy. Acceptance: bounded allocations, disposal tests and switching/context-loss/shader-failure checks.
4. Controls (depends on 2-3, complete): preset selection/navigation/random, opt-in active-time cycling, elapsed-time transitions, persistence and existing independent tuning. Acceptance: frame-rate/cycle tests, restored preferences without autoplay and playback continuity.
5. Performance/art (depends on 3-4, complete within available hardware): all four presets at actual 4K buffer, lower quality measurements, real-track/compact/fullscreen screenshots and silent recording. Acceptance: record actual dimensions/hardware/timing, avoid unmeasured sustained physical-display claims.
6. Regression/handoff (complete): 42 tests, type-check/lint/build and all Electron suites pass. PHASE4_VALIDATION.md records changed files, licensing, measurements and manual limits. No later phases implemented.

Phase 5 is next: add validated musical intelligence through the existing null extension point with explicit confidence and unknown states. Preserve the Phase 4 audio ownership, preset adapter and performance baselines while evaluating later feature work.
