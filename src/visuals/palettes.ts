import { resolveRenderSize } from './sizing';
import type { PaletteName,VisualConfig } from './contracts';
export const palettes: Record<PaletteName,readonly [number,number,number]>={
  aurora:[0x21dcff,0x7956ff,0xff66c4],
  glacier:[0x8cfff2,0x2788ed,0xa9cfff],
  ember:[0xffb55b,0xff506f,0x9b57de]
};
export function renderingRatio(width: number,height: number,dpr: number,quality: VisualConfig['quality']){
  return resolveRenderSize(width,height,dpr,quality).pixelRatio;
}
