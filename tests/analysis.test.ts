import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FeatureProcessor,dbToMagnitude,frequencyWeights } from '../src/analysis/processor';
import { fixture,scaled,broadFrequencies } from './fixtures';
const run=(processor: FeatureProcessor,signal: ReturnType<typeof fixture>,frames=180,playing=true,dt=1/60)=>{
  for(let i=0;i<frames;i++)processor.process(signal.db,signal.pcm,dt,playing,i*dt);
  return processor.features;
};
test('silence, invalid silence values and sub-gate signals stay finite and inactive',()=>{
  const processor=new FeatureProcessor(48000,4096),quiet=fixture(48000,4096,[80],0.0001);
  quiet.db[0]=-Infinity;quiet.db[1]=NaN;quiet.db[2]=Infinity;
  const f=run(processor,quiet);
  assert.equal(f.gated,true);assert.equal(f.attack,false);assert.equal(f.activity,0);assert.equal(f.bass,0);
  assert.ok(f.bands.every(x=>x===0));assert.ok(f.waveform.every(x=>x===0));
  const silent={pcm:new Float32Array(4096),db:new Float32Array(2048).fill(-Infinity)};
  silent.pcm[0]=NaN;silent.pcm[1]=Infinity;
  assert.equal(run(processor,silent).rms,0);
  assert.equal(dbToMagnitude(-Infinity),0);assert.equal(dbToMagnitude(NaN),0);
  assert.ok(Math.abs(dbToMagnitude(-20)-0.1)<1e-10);
});
test('physical Hz mapping at 44.1 and 48 kHz separates low and high tones',()=>{
  for(const sampleRate of [44100,48000]){
    const low=run(new FeatureProcessor(sampleRate,4096),fixture(sampleRate,4096,[80]));
    const high=run(new FeatureProcessor(sampleRate,4096),fixture(sampleRate,4096,[8000]));
    assert.ok(low.bass>0.6);assert.ok(low.mids<0.03&&low.treble<0.01);
    const mid=run(new FeatureProcessor(sampleRate,4096),fixture(sampleRate,4096,[1000]));
    assert.ok(mid.mids>0.6&&mid.bass<0.01&&mid.treble<0.01);
    assert.ok(high.treble>0.6);assert.ok(high.bass<0.01&&high.mids<0.01);
    let peak=0;for(let i=1;i<high.bands.length;i++)if(high.bands[i]>high.bands[peak])peak=i;
    assert.ok(Math.abs(Math.log(high.bandFrequencies[peak]/8000))<0.15);
    assert.ok(Math.abs(high.rms-0.18)<0.00001);
  }
  assert.deepEqual(frequencyWeights(2500,12000,4000,4096),[]);
  const weights=frequencyWeights(35,12000,16000,2048);
  assert.ok(weights.every(x=>x.bin<1024&&x.weight>0&&x.weight<=1));
});
test('sustained spectra do not fabricate attacks; separated bursts produce cooldown-limited attacks',()=>{
  const processor=new FeatureProcessor(48000,4096),signal=fixture(48000,4096,broadFrequencies);
  run(processor,signal,120);
  let sustained=0;for(let i=0;i<120;i++)if(processor.process(signal.db,signal.pcm,1/60,true).attack)sustained++;
  assert.equal(sustained,0);
  const off=scaled(signal,0);
  run(processor,off,45);
  const detections: number[]=[];
  for(let i=0;i<240;i++){
    const frame=i%45<7?signal:off;
    if(processor.process(frame.db,frame.pcm,1/60,true).attack)detections.push(i/60);
  }
  assert.ok(detections.length>=4&&detections.length<=6,JSON.stringify(detections));
  for(let i=1;i<detections.length;i++)assert.ok(detections[i]-detections[i-1]>=0.18);
});
test('RMS-matched sparse and broad rhythmic music have different fullness',()=>{
  const sparse=fixture(48000,4096,[80]),broad=fixture(48000,4096,broadFrequencies);
  const a=new FeatureProcessor(48000,4096),b=new FeatureProcessor(48000,4096);
  let sparseActivity=0,broadActivity=0,sparseCoverage=0,broadCoverage=0;
  for(let i=0;i<360;i++){
    const gain=i%40<10?1:0.35;
    const x=scaled(sparse,gain),y=scaled(broad,gain);
    a.process(x.db,x.pcm,1/60,true);b.process(y.db,y.pcm,1/60,true);
    assert.ok(Math.abs(a.features.rms-b.features.rms)<0.0001);
    if(i>120){sparseActivity+=a.features.activity;broadActivity+=b.features.activity;sparseCoverage+=a.features.coverage;broadCoverage+=b.features.coverage;}
  }
  assert.ok(broadActivity>sparseActivity*1.5,JSON.stringify({sparseActivity,broadActivity}));
  assert.ok(broadCoverage>sparseCoverage*2);
  const loudTone=run(new FeatureProcessor(48000,4096),fixture(48000,4096,[80],0.6));
  assert.ok(loudTone.activity<0.55,'a loud tone must not reach Peak');
});
test('measured waveform, finite bounds, silence/pause decay, and transition history reset',()=>{
  const processor=new FeatureProcessor(48000,4096),signal=fixture(48000,4096,broadFrequencies);
  const f=run(processor,signal);
  assert.ok(Math.abs(f.waveform[17]-signal.pcm[17*8])<1e-7);
  processor.reset();
  assert.equal(f.attackActivity,0);assert.equal(f.attack,false);
  for(let i=0;i<12;i++){
    const frame=processor.process(signal.db,signal.pcm,1/60,true);
    assert.equal(frame.attack,false);assert.equal(frame.suppressed,true);
  }
  run(processor,signal,60);
  for(const value of [f.bass,f.mids,f.treble,f.envelope,f.activity,f.coverage,f.rms,f.spectralFlux,f.onsetStrength,...f.bands])assert.ok(Number.isFinite(value)&&value>=0&&value<=1);
  run(processor,signal,300,false);
  assert.ok(f.activity<0.001&&f.bass<0.001&&f.envelope<0.02);
  assert.ok(f.waveform.every(x=>Math.abs(x)<0.0001));assert.equal(f.attack,false);assert.equal(f.rms,0);
  processor.reset();run(processor,signal,10);assert.equal(f.attack,false);
});
test('smoothing is time-based and buffer identities are stable',()=>{
  const a=new FeatureProcessor(48000,4096),b=new FeatureProcessor(48000,4096),signal=fixture();
  const bands=a.features.bands,waveform=a.features.waveform;
  run(a,signal,120,true,1/60);run(b,signal,240,true,1/120);
  assert.ok(Math.abs(a.features.bass-b.features.bass)<0.015);
  assert.ok(Math.abs(a.features.envelope-b.features.envelope)<0.015);
  assert.equal(a.features.bands,bands);assert.equal(a.features.waveform,waveform);
});
