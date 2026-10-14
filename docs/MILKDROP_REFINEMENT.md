# MilkDrop visual refinement - October 14, 2026

## Findings and scope

The previous collection had only four presets. Three enabled no custom shapes or custom waves; their basic wave and feedback compositions covered a narrow range. Inspection confirmed the compiler retained warp/composite shaders. The PCM adapter correctly maps signed float PCM to unsigned bytes (128 + 127 * sample), resamples using the real sample rate, and reads before output gain. Unity-input tests confirm quiet amplitudes remain quiet rather than clipping. There was no evidence of a missing shader feature or a need for a global gain boost.

An isolated copy of the user's saved renderer preferences selected **Pearl**, with Aurora stored as the inactive MilkDrop preset. That is a saved-profile observation, not proof of what an already-open desktop window showed. Existing preferences were not overwritten. Select MilkDrop explicitly. The stage now shows the actually loaded preset label; Tune > Signals shows its credited name or an explicit fallback/loading state. Canvas identity and preset ID are asserted in Electron validation.

No audio routing, player, analysis, dependencies, quality budgets, CSP, other visual modes or desktop services were changed. Existing fixed quality/resolution limits remain; the baseline has no automatic frame-time quality scaling. No release, push or roadmap work.

## Collection and attribution

| Display name | Original preset / authors | Character |
| --- | --- | --- |
| Aurora | Geiss - Aurora | Flowing color |
| Cosmic layers | Geiss - 3 layers (Rayleigh Scattering Mix) | Cosmic patterns |
| Liquid color | Flexi, martin + geiss - dedicated to the sherwin maxawow | Liquid motion |
| Kaleidoscope | Cope - Passage (mandala mix) | Nested mandala and recursive symmetry |
| Chrome tunnel | bdrv, flexi + martin - ultramix #380 [shiny tunnel derivative mix] | Reflective twisting tunnel |
| Psychedelic glowsticks | Eo.S. + Geiss - glowsticks v2 03 music shifter edit b (Psychedelic Mix) | Electric oscillating filaments |
| Starburst | Eo.S. - starburst 01 | Radial rhythmic starburst |
| Spiral dreams | Aderrasi - Causeway of Dreams (Point Mix) | Slow color spiral with a fine dancing trace |
| Reaction pools | Geiss - Reaction Diffusion (Puddle Mix) | Organic liquid cells |
| Mindblob geometry | Flexi - mindblob mix | Energetic geometry |

The six additions are exact converted JSON sources from butterchurn-presets **2.4.7**, distributed under its MIT license (Copyright 2013-2018 Jordan Berg). Existing four source files are unchanged. Full author titles remain in the picker. Distribution notices remain in public/licenses/butterchurn-presets.txt and butterchurn.txt. Source checksums are in src/visuals/milkdrop/vendor/SHA256.json. All use built-in textures; no downloaded artwork or native-only MilkDrop extensions are required.

