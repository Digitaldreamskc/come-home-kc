export type OnboardingIntent = 'talent' | 'employer';
export function onboardingIntent(value:unknown):OnboardingIntent {return value==='employer'?'employer':'talent';}
export function onboardingDestination(intent:OnboardingIntent){return intent==='employer'?'/portal?view=employer':'/portal?view=profile';}
export const jobIdPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function introductionDestination(id:string){return jobIdPattern.test(id)?`/portal?view=profile&job=${id}#request-introduction`:'/portal?view=profile';}
export function safeAuthDestination(value:string|null){
 if(value==='/partnerships'||(value&&/^\/employers\/[0-9a-f-]{36}$/.test(value)))return value;
 if(value&&/^\/partnerships\?view=(?:calendar|intelligence)(?:&agreement=[0-9a-f-]{36})?$/i.test(value)){
  const params=new URLSearchParams(value.split('?')[1]);
  const view=params.get('view')?.toLowerCase();
  const agreement=params.get('agreement');
  return '/partnerships?view='+view+(agreement&&jobIdPattern.test(agreement)?'&agreement='+agreement:'');
 }
 if(value==='/reset-password'||value==='/connections')return value;
 if(!value||!value.startsWith('/portal')||value.includes('\\'))return '/portal';
 try{const u=new URL(value,'https://local.invalid');if(u.origin!=='https://local.invalid'||u.pathname!=='/portal'||[...u.searchParams.keys()].some(k=>!['view','job'].includes(k)))return '/portal';
 const job=u.searchParams.get('job');if(job)return introductionDestination(job);
 const view=u.searchParams.get('view');return view==='profile'||view==='employer'||view==='requests'?'/portal?view='+view:'/portal';
 }catch{return '/portal';}
}

export function emailConfirmed(user:{email_confirmed_at?:string|null}|null){return !!user?.email_confirmed_at;}
