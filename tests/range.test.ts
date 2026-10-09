import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRange } from '../electron/range';
test('whole resource, bounded, open-ended, suffix and clamped ranges',()=>{
  assert.equal(parseRange(null,100),null);
  assert.deepEqual(parseRange('bytes=10-19',100),{start:10,end:19});
  assert.deepEqual(parseRange('bytes=50-',100),{start:50,end:99});
  assert.deepEqual(parseRange('bytes=-15',100),{start:85,end:99});
  assert.deepEqual(parseRange('bytes=-200',100),{start:0,end:99});
  assert.deepEqual(parseRange('bytes=0-200',100),{start:0,end:99});
  assert.deepEqual(parseRange('bytes=99-99',100),{start:99,end:99});
});
test('reject malformed, multipart, reversed, unsafe, zero suffix and unsatisfiable ranges',()=>{
  for(const value of ['bytes=100-','bytes=10-9','bytes=-0','bytes=-','bytes=1-2,4-5','items=0-1','bytes=9007199254740993-','bytes=0-NaN'])assert.equal(parseRange(value,100),'invalid',value);
  assert.equal(parseRange('bytes=0-',0),'invalid');
});
