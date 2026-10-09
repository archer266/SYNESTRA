import type { MusicalIntelligence } from '../analysis/intelligence';
import { clamp,smooth } from '../analysis/processor';
import type { VisualConfig } from './contracts';
/** Small presentation offsets only; never mutates measured input, beat clock or preset state. */
export class MusicalResponse {
 accent=0;flow=0;rise=0;settle=0;
 update(f:Readonly<MusicalIntelligence>|null|undefined,c:Readonly<VisualConfig>,dt:number){
  const amount=c.reducedMotion?0:clamp(c.musicalResponse)*clamp(c.motion)*Math.min(1.5,c.sensitivity);
  if(!amount){this.accent=0;this.flow=0;this.rise=0;this.settle=0;return this;}
  const active=f?.valid;
  this.accent=smooth(this.accent,active?f.onsetStrength*amount:0,dt,.07,.45);
  this.flow=smooth(this.flow,active?f.shortEnergy*amount:0,dt,.7,1.3);
  this.rise=smooth(this.rise,active?f.energyRise*amount:0,dt,.8,1.4);
  this.settle=smooth(this.settle,active?(1-f.shortEnergy)*amount:amount,dt,1.2,1.2);
  return this;
 }
}
