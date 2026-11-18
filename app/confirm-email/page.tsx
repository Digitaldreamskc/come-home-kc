import ConfirmationRecovery from '@/components/confirmation-recovery';
export default async function Page({searchParams}:{searchParams:Promise<{next?:string}>}){return <ConfirmationRecovery nextPath={(await searchParams).next}/>;}
