import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transition, shuffled } from '../src/player/queue';
const order=['a','b','c'];
test('empty queue, first selection, normal next and previous',()=>{
 assert.equal(transition([],null,1,'off'),null);
 assert.equal(transition(order,null,1,'off'),'a');
 assert.equal(transition(order,'a',1,'off'),'b');
 assert.equal(transition(order,'b',-1,'off'),'a');
});
test('completion and repeat boundaries',()=>{
 assert.equal(transition(order,'c',1,'off',true),null);
 assert.equal(transition(order,'c',1,'all',true),'a');
 assert.equal(transition(order,'a',-1,'all'),'c');
 assert.equal(transition(order,'b',1,'one',true),'b');
 assert.equal(transition(order,'b',1,'one',false),'c');
 assert.equal(transition(['a'],'a',1,'all',true),'a');
 assert.equal(transition(['a'],'a',1,'off',true),null);
 assert.equal(transition(order,'a',-1,'off'),null);
});
test('shuffle is a permutation, does not mutate input, and traverses once before completion',()=>{
 const mixed=shuffled(order,()=>0);
 assert.deepEqual(order,['a','b','c']);
 assert.deepEqual([...mixed].sort(),order);
 assert.equal(new Set(mixed).size,3);
 assert.equal(transition(mixed,mixed[2],1,'off',true),null);
 assert.deepEqual(shuffled([]),[]);
});
