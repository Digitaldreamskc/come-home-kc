export type OnboardingIntent = 'talent' | 'employer';
export function onboardingIntent(value:unknown):OnboardingIntent {return value==='employer'?'employer':'talent';}
export function onboardingDestination(intent:OnboardingIntent){return intent==='employer'?'/portal?view=employer':'/portal?view=profile';}
export function safeAuthDestination(value:string|null){return ['/reset-password','/portal','/portal?view=profile','/portal?view=employer'].includes(value||'')?value!:'/portal';}
