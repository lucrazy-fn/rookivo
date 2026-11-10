import { createRoot } from 'react-dom/client';
import Page from '../app/page';
import '../app/globals.css';

document.documentElement.classList.add('static-pages');
createRoot(document.getElementById('root')!).render(<Page />);
