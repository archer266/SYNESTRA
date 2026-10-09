import test from 'node:test';
import assert from 'node:assert/strict';
import { IntelligenceProcessor } from '../src/analysis/intelligence';
import { AnalysisCadence } from '../src/analysis/cadence';
import { FeatureProcessor } from '../src/analysis/processor';
import { MusicalResponse } from '../src/visuals/musicalResponse';
import { defaultVisualConfig } from '../src/visuals/contracts';
import { validatePreferences } from '../src/visuals/preferences';
function rig(rate=48000,frequency=200){
 const tracker=new IntelligenceProcessor(),base=new FeatureProcessor(rate,4096).features,pcm=new Float32Array(4096);
 base.suppressed=false;base.gated=false;base.bass=.3;base.mids=.4;base.treble=.2;
 return {tracker,base,pcm,step(time:number,amplitude:number,playing=true){for(let i=0;i<pcm.length;i++)pcm[i]=amplitude*Math.sin(2*Math.PI*frequency*(time-(pcm.length-1-i)/rate));return tracker.process(pcm,rate,base,time,playing);}};
}
function pulses(bpm:number,level:number,renderHz=60){
 const r=rig(),events:number[]=[];let acquired:number|null=null,tempo:number|null=null,nextRender=0,reads=0;
 for(let i=1;i<=1400;i++){const t=i/100,phase=(t-.5)%(60/bpm),amp=t>=.5&&phase>=0&&phase<.08?level*Math.exp(-phase/.04):0;
 const f=r.step(t,amp);if(f.onset)events.push(t);if(f.tempoValid){acquired??=t;tempo=f.tempo;}
 if(t>=nextRender){void r.tracker.features.tempo;reads++;nextRender+=1/renderHz;}}
 const expected:number[]=[];for(let t=.5;t<=14.001;t+=60/bpm)expected.push(t);
 const matched=events.filter(t=>expected.some(e=>t>=e-.011&&t-e<=.08));
 return {events,acquired,tempo,precision:matched.length/events.length,recall:matched.length/expected.length,reads};
}
test('known pulses acquire tempo within 10 seconds, onset precision/recall >=90%, BPM error <=3%',()=>{
 const measurements=[];
 for(const bpm of [60,90,120,150,180])for(const level of [.015,.08,.4]){
 const m=pulses(bpm,level);assert.ok(m.precision>=.9,JSON.stringify({bpm,level,...m}));assert.ok(m.recall>=.9);assert.ok(m.acquired!==null&&m.acquired<=10);assert.ok(m.tempo!==null&&Math.abs(m.tempo-bpm)/bpm<=.03);measurements.push({bpm,level,precision:m.precision,recall:m.recall,acquired:m.acquired,estimated:m.tempo});}
 console.log('INTELLIGENCE_METRICS',JSON.stringify(measurements));
});
test('silence, near-silence and sustained tones do not invent onsets or tempo',()=>{
 for(const frequency of [20,35,40,80,200,1000,8000])for(const level of [0,.0005,.015,.4]){const r=rig(48000,frequency);let events=0;for(let i=1;i<=1500;i++){const f=r.step(i/100,level);events+=Number(f.onset);assert.equal(f.tempo,null);for(const value of Object.values(f))if(typeof value==='number')assert.ok(Number.isFinite(value));}assert.equal(events,0);}
});
test('isolated transients and deliberately irregular rhythms do not sustain confidence',()=>{
 for(const times of [[1,6,12],[.5,.78,1.47,1.85,2.79,3.31,3.61,4.45,4.88,5.6,6.58,6.91,7.53,8.4,8.69,9.21,10.11,10.5,11.33,11.63,12.2]]){
 const r=rig();let valid=0;for(let i=1;i<=1400;i++){const t=i/100,f=r.step(t,times.some(e=>t>=e&&t<e+.06)?.15:0);valid+=Number(f.tempoValid);}assert.equal(valid,0);}
});
test('gradual rises/falls produce bounded persistent energy heuristics',()=>{
 const r=rig();let rise=0,fall=0;
 for(let i=1;i<=3000;i++){const t=i/100,level=t<4?.01:t<14?.01+(t-4)*.018:t<18?.19:Math.max(0,.19-(t-18)*.018);const f=r.step(t,level);if(t>6&&t<16)rise=Math.max(rise,f.energyRise);if(t>20)fall=Math.max(fall,f.energyFall);assert.ok(f.energyRise>=0&&f.energyRise<=1&&f.energyFall>=0&&f.energyFall<=1);}
 assert.ok(rise>.15);assert.ok(fall>.15);
});
test('seek reset, pause and analysis gaps clear events, tempo and phase without catch-up',()=>{
 const r=rig();for(let i=1;i<=800;i++)r.step(i/100,i%50<8?.2:0);assert.ok(r.tracker.features.tempoValid);
 const epoch=r.tracker.features.epoch;r.tracker.reset();assert.equal(r.tracker.features.tempo,null);assert.equal(r.tracker.features.beatPhase,null);assert.equal(r.tracker.features.epoch,epoch+1);
 for(let i=1;i<20;i++)assert.equal(r.step(8+i/100,.2).onset,false);
 r.step(9,.2);assert.equal(r.tracker.features.tempo,null);assert.equal(r.tracker.features.onset,false);r.step(9.01,.2,false);assert.equal(r.tracker.features.valid,false);assert.equal(r.tracker.features.beat,false);
});
test('analysis results do not depend on renderer reads at 30/60/144 Hz',()=>{
 const results=[30,60,144].map(hz=>pulses(120,.08,hz));for(const result of results){assert.deepEqual(result.events,results[0].events);assert.equal(result.tempo,results[0].tempo);assert.equal(result.acquired,results[0].acquired);}
});
test('cadence owns one timer, stops/disposes cleanly and never catches up delayed samples',()=>{
 let now=0,id=0;const pending=new Map<number,()=>void>(),times:number[]=[];
 const c=new AnalysisCadence({now:()=>now,schedule:cb=>{pending.set(++id,cb);return id;},cancel:h=>{pending.delete(h as number);}},t=>times.push(t));
 c.start();c.start();assert.equal(pending.size,1);now=10;const [key,cb]=pending.entries().next().value!;pending.delete(key);cb();assert.deepEqual(times,[0,10]);assert.equal(pending.size,1);c.stop();assert.equal(pending.size,0);c.start();c.dispose();c.start();assert.equal(pending.size,0);
});
test('response off/reduced-motion is neutral, response bounded and preferences validated',()=>{
 const r=rig(),response=new MusicalResponse();for(let i=1;i<200;i++)response.update(r.step(i/100,i%50<8?.2:0),defaultVisualConfig,.01);assert.ok(response.flow>0);assert.ok(response.accent<=1);
 response.update(r.tracker.features,{...defaultVisualConfig,musicalResponse:0},.01);assert.deepEqual([response.accent,response.flow,response.rise,response.settle],[0,0,0,0]);
 response.update(r.tracker.features,{...defaultVisualConfig,reducedMotion:true},.01);assert.equal(response.flow,0);
 assert.equal(validatePreferences({musicalResponse:0}).musicalResponse,0);assert.equal(validatePreferences({musicalResponse:1}).musicalResponse,1);assert.equal(validatePreferences({musicalResponse:NaN}).musicalResponse,.5);
});

