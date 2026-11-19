import {headers} from 'next/headers';
import {notFound} from 'next/navigation';
import {demoAllowed} from '@/lib/paths/demo-store';
import {tenant} from '@/lib/tenant-config';
import PathWorkspace from '@/components/paths/path-workspace';
import './paths.css';
export default async function Page(){if(!demoAllowed((await headers()).get('host')))notFound();return <PathWorkspace config={tenant}/>;}
