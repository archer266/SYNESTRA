# Phase 1 validation

Environment: Windows x64, Node.js 24.21.0. Electron 44.7.0, Vite 8.3.4, React 19.3.0. Validation performed on October 8, 2026 (America/Los_Angeles).

## Results
- `npm.cmd ci`: passed from the lockfile, including the Electron runtime install hook.
- `npm.cmd run dev`: confirmed a native SYNESTRA Electron window and an HTTP 200 response from the local Vite server.
- `npm.cmd audit --omit=dev`: 0 vulnerabilities.
- `npm.cmd run type-check`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd test`: 6 passed, 0 failed.
- `npm.cmd run build`: passed.
- `npm.cmd run package`: passed; produced release/SYNESTRA-0.1.0.exe.
- `npm.cmd run test:desktop`: passed against both the built Electron application and the packaged Windows executable.
- Desktop screenshots: [full size](desktop.png), [compact size](desktop-compact.png). No horizontal overflow at the tested compact size.

Focused tests cover complete/partial/suffix/open-ended ranges, clamping, invalid/multipart/unsafe ranges, actual streamed bytes over repeated distant seeks, HEAD, 404/405/416 responses, traversal attempts, stable ID persistence, deduplication and unchanged source bytes. Queue tests cover empty/single/multiple tracks, previous/next boundaries, completion, manual versus automatic repeat-one, repeat-all wrap and shuffle permutations.

Desktop tests synthesize a ten-minute MP3 and a short MP3 plus a damaged file. They launch real Electron and confirm sandbox/isolation/disabled Node, canceled/imported picker results, playback, four distant seeks with subsequent time progression, pause, keyboard focus, volume controls, shuffle, repeat-one/all/off, natural queue completion, previous/next, damaged-file error recovery, resizing, queue collapse, persistence and no autoplay on relaunch.

The test substitutes the native dialog result; it does not automate Windows' native picker UI. Media progression was verified programmatically; subjective sound quality and actual speaker output require human listening.

## Manual playback checklist
1. Launch the portable EXE or `npm.cmd run dev`. Open Import MP3s, cancel, then multi-select several personal MP3 files, including a long/VBR track.
2. Confirm audible sound, volume and mute; pause/resume; click different queue items; use previous/next.
3. Seek repeatedly near the end and back toward the beginning of a long track. Check elapsed time and continued sound.
4. Let a short final track finish with repeat off, all and one. Enable shuffle and inspect track traversal.
5. Import a damaged .mp3 and try a source that has been moved/deleted. Confirm a readable error and recovery by selecting a valid track.
6. Collapse the queue, resize the window, Tab through controls and verify Space/arrow shortcuts do not override a focused slider.
7. Close/relaunch: confirm the library remains and music does not start automatically.

## Dependency notes
Build emits lucide-react "use client" directive warnings; the renderer is entirely client-side. Eight moderate audit entries arise from the packaging dependency chain; no high/critical entries were reported. These are recorded for follow-up rather than hidden with audit suppression.
