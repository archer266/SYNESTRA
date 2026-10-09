import { IntelligenceProcessor } from './intelligence';
import { AnalysisCadence } from './cadence';
import type { AudioGraph } from '../player/audioGraph';
import type { AnalysisConfig, MusicFeatureSource } from './contracts';
import { FeatureProcessor } from './processor';
/** Passive consumer of the player's pre-gain analyser. Owns no audio nodes or animation loop. */
export class AnalysisService implements MusicFeatureSource {
  private intelligenceProcessor=new IntelligenceProcessor();
  private cadence=new AnalysisCadence({now:()=>performance.now()/1000,schedule:(cb,ms)=>setTimeout(cb,ms),cancel:handle=>clearTimeout(handle as ReturnType<typeof setTimeout>)},time=>this.sample(time));
  get intelligence(){return this.intelligenceProcessor.features;}
  get latest(){return this.processor.features;}
  start(){this.cadence.start();}
  stop(){this.cadence.stop();this.reset();}
  private processor=new FeatureProcessor(48000,2048);
  private frequency=new Float32Array(1024);
  private waveform=new Float32Array(2048);
  private lastTime: number | null=null;
  private analyser?: AnalyserNode;
  private config: Partial<AnalysisConfig>={};
  private resetEvents=['loadstart','emptied','seeking','seeked','playing','pause','ended','waiting'] as const;
  constructor(private audio: HTMLAudioElement,private graph: AudioGraph){
    for(const event of this.resetEvents)audio.addEventListener(event,this.reset);
  }
  /** Borrowed contiguous PCM; valid until the next analysis sample. */
  get rawWaveform():Readonly<Float32Array>{return this.waveform;}
  get frequencyData(): Readonly<Float32Array>{return this.frequency;}
  reset=()=>{this.processor.reset();this.intelligenceProcessor.reset();};
  configure(config: Partial<AnalysisConfig>){this.config={...this.config,...config};this.processor.configure(this.config);}
  sample(timeSeconds: number){
    const node=this.graph.getAnalysisNode();
    if(node&&node!==this.analyser){
      this.analyser=node;
      this.processor=new FeatureProcessor(node.context.sampleRate,node.fftSize);
      this.processor.configure(this.config);
      this.frequency=new Float32Array(node.frequencyBinCount);this.waveform=new Float32Array(node.fftSize);
    }
    const dt=this.lastTime===null?1/60:Math.max(0,timeSeconds-this.lastTime);
    if(dt>0.1)this.reset(); // Background-tab/resume discontinuity is not an attack.
    this.lastTime=timeSeconds;
    const playing=!!node&&node.context.state==='running'&&!this.audio.paused&&!this.audio.ended&&!this.audio.seeking&&this.audio.readyState>=3;
    if(playing){node.getFloatFrequencyData(this.frequency);node.getFloatTimeDomainData(this.waveform);}
    else{this.frequency.fill(-Infinity);this.waveform.fill(0);}
    this.processor.process(this.frequency,this.waveform,dt,playing,timeSeconds);
    this.processor.features.sampleRate=node?.context.sampleRate??0;
    this.processor.features.fftSize=node?.fftSize??0;
    this.intelligenceProcessor.process(this.waveform,node?.context.sampleRate??0,this.processor.features,timeSeconds,playing);
    return this.processor.features;
  }
  dispose(){this.cadence.dispose();for(const event of this.resetEvents)this.audio.removeEventListener(event,this.reset);}
}
