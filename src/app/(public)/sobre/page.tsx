import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Box, Code, Globe, Layers, Sparkles, Zap } from 'lucide-react';
import { SITE } from '@/lib/seo';
import Button from '@/components/ui/Button';

export const metadata: Metadata = {
  title: 'Sobre',
  description: 'Conheca o Monhang Editor 3D — plataforma brasileira de criacao de experiencias web 3D interativas com exportacao de codigo real.',
  alternates: { canonical: `${SITE.url}/sobre` },
};

const highlights = [
  {
    icon: <Box size={22} />,
    title: 'Modelagem 3D Visual',
    desc: 'Crie e edite cenas 3D diretamente no navegador com ferramentas intuitivas e suporte a GLB, GLTF e OBJ.',
  },
  {
    icon: <Layers size={22} />,
    title: 'Paginas com WebGL',
    desc: 'Combine HTML, CSS e canvas 3D em paginas responsivas. Crie landing pages, heroes e backgrounds imersivos.',
  },
  {
    icon: <Zap size={22} />,
    title: 'Interacoes Sem Codigo',
    desc: 'Conecte eventos a acoes visualmente. Clique, hover, scroll e timers controlam animacoes e comportamentos.',
  },
  {
    icon: <Code size={22} />,
    title: 'Exportacao de Codigo Real',
    desc: 'Exporte projetos completos para Next.js ou React. Codigo funcional, limpo e pronto para producao.',
  },
  {
    icon: <Globe size={22} />,
    title: 'Plataforma Brasileira',
    desc: 'Tecnologia com identidade nacional. Suporte em portugues, documentacao em PT-BR e foco no mercado brasileiro.',
  },
  {
    icon: <Sparkles size={22} />,
    title: 'IA Integrada',
    desc: 'Recursos de inteligencia artificial para geracao de modelos 3D a partir de imagens e otimizacao de cenas.',
  },
];

const comparisons = [
  {
    label: 'Exportacao de codigo real',
    desc: 'Diferente de ferramentas visuais que geram codigo proprietario, o Monhang exporta projetos Next.js e React completos que voce pode versionar, editar e implantar em qualquer lugar.',
  },
  {
    label: 'Foco em Web 3D',
    desc: 'Enquanto ferramentas de design web focam em layouts 2D, o Monhang integra nativamente Three.js e WebGL, permitindo criar paginas com cenas 3D interativas sem precisar programar shaders.',
  },
  {
    label: 'Sem lock-in',
    desc: 'Seu projeto exportado e um projeto web padrao. Voce nao depende da plataforma para rodar, editar ou publicar. O codigo e seu.',
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      <div className="mb-16 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-50 sm:text-4xl lg:text-5xl">
          Sobre o Monhang Editor 3D
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-neutral-400 sm:text-base">
          Uma plataforma brasileira que une modelagem 3D, construcao de paginas web e exportacao de codigo real em uma experiencia visual integrada.
        </p>
      </div>

      <section className="mb-20">
        <h2 className="text-xl font-semibold text-neutral-100 text-center mb-10">
          O que voce pode criar
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {highlights.map((h) => (
            <div
              key={h.title}
              className="rounded-xl border border-neutral-800/60 bg-[#0f1113] p-6 transition-colors hover:border-neutral-700/80"
            >
              <div className="mb-4 text-emerald-400">{h.icon}</div>
              <h3 className="text-sm font-semibold text-neutral-100">{h.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-500">{h.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-20">
        <h2 className="text-xl font-semibold text-neutral-100 text-center mb-10">
          Para quem e
        </h2>
        <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">
          {[
            { title: 'Designers', desc: 'Crie experiencias 3D sem codigo e exporte para desenvolvedores.' },
            { title: 'Desenvolvedores', desc: 'Acelere o desenvolvimento web 3D com codigo exportado limpo.' },
            { title: 'Agencias', desc: 'Entregue sites com WebGL mais rapido, com codigo padrao e customizavel.' },
            { title: 'Freelancers', desc: 'Ofereca experiencias 3D como servico para clientes sem equipe tecnica.' },
          ].map((p) => (
            <div key={p.title} className="rounded-xl border border-neutral-800/60 bg-[#0f1113] p-5">
              <h3 className="text-sm font-semibold text-neutral-100">{p.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-20">
        <h2 className="text-xl font-semibold text-neutral-100 text-center mb-10">
          Diferencial
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {comparisons.map((c) => (
            <div
              key={c.label}
              className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-6"
            >
              <h3 className="text-sm font-semibold text-emerald-300">{c.label}</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-400">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-20">
        <h2 className="text-xl font-semibold text-neutral-100 text-center mb-10">
          Visao Futura
        </h2>
        <div className="mx-auto max-w-3xl text-sm leading-relaxed text-neutral-400 space-y-4">
          <p>
            O Monhang Editor 3D nasceu com a missao de democratizar a criacao de experiencias web 3D no Brasil. Acreditamos que a combinacao de ferramentas visuais acessiveis com exportacao de codigo real e o caminho para uma web mais imersiva e independente.
          </p>
          <p>
            Nossa visao e evoluir a plataforma com mais formatos 3D, integracao com bancos de assets, colaboracao em tempo real, suporte a WebXR, exportacao para React Native e um ecossistema de plugins criado pela comunidade.
          </p>
          <p>
            O futuro da web tem profundidade. E ele fala portugues.
          </p>
        </div>
      </section>

      <div className="text-center">
        <Link href="/login">
          <Button size="lg" iconRight={<ArrowRight size={15} />}>
            Acessar o Editor
          </Button>
        </Link>
      </div>
    </div>
  );
}
