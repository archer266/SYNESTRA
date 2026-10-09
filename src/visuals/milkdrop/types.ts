export type Equation=(values:Record<string,number>)=>Record<string,number>;
export interface PresetPart {baseVals:Record<string,number>;init_eqs?:Equation;frame_eqs?:Equation;point_eqs?:Equation|string}
export interface MilkPreset extends PresetPart {pixel_eqs?:Equation|string;shapes:PresetPart[];waves:PresetPart[];warp:string;comp:string}
export interface MilkRenderer {
 time:number;fps:number;frameNum:number;blending:boolean;blendProgress:number;blendDuration:number;blendStartTime:number;
 calcTimeAndFPS:(elapsed:number)=>void;
}
export interface MilkVisualizer {
 renderer:MilkRenderer;
 loadPreset(preset:MilkPreset,seconds:number):void;
 render(options:{elapsedTime:number;audioLevels:{timeByteArray:Uint8Array;timeByteArrayL:Uint8Array;timeByteArrayR:Uint8Array}}):void;
 setRendererSize(width:number,height:number,options:{pixelRatio:number;textureRatio:number;meshWidth:number;meshHeight:number}):void;
}
export type MilkFactory=(context:null,canvas:HTMLCanvasElement,options:Record<string,number|boolean>)=>MilkVisualizer;
