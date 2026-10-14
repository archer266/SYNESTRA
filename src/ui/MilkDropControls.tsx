import { milkdropPresets } from '../visuals/milkdrop/catalog';
import { adjacentPreset,randomPreset } from '../visuals/milkdrop/cycle';
import type { VisualConfig } from '../visuals/contracts';
export function MilkDropControls({config,change,reducedMotion}:{config:VisualConfig;change:(patch:Partial<VisualConfig>)=>void;reducedMotion:boolean}){
 return <div className="milkdrop-controls">
  <label>MilkDrop preset<select aria-label="MilkDrop preset" value={config.milkdropPreset} onChange={e=>change({milkdropPreset:e.target.value as VisualConfig['milkdropPreset']})}>{milkdropPresets.map(p=><option value={p.id} key={p.id}>{p.label} - {p.name}</option>)}</select></label>
  <p className="settings-note">{milkdropPresets.find(p=>p.id===config.milkdropPreset)?.description} · curated MilkDrop collection</p>
  <div className="preset-actions"><button onClick={()=>change({milkdropPreset:adjacentPreset(config.milkdropPreset,-1)})} aria-label="Previous preset">Previous</button><button onClick={()=>change({milkdropPreset:randomPreset(config.milkdropPreset)})} aria-label="Random preset">Random</button><button onClick={()=>change({milkdropPreset:adjacentPreset(config.milkdropPreset,1)})} aria-label="Next preset">Next</button></div>
  <label className="cycle-control"><span>Automatic cycling</span><input aria-label="Automatic cycling" type="checkbox" checked={config.milkdropCycle} onChange={e=>change({milkdropCycle:e.target.checked})}/></label>
  <label>Cycle interval <output>{config.milkdropInterval}s</output><input aria-label="Cycle interval" type="range" min="15" max="300" step="5" value={config.milkdropInterval} onChange={e=>change({milkdropInterval:Number(e.target.value)})}/></label>
  <label>Transition duration <output>{config.milkdropTransition}s</output><input aria-label="Transition duration" type="range" min="1" max="8" step="0.5" value={config.milkdropTransition} onChange={e=>change({milkdropTransition:Number(e.target.value)})}/></label>
  <p className="settings-note">{reducedMotion?'Reduced motion uses a calm measured waveform. Your preset choice is retained.':'Cycles advance during visible music playback. Pause, silence and hidden windows hold the cycle. Zero motion uses the waveform.'}</p>
 </div>;
}
