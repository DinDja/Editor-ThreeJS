import type { Metadata } from 'next';
import { Shield, Lock, FileCode, AlertTriangle, Server } from 'lucide-react';
import { SITE } from '@/lib/seo';
import SecurityNotice from '@/components/public/SecurityNotice';

export const metadata: Metadata = {
  title: 'Seguranca',
  description: 'Compromisso de seguranca do Monhang Editor 3D. Saiba como protegemos seus projetos, dados e arquivos.',
  alternates: { canonical: `${SITE.url}/seguranca` },
};

const securityPractices = [
  {
    icon: <Server size={20} />,
    title: 'Infraestrutura Segura',
    desc: 'Servidores com acesso restrito, firewalls configurados e monitoramento continuo. Utilizamos TLS/HTTPS em todas as comunicacoes.',
  },
  {
    icon: <Lock size={20} />,
    title: 'Criptografia',
    desc: 'Dados em transito protegidos por TLS 1.3. Senhas armazenadas com hash criptografico (bcrypt/argon2). Sessoes gerenciadas com tokens seguros.',
  },
  {
    icon: <FileCode size={20} />,
    title: 'Codigo Exportado Seguro',
    desc: 'O codigo exportado e um projeto web padrao. Voce controla a hospedagem, o dominio e as politicas de seguranca do ambiente de producao.',
  },
  {
    icon: <AlertTriangle size={20} />,
    title: 'Relato de Vulnerabilidade',
    desc: 'Mantemos um canal dedicado para pesquisadores de seguranca reportarem vulnerabilidades de forma responsavel.',
  },
];

export default function SecurityPage() {
  return (
    <article className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-50 sm:text-4xl">
          Seguranca
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-400 max-w-2xl">
          Nosso compromisso e proteger seus projetos, dados e a integridade da plataforma.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 mb-14">
        {securityPractices.map((sp) => (
          <div
            key={sp.title}
            className="rounded-xl border border-neutral-800/60 bg-[#0f1113] p-5"
          >
            <div className="mb-3 text-emerald-400">{sp.icon}</div>
            <h3 className="text-sm font-semibold text-neutral-100">{sp.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">{sp.desc}</p>
          </div>
        ))}
      </div>

      <div className="space-y-5">
        <SecurityNotice title="Protecao de Projetos">
          <p>
            Todos os projetos criados no Monhang Editor 3D sao privados por padrao. Apenas voce tem acesso aos seus projetos. Nao compartilhamos, analisamos ou acessamos seus projetos sem sua autorizacao, exceto quando necessario para suporte tecnico solicitado por voce.
          </p>
        </SecurityNotice>

        <SecurityNotice title="Arquivos Enviados">
          <p>
            Modelos 3D, imagens, texturas e demais assets que voce faz upload sao armazenados de forma segura e isolada. Utilizamos verificacao de tipo MIME e limites de tamanho para prevenir uploads maliciosos.
          </p>
        </SecurityNotice>

        <SecurityNotice
          type="warning"
          title="Boas Praticas para Usuarios"
        >
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Use senhas fortes e unicas para sua conta.</li>
            <li>Nao compartilhe suas credenciais com terceiros.</li>
            <li>Mantenha seu navegador e sistema operacional atualizados.</li>
            <li>Revise periodicamente os dispositivos conectados a sua conta.</li>
            <li>Nao faca upload de informacoes sensiveis em projetos publicos.</li>
          </ul>
        </SecurityNotice>

        <SecurityNotice title="Scripts Customizados">
          <p>
            A Plataforma permite que voce execute scripts customizados em seus projetos (Modo Interacoes). Esses scripts sao executados em ambiente isolado e nao tem acesso ao backend da plataforma nem a dados de outros usuarios. Voce e responsavel pelo conteudo e seguranca dos scripts que criar.
          </p>
        </SecurityNotice>

        <SecurityNotice title="Exportacao Segura">
          <p>
            O codigo exportado e um projeto web padrao. A seguranca do ambiente de producao (hospedagem, dominio, HTTPS, headers de seguranca) e de sua responsabilidade. Recomendamos implementar Content Security Policy (CSP), CORS adequado e outras boas praticas de seguranca web no projeto exportado.
          </p>
        </SecurityNotice>

        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6">
          <div className="flex items-start gap-3">
            <Shield size={20} className="mt-0.5 shrink-0 text-emerald-400" />
            <div>
              <h3 className="text-sm font-semibold text-emerald-200">Relato de Vulnerabilidade</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-neutral-400">
                Se voce encontrou uma vulnerabilidade de seguranca no Monhang Editor 3D, pedimos que nos comunique de forma responsavel. Envie detalhes para{' '}
                <a href="mailto:seguranca@monhang.com.br" className="text-emerald-400 underline hover:text-emerald-300">
                  seguranca@monhang.com.br
                </a>.
                Comprometemo-nos a responder em ate 48h e a nao tomar medidas legais contra pesquisadores que atuem de boa-fe.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-neutral-800/60 text-center">
          <p className="text-sm text-neutral-500">
            Para duvidas sobre seguranca:{' '}
            <a href="mailto:seguranca@monhang.com.br" className="text-emerald-400 hover:text-emerald-300">
              seguranca@monhang.com.br
            </a>
          </p>
        </div>
      </div>
    </article>
  );
}
