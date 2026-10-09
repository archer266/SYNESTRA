import { clamp,smooth } from './processor';
import type { MusicFeatures } from './contracts';
/** Borrowed scalar frame. Times are monotonic seconds; IDs increase within an epoch.
 * Energies/strength/confidence/trends: 0..1. Confidence is consistency, not calibrated probability.
 * Beat events are observed aligned attacks, never a generated beat grid. Null means unknown.
 */
export interface MusicalIntelligence {
 timestamp:number; epoch:number; valid:boolean; low:number; mid:number; high:number;
 onsetStrength:number; onset:boolean; onsetId:number; lastOnset:number|null;
 beat:boolean; beatId:number; lastBeat:number|null; beatConfidence:number;
 tempo:number|null; tempoConfidence:number; tempoValid:boolean; beatPhase:number|null;
 shortEnergy:number; longEnergy:number; energyRise:number; energyFall:number;
}
export class IntelligenceProcessor {
 readonly features:MusicalIntelligence={timestamp:0,epoch:0,valid:false,low:0,mid:0,high:0,onsetStrength:0,onset:false,onsetId:0,lastOnset:null,beat:false,beatId:0,lastBeat:null,beatConfidence:0,tempo:null,tempoConfidence:0,tempoValid:false,beatPhase:null,shortEnergy:0,longEnergy:0,energyRise:0,energyFall:0};
 private events=new Float64Array(32);private scratch=new Float64Array(16);private count=0;private cursor=0;
 private previousRms=0;private previousFullRms=0;private previous=0;private mean=0;private deviation=0;private armed=true;private warmup=.25;
 private lastTime:number|null=null;private lastAttack=-Infinity;private riseTime=0;private fallTime=0;private period=0;
 reset(){
  const f=this.features;f.epoch++;f.valid=false;f.onset=false;f.beat=false;f.onsetId=0;f.beatId=0;f.lastOnset=null;f.lastBeat=null;f.onsetStrength=0;
  this.invalidate();this.count=0;this.cursor=0;this.previous=0;this.previousRms=0;this.previousFullRms=0;this.mean=0;this.deviation=0;this.armed=true;this.warmup=.25;this.lastTime=null;this.lastAttack=-Infinity;this.riseTime=0;this.fallTime=0;
  f.shortEnergy=0;f.longEnergy=0;f.energyRise=0;f.energyFall=0;f.low=0;f.mid=0;f.high=0;
 }
 private invalidate(){const f=this.features;f.tempo=null;f.tempoValid=false;f.tempoConfidence=0;f.beatConfidence=0;f.beatPhase=null;this.period=0;}
 private track(time:number){
  const f=this.features,oldPeriod=this.period,last=f.lastBeat;
  this.events[this.cursor]=time;this.cursor=(this.cursor+1)%32;this.count=Math.min(32,this.count+1);
  const n=Math.min(16,this.count-1);if(n<6)return;
  for(let i=0;i<n;i++){const a=(this.cursor-1-i+32)%32,b=(a-1+32)%32;this.scratch[i]=this.events[a]-this.events[b];}
  // In-place insertion sort: fixed scratch storage, no hot-path array allocation.
  for(let i=1;i<n;i++){const v=this.scratch[i];let j=i-1;while(j>=0&&this.scratch[j]>v){this.scratch[j+1]=this.scratch[j];j--;}this.scratch[j+1]=v;}
  const median=this.scratch[Math.floor(n/2)];let error=0,support=0;
  for(let i=0;i<n;i++){const relative=Math.abs(this.scratch[i]-median)/median;error+=Math.min(1,relative);if(relative<.1)support++;}
  const confidence=clamp((1-error/n*5)*(support/n)*Math.min(1,n/8));
  f.tempoConfidence=confidence;
  const plausible=median>=.3&&median<=1.02,threshold=f.tempoValid?.55:.7;
  if(!plausible||confidence<threshold){this.invalidate();return;}
  this.period=median;f.tempo=60/median;f.tempoValid=true;
  const aligned=last===null||!oldPeriod||Math.abs((time-last)/oldPeriod-Math.round((time-last)/oldPeriod))<.15;
  if(aligned){f.beat=true;f.beatId++;f.lastBeat=time;f.beatConfidence=confidence;}
 }
 process(pcm:Readonly<Float32Array>,sampleRate:number,base:Readonly<MusicFeatures>,time:number,playing:boolean){
  const f=this.features;if(!Number.isFinite(time))return f;
  let dt=this.lastTime===null?.01:time-this.lastTime;
  if(dt<=0)return f;
  if(dt>.1){this.reset();dt=.01;}
  this.lastTime=time;f.timestamp=time;f.onset=false;f.beat=false;
  if(!playing||sampleRate<=0){if(f.valid||this.count)this.reset();this.lastTime=time;f.timestamp=time;return f;}
  this.warmup=Math.max(0,this.warmup-dt);
  // Last 20 ms of the existing PCM snapshot improves timing over full 4096-sample RMS.
  const length=Math.min(pcm.length,Math.max(1,Math.round(sampleRate*.02)));let power=0;
  for(let i=pcm.length-length;i<pcm.length;i++){const v=clamp(pcm[i],-1,1);power+=v*v;}
  const rms=Math.sqrt(power/length),active=rms>.001&&!base.suppressed&&this.warmup===0;
  f.valid=this.warmup===0&&!base.suppressed;
  const energy=active?clamp(1-Math.exp(-14*rms)):0;
  f.shortEnergy=smooth(f.shortEnergy,energy,dt,.3,.65);f.longEnergy=smooth(f.longEnergy,energy,dt,4,4);
  f.low=smooth(f.low,active?base.bass:0,dt,.07,.4);f.mid=smooth(f.mid,active?base.mids:0,dt,.07,.4);f.high=smooth(f.high,active?base.treble:0,dt,.07,.4);
  let fullPower=0;for(let i=0;i<pcm.length;i++){const v=clamp(pcm[i],-1,1);fullPower+=v*v;}
  const fullRms=Math.sqrt(fullPower/Math.max(1,pcm.length));
  // Confirm a short-window rise against the longer window to reject bass-cycle RMS ripple.
  const rising=rms>this.previousRms*1.35&&fullRms>this.previousFullRms*1.08;
  const log=Math.log1p(rms*100),novelty=active&&rising?Math.max(0,log-this.previous):0;this.previous=log;this.previousRms=rms;this.previousFullRms=fullRms;
  const threshold=Math.max(.035,this.mean+3*this.deviation);
  if(novelty<threshold*.5)this.armed=true;
  f.onsetStrength*=Math.exp(-dt/.14);
  if(active&&this.armed&&novelty>threshold&&time-this.lastAttack>=.18){
   f.onset=true;f.onsetId++;f.lastOnset=time;f.onsetStrength=clamp(novelty/Math.max(.1,threshold*3));this.lastAttack=time;this.armed=false;this.track(time);
  }
  const alpha=1-Math.exp(-dt/.8);this.deviation+=(Math.abs(novelty-this.mean)-this.deviation)*alpha;this.mean+=(novelty-this.mean)*alpha;
  if(f.tempoValid&&this.period){const age=time-(f.lastOnset??time);if(age>this.period*2.5){this.invalidate();this.count=0;}else{f.beatConfidence=f.tempoConfidence*Math.exp(-Math.max(0,age-this.period)/this.period);f.beatPhase=f.lastBeat!==null&&time-f.lastBeat<this.period*1.5?((time-f.lastBeat)/this.period)%1:null;}}
  const difference=f.shortEnergy-f.longEnergy;
  this.riseTime=active&&difference>.045?this.riseTime+dt:0;this.fallTime=f.valid&&f.longEnergy>.04&&difference<-.045?this.fallTime+dt:0;
  f.energyRise=smooth(f.energyRise,this.riseTime>.45?clamp((difference-.03)*3):0,dt,.4,1);
  f.energyFall=smooth(f.energyFall,this.fallTime>.45?clamp((-difference-.03)*3):0,dt,.4,1);
  return f;
 }
}
