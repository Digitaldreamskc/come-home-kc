import { tenant, designTokens } from '@/lib/tenant-config';
import type { Metadata } from 'next';
import './globals.css';
import './foundation.css';
import './onboarding.css';
export const metadata: Metadata = { title: tenant.product+' | '+tenant.headline, description: tenant.description };
export default function Layout({ children }: { children: React.ReactNode }) {return <html lang="en"><body style={designTokens(tenant) as React.CSSProperties}>{children}</body></html>;}
