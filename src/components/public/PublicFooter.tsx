import Link from 'next/link';
import BrandMark from '@/components/auth/BrandMark';

const footerLinks = [
  { href: '/sobre', label: 'Sobre' },
  { href: '/docs', label: 'Documentacao' },
  { href: '/ajuda', label: 'Ajuda' },
  { href: '/changelog', label: 'Changelog' },
  { href: '/suporte', label: 'Suporte' },
  { href: '/termos-de-uso', label: 'Termos de Uso' },
  { href: '/privacidade', label: 'Privacidade' },
  { href: '/cookies', label: 'Cookies' },
  { href: '/seguranca', label: 'Seguranca' },
];

export default function PublicFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-neutral-800/60 bg-[#0a0c0d]">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <BrandMark />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-neutral-500">
              Plataforma brasileira de criacao de experiencias web 3D interativas. Modele, exporte e publique codigo real.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-300">
              Links
            </h3>
            <ul className="mt-4 grid grid-cols-2 gap-2">
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-neutral-500 transition-colors hover:text-neutral-200 outline-none focus-visible:text-emerald-300"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-300">
              Produto
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-neutral-500">
              Monhang Editor 3D — Crie sites, landing pages, componentes 3D e backgrounds WebGL com exportacao de codigo real para Next.js e React.
            </p>
          </div>
        </div>

        <div className="mt-10 border-t border-neutral-800/60 pt-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-neutral-600">
            &copy; {year} Monhang Editor 3D. Todos os direitos reservados.
          </p>
          <p className="text-xs text-neutral-600">
            Tecnologia com identidade brasileira.
          </p>
        </div>
      </div>
    </footer>
  );
}
