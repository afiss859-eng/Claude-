import './globals.css';
export const metadata = { title: 'Burkina Market', description: 'Marketplace numérique burkinabè' };
export default function RootLayout({children}:{children:React.ReactNode}){ return <html lang="fr"><body>{children}</body></html> }
