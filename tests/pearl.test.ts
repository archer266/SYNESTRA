import test from 'node:test';
import assert from 'node:assert/strict';
import { PearlMotion,PEARL_CENTERS,PEARL_RADIUS,pearlCameraHalfHeight } from '../src/visuals/pearlMotion';
import { defaultVisualConfig } from '../src/visuals/contracts';
import { validatePreferences } from '../src/visuals/preferences';
import type { MusicFeatures } from '../src/analysis/contracts';
const frame=():MusicFeatures=>({timestamp:0,sampleRate:48000,fftSize:4096,rms:.2,loudness:.7,envelope:0,bass:0,mids:0,treble:0,waveform:new Float32Array(512),bands:new Float32Array(64),bandFrequencies:new Float32Array(64),spectralFlux:0,onsetStrength:0,attack:false,attackActivity:0,coverage:.8,activity:.8,gated:false,suppressed:false});
const run=(f:MusicFeatures,seconds=4,rate=60,config=defaultVisualConfig)=>{const m=new PearlMotion();for(let i=0;i<seconds*rate;i++)m.update(f,config,1/rate);return m;};
test('Pearl replaces legacy Fused Bubbles preferences without discarding tuning',()=>{
 const p=validatePreferences({mode:'fused-bubbles',palette:'ember',motion:.2,quality:'economy',sensitivity:1.4,richness:.8,smoothing:.7});
 assert.equal(p.mode,'pearl');assert.equal(p.palette,'ember');assert.equal(p.motion,.2);assert.equal(p.sensitivity,1.4);
 assert.equal(defaultVisualConfig.mode,'classic');assert.equal(validatePreferences({mode:'spectrum'}).mode,'spectrum');
});
test('three stable separate pearls fit desktop, compact and narrow stage sizes',()=>{
 assert.equal(PEARL_CENTERS.length,3);
 for(const aspect of [3,2,1.4,.8,.5]){
  const half=pearlCameraHalfHeight(aspect),radius=PEARL_RADIUS*1.07;
  for(const [x,y] of PEARL_CENTERS){assert.ok(Math.abs(x)+radius<half*aspect);assert.ok(Math.abs(y)+radius<half);}
 }
 for(let i=0;i<3;i++)for(let j=i+1;j<3;j++){
  const d=Math.hypot(PEARL_CENTERS[i][0]-PEARL_CENTERS[j][0],PEARL_CENTERS[i][1]-PEARL_CENTERS[j][1]);
  assert.ok(d>PEARL_RADIUS*2.08);
 }
});
test('bass swells the left pearl, mids accelerate only center flow, highs only right flow',()=>{
 const baseline=run(frame());
 for(const [field,index] of [['bass',0],['mids',1],['treble',2]] as const){
  const f=frame();f[field]=1;const m=run(f);
  if(field==='bass'){
   assert.ok(m.radii[0]>baseline.radii[0]+.02);assert.equal(m.radii[1],baseline.radii[1]);assert.equal(m.radii[2],baseline.radii[2]);
  }else for(let i=0;i<3;i++){if(i===index)assert.ok(m.phases[i]>baseline.phases[i]+.1);else assert.equal(m.phases[i],baseline.phases[i]);}
 }
});
test('Pearl smoothing remains consistent across frame rates and settles after silence or seeking',()=>{
 const f=frame();f.bass=f.mids=f.treble=f.envelope=1;
 const a=run(f,5,60),b=run(f,5,144);
 for(let i=0;i<3;i++){assert.ok(Math.abs(a.phases[i]-b.phases[i])<.002);assert.ok(Math.abs(a.radii[i]-b.radii[i])<.001);}
 for(const suppressed of [true,false]){
  const m=run(f);const quiet={...f,suppressed,gated:!suppressed};
  for(let i=0;i<900;i++)m.update(quiet,defaultVisualConfig,1/60);
  assert.ok(m.bass<.001&&m.mids<.001&&m.highs<.001&&m.energy<.001);
  assert.ok([...m.radii,...m.phases,...m.offsets].every(Number.isFinite));
 }
});
test('reduced or zero motion removes decorative movement while preserving smoothed music measurements',()=>{
 const f=frame();f.bass=f.mids=f.treble=f.envelope=1;
 for(const config of [{...defaultVisualConfig,motion:0},{...defaultVisualConfig,reducedMotion:true}]){
  const initial=new PearlMotion(),m=run(f,5,60,config);
  assert.deepEqual(m.phases,initial.phases);assert.deepEqual([...m.radii],[1,1,1]);assert.ok([...m.offsets].every(x=>x===0));
  assert.ok(m.bass>.99&&m.mids>.99&&m.highs>.99);
 }
});
