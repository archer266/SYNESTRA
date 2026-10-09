# Classic Lightflow - October 9, 2026

One focused classic-iTunes-inspired composition added through the existing Phase 3 WorldAdapter. No new dependencies or architecture layer. Fixed budget: five ribbon meshes, five soft light sprites, up to 1,200 particles (400 drawn in Economy), one atmospheric plane. Reused buffers, owned resource disposal and existing scheduler/sizing/fallback. No audio graph or analysis changes.

Visual review used Bartender (Instrumental).mp3 from the existing local library in an isolated profile. Full app captures at 1280 x 820 and compact 780 x 600 were inspected. The initial faint version was refined with wider glow, brighter leading lights and more visible sparks. [Desktop](frame-2.png), [compact](compact-controls.png), [fullscreen](fullscreen.png), [silent recording](real-track-motion.webm). This is visual/integration evidence, not a human listening-quality certification.

Passed: type-check, lint, 52 tests, production build, actual Classic real-track playback, switching to Pearl/Spectrum/MilkDrop and back, pre-gain response while muted, seeking, fullscreen, 3840 x 2160 buffer allocation, GPU loss/fallback/retry, reduced motion, compact layout and pause. Existing large-bundle/lucide build warnings remain. Test harness panel-state and decimal-input errors were corrected before the final successful run.

Performance: RX 6800 XT through ANGLE/D3D11, 180 frame intervals at 3840 x 2160, median 16.7 ms / p95 16.8 ms, GL error zero. [Raw result](performance.json). These are short RAF scheduling measurements, not GPU timer queries, sustained physical-display certification or a guarantee on other GPUs.

Changed: src/visuals/classic.ts; registry/config/preferences; stage title and Tune copy; default-mode assertion in tests/pearl.test.ts; scripts/classic-review.mjs; README/status and these captures. Player and analysis hashes match the pre-Classic snapshot. Saved Phase 5 work is preserved and its interrupted handoff is not declared complete. The old roadmap is no longer the active plan.

Reproduce visual checks: build, then node scripts/classic-review.mjs --check. Optional --record captures silent video. This review command requires at least one accessible MP3 in the existing library; it uses a separate temporary application profile.

Manual: compare quiet and energetic tracks; adjust motion/richness/palette; try High / 2160p fullscreen on the intended display; run a prolonged session and lower quality if pacing degrades. Existing saved visual modes are respected: select Classic - Lightflow in the header to see the new scene. Fresh installs default to Classic.

Final player regression: npm.cmd run test:desktop PASS, including native import/cancel, sandbox/isolation, long-track seeking, keyboard focus, shuffle/repeat/completion, damaged-file recovery, library persistence and no autoplay. Isolated profile: synestra-desktop-a3E0FQ.
