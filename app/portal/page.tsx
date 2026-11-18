import { session } from '@/lib/supabase';import { redirect } from 'next/navigation';import Portal from './portal';
export default async function Page(){const {db,user}=await session();if(!user)redirect('/login');const {data}=await db.rpc('user_is_admin');return <Portal email={user.email||''} isAdmin={data===true}/>;}
