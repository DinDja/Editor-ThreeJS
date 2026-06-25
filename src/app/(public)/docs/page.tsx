import type { Metadata } from 'next';
import { SITE } from '@/lib/seo';
import DocSidebar from '@/components/public/DocSidebar';

export const metadata: Metadata = {
  title: 'Documentacao',
  description: 'Documentacao oficial do Monhang Editor 3D. Aprenda a criar experiencias web 3D interativas com exportacao de codigo real.',
  alternates: { canonical: `${SITE.url}/docs` },
};

const shortcutList = [
  { keys: 'Ctrl + S', desc: 'Salvar projeto' },
  { keys: 'Ctrl + Z', desc: 'Desfazer' },
  { keys: 'Ctrl + Shift + Z', desc: 'Refazer' },
  { keys: 'Ctrl + D', desc: 'Duplicar selecionado' },
  { keys: 'Delete', desc: 'Remover selecionado' },
  { keys: 'F', desc: 'Enquadrar selecao' },
  { keys: 'G', desc: 'Ferramenta Mover' },
  { keys: 'R', desc: 'Ferramenta Rotacionar' },
  { keys: 'S', desc: 'Ferramenta Escalar' },
  { keys: '1', desc: 'Modo Cena' },
  { keys: '2', desc: 'Modo Pagina' },
  { keys: '3', desc: 'Modo Interacoes' },
  { keys: '4', desc: 'Preview' },
  { keys: '5', desc: 'Exportacao' },
];

