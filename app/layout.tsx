import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Come Home KC | Find your people. Find your opportunity.', description: 'Careers, employers and community resources on both sides of the Kansas City state line.' };
export default function Layout({ children }: { children: React.ReactNode }) {return <html lang="en"><body>{children}</body></html>;}
