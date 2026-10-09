import type { AnalysisConfig, MusicFeatures } from './contracts';
export const BAND_COUNT=64, WAVEFORM_SIZE=512;
export const clamp=(value: number,min=0,max=1)=>Number.isFinite(value)?Math.min(max,Math.max(min,value)):min;
export function smooth(current: number,target: number,dt: number,attack: number,release: number){
  return current+(target-current)*(1-Math.exp(-Math.max(0,dt)/(target>current?attack:release)));
}
export function dbToMagnitude(db: number){return Number.isFinite(db)?Math.pow(10,clamp(db,-160,0)/20):0;}
interface BinWeight { bin: number; weight: number }
/** Integrate each bin's occupied Hz interval; narrow log bands never double-count a whole bin. */
export function frequencyWeights(low: number,high: number,sampleRate: number,fftSize: number): BinWeight[] {
  const width=sampleRate/fftSize,nyquist=sampleRate/2;
  low=Math.max(0,low);high=Math.min(high,nyquist);
  if(high<=low)return [];
  const result: BinWeight[]=[];
  for(let bin=Math.max(1,Math.ceil(low/width-0.5));bin<=Math.min(fftSize/2-1,Math.floor(high/width+0.5));bin++){
    const overlap=Math.max(0,Math.min(high,(bin+0.5)*width)-Math.max(low,(bin-0.5)*width));
    if(overlap>0)result.push({bin,weight:overlap/width});
  }
  return result;
}
export class FeatureProcessor {
  readonly features: MusicFeatures;
  private config: AnalysisConfig={sensitivity:1,smoothing:0.5};
  private powers: Float32Array;
  private previous: Float32Array;
  private bandPower=new Float32Array(BAND_COUNT);
  private ranges: BinWeight[][];
  private regions: BinWeight[][];
  private warmup=0.22;
  private primed=false;
  private gate=false;
  private fluxMean=0;
  private fluxDeviation=0;
  private cooldown=0;
  constructor(readonly sampleRate: number,readonly fftSize: number){
    if(!Number.isFinite(sampleRate)||sampleRate<=0||!Number.isInteger(fftSize)||fftSize<32)throw new Error('Invalid analysis format');
    this.powers=new Float32Array(fftSize/2);this.previous=new Float32Array(fftSize/2);
    const min=Math.min(35,sampleRate/4),max=Math.min(12000,sampleRate/2);
    const frequencies=new Float32Array(BAND_COUNT);
    this.ranges=Array.from({length:BAND_COUNT},(_,i)=>{
      const low=min*Math.pow(max/min,i/BAND_COUNT),high=min*Math.pow(max/min,(i+1)/BAND_COUNT);
      frequencies[i]=Math.sqrt(low*high);
      return frequencyWeights(low,high,sampleRate,fftSize);
    });
    this.regions=[[35,180],[180,2500],[2500,12000]].map(([low,high])=>frequencyWeights(low,high,sampleRate,fftSize));
    this.features={timestamp:0,sampleRate,fftSize,rms:0,loudness:0,envelope:0,bass:0,mids:0,treble:0,waveform:new Float32Array(WAVEFORM_SIZE),bands:new Float32Array(BAND_COUNT),bandFrequencies:frequencies,spectralFlux:0,onsetStrength:0,attack:false,attackActivity:0,coverage:0,activity:0,gated:true,suppressed:true};
  }
  configure(config: Partial<AnalysisConfig>){
    if(config.sensitivity!==undefined)this.config.sensitivity=clamp(config.sensitivity,0.5,2);
    if(config.smoothing!==undefined)this.config.smoothing=clamp(config.smoothing);
  }
  /** Clear detector history immediately. Display envelopes recede instead of visually snapping. */
  reset(){
    this.previous.fill(0);this.primed=false;this.warmup=0.22;
    this.fluxMean=0;this.fluxDeviation=0;this.cooldown=0;this.gate=false;
    this.features.attack=false;this.features.attackActivity=0;
    this.features.spectralFlux=0;this.features.onsetStrength=0;this.features.suppressed=true;
  }
  private power(weights: BinWeight[]){let total=0;for(const {bin,weight} of weights)total+=this.powers[bin]*weight;return total;}
  private normalize(amplitude: number){return clamp(1-Math.exp(-Math.max(0,amplitude)*14*this.config.sensitivity));}
  process(frequencyDb: Float32Array,pcm: Float32Array,deltaSeconds: number,playing: boolean,timeSeconds=0): Readonly<MusicFeatures>{
    const dt=clamp(deltaSeconds,0,0.25),f=this.features;
    f.timestamp=Number.isFinite(timeSeconds)?timeSeconds:0;
    let squared=0;
    for(let i=0;i<pcm.length;i++){const value=Number.isFinite(pcm[i])?clamp(pcm[i],-1,1):0;squared+=value*value;}
    f.rms=playing&&pcm.length?clamp(Math.sqrt(squared/pcm.length)):0;
    // Physical, pre-sensitivity gate with hysteresis: -60 dBFS open / about -64 dBFS close.
    this.gate=playing && f.rms>(this.gate?0.00063:0.001);
    f.gated=!this.gate;
    if(playing)this.warmup=Math.max(0,this.warmup-dt);
    f.suppressed=this.warmup>0;
    const active=this.gate&&!f.suppressed;
    let positive=0,previousTotal=0;
    for(let i=0;i<this.powers.length;i++){
      const magnitude=playing?dbToMagnitude(frequencyDb[i]):0;
      this.powers[i]=magnitude*magnitude;
      const compressed=Math.log1p(magnitude*50);
      positive+=Math.max(0,compressed-this.previous[i]);
      previousTotal+=this.previous[i];
      this.previous[i]=compressed;
    }
    const flux=this.primed&&active?clamp(positive/Math.max(0.1,previousTotal)):0;
    this.primed=playing;
    this.cooldown=Math.max(0,this.cooldown-dt);
    const threshold=Math.max(0.055,this.fluxMean+2.4*this.fluxDeviation);
    f.spectralFlux=flux;
    f.onsetStrength=active?clamp((flux-threshold)/Math.max(0.08,threshold*2)):0;
    f.attack=active&&flux>threshold&&this.cooldown===0;
    if(f.attack)this.cooldown=0.18;
    // Update baseline AFTER detection, so an attack cannot lift its own threshold.
    const alpha=1-Math.exp(-dt/0.7);
    this.fluxDeviation+=(Math.abs(flux-this.fluxMean)-this.fluxDeviation)*alpha;
    this.fluxMean+=(flux-this.fluxMean)*alpha;
    f.attackActivity=f.attack?Math.min(1,f.attackActivity+0.36):f.attackActivity*Math.exp(-dt/0.9);
    const attack=0.025+this.config.smoothing*0.09,release=0.16+this.config.smoothing*0.44;
    f.loudness=smooth(f.loudness,active?this.normalize(f.rms):0,dt,attack,release);
    f.envelope=smooth(f.envelope,active?this.normalize(f.rms):0,dt,0.45,1.1);
    const regionNames=['bass','mids','treble'] as const;
    for(let i=0;i<3;i++)f[regionNames[i]]=smooth(f[regionNames[i]],active?this.normalize(Math.sqrt(this.power(this.regions[i]))):0,dt,attack,release);
    let peakPower=0;
    for(let i=0;i<BAND_COUNT;i++){this.bandPower[i]=this.power(this.ranges[i]);peakPower=Math.max(peakPower,this.bandPower[i]);}
    let covered=0;
    for(let i=0;i<BAND_COUNT;i++){
      const amplitude=Math.sqrt(this.bandPower[i]);
      if(active&&amplitude>Math.max(0.001,Math.sqrt(peakPower)*0.07))covered++;
      f.bands[i]=smooth(f.bands[i],active?this.normalize(amplitude):0,dt,attack,release);
    }
    f.coverage=smooth(f.coverage,active?covered/BAND_COUNT:0,dt,0.12,0.45);
    const fullness=active?this.normalize(f.rms)*(0.12+0.68*Math.sqrt(f.coverage)+0.2*f.attackActivity):0;
    f.activity=smooth(f.activity,clamp(fullness),dt,0.2,0.65);
    // Store actual measured samples, never a synthesized sine. During inactivity fade the last frame.
    for(let i=0;i<WAVEFORM_SIZE;i++){
      f.waveform[i]=active?(Number.isFinite(pcm[Math.floor(i*pcm.length/WAVEFORM_SIZE)])?clamp(pcm[Math.floor(i*pcm.length/WAVEFORM_SIZE)],-1,1):0):f.waveform[i]*Math.exp(-dt/0.18);
    }
    if(!playing){this.primed=false;this.gate=false;}
    return f;
  }
}
