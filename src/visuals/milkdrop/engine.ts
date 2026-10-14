import { preparePreset } from './prepare';
import { MusicalResponse } from '../musicalResponse';
import type { VisualEngine,EngineContext,RenderSize,VisualFrame } from '../engine';
import { defaultVisualConfig,type VisualConfig } from '../contracts';
import { presets } from './presets.generated';
import type { MilkFactory,MilkVisualizer } from './types';
import { MilkAudioInput } from './audio';
import { driveMilkClock } from './clock';
import { GLResources } from './resources';
/** Exclusive graphics, borrowed PCM, no audio nodes or loop. Dynamic loading is generation/disposal-safe. */
export class MilkDropEngine implements VisualEngine {
 private canvas?:HTMLCanvasElement;private resources?:GLResources;private visualizer?:MilkVisualizer;
 private context?:EngineContext;private config={...defaultVisualConfig};private size?:Readonly<RenderSize>;
 private active=false;private disposed=false;private audio=new MilkAudioInput();private speed=.5;private track:string|null=null;
 private response=new MusicalResponse();private presentation='';
 private lastSweep=0;private loading?:HTMLDivElement;
 private selected='';private lastWidth=0;private lastHeight=0;private lastQuality='';
 constructor(private load:()=>Promise<MilkFactory>=()=>import('butterchurn').then(module=>{const api=module.default as unknown as {createVisualizer?:MilkFactory;default?:{createVisualizer:MilkFactory}};const factory=api.createVisualizer??api.default?.createVisualizer;if(!factory)throw new Error('Unsupported Butterchurn export');return factory;})){}
 initialize(context:EngineContext){
  if(this.canvas||this.disposed)throw new Error('MilkDrop cannot be initialized twice');
  this.context=context;this.canvas=document.createElement('canvas');this.canvas.setAttribute('aria-label','MilkDrop loading');
  this.canvas.addEventListener('webglcontextlost',this.lost);context.container.appendChild(this.canvas);
  this.loading=document.createElement('div');this.loading.className='engine-loading';this.loading.textContent='Preparing MilkDrop...';this.loading.setAttribute('role','status');context.container.appendChild(this.loading);
  void this.load().then(factory=>{
   if(this.disposed||!this.canvas)return;
   const native=this.canvas.getContext('webgl2',{alpha:false,antialias:false,depth:false,stencil:false,premultipliedAlpha:false});
   if(!native)throw new Error('WebGL 2 is unavailable');
   this.resources=new GLResources(native);
   // Only this private canvas is adapted; no prototypes or other engines are modified.
   Object.defineProperty(this.canvas,'getContext',{value:(kind:string)=>kind==='webgl2'?this.resources?.gl:null,configurable:true});
   this.visualizer=factory(null,this.canvas,{width:1,height:1,pixelRatio:1,textureRatio:1,meshWidth:32,meshHeight:24,outputFXAA:false});
   driveMilkClock(this.visualizer.renderer,()=>this.speed);
   this.canvas.setAttribute('aria-label','MilkDrop visualizer');this.applyPreset(0);this.loading?.remove();this.loading=undefined;if(this.size)this.resize(this.size);this.resources.sweep(this.visualizer);
  }).catch(error=>{if(!this.disposed)context.reportFailure('MilkDrop initialization: '+String(error));});
 }
 private lost=(event:Event)=>{event.preventDefault();if(!this.disposed)this.context?.reportFailure('MilkDrop GPU context lost');};
 configure(config:Readonly<VisualConfig>){
  this.config={...config};
  if(this.canvas){const hue=config.palette==='glacier'?-35:config.palette==='ember'?85:0;this.canvas.style.filter=`hue-rotate(${hue}deg) saturate(${.8+.5*config.richness})`;}
  if(this.visualizer&&this.selected!==config.milkdropPreset)this.applyPreset(config.milkdropTransition);
 }
 private applyPreset(seconds:number){
  if(!this.visualizer)return;
  const source=presets[this.config.milkdropPreset];
  // Upstream mutates nested baseVals; never mutate the static catalog shared between engine instances.
  const copy=preparePreset(this.config.milkdropPreset,source);
  this.visualizer.loadPreset(copy,seconds);this.selected=this.config.milkdropPreset;
  this.resources?.sweep(this.visualizer);
 }
 resize(size:Readonly<RenderSize>){
  this.size=size;if(!this.visualizer||!this.canvas)return;
  if(size.width===this.lastWidth&&size.height===this.lastHeight&&this.lastQuality===this.config.quality)return;
  this.lastWidth=size.width;this.lastHeight=size.height;this.lastQuality=this.config.quality;
  this.canvas.width=size.width;this.canvas.height=size.height;
  const mesh=this.config.quality==='economy'?24:this.config.quality==='high'?64:40;
  this.visualizer.setRendererSize(size.width,size.height,{pixelRatio:1,textureRatio:1,meshWidth:mesh,meshHeight:Math.round(mesh*.75)});
  this.resources?.sweep(this.visualizer);
 }
 activate(){this.active=true;this.audio.reset();}
 deactivate(){this.active=false;}
 render(frame:Readonly<VisualFrame>){
  if(!this.active||this.disposed||!this.visualizer)return;
  if(this.track!==frame.playback.trackId||frame.playback.seeking||frame.features.suppressed){this.track=frame.playback.trackId;this.audio.reset();}
  const running=frame.playback.playing&&!frame.playback.paused&&!frame.playback.ended&&!frame.playback.seeking&&!frame.features.gated&&!frame.features.suppressed;
  this.speed+=( (running ? .25+.75*this.config.motion : .06)-this.speed)*(1-Math.exp(-frame.timing.delta/.8));
  const audioLevels=this.audio.update(frame.rawWaveform,frame.features.sampleRate,running,this.config.sensitivity,this.config.smoothing,frame.timing.delta);
  this.visualizer.render({elapsedTime:frame.timing.delta,audioLevels});
  const response=this.response.update(frame.intelligence,this.config,frame.timing.delta);
  // Presentation-only <= 4% light modulation. Never changes library PCM, clock or preset equations.
  const hue=this.config.palette==='glacier'?-35:this.config.palette==='ember'?85:0;
  const presentation=`hue-rotate(${hue}deg) saturate(${.8+.5*this.config.richness}) brightness(${(1+response.accent*.025+response.flow*.015).toFixed(3)})`;
  if(this.canvas&&presentation!==this.presentation){this.canvas.style.filter=presentation;this.presentation=presentation;}
  if(frame.timing.elapsed-this.lastSweep>=2){this.lastSweep=frame.timing.elapsed;this.resources?.sweep(this.visualizer);}
  if(this.canvas){this.canvas.dataset.resources=String(this.resources?.count??0);this.canvas.dataset.preset=this.selected;this.canvas.dataset.blend=this.visualizer.renderer.blendProgress.toFixed(3);}
 }
 dispose(){
  if(this.disposed)return;this.disposed=true;this.active=false;this.canvas?.removeEventListener('webglcontextlost',this.lost);
  this.loading?.remove();this.loading=undefined;this.resources?.dispose();this.visualizer=undefined;this.resources=undefined;this.canvas?.remove();this.canvas=undefined;this.context=undefined;
 }
}
