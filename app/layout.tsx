import '@fontsource/montserrat/600.css';
import '@fontsource/montserrat/700.css';
import '@fontsource/lato/400.css';
import '@fontsource/lato/700.css';
import { tenant, designTokens } from '@/lib/tenant-config';
import type { Metadata } from 'next';
import './globals.css';
import './foundation.css';
import './onboarding.css';
import './partners/fonts.css';
import './connected.css';
export const metadata: Metadata = { title: tenant.product+' | '+tenant.headline, description: tenant.description };
export default function Layout({ children }: { children: React.ReactNode }) {return <html lang="en"><body style={designTokens(tenant) as React.CSSProperties}>{children}</body></html>;}
