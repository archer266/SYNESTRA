import { open } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { parseRange } from './range';
import { validId, type TrackLibrary } from './library';
export async function serveMedia(request: Request, library: Pick<TrackLibrary,'get'>): Promise<Response> {
  // Match the raw URL: never decode/resolve user paths or normalize traversal.
  const match = /^synestra-media:\/\/track\/([0-9a-f-]+)$/.exec(request.url);
  if (!match || !validId(match[1])) return new Response(null,{status:404});
  if (!['GET','HEAD'].includes(request.method)) return new Response(null,{status:405,headers:{Allow:'GET, HEAD'}});
  const track=library.get(match[1]);
  if (!track) return new Response(null,{status:404});
  let handle;
  try {
    handle=await open(track.path,'r');
    const info=await handle.stat();
    if (!info.isFile()) {await handle.close();return new Response(null,{status:404});}
    const range=parseRange(request.headers.get('range'),info.size);
    const headers: Record<string,string>={'Content-Type':'audio/mpeg','Accept-Ranges':'bytes','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'};
    if(range==='invalid'){await handle.close();return new Response(null,{status:416,headers:{...headers,'Content-Range':'bytes */'+info.size}});}
    const start=range?.start??0,end=range?.end??info.size-1;
    headers['Content-Length']=String(Math.max(0,end-start+1));
    if(range)headers['Content-Range']='bytes '+start+'-'+end+'/'+info.size;
    if(request.method==='HEAD'||info.size===0){await handle.close();return new Response(null,{status:range?206:200,headers});}
    const stream=handle.createReadStream({start,end,autoClose:true});
    const abort=()=>stream.destroy();
    request.signal.addEventListener('abort',abort,{once:true});
    stream.once('close',()=>request.signal.removeEventListener('abort',abort));
    if(request.signal.aborted)stream.destroy();
    return new Response(Readable.toWeb(stream) as ReadableStream<Uint8Array>,{status:range?206:200,headers});
  } catch {
    await handle?.close().catch(()=>undefined);
    return new Response(null,{status:404});
  }
}
