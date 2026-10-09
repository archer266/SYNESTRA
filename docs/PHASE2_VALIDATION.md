# Phase 2 validation

Windows x64, Node.js 24.21.0, Electron 44.7.0, Vite 8.3.4, React 19.3.0, Three.js 0.186.1. October 8, 2026 (America/Los_Angeles).

## Automated results
- `npm.cmd run dev`: confirmed the native SYNESTRA Electron window and HTTP 200 from Vite.
- `npm.cmd run type-check`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd test`: **14 passed, 0 failed**. The original six tests are preserved.
- `npm.cmd run build`: passed.
- `npm.cmd run test:desktop`: passed against the Phase 2 renderer; imports/cancel, security settings, MP3 playback, repeated long seeks with progress, queue/repeat, errors, resize, persistence and no autoplay.
- `npm.cmd run test:visuals`: passed. Real Electron audio feeds the real analyser and Three.js world.
- `npm.cmd run package`: passed; generated release/SYNESTRA-0.2.0.exe (102,237,093 bytes, unsigned).
- Both desktop suites also passed against release/win-unpacked/SYNESTRA.exe. Packaged RMS before/after mute: **0.1879 / 0.1879**.
- `npm.cmd audit --omit=dev`: 0 vulnerabilities.

Analysis fixtures use actual synthetic PCM and a Blackman-windowed radix-2 FFT: silence/non-finite values, sub-gate levels, 80 Hz / 1 kHz / 8 kHz tones at both 44.1 and 48 kHz, sustained spectra, separated rhythmic bursts, RMS-matched sparse and broad signals, boundedness, pause decay, reused arrays and frame-rate-independent smoothing. Service tests exercise seeking/seeked/emptied/loadstart/playing resets and listener disposal. Progression tests verify continuous bounds, growth/recession and stage hysteresis.

The visual suite encodes generated steady and broad rhythmic MP3s. Steady RMS before/after output mute measured **0.1881 / 0.1879** in the source-build run (small variation is expected from the sampled waveform window). It checks:
- Measured coverage/activity and real playback while changing layouts, sensitivity, richness and smoothing.
- Repeated layout switches keep the same canvas; object counts are statically bounded by instancing.
- Effective 1.5× device pixel ratio via Electron zoom plus resize, and compact 780×600 window controls.
- OS reduced-motion emulation and pause decay.
- Actual WEBGL_lose_context event → 2D waveform fallback, with continuing media time.
- Forced getContext WebGL initialization failure → waveform fallback, with continuing playback.
- No renderer JavaScript exceptions in the exercised main session.

Native picker return values are stubbed; the Windows picker itself remains a manual check. No user music files are modified. This is not an acoustic measurement of speakers or an exhaustive GPU/performance certification.

## Visual evidence
- [Linear layout](phase2-linear.png)
- [Radial layout](phase2-radial.png)
- [Compact window with tuning](phase2-compact.png)
- [GPU fallback with diagnostics](phase2-fallback.png)

Screenshots were inspected after allowing resized GPU frames to render. Layout controls and transport remain visible. The compact diagnostic panel scrolls rather than pushing the transport out of view.

## Listening / viewing checklist
1. Import personal MP3s and listen in both Linear and Radial. Compare bass-heavy, bright, sparse and dense passages; confirm bars and traces follow the music.
2. Open Signals, lower Volume to zero and restore it. RMS/activity should continue following the track independently of output level.
3. Change Sensitivity, Visual richness and Smoothing during playback. Check uninterrupted sound and gradual Quiet → Groove → Lift → Peak composition changes on suitable music.
4. Repeatedly seek, pause/resume, switch tracks and let a queue finish. Check that visuals settle and transition artifacts do not trigger bursts.
5. Resize, collapse the queue, use keyboard controls, and enable Windows reduced motion. Test moving between physical monitors with different scaling.
6. Listen for a longer session on the intended GPU/audio hardware; verify responsiveness and subjective visual comfort across genres.
7. Relaunch: references should remain and playback must stay stopped.

## Known validation limits
Tests establish signal behavior and lifecycle correctness on this host, not universal musical interpretation. Human listening, the real file picker, broad genre tuning, additional physical GPUs/mixed-DPI monitors and long-session resource/performance checks remain pending. Packaging remains unsigned. Existing development-tool audit advisories and the documented Vite bundle/directive warnings remain.
