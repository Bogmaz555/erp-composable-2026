export const dynamic = 'force-dynamic';
// @ts-ignore
import './globals.css';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import Providers from './providers';

export const metadata = {
  title: 'MAX ERP System',
  description: 'Industrial Composable ERP',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body className="flex h-screen bg-zinc-950 overflow-hidden text-slate-100">
        <Providers>
          <Sidebar />
          
          <main className="flex-1 overflow-auto bg-zinc-950 pt-16 md:pt-0 relative flex flex-col">
            <TopBar />
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
