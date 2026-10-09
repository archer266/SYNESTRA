import type { RepeatMode } from '../../shared/contracts';
export function shuffled(ids: string[], random= Math.random): string[] {
  const result=[...ids];
  for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
  return result;
}
export function transition(order: string[], current: string | null, direction: -1 | 1, repeat: RepeatMode, ended=false): string | null {
  if(!order.length)return null;
  const index=current ? order.indexOf(current) : -1;
  if(index<0)return order[0];
  if(ended && repeat==='one')return current;
  const next=index+direction;
  if(next>=0 && next<order.length)return order[next];
  if(repeat==='all')return order[(next+order.length)%order.length];
  return null;
}
