import Link from 'next/link';
import { EditorialPage } from '@/components/editorial';
import ApplicationForm from './application-form';
import '../../intelligence.css';

export default function Page() {
  return <EditorialPage>
    <section className="atlas-directory-hero">
      <Link href="/regional-intelligence/ecosystem">Entrepreneurial ecosystem</Link>
      <h1>Add your resource partner profile</h1>
      <p>Tell us who you serve and how you help entrepreneurs in the Kansas City region.</p>
    </section>
    <section className="atlas-directory"><ApplicationForm/></section>
  </EditorialPage>;
}