Sources: [official presets/license](https://github.com/jberg/butterchurn-presets/blob/master/LICENSE), [Butterchurn API](https://github.com/jberg/butterchurn). Compatibility was checked against installed **Butterchurn 2.6.7**, not assumed from native Winamp support. The compiler emits static functions, preserving strict CSP without unsafe-eval or remote textures.

Local adaptations live in prepare.ts, leaving author JSON intact:
- Aurora: a low-opacity, bass-weighted native shape supplies a quiet feedback seed. Lower subtractive decay gives it a soft trail instead of a nearly black quiet frame. No audio amplification.
- Cosmic layers: composite exposure 1.7 -> 1.0 prevents dense material washing out to white.
- Kaleidoscope: exposure 1.49 -> 0.88 before squaring avoids clipped pale regions while retaining its recursive mandala.
- Starburst: bounded native bass/mid levels shape feedback expansion/rotation. The original is largely time-driven. No external beat grid or invented BPM is introduced.

Rejected auditions: sparse extrusion/pipe imagery, muddy mandelbox flight and a basic eight-spoke kaleidoscope. The retained collection contrasts detailed tunnels/mandalas and liquid feedback with calmer trails/star fields. Aurora remains deliberately sparse; Starburst is a restrained filament composition, not a strobe.

Five-second silent clips: [Aurora](milkdrop-curation/clips/aurora.webm), [Cosmic layers](milkdrop-curation/clips/galaxy.webm), [Liquid color](milkdrop-curation/clips/liquid.webm), [Kaleidoscope](milkdrop-curation/clips/kaleidoscope.webm), [Chrome tunnel](milkdrop-curation/clips/tunnel.webm), [Psychedelic glowsticks](milkdrop-curation/clips/ribbons.webm), [Starburst](milkdrop-curation/clips/starburst.webm), [Spiral dreams](milkdrop-curation/clips/dream.webm), [Reaction pools](milkdrop-curation/clips/reaction.webm), [Mindblob geometry](milkdrop-curation/clips/crystal.webm).

## Controls and timing

Existing previous/next/random, opt-in cycling (15-300 s), blend (1-8 s), sensitivity, smoothing, palette, motion, richness and quality controls remain. Legacy preset IDs stay valid. Author programs are cloned before Butterchurn mutates them. Transition progress uses elapsed seconds through the existing shared clock; legacy feedback equations themselves can still vary with frame rate. Paused/silent/hidden/fallback time does not advance automatic cycling. Reduced motion or Motion zero retains the measured waveform fallback.

## Validation

Baseline once: type-check, lint, 52 tests and build passed. The baseline MilkDrop suite failed waiting for automatic cycling after pause/resume (expected galaxy, still aurora). This predates the preset changes. Cycling passed on the affected rerun. That run then exposed a stale Phase 4 CSS assertion that omitted the already-existing Musical Response brightness term. The test now checks hue/saturation and the original 1.00-1.04 brightness bound; production response code was not changed. Final affected-suite outcome is recorded below. Existing Vite bundle-size and lucide directive warnings remain.

Final unit coverage includes catalog/source correspondence, legacy IDs, quiet PCM scaling, bounded non-mutating adaptations, preset navigation/cycling, lifecycle cleanup, fallback and persisted preference validation.

Electron collection run: all ten actual MilkDrop shaders linked/rendered, GL error 0, stable 177 tracked live GL resources, exactly one AudioContext/source/analyser/gain. Each preset exercised quiet 330 Hz, pulsed bass, dense broadband musical fixture and digital silence, with real screenshot measurements. Final adaptations were rechecked on affected presets. See milkdrop-collection/final-signals.json. No dense black frame; final sampled near-white fractions under 2.5%. This samples behavior, not a universal no-flash guarantee.

Real-library MP3 auditions use an isolated profile and read source music without modification. Whole-app normal/compact screenshots and short motion capture sections are reviewed separately from automated checks. Playwright videos are silent, so they establish visual motion, not human listening quality.

Performance: all ten presets passed at exact 1920 x 1080 and 3840 x 2160 buffers, High quality, on ANGLE / AMD Radeon RX 6800 XT / D3D11. Each 90-RAF sample measured approximately 16.7 ms median / 16.8 ms p95; GL errors were zero and live resources stayed 177. See milkdrop-collection/performance.json. These are short RAF scheduling samples with an enlarged stage buffer, not GPU timer queries, prolonged load testing or a physical 4K display certification.

Final results: type-check PASS; lint PASS; 56 tests PASS; production build PASS; reproducible static preset compilation PASS; ten-preset four-signal Electron collection PASS; ten-preset 1080p/4K performance run PASS; existing MilkDrop regression (including Classic switching) PASS; existing desktop regression PASS. The earlier cycling failure did not reproduce, and the stale CSS expectation was corrected as described above.

MilkDrop regression covers manual/random/cycle transitions, pause, mute/pre-gain response, repeated seek, real-track import, silence, mode switches, settings, reduced-motion/Motion-zero fallback, fullscreen, minimize/restore with continuing audio, context loss/retry, forced shader failure, bounded resources and preferences after relaunch without autoplay. Desktop regression covers isolation/sandboxing, picker cancellation/import, four seeks in a ten-minute MP3, editable-field shortcuts, volume, shuffle, repeat and completion, damaged-file recovery, queue persistence and resizing. No named-playlist manager exists in the baseline.

Final real-track review: all ten presets captured while Bartender (Instrumental).mp3 played in the isolated app. Reviewed full-window and compact captures and five decoded one-second-spaced frames from each five-second motion clip. See [first five motion strips](milkdrop-curation/motion-review-0.png), [second five](milkdrop-curation/motion-review-1.png), [compact controls](milkdrop-curation/compact-controls.png), and milkdrop-curation/clips/*.webm. This demonstrates composition and motion progression; it does not replace real-time human listening or long-session frame-pacing review. No frozen or failed preset in these samples.

Changed production files: milkdrop/catalog.ts, six vendor JSONs + SHA256.json, presets.generated.js, prepare.ts, engine.ts, visuals/contracts.ts/director.ts and ui/MilkDropControls.tsx/SpectrumStage.tsx/VisualSettings.tsx. Supporting changes: compiler, preset tests, existing MilkDrop smoke assertions, four focused review scripts, README/status/this report and local capture ignore rules. Player, audio input/graph, desktop code, Pearl, Spectrum, Classic, package.json and lockfile are unchanged.

## Launch and manual viewing

```powershell
Set-Location 'C:\Users\Admin\Desktop\Coding Projects\Synestra'
npm.cmd ci
npm.cmd run dev
```

1. Import an MP3 and play. Select **MilkDrop** in the visual-mode picker; open **Tune** and choose a preset. Confirm the stage/Signals loaded name changes, not just the selector.
2. Compare Kaleidoscope, Chrome tunnel, Liquid color, Psychedelic glowsticks, Reaction pools and Spiral dreams. Use 3-5 second blends and 45-90 second cycling for deliberate changes.
3. Try quiet, bass-heavy and dense music. Mute should leave the visual response intact; pause should settle the motion. Check seek, queue changes and other modes without interruption.
4. Enter fullscreen. On capable hardware use High / 2160p and verify actual dimensions in Signals. A 4K buffer alone does not establish sustained physical 4K/60 FPS.
5. Listen/watch for 30-60 minutes on your GPU, including minimize/restore and repeated switching. Human judgments of musical timing, comfort, long-session stability and mixed-DPI/physical 4K pacing remain manual.
