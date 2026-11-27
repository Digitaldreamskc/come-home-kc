import Link from 'next/link';
import {EditorialPage} from '@/components/editorial';
import EcosystemDirectory from './ecosystem-directory';
import '../intelligence.css';
export default function Page(){return <EditorialPage><section className="atlas-directory-hero"><Link href="/regional-intelligence">Regional intelligence</Link><p className="partner-eyebrow">Entrepreneurial ecosystem</p><h1>Build your business in Kansas City.</h1><p>Find the organizations and programs that can help you start, build or grow a business.</p></section><EcosystemDirectory/></EditorialPage>;}
