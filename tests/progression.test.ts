import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ProgressionController } from '../src/visuals/progression';
const advance=(p: ProgressionController,activity: number,seconds: number)=>{for(let i=0;i<seconds*60;i++)p.update({activity},1/60);return p.state;};
test('structural growth, slower recession, bounded continuous weights and hysteresis',()=>{
 const p=new ProgressionController();
 advance(p,1,0.65);assert.ok(p.state.activity>0.6&&p.state.activity<0.65);
 advance(p,1,3);assert.equal(p.state.stage,'Peak');assert.ok(p.state.peak>0.95);
 const before=p.state.activity;advance(p,0,0.65);assert.ok(p.state.activity>before*0.6);
 advance(p,0,10);assert.equal(p.state.stage,'Quiet');assert.equal(p.state.peak,0);
 advance(p,0.29,5);assert.equal(p.state.stage,'Groove');
 for(let i=0;i<240;i++){p.update({activity:i%2?0.23:0.25},1/60);assert.equal(p.state.stage,'Groove');}
 for(const value of [p.state.activity,p.state.groove,p.state.lift,p.state.peak])assert.ok(value>=0&&value<=1);
 p.reset();assert.equal(p.state.stage,'Quiet');assert.equal(p.state.activity,0);
});
