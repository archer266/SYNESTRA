import { milkdropPresets } from '../visuals/milkdrop/catalog';
import { MilkDropControls } from './MilkDropControls';
import { useState } from 'react';
import { Activity,ChevronDown } from 'lucide-react';
import type { VisualConfig,VisualDiagnostics } from '../visuals/contracts';
const percent=(value: number)=>Math.round(value*100)+'%';
interface Props { config: VisualConfig; change: (patch: Partial<VisualConfig>)=>void; diagnostics: VisualDiagnostics|null }
export function VisualSettings({config,change,diagnostics}: Props){
  const [signals,setSignals]=useState(false);
  return <aside className="side-panel tuning-panel" id="visual-tuning" aria-label="Visual settings">
    <div className="panel-heading"><span className="eyebrow">MAKE IT YOURS</span><h2>Tune the room</h2><p>{config.mode==='classic'?'Light that follows the music.':config.mode==='pearl'?'Three pearls. A soft light for every note.':config.mode==='milkdrop'?'Color, feedback and a little infinity.':'Measured sound. Your way of seeing it.'}</p></div>
    <div className="settings-fields">
      {config.mode==='milkdrop'&&<MilkDropControls config={config} change={change} reducedMotion={!!diagnostics?.reducedMotion}/> }
      <label>Palette<select aria-label="Palette" value={config.palette} onChange={e=>change({palette:e.target.value as VisualConfig['palette']})}><option value="aurora">{config.mode==='milkdrop'?'Original preset palette':'Aurora - cyan, violet, rose'}</option><option value="glacier">{config.mode==='milkdrop'?'Glacier - cool hue shift':'Glacier - cool blue & ice'}</option><option value="ember">{config.mode==='milkdrop'?'Ember - warm hue shift':'Ember - amber & rose'}</option></select></label>
      <label>Sensitivity <output>{config.sensitivity.toFixed(2)}×</output><input aria-label="Sensitivity" type="range" min="0.5" max="2" step="0.05" value={config.sensitivity} onChange={e=>change({sensitivity:Number(e.target.value)})}/></label>
      <label>Visual richness <output>{percent(config.richness)}</output><input aria-label="Visual richness" type="range" min="0" max="1" step="0.05" value={config.richness} onChange={e=>change({richness:Number(e.target.value)})}/></label>
      <label>Smoothing <output>{percent(config.smoothing)}</output><input aria-label="Smoothing" type="range" min="0" max="1" step="0.05" value={config.smoothing} onChange={e=>change({smoothing:Number(e.target.value)})}/></label>
      <label>Musical Response <output>{config.musicalResponse===0?'Off':percent(config.musicalResponse)}</output><input aria-label="Musical Response" type="range" min="0" max="1" step="0.05" value={config.musicalResponse} onChange={e=>change({musicalResponse:Number(e.target.value)})}/></label>
      <p className="settings-note">Off restores the original response. MilkDrop adds only gentle light modulation; its own audio response stays intact.</p>
      <label>Motion <output>{diagnostics?.reducedMotion?'Reduced by system':percent(config.motion)}</output><input aria-label="Motion" type="range" min="0" max="1" step="0.05" value={config.motion} disabled={diagnostics?.reducedMotion} onChange={e=>change({motion:Number(e.target.value)})}/></label>
      <label>Rendering quality<select aria-label="Rendering quality" value={config.quality} onChange={e=>change({quality:e.target.value as VisualConfig['quality']})}><option value="high">High - up to 4K</option><option value="balanced">Balanced</option><option value="economy">Economy · lower GPU use</option></select></label>
      <label>Render resolution limit<select aria-label="Render resolution limit" value={config.resolution} onChange={e=>change({resolution:e.target.value as VisualConfig['resolution']})}><option value="auto">Auto - quality budget</option><option value="720p">1280 x 720</option><option value="1080p">1920 x 1080</option><option value="1440p">2560 x 1440</option><option value="2160p">3840 x 2160</option></select></label>
      <p className="settings-note">Saved on this device. Volume changes only what you hear.</p>
    </div>
    <button className="signals-toggle" aria-expanded={signals} aria-controls="diagnostics" onClick={()=>setSignals(!signals)}><Activity size={17}/> Signals<ChevronDown size={16}/></button>
    {signals&&diagnostics&&<div className="diagnostics" id="diagnostics" aria-label="Signal diagnostics">
      <div className="diagnostic-title">PRE-VOLUME SIGNAL <span>{diagnostics.gated?'GATED':diagnostics.suppressed?'SETTLING':'LIVE'}</span></div>
      <dl>
        <dt>RMS</dt><dd data-signal="rms">{diagnostics.rms.toFixed(4)}</dd>
        <dt>Bass / mid / high</dt><dd>{percent(diagnostics.bass)} / {percent(diagnostics.mids)} / {percent(diagnostics.treble)}</dd>
        <dt>Slow energy</dt><dd>{percent(diagnostics.envelope)}</dd>
        <dt>Band coverage</dt><dd data-signal="coverage">{percent(diagnostics.coverage)}</dd>
        <dt>Recent attacks</dt><dd>{percent(diagnostics.attackActivity)}</dd>
        <dt>Onset strength</dt><dd>{percent(diagnostics.onsetStrength)}</dd>
        <dt>Fast onset</dt><dd data-signal="musical-onset">{percent(diagnostics.intelligence.onsetStrength)}</dd>
        <dt>Beat confidence (estimate)</dt><dd data-signal="beat-confidence">{percent(diagnostics.intelligence.beatConfidence)}</dd>
        <dt>Estimated tempo</dt><dd data-signal="tempo">{diagnostics.intelligence.tempoValid&&diagnostics.intelligence.tempo!==null?diagnostics.intelligence.tempo.toFixed(1)+' BPM':'Unknown'}</dd>
        <dt>Tempo confidence</dt><dd data-signal="tempo-confidence">{percent(diagnostics.intelligence.tempoConfidence)}</dd>
        <dt>Beat phase (estimate)</dt><dd>{diagnostics.intelligence.beatPhase===null?'Unknown':percent(diagnostics.intelligence.beatPhase)}</dd>
        <dt>Short / long energy</dt><dd>{percent(diagnostics.intelligence.shortEnergy)} / {percent(diagnostics.intelligence.longEnergy)}</dd>
        <dt>Energy rise / fall</dt><dd data-signal="energy-trend">{percent(diagnostics.intelligence.energyRise)} / {percent(diagnostics.intelligence.energyFall)}</dd>
        <dt>Activity</dt><dd data-signal="activity">{percent(diagnostics.activity)}</dd>
        <dt>Progression</dt><dd>{diagnostics.stage}</dd>
        <dt>Groove / lift / peak</dt><dd>{percent(diagnostics.groove)} / {percent(diagnostics.lift)} / {percent(diagnostics.peak)}</dd>
        <dt>Sample rate / FFT</dt><dd>{diagnostics.sampleRate?diagnostics.sampleRate+' / '+diagnostics.fftSize:'Awaiting playback'}</dd>
        <dt>Renderer</dt><dd data-signal="renderer">{diagnostics.renderer}</dd>
        <dt>Active engine</dt><dd data-signal="engine">{diagnostics.engine} / {diagnostics.backend}</dd>
        {config.mode==='milkdrop'&&<><dt>Loaded preset</dt><dd data-signal="active-preset">{milkdropPresets.find(p=>p.id===diagnostics.activePreset)?.name??'None / fallback'}</dd></>}
        <dt>Render dimensions</dt><dd data-signal="resolution">{diagnostics.renderWidth} x {diagnostics.renderHeight}</dd>
        <dt>Effective pixel ratio</dt><dd>{diagnostics.pixelRatio.toFixed(2)}</dd>
        <dt>Frame interval / FPS</dt><dd data-signal="timing">{diagnostics.frameMs.toFixed(1)} ms / {diagnostics.fps.toFixed(1)}</dd>
        <dt>CPU submission</dt><dd>{diagnostics.cpuMs.toFixed(2)} ms</dd>
        <dt>Fallback</dt><dd>{diagnostics.fallbackReason??'None'}</dd>
        {diagnostics.cleanupWarning&&<><dt>Cleanup warning</dt><dd>{diagnostics.cleanupWarning}</dd></>}
      </dl><p>Frame timing is measured scheduling cadence. CPU submission is not GPU execution time; 4K/60 FPS requires hardware measurement.</p><p>Tempo and beats are conservative estimates; half/double-tempo ambiguity remains. Energy rise/fall is a signal heuristic, not chorus, verse, mood or drop recognition.</p>
    </div>}
  </aside>;
}
