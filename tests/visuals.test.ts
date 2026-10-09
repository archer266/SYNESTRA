import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultVisualConfig } from '../src/visuals/contracts';
import { validatePreferences } from '../src/visuals/preferences';
import { renderingRatio } from '../src/visuals/palettes';
test('visual preferences reject corrupt, unknown and non-finite fields without persisting audio or OS state',()=>{
 assert.deepEqual(validatePreferences(null),defaultVisualConfig);
 assert.deepEqual(validatePreferences({mode:'future',palette:'bad',motion:NaN,sensitivity:Infinity,reducedMotion:true,playing:true}),defaultVisualConfig);
 const p=validatePreferences({mode:'spectrum',layout:'linear',palette:'ember',quality:'economy',motion:0,richness:1,sensitivity:2,smoothing:.9});
 assert.equal(p.mode,'spectrum');assert.equal(p.palette,'ember');assert.equal(p.motion,0);assert.equal(p.quality,'economy');
 assert.equal('playing' in p,false);
});
test('render resolution has bounded pixel budgets at high DPI',()=>{
 for(const quality of ['balanced','economy'] as const)for(const [w,h,dpr] of [[7680,4320,3],[1200,900,2],[600,400,1]]){
 const r=renderingRatio(w,h,dpr,quality);
 assert.ok(w*h*r*r<=(quality==='economy'?850000:1600000)+1);assert.ok(r<=dpr);
 }
});
