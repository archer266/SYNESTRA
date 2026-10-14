import type { MilkPreset } from './types';
/** Own mutable preset values; leave vendored author sources intact. */
export function preparePreset(id:string,source:MilkPreset):MilkPreset{
 const copy:MilkPreset={...source,baseVals:{...source.baseVals},shapes:source.shapes.map(p=>({...p,baseVals:{...p.baseVals}})),waves:source.waves.map(p=>({...p,baseVals:{...p.baseVals}}))};
 if(id==='aurora'){
  copy.warp=source.warp.replace('ret_2 - 0.01','ret_2 * 0.995 - 0.001');
  // Aurora's tiny basic wave can leave its feedback almost black on quiet PCM.
  // A faint native shape seeds the author's existing warp, without amplifying audio.
  copy.shapes[0]={baseVals:{enabled:1,sides:32,additive:1,thickOutline:0,textured:0,num_inst:1,x:.5,y:.5,rad:.045,ang:0,r:.12,g:.45,b:.3,a:.035,r2:.04,g2:.1,b2:.2,a2:0,border_r:0,border_g:0,border_b:0,border_a:0},init_eqs:a=>a,frame_eqs:a=>{
   a.x=.5+.19*Math.sin(a.time*.21);a.y=.5+.17*Math.cos(a.time*.17);a.rad=.085+.018*Math.min(3,Math.max(0,a.bass_att));a.a=.18+.035*Math.min(3,Math.max(0,a.bass));return a;
  }};
 }
 // The original composite multiplies by 1.49 before squaring, clipping pale
 // passages to white. Preserve its symmetry/feedback and lower only that exposure.
 if(id==='galaxy')copy.comp=source.comp.replace('ret_1 * 1.7','ret_1 * 1.0');
 if(id==='kaleidoscope')copy.comp=source.comp.replace('ret_1 * 1.49','ret_1 * 0.88');
 // The original starburst is almost entirely time-driven. Its native bass/mid
 // levels now gently expand the feedback rays; this does not synthesize beats.
 if(id==='starburst'){
  const original=copy.frame_eqs!;
  copy.frame_eqs=a=>{a=original(a);const bass=Math.min(2,Math.max(0,a.bass_att));a.zoom=1.015+.012*bass;a.rot=.002*(Math.min(2,Math.max(0,a.mid_att))-1);return a;};
 }
 return copy;
}