export default function DocsPage() {
  return (
    <div className="mx-auto flex max-w-6xl gap-8 px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      <DocSidebar />

      <article className="min-w-0 flex-1">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-50 sm:text-4xl">
            Documentacao
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-neutral-400 max-w-2xl">
            Aprenda a criar experiencias web 3D interativas com o Monhang Editor 3D. Da modelagem a exportacao de codigo real.
          </p>
        </div>

        <div className="space-y-16">
          <section id="conceitos">
            <h2 className="text-xl font-semibold text-neutral-100">Conceitos Principais</h2>
            <div className="mt-4 space-y-4 text-sm leading-relaxed text-neutral-400">
              <p>
                O Monhang Editor 3D organiza seu trabalho em <strong className="text-neutral-200">Projetos</strong>. Cada projeto contem:
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-neutral-200">Cenas 3D:</strong> objetos, luzes, cameras e materiais renderizados com Three.js/WebGL.
                </li>
                <li>
                  <strong className="text-neutral-200">Paginas:</strong> estrutura HTML com blocos de conteudo e canvas 3D embutidos.
                </li>
                <li>
                  <strong className="text-neutral-200">Interacoes:</strong> regras que conectam eventos do usuario a acoes em elementos HTML e 3D.
                </li>
              </ul>
            </div>
          </section>

          <section id="modo-cena">
            <h2 className="text-xl font-semibold text-neutral-100">Modo Cena</h2>
            <div className="mt-4 space-y-4 text-sm leading-relaxed text-neutral-400">
              <p>
                O Modo Cena e o ambiente de modelagem 3D. Aqui voce posiciona objetos, ajusta materiais, iluminacao e cameras.
              </p>
              <p>Principais funcionalidades:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Importacao de modelos GLB, GLTF, OBJ e FBX.</li>
                <li>Primitivas 3D: cubo, esfera, cilindro, plano e torus.</li>
                <li>Ferramentas de transformacao: mover (G), rotacionar (R), escalar (S).</li>
                <li>Editor de materiais com PBR.</li>
                <li>Iluminacao: ambiente, direcional, ponto e spot.</li>
                <li>Timeline para animacoes.</li>
                <li>Arvore de cena para hierarquia de objetos.</li>
              </ul>
            </div>
          </section>

          <section id="modo-pagina">
            <h2 className="text-xl font-semibold text-neutral-100">Modo Pagina</h2>
            <div className="mt-4 space-y-4 text-sm leading-relaxed text-neutral-400">
              <p>
                O Modo Pagina funciona como um construtor visual de paginas web. Voce monta a estrutura com blocos arrastaveis:
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Blocos de texto (titulos, paragrafos).</li>
                <li>Blocos de midia (imagens, videos).</li>
                <li>Blocos de canvas 3D (renderizam cenas do Modo Cena).</li>
                <li>Blocos de container (divs, secoes, grids).</li>
                <li>Blocos interativos (botoes, links, formularios).</li>
              </ul>
              <p>
                As paginas sao responsivas por padrao. Voce pode definir layouts diferentes para desktop, tablet e mobile.
              </p>
            </div>
          </section>

          <section id="modo-interacoes">
            <h2 className="text-xl font-semibold text-neutral-100">Modo Interacoes</h2>
            <div className="mt-4 space-y-4 text-sm leading-relaxed text-neutral-400">
              <p>
                O Modo Interacoes permite criar logica visual entre elementos sem escrever codigo.
              </p>
              <p>Estrutura de uma interacao:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-neutral-200">Gatilho:</strong> click, hover, scroll, timer, tecla pressionada.
                </li>
                <li>
                  <strong className="text-neutral-200">Alvo:</strong> elemento HTML ou objeto 3D que recebe a acao.
                </li>
                <li>
                  <strong className="text-neutral-200">Acao:</strong> animar (entrada/saida), mostrar/esconder, navegar, reproduzir animacao 3D, executar script.
                </li>
              </ul>
            </div>
          </section>

          <section id="preview">
            <h2 className="text-xl font-semibold text-neutral-100">Preview</h2>
            <div className="mt-4 space-y-4 text-sm leading-relaxed text-neutral-400">
              <p>
                O Preview executa sua pagina em um ambiente isolado dentro do editor. Todas as cenas 3D, interacoes e scripts funcionam exatamente como no codigo exportado.
              </p>
              <p>
                Use o Preview para testar interacoes, verificar responsividade e validar a experiencia antes de exportar.
              </p>
            </div>
          </section>

          <section id="exportacao">
            <h2 className="text-xl font-semibold text-neutral-100">Exportacao Web</h2>
            <div className="mt-4 space-y-4 text-sm leading-relaxed text-neutral-400">
              <p>
                A exportacao gera codigo-fonte real e funcional, pronto para uso em producao. Formatos disponiveis:
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-neutral-200">Next.js:</strong> projeto completo com App Router, TypeScript, Tailwind CSS e React Three Fiber.
                </li>
                <li>
                  <strong className="text-neutral-200">React:</strong> componente funcional com a cena 3D, pronto para integrar em projetos existentes.
                </li>
              </ul>
            </div>
          </section>

          <section id="estrutura">
            <h2 className="text-xl font-semibold text-neutral-100">Estrutura de Projeto Exportado</h2>
            <div className="mt-4 space-y-4 text-sm leading-relaxed text-neutral-400">
              <p>
                Um projeto Next.js exportado segue esta estrutura padrao:
              </p>
              <pre className="overflow-x-auto rounded-lg border border-neutral-800/60 bg-[#0f1113] p-4 font-mono text-xs text-neutral-300">
{`meu-projeto/
  src/
    app/
      layout.tsx
      page.tsx
      globals.css
    components/
      Scene3D.tsx
      PageCanvas.tsx
    lib/
      scene-data.ts
  public/
    models/
    textures/
  package.json
  next.config.ts
  tailwind.config.ts`}
              </pre>
            </div>
          </section>

          <section id="formatos">
            <h2 className="text-xl font-semibold text-neutral-100">Formatos Suportados</h2>
            <div className="mt-4 space-y-4 text-sm leading-relaxed text-neutral-400">
              <div className="overflow-x-auto rounded-lg border border-neutral-800/60">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-neutral-800/60 bg-neutral-800/30">
                      <th className="px-4 py-2.5 font-medium text-neutral-300">Formato</th>
                      <th className="px-4 py-2.5 font-medium text-neutral-300">Tipo</th>
                      <th className="px-4 py-2.5 font-medium text-neutral-300">Importacao</th>
                      <th className="px-4 py-2.5 font-medium text-neutral-300">Exportacao</th>
                    </tr>
                  </thead>
                  <tbody className="text-neutral-400">
                    {[
                      ['GLB', 'Modelo 3D', 'Sim', 'Sim'],
                      ['GLTF', 'Modelo 3D', 'Sim', 'Sim'],
                      ['OBJ', 'Modelo 3D', 'Sim', 'Nao'],
                      ['FBX', 'Modelo 3D', 'Sim', 'Nao'],
                      ['PNG', 'Textura/Imagem', 'Sim', 'Sim'],
                      ['JPG', 'Textura/Imagem', 'Sim', 'Sim'],
                      ['WEBP', 'Textura/Imagem', 'Sim', 'Sim'],
                      ['HDR', 'Iluminacao', 'Sim', 'Nao'],
                    ].map(([format, type, import_, export_]) => (
                      <tr key={format} className="border-b border-neutral-800/40">
                        <td className="px-4 py-2.5 font-mono text-xs">{format}</td>
                        <td className="px-4 py-2.5">{type}</td>
                        <td className="px-4 py-2.5">
                          {import_ === 'Sim' ? (
                            <span className="text-emerald-400">Sim</span>
                          ) : (
                            <span className="text-neutral-600">Nao</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {export_ === 'Sim' ? (
                            <span className="text-emerald-400">Sim</span>
                          ) : (
                            <span className="text-neutral-600">Nao</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section id="boas-praticas">
            <h2 className="text-xl font-semibold text-neutral-100">Boas Praticas</h2>
            <div className="mt-4 space-y-4 text-sm leading-relaxed text-neutral-400">
              <ul className="list-disc space-y-2 pl-5">
                <li>Use modelos GLB sempre que possivel, por serem compactos e autossuficientes.</li>
                <li>Mantenha texturas em resolucao 1024x1024 ou 2048x2048 para web.</li>
                <li>Limite o numero de luzes dinamicas. Prefira luz ambiente + 1 luz direcional.</li>
                <li>Agrupe objetos relacionados na hierarquia da cena.</li>
                <li>Teste o Preview regularmente durante o desenvolvimento.</li>
                <li>Nomeie objetos e cenas de forma descritiva.</li>
                <li>Salve frequentemente (Ctrl+S).</li>
              </ul>
            </div>
          </section>

          <section id="atalhos">
            <h2 className="text-xl font-semibold text-neutral-100">Atalhos de Teclado</h2>
            <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-800/60">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-800/60 bg-neutral-800/30">
                    <th className="px-4 py-2.5 font-medium text-neutral-300">Atalho</th>
                    <th className="px-4 py-2.5 font-medium text-neutral-300">Acao</th>
                  </tr>
                </thead>
                <tbody className="text-neutral-400">
                  {shortcutList.map((s) => (
                    <tr key={s.keys} className="border-b border-neutral-800/40">
                      <td className="px-4 py-2.5">
                        <kbd className="rounded border border-neutral-700 bg-neutral-800/60 px-2 py-0.5 font-mono text-xs text-neutral-200">
                          {s.keys}
                        </kbd>
                      </td>
                      <td className="px-4 py-2.5">{s.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section id="limitacoes">
            <h2 className="text-xl font-semibold text-neutral-100">Limitacoes Conhecidas</h2>
            <div className="mt-4 space-y-4 text-sm leading-relaxed text-neutral-400">
              <ul className="list-disc space-y-2 pl-5">
                <li>Suporte a WebGPU em fase experimental. Recomendamos WebGL para producao.</li>
                <li>Arquivos OBJ e FBX muito grandes podem ter desempenho reduzido na importacao.</li>
                <li>Animacoes complexas com muitos keyframes podem aumentar o tamanho do arquivo exportado.</li>
                <li>O Preview carrega em uma nova aba/contexto e nao suporta hot-reload. Salve antes de testar.</li>
                <li>Exportacao para React Native nao e suportada no momento.</li>
              </ul>
            </div>
          </section>
        </div>

        <div className="mt-16 rounded-xl border border-neutral-800/60 bg-[#0f1113] p-6 text-center">
          <p className="text-sm text-neutral-400">
            Documentacao em constante evolucao.{' '}
            <a href="/suporte" className="font-medium text-emerald-400 underline hover:text-emerald-300">
              Sugira melhorias
            </a>{' '}
            ou consulte a{' '}
            <a href="/ajuda" className="font-medium text-emerald-400 underline hover:text-emerald-300">
              Central de Ajuda
            </a>.
          </p>
        </div>
      </article>
    </div>
  );
}
