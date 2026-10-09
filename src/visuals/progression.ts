import type { MusicFeatures } from '../analysis/contracts';
import { clamp,smooth } from '../analysis/processor';
export type ProgressionStage='Quiet'|'Groove'|'Lift'|'Peak';
export interface ProgressionState { stage: ProgressionStage; activity: number; groove: number; lift: number; peak: number }
const stages: ProgressionStage[]=['Quiet','Groove','Lift','Peak'];
const thresholds=[0.22,0.44,0.70];
const ramp=(x: number,start: number,end: number)=>{const t=clamp((x-start)/(end-start));return t*t*(3-2*t);};
/** World-independent continuous layers; labels use a separate hysteresis latch. */
export class ProgressionController {
  readonly state: ProgressionState={stage:'Quiet',activity:0,groove:0,lift:0,peak:0};
  private index=0;
  update(features: Pick<MusicFeatures,'activity'>,dt: number){
    const s=this.state;
    s.activity=smooth(s.activity,clamp(features.activity),clamp(dt,0,0.25),0.65,1.45);
    s.groove=ramp(s.activity,0.12,0.35);
    s.lift=ramp(s.activity,0.34,0.62);
    s.peak=ramp(s.activity,0.60,0.88);
    if(this.index<3&&s.activity>thresholds[this.index]+0.025)this.index++;
    else if(this.index>0&&s.activity<thresholds[this.index-1]-0.045)this.index--;
    s.stage=stages[this.index];return s;
  }
  reset(){this.index=0;Object.assign(this.state,{stage:'Quiet',activity:0,groove:0,lift:0,peak:0});}
}
