import { useEffect,useRef,useState } from 'react';
import { SceneDirector } from '../visuals/director';
import type { VisualConfig,VisualDiagnostics } from '../visuals/contracts';
interface Props { onConfiguration:(patch:Partial<VisualConfig>)=>void; config: VisualConfig; diagnostics: VisualDiagnostics|null; onDiagnostics: (value: VisualDiagnostics)=>void }
export function SpectrumStage({config,diagnostics,onDiagnostics,onConfiguration}: Props){
  const host=useRef<HTMLDivElement>(null),director=useRef<SceneDirector|null>(null);
  const initial=useRef({config,onDiagnostics,onConfiguration});
  const [fullscreen,setFullscreen]=useState(false),[error,setError]=useState('');
  useEffect(()=>{
    if(!host.current)return;
    const instance=new SceneDirector(host.current,initial.current.onDiagnostics,initial.current.config,initial.current.onConfiguration);
    director.current=instance;
    const changed=()=>setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange',changed);
    return()=>{document.removeEventListener('fullscreenchange',changed);instance.dispose();director.current=null;};
  },[]);
  useEffect(()=>{director.current?.configure(config);},[config]);
  const toggleFullscreen=async()=>{
    try{setError('');if(document.fullscreenElement)await document.exitFullscreen();else await host.current?.closest<HTMLElement>('.stage')?.requestFullscreen();}
    catch{setError('Fullscreen is unavailable. Windowed playback continues.');}
  };
  return <>
    <div className="spectrum-viewport"><div className="spectrum-canvas" ref={host}/></div>
    <div className="stage-footer"><span className="world-title">{config.mode==='classic'?'Classic / Lightflow':config.mode==='pearl'?'Pearl':config.mode==='milkdrop'?'MilkDrop':'Spectrum'} <span className="stage-separator">/</span> <span className="stage-state">{diagnostics?.stage??'Quiet'}</span></span>
      <span>{diagnostics?.reducedMotion?'REDUCED MOTION':diagnostics?.fallbackReason?'Waveform fallback - audio continues':'LIVE AUDIO'}</span>
      <div className="stage-actions">{diagnostics?.fallbackReason&&!(config.mode==='milkdrop'&&(diagnostics.reducedMotion||config.motion===0))&&<button onClick={()=>director.current?.retryGraphics()}>Retry graphics</button>}<button onClick={()=>void toggleFullscreen()}>{fullscreen?'Exit fullscreen':'Enter fullscreen'}</button></div>
      {error&&<span role="alert">{error}</span>}
    </div>
  </>;
}
