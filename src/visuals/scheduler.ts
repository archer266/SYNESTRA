export interface FrameClock { request(callback:(milliseconds:number)=>void):number;cancel(handle:number):void }
export interface FrameTiming { now:number;delta:number;elapsed:number;frame:number;intervalMs:number }
export class RenderScheduler {
  private handle:number|null=null;
  private running=false;
  private disposed=false;
  private last:number|null=null;
  readonly timing:FrameTiming={now:0,delta:0,elapsed:0,frame:0,intervalMs:0};
  constructor(private clock:FrameClock,private render:(timing:Readonly<FrameTiming>)=>void){}
  start(){if(this.running||this.disposed)return;this.running=true;this.last=null;this.handle=this.clock.request(this.tick);}
  stop(){this.running=false;this.last=null;if(this.handle!==null)this.clock.cancel(this.handle);this.handle=null;}
  private tick=(milliseconds:number)=>{
    this.handle=null;if(!this.running||this.disposed)return;
    const interval=this.last===null?1000/60:Math.max(0,milliseconds-this.last);this.last=milliseconds;
    this.timing.now=milliseconds/1000;this.timing.intervalMs=interval;this.timing.delta=Math.min(.1,interval/1000);
    this.timing.elapsed+=this.timing.delta;this.timing.frame++;
    try{this.render(this.timing);}finally{if(this.running&&!this.disposed)this.handle=this.clock.request(this.tick);}
  };
  dispose(){this.disposed=true;this.stop();}
}