test('continuous PCM windows at 44.1/48 kHz retain onset accuracy and bounded latency',()=>{
 for(const rate of [44100,48000])for(const bpm of [60,120,180]){
 const r=rig(rate),events:number[]=[];
 for(let i=1;i<=1400;i++){const t=i/100;for(let j=0;j<r.pcm.length;j++){const s=t-(r.pcm.length-1-j)/rate,phase=(s-.5)%(60/bpm);r.pcm[j]=s>=.5&&phase>=0&&phase<.08?.08*Math.exp(-phase/.04)*Math.sin(2*Math.PI*200*s):0;}const f=r.tracker.process(r.pcm,rate,r.base,t,true);if(f.onset)events.push(t);}
 const expected:number[]=[];for(let t=.5;t<13.95;t+=60/bpm)expected.push(t);
 const delays=expected.map(e=>events.find(t=>t>=e-.001&&t-e<=.08)).filter((t):t is number=>t!==undefined);
 assert.ok(delays.length/expected.length>=.9);assert.ok(r.tracker.features.tempo!==null&&Math.abs(r.tracker.features.tempo-bpm)/bpm<.03);
 console.log('CONTINUOUS_PCM',JSON.stringify({rate,bpm,events:events.length,expected:expected.length,estimated:r.tracker.features.tempo}));
 }
});
