import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import electron from 'electron';
import { desktopBuild } from './build.mjs';
await desktopBuild();
const server=await createServer();await server.listen();
const env={...process.env,SYNESTRA_DEV_URL:'http://127.0.0.1:5179'};delete env.ELECTRON_RUN_AS_NODE;
const child=spawn(electron,['.'],{stdio:'inherit',env,windowsHide:false});
let closing=false;async function close(){if(closing)return;closing=true;child.kill();await server.close();}
child.on('exit',async code=>{await close();process.exitCode=code??0;});
child.on('error',async e=>{console.error(e);await close();process.exitCode=1;});
process.on('SIGINT',close);process.on('SIGTERM',close);
