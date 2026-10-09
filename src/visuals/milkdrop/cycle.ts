import { milkdropPresets,isPreset,type PresetId } from './catalog';
export const adjacentPreset=(id:string,direction:number):PresetId=>milkdropPresets[(Math.max(0,milkdropPresets.findIndex(p=>p.id===id))+direction%milkdropPresets.length+milkdropPresets.length)%milkdropPresets.length].id;
export function randomPreset(id:string,random=Math.random):PresetId{
 const choices=milkdropPresets.filter(p=>p.id!==id),value=random();
 return choices[Math.min(choices.length-1,Math.max(0,Math.floor((Number.isFinite(value)?value:0)*choices.length)))].id;
}
/** No timers: advances only for eligible active playback time supplied by the host. */
export class PresetCycle {
 private elapsed=0;private id:PresetId='aurora';private interval=45;private enabled=false;
 configure(id:string,enabled:boolean,interval:number){
  const valid=isPreset(id)?id:'aurora',seconds=Number.isFinite(interval)?Math.max(15,Math.min(300,interval)):45;
  if(valid!==this.id||enabled!==this.enabled||seconds!==this.interval)this.elapsed=0;
  this.id=valid;this.enabled=enabled;this.interval=seconds;
 }
 update(delta:number,eligible:boolean):PresetId|null{
  if(!eligible||!this.enabled||!Number.isFinite(delta)||delta<=0)return null;
  this.elapsed+=delta;if(this.elapsed+1e-8<this.interval)return null;
  this.elapsed=0;this.id=adjacentPreset(this.id,1);return this.id;
 }
}
