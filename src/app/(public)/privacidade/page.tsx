import type { Metadata } from 'next';
import { SITE } from '@/lib/seo';
import LegalSection from '@/components/public/LegalSection';

export const metadata: Metadata = {
  title: 'Politica de Privacidade',
  description: 'Politica de Privacidade do Monhang Editor 3D. Saiba como tratamos seus dados, projetos e arquivos com transparencia e seguranca.',
  alternates: { canonical: `${SITE.url}/privacidade` },
};

const lastUpdate = '2026-01-15';

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-50 sm:text-4xl">
          Politica de Privacidade
        </h1>
        <p className="mt-3 text-sm text-neutral-500">
          Ultima atualizacao: {lastUpdate}
        </p>
      </div>

      <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-4 text-sm leading-relaxed text-amber-200/80">
        <strong>Aviso:</strong> Este documento e um modelo. Recomendamos revisao juridica antes do uso oficial, especialmente para adequacao completa a LGPD.
      </div>

      <div className="mt-10 divide-y divide-neutral-800/60">
        <LegalSection title="1. Quais Dados Podem Ser Coletados">
          <p>
            O Monhang Editor 3D coleta apenas os dados necessarios para oferecer e melhorar a Plataforma. Abaixo detalhamos cada categoria.
          </p>
        </LegalSection>

        <LegalSection title="2. Dados de Conta">
          <p>
            Ao criar uma conta, podemos coletar: nome completo, e-mail, organizacao (se aplicavel) e credenciais de acesso. Esses dados sao utilizados para autenticacao, comunicacao e suporte.
          </p>
        </LegalSection>

        <LegalSection title="3. Dados de Projetos">
          <p>
            As cenas, paginas, interacoes, scripts e configuracoes que voce cria na Plataforma sao armazenados para permitir que voce acesse e edite seus projetos. Seus projetos sao privados por padrao e nao sao acessiveis a outros usuarios, a menos que voce os compartilhe.
          </p>
        </LegalSection>

        <LegalSection title="4. Arquivos Enviados (GLB, Imagens, Texturas)">
          <p>
            Modelos 3D nos formatos GLB e GLTF, imagens, texturas e outros assets que voce faz upload para a Plataforma sao armazenados de forma segura e utilizados apenas para renderizacao e edicao dentro do seu projeto. Esses arquivos nao sao compartilhados, vendidos ou utilizados para treinamento de IA sem sua autorizacao.
          </p>
        </LegalSection>

        <LegalSection title="5. Dados Tecnicos de Uso">
          <p>
            Podemos coletar dados tecnicos anonimizados para melhorar a Plataforma, como: tipo de navegador, sistema operacional, tempo medio de sessao, funcionalidades mais utilizadas e metricas de performance. Esses dados nao identificam usuarios individualmente.
          </p>
        </LegalSection>

        <LegalSection title="6. Cookies e Tecnologias Semelhantes">
          <p>
            Utilizamos cookies essenciais para o funcionamento da Plataforma, como autenticacao e preferencias de interface. Para mais detalhes, consulte nossa{' '}
            <a href="/cookies" className="text-emerald-400 underline hover:text-emerald-300">
              Politica de Cookies
            </a>.
          </p>
        </LegalSection>

        <LegalSection title="7. Finalidade do Uso dos Dados">
          <p>Utilizamos seus dados para as seguintes finalidades:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Fornecer, manter e melhorar a Plataforma.</li>
            <li>Autenticar usuarios e proteger contas.</li>
            <li>Enviar comunicacoes tecnicas ou administrativas.</li>
            <li>Oferecer suporte tecnico.</li>
            <li>Gerar estatisticas anonimizadas de uso.</li>
            <li>Cumprir obrigacoes legais.</li>
          </ul>
        </LegalSection>

        <LegalSection title="8. Seguranca">
          <p>
            Adotamos medidas tecnicas e administrativas para proteger seus dados contra acesso nao autorizado, perda, alteracao ou destruicao. Utilizamos criptografia em transito (TLS/HTTPS), armazenamento seguro e controle de acesso.
          </p>
          <p>
            Para mais informacoes, consulte nossa pagina de{' '}
            <a href="/seguranca" className="text-emerald-400 underline hover:text-emerald-300">
              Seguranca
            </a>.
          </p>
        </LegalSection>

        <LegalSection title="9. Compartilhamento de Dados">
          <p>
            Nao vendemos seus dados pessoais. Podemos compartilhar dados apenas nas seguintes situacoes:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Com prestadores de servico essenciais (hospedagem, CDN), sob contrato de confidencialidade.</li>
            <li>Mediante seu consentimento explicito.</li>
            <li>Para cumprimento de obrigacao legal ou ordem judicial.</li>
          </ul>
        </LegalSection>

        <LegalSection title="10. Retencao de Dados">
          <p>
            Mantemos seus dados enquanto sua conta estiver ativa e pelo periodo necessario para cumprir as finalidades descritas nesta politica. Ao excluir sua conta, seus dados serao removidos em ate 30 dias, salvo obrigacoes legais que exijam retencao.
          </p>
        </LegalSection>

        <LegalSection title="11. Direitos do Usuario (LGPD)">
          <p>
            Nos termos da Lei Geral de Protecao de Dados (LGPD &mdash; Lei 13.709/2018), voce tem direito a:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Confirmar a existencia de tratamento dos seus dados.</li>
            <li>Acessar seus dados pessoais armazenados.</li>
            <li>Corrigir dados incompletos ou desatualizados.</li>
            <li>Solicitar a exclusao dos seus dados.</li>
            <li>Revogar consentimento a qualquer momento.</li>
            <li>Portabilidade dos dados, quando aplicavel.</li>
          </ul>
          <p>
            Para exercer qualquer desses direitos, entre em contato pelo e-mail{' '}
            <a href="mailto:privacidade@monhang.com.br" className="text-emerald-400 underline hover:text-emerald-300">
              privacidade@monhang.com.br
            </a>.
          </p>
        </LegalSection>

        <LegalSection title="12. Contato">
          <p>
            Em caso de duvidas sobre esta Politica de Privacidade, entre em contato:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              E-mail:{' '}
              <a href="mailto:privacidade@monhang.com.br" className="text-emerald-400 underline hover:text-emerald-300">
                privacidade@monhang.com.br
              </a>
            </li>
            <li>
              Pagina de{' '}
              <a href="/suporte" className="text-emerald-400 underline hover:text-emerald-300">
                Suporte
              </a>
            </li>
          </ul>
        </LegalSection>
      </div>
    </article>
  );
}
