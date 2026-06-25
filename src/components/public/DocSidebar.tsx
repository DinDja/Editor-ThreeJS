'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

const docNav = [
  { label: 'Visao geral', href: '/docs' },
  { label: 'Conceitos principais', href: '/docs#conceitos' },
  { label: 'Modo Cena', href: '/docs#modo-cena' },
  { label: 'Modo Página', href: '/docs#modo-pagina' },
  { label: 'Modo Interações', href: '/docs#modo-interacoes' },
  { label: 'Pré-visualização', href: '/docs#preview' },
  { label: 'Exportação para Web', href: '/docs#exportacao' },
  { label: 'Estrutura de projeto', href: '/docs#estrutura' },
  { label: 'Formatos suportados', href: '/docs#formatos' },
  { label: 'Boas práticas', href: '/docs#boas-praticas' },
  { label: 'Atalhos', href: '/docs#atalhos' },
  { label: 'Limitações conhecidas', href: '/docs#limitacoes' },
];

export default function DocSidebar() {
  const pathname = usePathname();
  const [hash, setHash] = useState('');

  useEffect(() => {
    setHash(window.location.hash);
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return (
    <nav className="w-56 shrink-0 hidden lg:block">
      <div className="sticky top-20">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-neutral-400">
          Documentacao
        </h3>
        <ul className="space-y-0.5">
          {docNav.map((link) => {
            const isDocsPath = pathname === '/docs';
            const matchesHash = link.href.includes('#') && isDocsPath && link.href.endsWith(hash);
            const isExact = pathname === link.href;
            const active = isExact || matchesHash;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 ${
                    active
                      ? 'bg-emerald-500/10 text-emerald-300 font-medium'
                      : 'text-neutral-500 hover:bg-neutral-800/40 hover:text-neutral-200'
                  }`}
                >
                  {active && <ChevronRight size={12} className="shrink-0" />}
                  <span className={active ? '' : 'ml-[22px]'}>{link.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
