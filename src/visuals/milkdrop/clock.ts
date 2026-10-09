/** Pinned 2.6.7 adapter: legacy render time otherwise advances by estimated FPS.
 * Preset transitions use host seconds, independently of motion speed/frame rate. */
import type { MilkRenderer } from './types';
export function driveMilkClock(renderer:MilkRenderer,speed:()=>number){
 renderer.calcTimeAndFPS=(delta:number)=>{
  const dt=Math.max(.0001,Math.min(.1,Number.isFinite(delta)?delta:1/60));
  renderer.fps=1/dt;renderer.time+=dt*speed();
  if(renderer.blending){renderer.blendProgress=Math.min(1,renderer.blendProgress+dt/Math.max(.001,renderer.blendDuration));if(renderer.blendProgress>=1)renderer.blending=false;}
 };
}
