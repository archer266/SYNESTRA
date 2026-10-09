import { permitsFullscreen } from './permissions';
import { app, BrowserWindow, dialog, ipcMain, protocol, session } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { TrackLibrary } from './library';
import { serveMedia } from './media';
app.setName('SYNESTRA');
protocol.registerSchemesAsPrivileged([{scheme:'synestra-media',privileges:{standard:true,secure:true,stream:true,supportFetchAPI:true,corsEnabled:true}}]);
let window: BrowserWindow | null=null;
const devUrl=!app.isPackaged && process.env.SYNESTRA_DEV_URL==='http://127.0.0.1:5179' ? process.env.SYNESTRA_DEV_URL : undefined;
const productionUrl=pathToFileURL(join(__dirname,'../dist/index.html')).href;
function validate(event: IpcMainInvokeEvent,args: unknown[]) {
  if(args.length || !window || event.sender!==window.webContents || event.senderFrame!==window.webContents.mainFrame || event.senderFrame.url !== (devUrl ? devUrl+'/' : productionUrl)) throw new Error('Unauthorized desktop request');
}
function createWindow() {
  window=new BrowserWindow({title:'SYNESTRA',width:1280,height:820,minWidth:760,minHeight:580,backgroundColor:'#090c12',autoHideMenuBar:true,webPreferences:{preload:join(__dirname,'preload.cjs'),contextIsolation:true,sandbox:true,nodeIntegration:false,webSecurity:true}});
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  window.webContents.on('will-navigate',(event)=>event.preventDefault());
  window.webContents.on('will-attach-webview',event=>event.preventDefault());
  const current=window;
  const notifyVisibility=()=>{if(!current.isDestroyed())current.webContents.send('window:visibility',current.isVisible()&&!current.isMinimized());};
  current.on('show',notifyVisibility);current.on('hide',notifyVisibility);
  current.on('minimize',notifyVisibility);current.on('restore',notifyVisibility);
  window.on('closed',()=>{window=null;});
  if(devUrl)void window.loadURL(devUrl); else void window.loadFile(join(__dirname,'../dist/index.html'));
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance',()=>{if(window?.isMinimized())window.restore();window?.focus();});
  void app.whenReady().then(async()=>{
    const library=new TrackLibrary(app.getPath('userData'));
    await library.load();
    const expectedUrl=devUrl?devUrl+'/':productionUrl;
    session.defaultSession.setPermissionRequestHandler((contents,permission,callback,details)=>callback(permitsFullscreen(permission,!!window&&contents===window.webContents,details.isMainFrame,details.requestingUrl,expectedUrl)));
    session.defaultSession.setPermissionCheckHandler((contents,permission,_origin,details)=>permitsFullscreen(permission,!!window&&contents===window.webContents,details.isMainFrame,details.requestingUrl,expectedUrl));
    protocol.handle('synestra-media',request=>serveMedia(request,library));
    ipcMain.handle('window:visible',(event,...args)=>{validate(event,args);return window!.isVisible()&&!window!.isMinimized();});
    ipcMain.handle('library:list',(event,...args)=>{validate(event,args);return library.snapshot();});
    let importing=false;
    ipcMain.handle('library:import',async(event,...args)=>{
      validate(event,args);
      if(importing)return null;
      importing=true;
      try{
        const selection=await dialog.showOpenDialog(window!,{title:'Import music into SYNESTRA',properties:['openFile','multiSelections'],filters:[{name:'MP3 audio',extensions:['mp3']}]});
        if(selection.canceled)return null;
        return await library.import(selection.filePaths);
      } finally {importing=false;}
    });
    createWindow();
    app.on('activate',()=>{if(!window)createWindow();});
  }).catch(error=>{dialog.showErrorBox('SYNESTRA could not start',String(error));app.quit();});
  app.on('window-all-closed',()=>app.quit());
}
