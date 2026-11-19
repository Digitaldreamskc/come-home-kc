import AccountAccess from '@/components/account-access';
import { onboardingIntent } from '@/lib/onboarding';
export default async function Signup({searchParams}:{searchParams:Promise<{intent?:string;next?:string}>}){const query=await searchParams;return <AccountAccess mode="signup" nextPath={query.next} intent={onboardingIntent(query.intent)}/>;}
