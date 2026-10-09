export interface Track { id: string; name: string }
export interface Library { tracks: Track[]; warning?: string }
export interface DesktopBridge { library(): Promise<Library>; importMp3(): Promise<Library | null>; watchVisibility(listener:(visible:boolean)=>void):()=>void }
export type RepeatMode = 'off' | 'all' | 'one';
declare global { interface Window { synestra: DesktopBridge } }
