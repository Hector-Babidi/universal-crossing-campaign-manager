import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Universal Crossing | Campaign Manager', description: 'Gerenciador de campanhas de RPG INDIE CROSS.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="pt-BR"><body>{children}</body></html>; }
