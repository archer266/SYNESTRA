import type { VisualConfig } from './contracts';
import type { EngineDefinition,RenderSize,VisualEngine,VisualFrame } from './engine';
import { EngineRegistry } from './engine';
/** Central lifecycle and failure containment. No clocks, audio routes or engine-specific resources. */
export class EngineSession {
  private current?: VisualEngine;
  private definition?: EngineDefinition;
  private generation=0;
  private active=false;
  private disposed=false;
  private pendingFailure: string|null=null;
  selected='';
  fallbackReason: string|null=null;
  cleanupWarning: string|null=null;
  constructor(private registry:EngineRegistry,private container:HTMLElement,private config:VisualConfig,private size:RenderSize){}
  get info(){return this.definition;}
  private release(){
    const current=this.current;this.current=undefined;
    try{current?.deactivate();}catch(error){this.cleanupWarning=String(error);}
    try{current?.dispose();}catch(error){this.cleanupWarning=String(error);}
  }
  private replace(definition:EngineDefinition){
    const generation=++this.generation;this.release();this.pendingFailure=null;this.definition=definition;
    try{
      this.current=definition.create();
      this.current.initialize({container:this.container,reportFailure:reason=>{if(!this.disposed&&generation===this.generation)this.pendingFailure=reason;}});
      this.current.configure(this.config);this.current.resize(this.size);
      if(this.active)this.current.activate();
    }catch(error){
      this.release();
      if(definition.id!=='waveform')this.fallback('Engine initialization failed: '+String(error));
      else this.fallbackReason='Fallback unavailable: '+String(error);
    }
  }
  select(id:string,force=false){
    if(this.disposed)return;
    const definition=this.registry.get(id); // Validate before touching the working engine.
    if(id===this.selected&&!force)return;
    this.selected=id;this.fallbackReason=null;
    if((this.config.reducedMotion||this.config.motion===0)&&!definition.capabilities.reducedMotion)this.fallback(this.config.reducedMotion?'Reduced motion: measured waveform':'Motion disabled: measured waveform');else this.replace(definition);
  }
  retry(){this.select(this.selected,true);}
  private fallback(reason:string){this.fallbackReason=reason;this.replace(this.registry.get('waveform'));}
  configure(config:VisualConfig){
    if(this.disposed)return;const changed=this.config.reducedMotion!==config.reducedMotion||(this.config.motion===0)!==(config.motion===0);this.config=config;
    if(changed&&this.selected&&!this.registry.get(this.selected).capabilities.reducedMotion){this.select(this.selected,true);return;}
    try{this.current?.configure(config);}catch(error){this.pendingFailure='Configuration failed: '+String(error);}
  }
  resize(size:RenderSize){
    if(this.disposed)return;this.size=size;
    try{this.current?.resize(size);}catch(error){this.pendingFailure='Resize failed: '+String(error);}
  }
  setActive(active:boolean){
    if(this.disposed||this.active===active)return;this.active=active;
    try{if(active)this.current?.activate();else this.current?.deactivate();}catch(error){this.pendingFailure='Activation failed: '+String(error);}
  }
  render(frame:Readonly<VisualFrame>){
    if(this.disposed||!this.active)return;
    if(this.pendingFailure){
      const reason=this.pendingFailure;this.pendingFailure=null;
      if(this.definition?.id!=='waveform')this.fallback(reason);else this.fallbackReason=reason;
    }
    try{this.current?.render(frame);}catch(error){if(this.definition?.id!=='waveform')this.fallback('Render failed: '+String(error));else this.fallbackReason='Fallback render failed: '+String(error);}
  }
  dispose(){if(this.disposed)return;this.disposed=true;++this.generation;this.release();}
}
