import type { Track, RepeatMode } from '../../shared/contracts';
import { AudioGraph } from './audioGraph';
import { shuffled, transition } from './queue';
export interface PlayerState {
  tracks: Track[]; currentId: string | null; playing: boolean; loading: boolean;
  position: number; duration: number; volume: number; shuffle: boolean; repeat: RepeatMode;
  error: string | null; completed: boolean;
}
export class Player {
  readonly audio = new Audio();
  readonly graph = new AudioGraph(this.audio);
  private listeners = new Set<()=>void>();
  private order: string[]=[];
  private intent=0;
  private state: PlayerState={tracks:[],currentId:null,playing:false,loading:false,position:0,duration:0,volume:0.75,shuffle:false,repeat:'off',error:null,completed:false};
  constructor(){
    this.audio.preload='metadata';
    this.audio.crossOrigin='anonymous';
    this.audio.addEventListener('playing',()=>this.patch({playing:!this.audio.paused,loading:false,error:null,completed:false}));
    this.audio.addEventListener('pause',()=>this.patch({playing:!this.audio.paused}));
    this.audio.addEventListener('waiting',()=>this.patch({loading:true}));
    this.audio.addEventListener('loadstart',()=>this.patch({loading:true}));
    this.audio.addEventListener('canplay',()=>this.patch({loading:false}));
    this.audio.addEventListener('loadedmetadata',()=>this.measure());
    this.audio.addEventListener('durationchange',()=>this.measure());
    this.audio.addEventListener('timeupdate',()=>this.patch({position:this.audio.currentTime}));
    this.audio.addEventListener('seeking',()=>this.patch({loading:true}));
    this.audio.addEventListener('seeked',()=>this.patch({loading:false,position:this.audio.currentTime}));
    this.audio.addEventListener('error',()=>{
      this.intent++;
      const code=this.audio.error?.code;
      this.patch({playing:false,loading:false,error:code===4 ? 'This file cannot be played. It may be unsupported, damaged, or missing.' : 'Playback failed. Check the file and try another track.'});
    });
    this.audio.addEventListener('ended',()=>{
      this.patch({playing:false,loading:false});
      const next=transition(this.order,this.state.currentId,1,this.state.repeat,true);
      if(next)void this.select(next,true);
      else this.patch({completed:true,position:this.state.duration});
    });
  }
  private measure(){this.patch({duration:Number.isFinite(this.audio.duration)?this.audio.duration:0});}
  private patch(partial: Partial<PlayerState>){this.state={...this.state,...partial};this.listeners.forEach(fn=>fn());}
  subscribe=(fn:()=>void)=>{this.listeners.add(fn);return ()=>{this.listeners.delete(fn);};};
  snapshot=()=>this.state;
  setTracks(tracks: Track[]){
    this.patch({tracks});
    const ids=tracks.map(t=>t.id);
    this.order=this.state.shuffle ? [...this.order.filter(id=>ids.includes(id)),...shuffled(ids.filter(id=>!this.order.includes(id)))] : ids;
    if(!this.state.currentId && tracks.length)void this.select(tracks[0].id,false);
  }
  async select(id: string,play=true){
    if(!this.state.tracks.some(t=>t.id===id))return;
    this.intent++;
    this.audio.pause();
    this.patch({currentId:id,position:0,duration:0,error:null,completed:false,playing:false,loading:true});
    this.audio.src='synestra-media://track/'+id;
    this.audio.load();
    if(play)await this.play();
  }
  async play(){
    if(!this.state.currentId)return;
    const token=++this.intent;
    try {
      // Resume is invoked before the first await so transient activation is retained.
      await this.graph.resume(this.state.volume);
      if(token!==this.intent)return;
      if(this.audio.ended)this.audio.currentTime=0;
      await this.audio.play();
    } catch(error){
      if(token!==this.intent)return;
      this.patch({playing:false,loading:false,error:(error as Error).name==='NotAllowedError' ? 'Playback needs a click. Press Play to start.' : 'Could not play this file. Try another MP3 or press Play to retry.'});
    }
  }
  pause(){this.intent++;this.audio.pause();this.patch({loading:false});}
  toggle(){if(!this.audio.paused)this.pause();else void this.play();}
  next(){
    const id=transition(this.order,this.state.currentId,1,this.state.repeat);
    if(id)void this.select(id,true);
    else {this.pause();this.patch({completed:true});}
  }
  previous(){
    if(this.audio.currentTime>3){this.seek(0);return;}
    const id=transition(this.order,this.state.currentId,-1,this.state.repeat);
    if(id)void this.select(id,true);else this.seek(0);
  }
  seek(seconds: number){
    if(!Number.isFinite(seconds)||!this.state.duration)return;
    try{this.audio.currentTime=Math.min(this.state.duration,Math.max(0,seconds));this.patch({position:this.audio.currentTime,completed:false});}
    catch{this.patch({error:'Seeking is not available until this file has loaded.'});}
  }
  setVolume(value: number){if(!Number.isFinite(value))return;const volume=Math.max(0,Math.min(1,value));this.graph.setVolume(volume);this.patch({volume});}
  toggleShuffle(){
    const shuffle=!this.state.shuffle;
    const ids=this.state.tracks.map(t=>t.id);
    this.order=shuffle ? [...(this.state.currentId?[this.state.currentId]:[]),...shuffled(ids.filter(id=>id!==this.state.currentId))] : ids;
    this.patch({shuffle});
  }
  cycleRepeat(){const modes: RepeatMode[]=['off','all','one'];this.patch({repeat:modes[(modes.indexOf(this.state.repeat)+1)%3]});}
}
export const player=new Player();
