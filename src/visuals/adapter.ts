import type { VisualConfig,VisualWorld } from './contracts';
import type { EngineContext,RenderSize,VisualEngine,VisualFrame } from './engine';
/** Migration boundary: existing Three/canvas worlds keep isolated graphics, no scheduling/audio access. */
export class WorldAdapter implements VisualEngine {
  private world?: VisualWorld;
  private active=false;
  private disposed=false;
  constructor(private create:(failure:(reason?:string)=>void)=>VisualWorld){}
  initialize(context:EngineContext){
    if(this.world||this.disposed)throw new Error('Engine cannot be initialized twice');
    this.world=this.create(reason=>context.reportFailure(reason??'GPU context or shader failure'));
    this.world.initialize(context.container);
  }
  configure(config:Readonly<VisualConfig>){this.world?.configure(config);}
  resize(size:Readonly<RenderSize>){this.world?.resize(size.cssWidth,size.cssHeight,size.pixelRatio);}
  activate(){if(!this.disposed)this.active=true;}
  render(frame:Readonly<VisualFrame>){if(this.active&&!this.disposed)this.world?.update(frame.features,frame.progression,frame.timing.delta,frame.intelligence);}
  deactivate(){this.active=false;}
  dispose(){if(this.disposed)return;this.disposed=true;this.active=false;this.world?.dispose();this.world=undefined;}
}
