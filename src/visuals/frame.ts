import type { MusicFeatures } from '../analysis/contracts';
import type { VisualFrame } from './engine';
import type { ProgressionState } from './progression';
/** Reuses the frame shell and borrows analysis buffers. Never owns audio resources. */
export class FrameComposer {
  private frame?: VisualFrame;
  compose(features:Readonly<MusicFeatures>,decibels:Readonly<Float32Array>,progression:Readonly<ProgressionState>,timing:VisualFrame['timing'],playback:VisualFrame['playback'],rawWaveform:Readonly<Float32Array>=features.waveform,intelligence:VisualFrame['intelligence']=null):VisualFrame{
    if(!this.frame)this.frame={features,rawWaveform,spectrum:{decibels,logBands:features.bands,frequenciesHz:features.bandFrequencies},waveform:features.waveform,progression,timing:{...timing},playback:{...playback},intelligence:null};
    const frame=this.frame;frame.intelligence=intelligence;
    frame.features=features;frame.rawWaveform=rawWaveform;Object.assign(frame.spectrum,{decibels,logBands:features.bands,frequenciesHz:features.bandFrequencies});
    frame.waveform=features.waveform;frame.progression=progression;
    Object.assign(frame.timing,timing);Object.assign(frame.playback,playback);
    return frame;
  }
}
