import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { serveMedia } from '../electron/media';
import { TrackLibrary } from '../electron/library';
test('stream real bytes across repeated seeks; reject unknown IDs and traversal; restore stable IDs',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'synestra-test-'));
 try{
  const file=join(directory,'test.mp3');
  const bytes=Buffer.alloc(1024*1024);for(let i=0;i<bytes.length;i++)bytes[i]=i%251;
  await writeFile(file,bytes);
  const library=new TrackLibrary(join(directory,'data'));
  await library.load();await library.import([file]);
  const id=library.snapshot().tracks[0].id;
  const url='synestra-media://track/'+id;
  const restored=new TrackLibrary(join(directory,'data'));await restored.load();
  assert.equal(restored.snapshot().tracks[0].id,id);
  await restored.import([file]);assert.equal(restored.snapshot().tracks.length,1);
  assert.equal('path' in restored.snapshot().tracks[0],false);
  for(const [start,end] of [[0,99],[900000,900099],[1024,2047],[800000,800200],[5,15]]){
   const response=await serveMedia(new Request(url,{headers:{Range:'bytes='+start+'-'+end}}),library);
   assert.equal(response.status,206);
   assert.equal(response.headers.get('Content-Range'),'bytes '+start+'-'+end+'/'+bytes.length);
   assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes.subarray(start,end+1));
  }
  const head=await serveMedia(new Request(url,{method:'HEAD'}),library);
  assert.equal(head.headers.get('content-length'),String(bytes.length));assert.equal((await head.arrayBuffer()).byteLength,0);
  const invalid=await serveMedia(new Request(url,{headers:{Range:'bytes=9999999-'}}),library);
  assert.equal(invalid.status,416);assert.equal(invalid.headers.get('content-range'),'bytes */'+bytes.length);
  assert.equal((await serveMedia(new Request('synestra-media://track/00000000-0000-4000-8000-000000000000'),library)).status,404);
  for(const suffix of ['/../../secret','%2f..%2fsecret','?path=C:/secret']){
   assert.equal((await serveMedia(new Request(url+suffix),library)).status,404);
  }
  assert.equal((await serveMedia(new Request(url,{method:'POST'}),library)).status,405);
  assert.deepEqual(await readFile(file),bytes);
  await rm(file);
  assert.equal((await serveMedia(new Request(url),library)).status,404);
 }finally{await rm(directory,{recursive:true,force:true});}
});
