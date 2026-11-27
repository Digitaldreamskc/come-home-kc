import Link from 'next/link';
import {EditorialPage} from '@/components/editorial';
import {directoryEntries} from '@/lib/atlas-discovery';
import DiscoveryDirectory from '../discovery-directory';
import '../intelligence.css';
export const dynamic='force-dynamic';
export default async function Page(){const entries=await directoryEntries('ecosystem').catch(()=>null);return <EditorialPage><section className="atlas-directory-hero"><Link href="/regional-intelligence">Regional intelligence</Link><p className="partner-eyebrow">KC Capital Atlas · Entrepreneurial ecosystem</p><h1>Find your way through the entrepreneurial ecosystem</h1><p>Explore regional founder support, accelerators, mentoring, coworking and economic development organizations. Verify current program availability with the provider.</p></section>{entries?<DiscoveryDirectory entries={entries} kind="ecosystem"/>:<p role="alert">Atlas data unavailable. <a href="/atlas">Visit the full Atlas.</a></p>}</EditorialPage>;}
