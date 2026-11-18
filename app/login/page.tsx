import AccountAccess from '@/components/account-access';
import { onboardingIntent } from '@/lib/onboarding';
export default async function Login({searchParams}:{searchParams:Promise<{intent?:string;error?:string}>}){const query=await searchParams;return <AccountAccess mode="login" intent={onboardingIntent(query.intent)} explicitIntent={!!query.intent} invalidLink={query.error==='invalid_link'}/>;}
