import { Marketplace } from '@/components/marketplace';
export default async function JobPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <Marketplace initialJobId={id} />; }
