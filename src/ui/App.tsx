import { engines } from '../visuals/registry';
import { useEffect,useState,useSyncExternalStore } from 'react';
import { AudioLines,ChevronDown,FolderPlus,ListMusic,Music2,Pause,Play,Repeat,Repeat1,Shuffle,SkipBack,SkipForward,SlidersHorizontal,Volume2,X } from 'lucide-react';
import { player } from '../player/player';
import { SpectrumStage } from './SpectrumStage';
import { VisualSettings } from './VisualSettings';
import { readVisualPreferences,saveVisualPreferences } from '../visuals/preferences';
import type { VisualConfig,VisualDiagnostics } from '../visuals/contracts';
const time=(seconds: number)=>{const n=Math.max(0,Math.floor(seconds));return Math.floor(n/60)+':'+String(n%60).padStart(2,'0');};
const logo='./brand/fused-bubbles.png';
export function App(){
  const state=useSyncExternalStore(player.subscribe,player.snapshot);
  const [panel,setPanel]=useState<'queue'|'tune'|null>(null);
  const [config,setConfig]=useState(readVisualPreferences);
  const [diagnostics,setDiagnostics]=useState<VisualDiagnostics|null>(null);
  const [importing,setImporting]=useState(false),[notice,setNotice]=useState<string|null>(null),[draft,setDraft]=useState<number|null>(null);
  const track=state.tracks.find(t=>t.id===state.currentId);
  const change=(patch: Partial<VisualConfig>)=>setConfig(old=>({...old,...patch}));
  useEffect(()=>{saveVisualPreferences(config);},[config]);
  useEffect(()=>{
    let active=true;
    window.synestra.library().then(library=>{if(active){player.setTracks(library.tracks);setNotice(library.warning??null);}}).catch(()=>{if(active)setNotice('The library could not be opened. Try importing your music.');});
    return()=>{active=false;};
  },[]);
  useEffect(()=>{setDraft(null);},[state.currentId]);
  useEffect(()=>{
    const keydown=(event: KeyboardEvent)=>{
      const target=event.target as HTMLElement;
      if(event.key==='Escape'){setPanel(null);return;}
      if(event.ctrlKey||event.metaKey||event.altKey||target.closest('input,textarea,select,button,[contenteditable="true"],[role="textbox"]'))return;
      if(event.code==='Space'){event.preventDefault();player.toggle();}
      if(event.code==='ArrowRight'){event.preventDefault();player.seek(player.snapshot().position+5);}
      if(event.code==='ArrowLeft'){event.preventDefault();player.seek(player.snapshot().position-5);}
      if(event.key.toLowerCase()==='n')player.next();
      if(event.key.toLowerCase()==='p')player.previous();
    };
    window.addEventListener('keydown',keydown);return()=>window.removeEventListener('keydown',keydown);
  },[]);
  const importMusic=async()=>{
    setImporting(true);
    try{const library=await window.synestra.importMp3();if(library){player.setTracks(library.tracks);setNotice(library.warning??null);}}
    catch{setNotice('Import could not be saved. Check file access and available disk space, then try again.');}
    finally{setImporting(false);}
  };
  const commitSeek=()=>{if(draft!==null){player.seek(draft);setDraft(null);}};
  return <div className={`app ${config.mode}-mode palette-${config.palette}`}>
    <header className="topbar">
      <div className="brand"><img src={logo} alt="" width="48" height="48"/><span>SYNESTRA</span></div>
      <div className="world-controls">
        <div className="mode-picker"><AudioLines size={21}/><select aria-label="Visual mode" value={config.mode} onChange={e=>change({mode:e.target.value as VisualConfig['mode']})}>{engines.list().map(engine=><option key={engine.id} value={engine.id}>{engine.name}</option>)}</select><ChevronDown size={16}/></div>
        {config.mode==='spectrum'&&<div className={'layout-switch '+config.layout} aria-label="Spectrum layout"><span className="selection-pill"/><button aria-pressed={config.layout==='linear'} onClick={()=>change({layout:'linear'})}>Linear</button><button aria-pressed={config.layout==='radial'} onClick={()=>change({layout:'radial'})}>Radial</button></div>}
      </div>
      <div className="header-actions">
        <button className={'tonal '+(panel==='tune'?'selected':'')} aria-expanded={panel==='tune'} aria-controls="visual-tuning" onClick={()=>setPanel(panel==='tune'?null:'tune')}><SlidersHorizontal size={19}/>Tune</button>
        <button className={'tonal '+(panel==='queue'?'selected':'')} aria-expanded={panel==='queue'} aria-controls="queue" onClick={()=>setPanel(panel==='queue'?null:'queue')}><ListMusic size={20}/>Queue</button>
        <button className="import" onClick={()=>void importMusic()} disabled={importing}><FolderPlus size={20}/>{importing?'Importing…':'Import music'}</button>
      </div>
    </header>
    {!track&&<div className="import-guidance"><div><strong>Your music, in motion.</strong><span>Import MP3s to begin. Your files stay right where they are.</span></div><Music2 size={21}/></div>}
    {(notice||state.error)&&<div className="notice" role="alert">{state.error??notice}<button onClick={()=>setNotice(null)} hidden={!!state.error} aria-label="Dismiss notice"><X size={17}/></button></div>}
    <main className={panel?'workspace with-panel':'workspace'}>
      <section className="stage" aria-label="Visual stage" tabIndex={0}>
        <SpectrumStage onConfiguration={change} config={config} diagnostics={diagnostics} onDiagnostics={setDiagnostics}/>
      </section>
      {panel==='tune'&&<VisualSettings config={config} change={change} diagnostics={diagnostics}/>}
      {panel==='queue'&&<aside id="queue" className="side-panel queue"><div className="panel-heading"><span className="eyebrow">YOUR COLLECTION</span><h2>Play queue <span>{state.tracks.length.toString().padStart(2,'0')}</span></h2><p>{state.shuffle?'Shuffled, just for this session.':'A little room for everything you love.'}</p></div><div className="queue-list">
        {!state.tracks.length?<div className="empty-queue"><Music2 size={32}/><h3>Make room for music</h3><p>Import MP3 files to build your queue.</p></div>:state.tracks.map((item,index)=><button key={item.id} className={'track '+(item.id===state.currentId?'selected':'')} onClick={()=>void player.select(item.id)} aria-current={item.id===state.currentId?'true':undefined}><span className="track-number">{item.id===state.currentId?<AudioLines size={19}/>:String(index+1).padStart(2,'0')}</span><span className="track-copy"><strong title={item.name}>{item.name}</strong><small>MP3 · LOCAL FILE</small></span>{item.id===state.currentId&&<span className="track-dot"/>}</button>)}
      </div><div className="queue-footer"><span>{state.tracks.length} tracks</span><span>On your device</span></div></aside>}
    </main>
    <footer className="transport">
      <div className="now-playing"><div className="cover"><img src={logo} alt="" width="56" height="56"/></div><div><strong title={track?.name}>{track?.name??'Ready when you are'}</strong><span role="status">{state.error?'Playback unavailable':state.loading?'Loading…':state.completed?'Queue complete':state.playing?'Now playing':track?'Ready to listen':'No track selected'}</span></div></div>
      <div className="playback"><div className="buttons">
        <button className={state.shuffle?'active':''} aria-label="Shuffle" aria-pressed={state.shuffle} onClick={()=>player.toggleShuffle()}><Shuffle size={21}/></button>
        <button aria-label="Previous track" disabled={!track} onClick={()=>player.previous()}><SkipBack size={25} fill="currentColor"/></button>
        <button className={'play-button '+(state.playing?'playing':'')} aria-label={state.playing?'Pause':'Play'} disabled={!track} onClick={()=>player.toggle()}>{state.playing?<Pause size={29} fill="currentColor"/>:<Play size={29} fill="currentColor"/>}</button>
        <button aria-label="Next track" disabled={!track} onClick={()=>player.next()}><SkipForward size={25} fill="currentColor"/></button>
        <button className={state.repeat!=='off'?'active':''} aria-label={'Repeat: '+state.repeat} onClick={()=>player.cycleRepeat()}>{state.repeat==='one'?<Repeat1 size={21}/>:<Repeat size={21}/>}</button>
      </div><div className="timeline"><span>{time(draft??state.position)}</span><input aria-label="Seek" type="range" min="0" max={state.duration||1} step="0.1" disabled={!state.duration} value={draft??Math.min(state.position,state.duration||1)} onChange={e=>setDraft(Number(e.target.value))} onPointerUp={commitSeek} onKeyUp={commitSeek} onBlur={commitSeek}/><span>{time(state.duration)}</span></div></div>
      <div className="volume"><Volume2 size={22}/><input aria-label="Volume" type="range" min="0" max="1" step="0.01" value={state.volume} onChange={e=>player.setVolume(Number(e.target.value))}/><span>{Math.round(state.volume*100)}%</span></div>
    </footer>
  </div>;
}
