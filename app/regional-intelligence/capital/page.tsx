import Link from 'next/link';
import {EditorialPage} from '@/components/editorial';
import {directoryEntries} from '@/lib/atlas-discovery';
import DiscoveryDirectory from '../discovery-directory';
import '../intelligence.css';
export const dynamic='force-dynamic';
export default async function Page(){const entries=await directoryEntries('capital').catch(()=>null);return <EditorialPage><section className="atlas-directory-hero"><Link href="/regional-intelligence">Regional intelligence</Link><p className="partner-eyebrow">KC Capital Atlas · Capital landscape</p><h1>Find the capital that fits your business</h1><p>Explore Kansas City's venture investors, angel networks, lenders, private investment firms and family offices. Research records are not confirmation of current investment activity.</p></section>{entries?<DiscoveryDirectory entries={entries} kind="capital"/>:<p role="alert">Atlas data unavailable. <a href="/atlas">Visit the full Atlas.</a></p>}</EditorialPage>;}
