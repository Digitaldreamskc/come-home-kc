import AccountAccess from '@/components/account-access';
import { onboardingIntent,safeAuthDestination } from '@/lib/onboarding';
export default async function Login({searchParams}:{searchParams:Promise<{next?:string;intent?:string;error?:string}>}){const query=await searchParams;return <AccountAccess mode="login" nextPath={query.next} intent={onboardingIntent(query.intent||(safeAuthDestination(query.next||null)==='/portal?view=employer'?'employer':undefined))} explicitIntent={!!query.intent} invalidLink={query.error==='invalid_link'}/>;}
