import FoundingPartner from '@/components/founding-partner';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Founding Employer & Talent Partner | Come Home KC',
  description: 'A 2027 founding partnership with Back2KC. A conversation about community programs, not recruitment services or a payment.',
};

export default function PartnersPage() {
  return <FoundingPartner layout="page"/>;
}
