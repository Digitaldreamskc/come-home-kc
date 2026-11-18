import AccountAccess from '@/components/account-access';
import { onboardingIntent } from '@/lib/onboarding';
export default async function Signup({searchParams}:{searchParams:Promise<{intent?:string}>}){const query=await searchParams;return <AccountAccess mode="signup" intent={onboardingIntent(query.intent)}/>;}
