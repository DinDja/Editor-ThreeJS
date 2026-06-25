import type { Metadata } from 'next';
import { SITE } from '@/lib/seo';
import LegalSection from '@/components/public/LegalSection';

export const metadata: Metadata = {
  title: 'Termos de Uso',
  description: 'Termos de uso do Monhang Editor 3D. Entenda as regras e condicoes para uso da plataforma de criacao de experiencias web 3D.',
  alternates: { canonical: `${SITE.url}/termos-de-uso` },
};

const lastUpdate = '2026-01-15';

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-50 sm:text-4xl">
          Termos de Uso
        </h1>
        <p className="mt-3 text-sm text-neutral-500">
          Ultima atualizacao: {lastUpdate}
        </p>
      </div>

      <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-4 text-sm leading-relaxed text-amber-200/80">
        <strong>Aviso:</strong> Este documento e um modelo informativo. Recomendamos revisao juridica antes do uso oficial em producao.
      </div>

      <div className="mt-10 divide-y divide-neutral-800/60">
        <LegalSection title="1. Apresentacao">
          <p>
            Bem-vindo ao Monhang Editor 3D (&ldquo;Plataforma&rdquo;). Estes Termos de Uso regulam o acesso e uso do editor web 3D, incluindo todas as ferramentas de modelagem, cena, pagina, interacoes, preview e exportacao de codigo.
          </p>
          <p>
            Ao acessar ou utilizar a Plataforma, voce concorda com estes Termos. Se nao concordar, nao utilize a Plataforma.
          </p>
        </LegalSection>

        <LegalSection title="2. Descricao do Produto">
          <p>
            O Monhang Editor 3D e uma plataforma brasileira de criacao de experiencias web 3D interativas. A ferramenta permite modelar cenas 3D, configurar paginas web com conteudo HTML e WebGL, definir interacoes entre elementos e exportar codigo-fonte real para projetos Next.js e React.
          </p>
        </LegalSection>

        <LegalSection title="3. Uso Permitido">
          <p>
            A Plataforma deve ser utilizada exclusivamente para fins licitos. E proibido utilizar o Monhang Editor 3D para:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Criar conteudo ilegal, ofensivo, difamatorio ou que viole direitos de terceiros.</li>
            <li>Engenharia reversa, descompilacao ou extracao do codigo-fonte da Plataforma.</li>
            <li>Uso abusivo que possa comprometer a estabilidade ou seguranca dos servidores.</li>
            <li>Violacao de direitos autorais ou de propriedade intelectual de terceiros.</li>
          </ul>
        </LegalSection>

        <LegalSection title="4. Responsabilidades do Usuario">
          <p>
            Voce e integralmente responsavel pelo conteudo que cria, importa e exporta na Plataforma. Isso inclui modelos 3D, texturas, imagens, scripts e qualquer outro arquivo carregado ou gerado.
          </p>
          <p>
            Voce deve manter a confidencialidade de suas credenciais de acesso e notificar imediatamente a equipe Monhang sobre qualquer uso nao autorizado de sua conta.
          </p>
        </LegalSection>

        <LegalSection title="5. Propriedade Intelectual">
          <p>
            A Plataforma Monhang Editor 3D, sua interface, logotipos, codigo-fonte do editor e documentacao sao de propriedade exclusiva da Monhang. Estes Termos nao transferem qualquer direito de propriedade intelectual sobre a Plataforma ao usuario.
          </p>
        </LegalSection>

        <LegalSection title="6. Conteudo Criado pelo Usuario">
          <p>
            Todo o conteudo criado por voce dentro da Plataforma &mdash; incluindo cenas, modelos 3D, paginas, interacoes, scripts e assets &mdash; pertence a voce. A Monhang nao reivindica propriedade sobre o conteudo gerado pelo usuario.
          </p>
          <p>
            Ao utilizar a Plataforma, voce concede a Monhang uma licenca limitada para processar, armazenar e renderizar seu conteudo exclusivamente para o funcionamento tecnico da Plataforma.
          </p>
        </LegalSection>

        <LegalSection title="7. Exportacao de Codigo e Assets">
          <p>
            O codigo exportado pela Plataforma (Next.js, React, HTML, JavaScript, CSS e arquivos 3D associados) e de sua propriedade. Voce pode utiliza-lo livremente em seus projetos pessoais ou comerciais, respeitando as licencas de bibliotecas de terceiros eventualmente incluidas na exportacao (como Three.js).
          </p>
        </LegalSection>

        <LegalSection title="8. Limitacoes de Responsabilidade">
          <p>
            A Plataforma e fornecida &ldquo;como esta&rdquo; (&ldquo;as is&rdquo;). A Monhang nao oferece garantias quanto a disponibilidade ininterrupta, ausencia de erros ou adequacao a finalidades especificas.
          </p>
          <p>
            Em nenhuma circunstancia a Monhang sera responsavel por danos indiretos, incidentais, especiais ou consequentes decorrentes do uso ou incapacidade de uso da Plataforma.
          </p>
        </LegalSection>

        <LegalSection title="9. Disponibilidade do Servico">
          <p>
            A Monhang se esforca para manter a Plataforma disponivel 24/7, porem nao garante disponibilidade ininterrupta. Podem ocorrer manutencoes programadas, atualizacoes ou interrupcoes imprevistas.
          </p>
        </LegalSection>

        <LegalSection title="10. Atualizacoes dos Termos">
          <p>
            A Monhang reserva-se o direito de modificar estes Termos a qualquer momento. Alteracoes significativas serao comunicadas com antecedencia via e-mail ou notificacao na Plataforma. O uso continuado apos alteracoes constitui aceitacao dos novos termos.
          </p>
        </LegalSection>

        <LegalSection title="11. Contato">
          <p>
            Para duvidas sobre estes Termos de Uso, entre em contato pelo e-mail{' '}
            <a href="mailto:legal@monhang.com.br" className="text-emerald-400 underline hover:text-emerald-300">
              legal@monhang.com.br
            </a>{' '}
            ou pela pagina de{' '}
            <a href="/suporte" className="text-emerald-400 underline hover:text-emerald-300">
              Suporte
            </a>.
          </p>
        </LegalSection>
      </div>
    </article>
  );
}
