import './globals.css';
export const metadata = { title: 'Rookivo', description: 'Histórico do Chess.com e análise local com Stockfish.', icons:{icon:'/rookivo-icon.svg'} };
export default function Layout({children}: {children: React.ReactNode}) { return <html lang="pt-BR"><body>{children}</body></html>; }
