import {notFound} from 'next/navigation';
import {openDemoReady} from '@/lib/open-demo-access';
import OpenDemo from '@/components/open-demo/app';
import '../../civic/civic.css';
import '../../find-your-path/paths.css';
import '../demo.css';
export const dynamic='force-dynamic';
export const metadata={title:'Back2KC & KC Now | Synthetic demonstration',robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{section?:string[]}>}){if(!openDemoReady(process.env))notFound();const {section=[]}=await params;return <OpenDemo section={section.join('/')}/>;}
