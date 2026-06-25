import Link from 'next/link';
import { Box, ArrowRight, HelpCircle } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="h-screen overflow-y-auto bg-[#0d0f10]">
      <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
        >
          <div className="absolute -left-40 top-0 h-[640px] w-[640px] rounded-full bg-emerald-500/5 blur-[120px]" />
          <div className="absolute -right-32 bottom-0 h-[520px] w-[520px] rounded-full bg-cyan-500/3 blur-[120px]" />
        </div>

        <div className="mb-6">
          <svg
            aria-hidden="true"
            viewBox="0 0 40 40"
            className="h-14 w-14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
          >
            <polygon
              points="20,3 37,20 20,37 3,20"
              className="text-emerald-400/40"
              strokeLinejoin="round"
            />
            <polygon
              points="20,11 29,20 20,29 11,20"
              className="text-emerald-500/30"
              strokeLinejoin="round"
            />
            <circle cx="20" cy="20" r="2.2" className="fill-emerald-400/60 stroke-none" />
          </svg>
        </div>

        <h1 className="text-5xl font-bold tracking-tight text-neutral-50 sm:text-6xl">
          404
        </h1>

        <p className="mt-4 text-lg font-medium text-neutral-200">
          Pagina nao encontrada
        </p>

        <p className="mt-3 max-w-md text-sm leading-relaxed text-neutral-400">
          A pagina que voce procura pode ter sido movida, renomeada ou nao existe. Navegue para uma das opcoes abaixo.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/login">
            <Button size="md" iconRight={<ArrowRight size={14} />}>
              Ir para o Editor
            </Button>
          </Link>
          <Link href="/ajuda">
            <Button size="md" variant="secondary" iconRight={<HelpCircle size={14} />}>
              Central de Ajuda
            </Button>
          </Link>
        </div>

        <div className="mt-12 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
          <Link
            href="/sobre"
            className="text-neutral-500 transition-colors hover:text-neutral-200 outline-none focus-visible:text-emerald-300"
          >
            Sobre
          </Link>
          <Link
            href="/docs"
            className="text-neutral-500 transition-colors hover:text-neutral-200 outline-none focus-visible:text-emerald-300"
          >
            Documentacao
          </Link>
          <Link
            href="/suporte"
            className="text-neutral-500 transition-colors hover:text-neutral-200 outline-none focus-visible:text-emerald-300"
          >
            Suporte
          </Link>
        </div>

        <p className="mt-14 text-xs text-neutral-600">
          &copy; {new Date().getFullYear()} Monhang Editor 3D
        </p>
      </div>
    </div>
  );
}
