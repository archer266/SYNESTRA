import { PresetCycle } from './milkdrop/cycle';
import { AnalysisService } from '../analysis/service';
import { player } from '../player/player';
import { ProgressionController } from './progression';
import { defaultVisualConfig,type VisualConfig,type VisualDiagnostics } from './contracts';
import { EngineSession } from './session';
import { engines } from './registry';
import { resolveRenderSize } from './sizing';
import { RenderScheduler,type FrameTiming } from './scheduler';
import { FrameComposer } from './frame';
import type { VisualFrame } from './engine';
/** One host clock and one passive analysis consumer across all engine changes. */
export class SceneDirector {
  private analysis=new AnalysisService(player.audio,player.graph);
  private progression=new ProgressionController();
  private composer=new FrameComposer();
  private cycle=new PresetCycle();
  private session:EngineSession;
  private scheduler:RenderScheduler;
  private config:VisualConfig;
  private observer:ResizeObserver;
  private motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  private size=resolveRenderSize(1,1,1,'balanced');
  private nativeVisible=true;private unsubscribeVisibility:()=>void;
  private disposed=false;private lastDiagnostic=0;private frameMs=1000/60;private cpuMs=0;
  private lastTrack:string|null=null;
  private unsubscribe:()=>void;
  private playback:VisualFrame['playback']={playing:false,paused:true,seeking:false,loading:false,ended:false,position:0,duration:0,trackId:null};
  constructor(private container:HTMLElement,private publish:(diagnostics:VisualDiagnostics)=>void,config:VisualConfig=defaultVisualConfig,private onConfiguration?:(patch:Partial<VisualConfig>)=>void){
    this.config={...config,reducedMotion:this.motion.matches};
    this.session=new EngineSession(engines,container,this.config,this.size);
    this.session.select(this.config.mode);
    this.analysis.configure(this.config);this.cycle.configure(this.config.milkdropPreset,this.config.milkdropCycle,this.config.milkdropInterval);
    this.scheduler=new RenderScheduler({request:callback=>requestAnimationFrame(callback),cancel:handle=>cancelAnimationFrame(handle)},this.tick);
    this.motion.addEventListener('change',this.motionChanged);
    document.addEventListener('visibilitychange',this.visibilityChanged);
    document.addEventListener('fullscreenchange',this.resize);
    window.addEventListener('resize',this.resize);
    this.observer=new ResizeObserver(this.resize);this.observer.observe(container);this.resize();
    this.lastTrack=player.snapshot().currentId;
    this.unsubscribe=player.subscribe(()=>{const id=player.snapshot().currentId;if(id!==this.lastTrack){this.lastTrack=id;this.analysis.reset();}});
    this.unsubscribeVisibility=window.synestra.watchVisibility(visible=>{this.nativeVisible=visible;this.visibilityChanged();});
    this.visibilityChanged();
  }
  private motionChanged=()=>{this.config={...this.config,reducedMotion:this.motion.matches};this.session.configure(this.config);};
  private visibilityChanged=()=>{
    if(this.disposed)return;
    if(document.hidden||!this.nativeVisible){this.scheduler.stop();this.analysis.stop();this.session.setActive(false);}
    else{this.analysis.reset();this.analysis.start();this.resize();this.session.setActive(true);this.scheduler.start();}
  };
  configure(config:Partial<VisualConfig>){
    if(this.disposed)return;
    const previous=this.config.mode;
    this.config={...this.config,...config,reducedMotion:this.motion.matches};
    this.cycle.configure(this.config.milkdropPreset,this.config.milkdropCycle,this.config.milkdropInterval);this.analysis.configure(this.config);this.session.configure(this.config);
    if(previous!==this.config.mode)this.session.select(this.config.mode);
    this.resize();
  }
  retryGraphics(){if(!this.disposed){this.session.retry();this.resize();}}
  private resize=()=>{
    if(this.disposed)return;
    const rect=this.container.getBoundingClientRect();
    this.size=resolveRenderSize(rect.width,rect.height,window.devicePixelRatio,this.config.quality,this.config.resolution);
    this.session.resize(this.size);
  };
  private tick=(timing:Readonly<FrameTiming>)=>{
    const start=performance.now();
    if(this.size.devicePixelRatio!==window.devicePixelRatio)this.resize();
    const features=this.analysis.latest,progression=this.progression.update(features,timing.delta);
    const state=player.snapshot(),audio=player.audio,p=this.playback;
    p.playing=state.playing;p.paused=audio.paused;p.seeking=audio.seeking;p.loading=state.loading;p.ended=audio.ended;
    p.position=Number.isFinite(audio.currentTime)?audio.currentTime:0;p.duration=Number.isFinite(audio.duration)?audio.duration:0;p.trackId=state.currentId;
    this.session.render(this.composer.compose(features,this.analysis.frequencyData,progression,timing,p,this.analysis.rawWaveform,this.analysis.intelligence));
    const next=this.cycle.update(timing.delta,this.config.mode==='milkdrop'&&!this.config.reducedMotion&&!this.session.fallbackReason&&p.playing&&!features.gated&&!features.suppressed);
    if(next){const patch={milkdropPreset:next};this.configure(patch);this.onConfiguration?.(patch);}
    const weight=1-Math.exp(-timing.delta/0.6);
    this.frameMs+=(timing.intervalMs-this.frameMs)*weight;this.cpuMs+=(performance.now()-start-this.cpuMs)*weight;
    if(timing.now-this.lastDiagnostic>=0.25){
      this.lastDiagnostic=timing.now;
      const canvas=this.container.querySelector('canvas'),info=this.session.info;
      this.publish({intelligence:{...this.analysis.intelligence},rms:features.rms,bass:features.bass,mids:features.mids,treble:features.treble,envelope:features.envelope,activity:features.activity,coverage:features.coverage,onsetStrength:features.onsetStrength,attackActivity:features.attackActivity,stage:progression.stage,groove:progression.groove,lift:progression.lift,peak:progression.peak,gated:features.gated,suppressed:features.suppressed,sampleRate:features.sampleRate,fftSize:features.fftSize,renderer:info?.id==='waveform'?'Waveform fallback':'WebGL',reducedMotion:this.config.reducedMotion,mode:this.config.mode,engine:info?.name??'Unavailable',backend:info?.capabilities.backend??'Unavailable',renderWidth:canvas?.width??0,renderHeight:canvas?.height??0,pixelRatio:this.size.pixelRatio,frameMs:this.frameMs,cpuMs:this.cpuMs,fps:1000/Math.max(0.001,this.frameMs),fallbackReason:this.session.fallbackReason,cleanupWarning:this.session.cleanupWarning});
    }
  };
  dispose(){
    if(this.disposed)return;this.disposed=true;this.scheduler.dispose();this.observer.disconnect();
    this.motion.removeEventListener('change',this.motionChanged);document.removeEventListener('visibilitychange',this.visibilityChanged);
    document.removeEventListener('fullscreenchange',this.resize);window.removeEventListener('resize',this.resize);
    this.unsubscribeVisibility();this.unsubscribe();this.analysis.dispose();this.session.dispose();
  }
}
