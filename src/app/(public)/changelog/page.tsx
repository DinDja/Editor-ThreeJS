import type { Metadata } from 'next';
import { SITE } from '@/lib/seo';
import ChangelogEntry, { type ChangelogVersion } from '@/components/public/ChangelogEntry';

export const metadata: Metadata = {
  title: 'Changelog',
  description: 'Historico de versoes do Monhang Editor 3D. Acompanhe melhorias, correcoes e novos recursos da plataforma.',
  alternates: { canonical: `${SITE.url}/changelog` },
};

const changelogData: ChangelogVersion[] = [
  {
    version: 'v1.0.0',
    date: '15/01/2026',
    type: 'feature',
    title: 'Lancamento oficial do Monhang Editor 3D',
    items: [
      'Editor 3D completo com suporte a Three.js e WebGL.',
      'Modo Cena com importacao de GLB, GLTF, OBJ e FBX.',
      'Modo Pagina com construtor visual de paginas web.',
      'Modo Interacoes para logica visual entre elementos.',
      'Preview em tempo real com renderizacao WebGL.',
      'Exportacao de codigo para Next.js e React.',
      'Suporte a texturas PBR e iluminacao avancada.',
      'Timeline para animacoes.',
      'Integracao com IA para geracao de modelos 3D a partir de imagens.',
    ],
  },
  {
    version: 'v1.0.1',
    date: '10/02/2026',
    type: 'improvement',
    title: 'Melhorias de performance e UX',
    items: [
      'Otimizacao do carregamento de cenas grandes.',
      'Melhoria na responsividade do Modo Pagina.',
      'Novos atalhos de teclado no Modo Cena.',
      'Ajustes no layout do painel de propriedades.',
    ],
  },
  {
    version: 'v1.0.2',
    date: '05/03/2026',
    type: 'fix',
    title: 'Correcoes e estabilidade',
    items: [
      'Correcao no carregamento de texturas em modelos GLB.',
      'Correcao de bug no Preview com multiplas cenas.',
      'Correcao na exportacao de projetos com scripts customizados.',
      'Melhoria no tratamento de erros durante importacao de modelos.',
    ],
  },
  {
    version: 'v1.1.0',
    date: '20/04/2026',
    type: 'feature',
    title: 'Novos recursos e formatos',
    items: [
      'Suporte a importacao de modelos com animacoes embutidas.',
      'Nova ferramenta de modelagem poligonal basica.',
      'Integracao com novos provedores de IA.',
      'Exportacao de projetos com estrutura modular.',
      'Suporte a iluminacao HDR no Modo Cena.',
    ],
  },
  {
    version: 'v1.1.1',
    date: '15/05/2026',
    type: 'improvement',
    title: 'Refinamento da experiencia',
    items: [
      'Interface reformulada com novo design system.',
      'Melhoria na documentacao embutida.',
      'Otimizacao do tamanho do bundle exportado.',
      'Suporte a temas claro e escuro.',
    ],
  },
  {
    version: 'v1.2.0',
    date: '25/06/2026',
    type: 'feature',
    title: 'Paginas institucionais e recursos publicos',
    items: [
      'Novas paginas institucionais: Sobre, Termos de Uso, Privacidade, Cookies, Seguranca.',
      'Central de Ajuda com FAQ organizado por categorias.',
      'Documentacao inicial do produto.',
      'Pagina de Contato e Suporte com formulario.',
      'Changelog publico para acompanhamento de versoes.',
      'Pagina 404 personalizada.',
    ],
  },
];

export default function ChangelogPage() {
  return (
    <article className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-50 sm:text-4xl">
          Changelog
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-400 max-w-2xl">
          Acompanhe a evolucao do Monhang Editor 3D. Novas versoes, correcoes e melhorias documentadas.
        </p>
      </div>

      <div className="mt-10">
        {changelogData.map((entry, index) => (
          <ChangelogEntry key={index} {...entry} />
        ))}
      </div>

      <div className="mt-12 rounded-xl border border-neutral-800/60 bg-[#0f1113] p-6 text-center">
        <p className="text-sm text-neutral-400">
          Acompanhe tambem nossas{' '}
          <a href="/docs" className="font-medium text-emerald-400 underline hover:text-emerald-300">
            documentacoes
          </a>{' '}
          ou{' '}
          <a href="/suporte" className="font-medium text-emerald-400 underline hover:text-emerald-300">
            entre em contato
          </a>{' '}
          com sugestoes.
        </p>
      </div>
    </article>
  );
}
