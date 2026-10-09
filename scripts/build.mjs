import { build } from 'esbuild';
import { build as viteBuild } from 'vite';
export async function desktopBuild(){await build({entryPoints:['electron/main.ts','electron/preload.ts'],outdir:'dist-electron',outExtension:{'.js':'.cjs'},bundle:true,platform:'node',format:'cjs',external:['electron'],sourcemap:true});}
if(process.argv[1].endsWith('build.mjs')){await desktopBuild();await viteBuild();}
