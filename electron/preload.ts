import { contextBridge, ipcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron';
import type { DesktopBridge } from '../shared/contracts';
const bridge: DesktopBridge = Object.freeze({library:()=>ipcRenderer.invoke('library:list'),importMp3:()=>ipcRenderer.invoke('library:import'),watchVisibility:(listener:(visible:boolean)=>void)=>{
  if(typeof listener!=='function')throw new TypeError('Expected visibility listener');
  let disposed=false,received=false;
  const update=(_event:IpcRendererEvent,visible:unknown)=>{if(!disposed&&typeof visible==='boolean'){received=true;listener(visible);}};
  ipcRenderer.on('window:visibility',update);
  void ipcRenderer.invoke('window:visible').then((visible:unknown)=>{if(!disposed&&!received&&typeof visible==='boolean')listener(visible);}).catch(()=>{});
  return()=>{disposed=true;ipcRenderer.removeListener('window:visibility',update);};
}});
contextBridge.exposeInMainWorld('synestra',bridge);
