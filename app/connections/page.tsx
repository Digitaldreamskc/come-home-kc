import {headers} from 'next/headers';
import {notFound,redirect} from 'next/navigation';
import {persistentPreviewAllowed} from '@/lib/paths/persistent';
import {session} from '@/lib/supabase';
import {tenant} from '@/lib/tenant-config';
import Connections from '@/components/paths/persistent-workspace';
import '../find-your-path/paths.css';
export default async function Page(){
 if(!persistentPreviewAllowed((await headers()).get('host')))notFound();
 const {user}=await session();if(!user)redirect('/login?next=/connections');
 return <Connections config={tenant}/>;
}
