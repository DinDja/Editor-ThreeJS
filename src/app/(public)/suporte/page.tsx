import type { Metadata } from 'next';
import { Bug, Lightbulb, Briefcase, Clock, MessageSquare } from 'lucide-react';
import { SITE } from '@/lib/seo';
import SupportForm from '@/components/public/SupportForm';

export const metadata: Metadata = {
  title: 'Contato e Suporte',
  description: 'Entre em contato com a equipe do Monhang Editor 3D. Suporte tecnico, reporte de bugs, sugestoes e duvidas comerciais.',
  alternates: { canonical: `${SITE.url}/suporte` },
};

const channels = [
  {
    icon: <Bug size={22} />,
    title: 'Reportar Bug',
    desc: 'Encontrou um problema? Nos ajude a melhorar a plataforma reportando bugs.',
  },
  {
    icon: <Lightbulb size={22} />,
    title: 'Sugestoes',
    desc: 'Tem uma ideia para uma funcionalidade? Adoramos ouvir sugestoes da comunidade.',
  },
  {
    icon: <Briefcase size={22} />,
    title: 'Duvidas Comerciais',
    desc: 'Planos, precos, licenciamento e solucoes corporativas.',
  },
  {
    icon: <Clock size={22} />,
    title: 'Tempo de Resposta',
    desc: 'Respondemos em ate 2 dias uteis. Urgencias sao priorizadas.',
  },
];

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-50 sm:text-4xl">
          Contato e Suporte
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-400 max-w-2xl">
          Estamos aqui para ajudar. Escolha o canal mais adequado para sua necessidade.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-14">
        {channels.map((ch) => (
          <div
            key={ch.title}
            className="rounded-xl border border-neutral-800/60 bg-[#0f1113] p-5"
          >
            <div className="mb-3 text-emerald-400">{ch.icon}</div>
            <h3 className="text-sm font-semibold text-neutral-100">{ch.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">{ch.desc}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        <div>
          <h2 className="mb-5 text-lg font-semibold text-neutral-100">
            <MessageSquare size={18} className="inline mr-2 text-emerald-400" />
            Envie sua mensagem
          </h2>
          <div className="rounded-2xl border border-neutral-800/60 bg-[#0f1113] p-6 sm:p-8">
            <SupportForm />
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-neutral-800/60 bg-[#0f1113] p-5">
            <h3 className="text-sm font-semibold text-neutral-100">E-mail direto</h3>
            <p className="mt-2 text-sm text-neutral-400">
              <a href="mailto:suporte@monhang.com.br" className="text-emerald-400 hover:text-emerald-300">
                suporte@monhang.com.br
              </a>
            </p>
          </div>

          <div className="rounded-xl border border-neutral-800/60 bg-[#0f1113] p-5">
            <h3 className="text-sm font-semibold text-neutral-100">Links uteis</h3>
            <ul className="mt-2 space-y-2">
              <li>
                <a href="/ajuda" className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors">
                  Central de Ajuda
                </a>
              </li>
              <li>
                <a href="/docs" className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors">
                  Documentacao
                </a>
              </li>
              <li>
                <a href="/changelog" className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors">
                  Changelog
                </a>
              </li>
              <li>
                <a href="/seguranca" className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors">
                  Seguranca
                </a>
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-neutral-800/60 bg-[#0f1113] p-5">
            <h3 className="text-sm font-semibold text-neutral-100">Horario de atendimento</h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-400">
              Segunda a sexta-feira<br />
              9h as 18h (horario de Brasilia)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
