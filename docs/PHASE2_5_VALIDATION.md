# Phase 2.5 validation

Validated October 9, 2026 on Windows x64. Version 0.2.5.
The test fixtures are generated MP3s; isolated temporary profiles keep the user's library untouched.

## Automated checks
- `npm.cmd run type-check`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd test`: 20/20 passed, preserving all Phase 1/2 tests.
- `npm.cmd run build`: passed.
- `npm.cmd run test:desktop`: passed in actual Electron. Native picker results are stubbed, not playback. Covers cancel/import, security settings, four repeated seeks in a ten-minute track, play/pause, keyboard focus, volume, shuffle, repeat off/all/one, completion, previous/next, damaged-file recovery, resize, queue persistence, unchanged source bytes and no autoplay.
- `npm.cmd run test:visuals`: passed. Covers measured RMS/coverage/activity, both original Spectrum layouts, tuning without audio interruption, canvas reuse, pause decay, high DPI, reduced motion, live context loss and forced WebGL initialization failure. Steady-fixture RMS before/after output mute: **0.1878 / 0.1883** (normal sampling variation).
- `npm.cmd run test:scenes`: passed. Covers repeated Fused Bubbles/Spectrum switches, unchanged audio source/analyser/gain counts (one each), advancing playback position, retained queue/volume, tuning during playback, palette pixel differences in both worlds, settings/canvas reuse, quality pixel budgets, compact non-overlap, reduced motion, Fused Bubbles context loss/recovery, forced shader-link failure in both worlds, validated preference restoration and no autoplay. No unexpected JS or shader errors.
- At the tested high-DPI stage size, Balanced allocated **663,552 pixels**, Economy **294,624 pixels**, within the 1,600,000 / 850,000 caps.
- Unit checks include fixed-step consistency at 60/120/144 Hz, finite/bounded masses during repeated attacks and long suspension gaps, one impulse per attack, transition settling, support droplet recession, motion-zero/OS-reduced-motion behavior, malformed preference rejection and high-DPI pixel caps.
- `npm.cmd audit --omit=dev`: zero advisories. Full audit reports eight moderate advisories in the existing electron-builder development/packaging chain; no high/critical advisories.

The scene fixture is rhythmically modulated. Its readiness check uses the sustained RMS floor rather than requiring a transient peak to coincide with the 4 Hz diagnostic sample.

## Build and desktop artifacts
- `npm.cmd run package`: passed. Portable executable: **release/SYNESTRA-0.2.5.exe**, 105,555,462 bytes.
- SHA-256: `90C0D6E94B38D46E527DBBEE05227CA21B7FE45A1FB725F96DF51CF81135E0B2`.
- All three desktop suites also passed against **release/win-unpacked/SYNESTRA.exe**, the application packaged inside the portable launcher.
- Packaged steady-fixture RMS before/after mute on the refined build: **0.1802 / 0.1879** (within the fixture tolerance; first sample can include startup settling).
- Packaged scene suite confirmed both-world palette pixel changes, forced shader-failure fallback, one persistent audio graph, settings restoration and no autoplay.
- Source and packaged screenshots were visually inspected at full and compact sizes.
- `npm.cmd run dev` launched a running Electron window titled SYNESTRA; the local Vite endpoint returned HTTP 200. The window was left open for the user.
- Portable launcher extraction/SmartScreen interaction and subjective listening remain manual checks; the actual packaged application was automated directly.

## Focused artwork refinement
The final Fused Bubbles treatment uses a stylized 2.5D SDF union, broad color lenses, soft internal light, delicate rims and antialiased rounded contours. Ray-march thickness artifacts and small specular hot spots were removed. Main impulses, strain and support droplets are restrained; a two-pass cohesion constraint keeps primary joins intact at maximum sensitivity and repeated attacks. The stage now blends into the surrounding plum background.

All three desktop regression suites and the artwork capture script passed against the refined packaged application. Type-check, lint, production build and Windows packaging passed.

The added 30-second simulated peak-stress test verifies that all primary joins remain intact, lobe displacement stays below 0.33 scene units and strain stays within 0.935-1.065. All 20 tests pass.

Full-window 1440 x 900 captures: [quiet](art-review/quiet.png), [flow](art-review/flow.png), [lift](art-review/lift.png), [peak](art-review/peak.png), [pause recovery](art-review/settled.png), [preserved Spectrum](art-review/spectrum.png). A [roughly 24-second motion recording](art-review/fused-bubbles-motion.webm) shows the actual Electron window responding to a generated MP3; it is a silent screen recording, not a soundtrack export. Timed frames decoded from the recording were inspected for shape consistency and restrained motion. Human preference and long-session comfort still merit listening/viewing on the target setup.

Reproduce with npm.cmd run test:art. Optional video recording requires npx.cmd playwright install ffmpeg, then npm.cmd run test:art -- --record.

## Visual inspection
Inspected actual Electron screenshots at full and compact sizes:
- [Fused Bubbles](phase2.5-fused.png)
- [Ember palette](phase2.5-fused-ember.png)
- [Original Spectrum Linear](phase2.5-spectrum-linear.png)
- [Original Spectrum Radial](phase2.5-spectrum-radial.png)
- [Compact layout with Tune](phase2.5-compact.png)

The stage, header, side panel and transport have separate bounds. The selected logo is bundled unchanged for small branding. The larger fluid sculpture is procedural and remains in the Fused Bubbles aesthetic.

## Known limitations
The fluid/glass rendering is a bounded visual approximation, not physically simulated fluid or path-traced refraction. Fullness and attacks remain musical heuristics. The fallback is a simple measured waveform. Additional worlds remain on the later-phase roadmap.

The build is unsigned and keeps Electron's executable icon. Vite reports the existing Three.js bundle-size and lucide-react client-directive warnings. Packaging reports absent author/description metadata; neither prevents launching. The app is local and no push/publish was performed.

## Short manual listening/viewing checklist
1. Use the real **Import music** dialog with several personal MP3s. Confirm cancel, selection, damaged/moved-file handling, and audible playback.
2. Switch **Fused Bubbles → Spectrum Linear → Spectrum Radial → Fused Bubbles** while listening. Confirm no audible break, seek jump, queue change or volume change.
3. Try all palettes and both quality levels; sweep sensitivity, richness, smoothing and motion. Check that Motion zero/reduced motion removes shaking while measured bars/traces remain.
4. Compare quiet, percussive and dense passages. Confirm natural settling on pause, repeated seeks and track changes; lower output volume and observe unchanged analysis.
5. Resize with Queue/Tune open, navigate with Tab, and move across physical mixed-DPI monitors. Check readability, focus, clipping and frame pacing.
6. Relaunch: visual choices return, Queue is collapsed, and playback stays stopped. Run a longer listening session on the target GPU to assess sustained performance/resource use.

Automated audio progress and signal checks passed; subjective listening quality, real picker interaction, long-session performance and additional physical GPU/display combinations still need human checks.
