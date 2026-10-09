export class AudioGraph {
  private context?: AudioContext;
  private analyser?: AnalyserNode;
  private gain?: GainNode;
  constructor(private audio: HTMLAudioElement) {}
  // Called synchronously from a user gesture. This graph lives as long as the player.
  async resume(volume: number) {
    if(!this.context){
      this.context=new AudioContext();
      const source=this.context.createMediaElementSource(this.audio);
      this.analyser=this.context.createAnalyser();
      this.analyser.fftSize=4096;
      this.analyser.smoothingTimeConstant=0; // Analysis owns time-based smoothing.
      this.gain=this.context.createGain();
      this.gain.gain.value=volume;
      source.connect(this.analyser);
      this.analyser.connect(this.gain);
      this.gain.connect(this.context.destination);
    }
    if(this.context.state!=='running')await this.context.resume();
  }
  setVolume(value: number){if(this.gain && this.context)this.gain.gain.setTargetAtTime(value,this.context.currentTime,0.015);}
  // Pre-volume tap for a future MusicFeatureSource; never connect another destination.
  getAnalysisNode(){return this.analyser;}
}
