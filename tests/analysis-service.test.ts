import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AnalysisService } from '../src/analysis/service';
import type { AudioGraph } from '../src/player/audioGraph';
import { fixture } from './fixtures';
test('analysis lifecycle uses the actual graph format and resets on seek/track events without owning audio',()=>{
 const audio=Object.assign(new EventTarget(),{paused:false,ended:false,seeking:false,readyState:4});
 const signal=fixture(44100,4096,[1000]);
 const nodeRef: {current: AnalyserNode|undefined}={current:undefined};
 const graph={getAnalysisNode:()=>nodeRef.current} as AudioGraph;
 const service=new AnalysisService(audio as HTMLAudioElement,graph);
 service.configure({sensitivity:1.1,smoothing:0.4});
 assert.equal(service.sample(0).sampleRate,0);
 nodeRef.current={context:{sampleRate:44100,state:'running'},fftSize:4096,frequencyBinCount:2048,
   getFloatFrequencyData:(target: Float32Array)=>target.set(signal.db),
   getFloatTimeDomainData:(target: Float32Array)=>target.set(signal.pcm)} as AnalyserNode;
 let time=0;
 const advance=(frames: number)=>{for(let i=0;i<frames;i++)service.sample(time+=1/60);return service.sample(time);};
 let f=advance(120);
 assert.equal(f.sampleRate,44100);assert.equal(f.fftSize,4096);assert.ok(f.mids>0.6);
 for(const event of ['seeking','seeked','emptied','loadstart']){
   audio.dispatchEvent(new Event(event));
   f=advance(1);assert.equal(f.suppressed,true);assert.equal(f.attack,false);assert.equal(f.attackActivity,0);
   advance(30);
 }
 audio.paused=true;f=advance(240);assert.equal(f.rms,0);assert.ok(f.activity<0.01);
 audio.paused=false;audio.dispatchEvent(new Event('playing'));f=advance(1);assert.equal(f.suppressed,true);
 advance(60);
 service.dispose();audio.dispatchEvent(new Event('seeking'));
 assert.equal(service.sample(time+=1/60).suppressed,false,'disposed service removes its lifecycle listeners');
});

test('service actually publishes intelligence and gain-independent PCM without renderer sampling',()=>{
 const audio=Object.assign(new EventTarget(),{paused:false,ended:false,seeking:false,readyState:4});let time=0;const pcm=new Float32Array(4096);
 const node={context:{sampleRate:48000,state:'running'},fftSize:4096,frequencyBinCount:2048,getFloatFrequencyData:(a:Float32Array)=>{a.fill(-40);},getFloatTimeDomainData:(a:Float32Array)=>{for(let i=0;i<a.length;i++)a[i]=time%.5<.08?.15*Math.sin(i*.2):0;pcm.set(a);}} as AnalyserNode;
 const service=new AnalysisService(audio as HTMLAudioElement,{getAnalysisNode:()=>node} as AudioGraph);
 for(let i=1;i<=1000;i++){time=i/100;service.sample(time);}
 assert.equal(service.intelligence.valid,true);assert.ok(service.intelligence.tempoValid);assert.ok(Math.abs(service.intelligence.tempo!-120)<3);assert.ok(service.latest.sampleRate===48000);
 audio.dispatchEvent(new Event('pause'));assert.equal(service.intelligence.tempo,null);service.dispose();
});
