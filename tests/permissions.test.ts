import test from 'node:test';
import assert from 'node:assert/strict';
import { permitsFullscreen } from '../electron/permissions';
test('only fullscreen from the trusted main document is permitted',()=>{
 const url='file:///app/dist/index.html';
 assert.equal(permitsFullscreen('fullscreen',true,true,url,url),true);
 for(const permission of ['media','automatic-fullscreen','clipboard-read','geolocation'])assert.equal(permitsFullscreen(permission,true,true,url,url),false);
 assert.equal(permitsFullscreen('fullscreen',false,true,url,url),false);
 assert.equal(permitsFullscreen('fullscreen',true,false,url,url),false);
 assert.equal(permitsFullscreen('fullscreen',true,true,'file:///other.html',url),false);
 assert.equal(permitsFullscreen('fullscreen',true,true,undefined,url),false);
});
