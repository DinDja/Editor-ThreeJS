import type { Metadata } from 'next';
import { SITE } from '@/lib/seo';
import LegalSection from '@/components/public/LegalSection';

export const metadata: Metadata = {
  title: 'Politica de Cookies',
  description: 'Politica de Cookies do Monhang Editor 3D. Entenda como e por que utilizamos cookies na plataforma.',
  alternates: { canonical: `${SITE.url}/cookies` },
};

const lastUpdate = '2026-01-15';

export default function CookiesPage() {
  return (
    <article className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-50 sm:text-4xl">
          Politica de Cookies
        </h1>
        <p className="mt-3 text-sm text-neutral-500">
          Ultima atualizacao: {lastUpdate}
        </p>
      </div>

      <div className="mt-10 divide-y divide-neutral-800/60">
        <LegalSection title="1. O Que Sao Cookies">
          <p>
            Cookies sao pequenos arquivos de texto armazenados no seu navegador quando voce visita um site. Eles sao amplamente utilizados para fazer com que sites funcionem de forma mais eficiente e fornecer informacoes aos proprietarios do site.
          </p>
        </LegalSection>

        <LegalSection title="2. Por Que Utilizamos Cookies">
          <p>
            O Monhang Editor 3D utiliza cookies para garantir o funcionamento adequado da Plataforma, manter sua sessao ativa, lembrar suas preferencias de interface e, futuramente, gerar estatisticas anonimizadas de uso.
          </p>
          <p>
            Nao utilizamos cookies para rastreamento publicitario ou venda de dados.
          </p>
        </LegalSection>

        <LegalSection title="3. Cookies Essenciais">
          <p>
            Esses cookies sao estritamente necessarios para o funcionamento da Plataforma e nao podem ser desativados. Eles garantem funcionalidades basicas como navegacao entre paginas, autenticacao e seguranca da sessao.
          </p>
          <div className="overflow-x-auto rounded-lg border border-neutral-800/60">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-800/60 bg-neutral-800/30">
                  <th className="px-4 py-2.5 font-medium text-neutral-300">Cookie</th>
                  <th className="px-4 py-2.5 font-medium text-neutral-300">Finalidade</th>
                  <th className="px-4 py-2.5 font-medium text-neutral-300">Duracao</th>
                </tr>
              </thead>
              <tbody className="text-neutral-400">
                <tr className="border-b border-neutral-800/40">
                  <td className="px-4 py-2.5 font-mono text-xs">next-auth.session-token</td>
                  <td className="px-4 py-2.5">Sessao de autenticacao</td>
                  <td className="px-4 py-2.5">Sessao</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-mono text-xs">csrf-token</td>
                  <td className="px-4 py-2.5">Protecao contra CSRF</td>
                  <td className="px-4 py-2.5">Sessao</td>
                </tr>
              </tbody>
            </table>
          </div>
        </LegalSection>

        <LegalSection title="4. Cookies de Autenticacao">
          <p>
            Utilizamos cookies para identificar usuarios autenticados, proteger sessoes e lembrar seu acesso quando a opcao &ldquo;manter acesso&rdquo; e selecionada. Esses cookies sao seguros e criptografados.
          </p>
        </LegalSection>

        <LegalSection title="5. Cookies de Preferencias">
          <p>
            A Plataforma pode utilizar cookies para lembrar suas preferencias de interface, como tema (claro/escuro), tamanho de paineis e atalhos personalizados. Esses cookies melhoram sua experiencia, mas nao afetam o funcionamento essencial.
          </p>
        </LegalSection>

        <LegalSection title="6. Cookies de Analytics">
          <p>
            Atualmente, a Plataforma nao utiliza servicos de analytics de terceiros. Caso venhamos a implementar ferramentas como Google Analytics ou similares, esta politica sera atualizada e voce sera notificado previamente.
          </p>
        </LegalSection>

        <LegalSection title="7. Como Gerenciar Cookies">
          <p>
            Voce pode gerenciar cookies diretamente nas configuracoes do seu navegador. A maioria dos navegadores permite:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Visualizar todos os cookies armazenados.</li>
            <li>Bloquear cookies de sites especificos.</li>
            <li>Excluir cookies ao fechar o navegador.</li>
            <li>Desativar todos os cookies (atenção: isso pode quebrar o funcionamento da Plataforma).</li>
          </ul>
          <p>
            Consulte a documentacao do seu navegador para instrucoes especificas (Chrome, Firefox, Edge, Safari).
          </p>
        </LegalSection>

        <LegalSection title="8. Links Relacionados">
          <p>
            Para mais informacoes sobre como tratamos seus dados, consulte nossa{' '}
            <a href="/privacidade" className="text-emerald-400 underline hover:text-emerald-300">
              Politica de Privacidade
            </a>.
          </p>
        </LegalSection>
      </div>
    </article>
  );
}
