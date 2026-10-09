/** Best-effort 100 Hz sampling, independent of RAF. No catch-up after a delayed callback. */
export interface AnalysisClock { now():number; schedule(callback:()=>void,ms:number):unknown; cancel(handle:unknown):void }
export class AnalysisCadence {
 private handle:unknown;private active=false;private disposed=false;
 constructor(private clock:AnalysisClock,private sample:(time:number)=>void){}
 start(){if(this.active||this.disposed)return;this.active=true;this.tick();}
 private tick=()=>{if(!this.active)return;this.sample(this.clock.now());if(this.active)this.handle=this.clock.schedule(this.tick,10);};
 stop(){this.active=false;if(this.handle!==undefined)this.clock.cancel(this.handle);this.handle=undefined;}
 dispose(){this.stop();this.disposed=true;}
}
