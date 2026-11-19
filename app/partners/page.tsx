import FoundingPartner from '@/components/founding-partner';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Founding Employer & Talent Partner | Come Home KC',
  description: 'A $25,000 charitable commitment for 2027 founding partners of Back2KC. Information only. Not a payment or a recruitment service.',
};

export default function PartnersPage() {
  return <FoundingPartner layout="page"/>;
}
