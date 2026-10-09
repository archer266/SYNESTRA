import type { MusicFeatures } from '../analysis/contracts';
import type { VisualConfig } from './contracts';
import { clamp,smooth } from '../analysis/processor';
/** Three independent pearls: left=bass, upper center=mids, right=treble. */
export const PEARL_CENTERS=[[-2.12,-0.52],[0,0.72],[2.12,-0.52]] as const;
export const PEARL_RADIUS=1.1;
export function pearlCameraHalfHeight(aspect: number){return Math.max(2.15,3.65/Math.max(0.1,aspect));}
export class PearlMotion {
  bass=0;mids=0;highs=0;energy=0;
  readonly phases=new Float32Array([0.3,2.6,4.8]);
  readonly radii=new Float32Array([1,1,1]);
  readonly offsets=new Float32Array(6);
  update(f: Readonly<MusicFeatures>,config: VisualConfig,delta: number){
    const dt=clamp(delta,0,0.1),active=!f.gated&&!f.suppressed;
    const attack=0.32+config.smoothing*0.35,release=1.05+config.smoothing*0.9;
    this.bass=smooth(this.bass,active?clamp(f.bass):0,dt,attack,release);
    this.mids=smooth(this.mids,active?clamp(f.mids):0,dt,attack,release);
    this.highs=smooth(this.highs,active?clamp(f.treble):0,dt,attack,release);
    this.energy=smooth(this.energy,active?clamp(f.envelope):0,dt,0.7,1.5);
    const motion=config.reducedMotion?0:clamp(config.motion);
    // Calm idle flow remains; motion=0 / reduced motion freezes decorative animation.
    for(let i=0;i<3;i++){
      this.phases[i]=(this.phases[i]+dt*(0.045+(i===0?this.energy*0.055:i===1?this.mids*0.16:this.highs*0.12))*motion)%4096;
      const phase=this.phases[i];
      this.offsets[i*2]=Math.sin(phase*0.6+i)*0.012*motion;
      this.offsets[i*2+1]=Math.cos(phase*0.52+i)*0.012*motion;
      const target=1+Math.sin(phase*1.1)*0.006*motion+(i===0?this.bass*0.045*motion:0);
      this.radii[i]=smooth(this.radii[i],target,dt,0.45,1.1);
    }
  }
}
