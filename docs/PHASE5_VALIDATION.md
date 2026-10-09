# Phase 5 validation (in progress)

## Acceptance criteria fixed before evaluation

- Deterministic 100 Hz sampling, independent read-only rendering at 30/60/144 Hz: identical event counts and tempo estimates for identical analysis input.
- Rhythmic pulses: 60, 90, 120, 150, 180 BPM at peak PCM amplitudes 0.015, 0.08, 0.4; onset precision/recall >= 90% after 0.3-second reset suppression, onset latency <= 80 ms; tempo within 3% by 10 seconds on these unambiguous fixtures. Report octave (half/double) ambiguity separately, not as proven metrical tempo.
- Silence, PCM below 0.00063 RMS and steady tones after initial settling: zero onset/beat events and no valid tempo. Isolated attacks must not establish tempo. Irregular timing must not sustain confident tracking.
- At least six consistent inter-onset intervals before tempo can be valid. Tempo/phase invalid immediately on reset/pause, and reacquired after resume. Analysis gaps > 100 ms invalidate history; never replay missed samples/events.
- Sustained energy rises/falls must activate the corresponding bounded heuristic only after persistence; no chorus/verse/drop/genre inference.
- Fixed reusable feature object, PCM/spectrum buffers, 32-event ring and fixed scratch storage; no unbounded histories or per-sample arrays.
- Preserve one audio graph; pre-gain analysis unaffected by output gain. Musical Response zero restores prior visual mapping; no external Butterchurn beat control or beat-triggered preset changes.

## Milestones

1. Baseline, source snapshot and contract/acceptance criteria.
2. Independent analysis cadence, bounded onset/tempo/energy processor and discontinuity handling.
3. Restrained visual mappings, saved response amount and honest diagnostics.
4. Deterministic evaluation, real Electron regressions and performance checks.
5. Documentation and handoff; stop before Phase 6.

## Sampling decision

The Phase 4 service samples from RAF, which couples onset opportunities to display rate. Use one 10 ms analysis timer while visible, with actual elapsed timestamps and no catch-up. Read the same analyser's PCM/FFT once per analysis tick; renderer reads the latest borrowed frame. Short-tail PCM energy supplements the long FFT window for transient timing. This is a best-effort main-thread sampler, not a sample-accurate audio-thread tracker: expensive GPU work/main-thread stalls can interrupt it, in which case invalidate/reacquire. No AudioWorklet, second context or routing change is introduced.

References inspected: [Web Audio analyser specification](https://webaudio.github.io/web-audio-api/#AnalyserNode), [Butterchurn official API](https://github.com/jberg/butterchurn), installed stable 2.6.7 source and adapter. Butterchurn accepts PCM and computes its own audio response; no supported external beat/tempo control is exposed. Any Phase 5 MilkDrop mapping will be a restrained presentation modulation, not audio/timing/preset mutation.
