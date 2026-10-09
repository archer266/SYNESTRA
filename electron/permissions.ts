/** Fullscreen is the only renderer permission; never grant it to subframes or other contents. */
export function permitsFullscreen(permission:string,trustedContents:boolean,isMainFrame:boolean,requestingUrl:string|undefined,expectedUrl:string){
  return permission==='fullscreen'&&trustedContents&&isMainFrame&&requestingUrl===expectedUrl;
}
