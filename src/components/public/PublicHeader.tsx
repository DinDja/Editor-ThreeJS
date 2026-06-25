'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X, ArrowRight } from 'lucide-react';
import BrandMark from '@/components/auth/BrandMark';
import Button from '@/components/ui/Button';

const navLinks = [
  { href: '/sobre', label: 'Sobre' },
  { href: '/docs', label: 'Docs' },
  { href: '/ajuda', label: 'Ajuda' },
  { href: '/suporte', label: 'Suporte' },
];

export default function PublicHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-800/60 bg-[#0a0c0d]/90 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 rounded-lg">
          <BrandMark />
        </Link>

        <ul className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 ${
                    active
                      ? 'bg-emerald-500/10 text-emerald-300'
                      : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-100'
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/editor">
            <Button size="sm" iconRight={<ArrowRight size={14} />}>
              Acessar Editor
            </Button>
          </Link>
        </div>

        <button
          type="button"
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg p-2 text-neutral-400 outline-none transition hover:bg-neutral-800/50 hover:text-neutral-100 focus-visible:ring-2 focus-visible:ring-emerald-400/60 md:hidden"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-neutral-800/60 bg-[#0a0c0d] px-4 pb-4 pt-2 md:hidden">
          <ul className="grid gap-1">
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-emerald-500/10 text-emerald-300'
                        : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-100'
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-3">
            <Link href="/editor" onClick={() => setOpen(false)}>
              <Button size="sm" iconRight={<ArrowRight size={14} />} className="w-full">
                Acessar Editor
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
