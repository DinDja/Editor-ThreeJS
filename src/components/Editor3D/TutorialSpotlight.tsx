'use client';

import { useEffect, useMemo, useState } from 'react';
import type { EditorMode } from '@/lib/page-builder/types';
import { useExperienceStore } from '@/store/experienceStore';

type TutorialSpotlightProps = {
  open: boolean;
  scope?: 'scene' | 'page-system';
  onClose: () => void;
};

type TutorialStep = {
  id: string;
  selector: string;
  title: string;
  description: string;
  details: string[];
  mode?: EditorMode;
};

type Rect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const sceneSteps: TutorialStep[] = [
  {
    id: 'tools-group',
    selector: '[data-tutorial="tools-group"]',
    title: 'Barra de Ferramentas de Transformacao',
    description: 'Este grupo define como voce interage com o objeto selecionado.',
    details: [
      'Use Select para apenas selecionar e navegar sem transformar.',
      'As demais ferramentas atuam diretamente no gizmo e na malha do objeto ativo.',
      'Sempre confirme qual objeto esta selecionado antes de transformar.',
    ],
  },
  {
    id: 'tool-select',
    selector: '[data-tutorial="tool-select"]',
    title: 'Select',
    description: 'Modo de selecao pura para escolher objetos sem alterar transformacoes.',
    details: [
      'Ideal para trocar rapidamente entre itens da cena.',
      'Use com Scene Graph para selecao precisa em cenas densas.',
    ],
  },
  {
    id: 'tool-translate',
    selector: '[data-tutorial="tool-translate"]',
    title: 'Mover',
    description: 'Desloca o objeto no espaco 3D.',
    details: [
      'Ative Snap para movimentos em incrementos e alinhamento limpo.',
      'Movimentos pequenos em eixos isolados evitam desalinhamento acidental.',
    ],
  },
  {
    id: 'tool-rotate',
    selector: '[data-tutorial="tool-rotate"]',
    title: 'Girar',
    description: 'Rotaciona o objeto em torno dos eixos.',
    details: [
      'Combine com Snap para angulos padronizados.',
      'A rotacao e local ao objeto, então hierarquia influencia resultado visual.',
    ],
  },
  {
    id: 'tool-scale',
    selector: '[data-tutorial="tool-scale"]',
    title: 'Escalar',
    description: 'Aumenta ou reduz dimensao do objeto.',
    details: [
      'Escalas muito extremas podem prejudicar leitura da cena.',
      'Para modelagem precisa, prefira ajustes pequenos e iterativos.',
    ],
  },
  {
    id: 'tool-edit',
    selector: '[data-tutorial="tool-edit"]',
    title: 'Editar Malha',
    description: 'Converte primitivas em malha editavel para edicao de vertices/faces.',
    details: [
      'Esse modo prepara o objeto para edicao estrutural.',
      'Use antes de ajustes de forma mais tecnicos e detalhados.',
    ],
  },
  {
    id: 'tool-sculpt',
    selector: '[data-tutorial="tool-sculpt"]',
    title: 'Sculpt',
    description: 'Esculpir para deformar superficie com pincel.',
    details: [
      'Melhor para formas organicas e refinamento de silhueta.',
      'Ajuste raio e intensidade para evitar deformacoes bruscas.',
    ],
  },
  {
    id: 'undo',
    selector: '[data-tutorial="undo"]',
    title: 'Undo',
    description: 'Volta uma acao no historico.',
    details: [
      'Use sem medo durante exploracao criativa.',
      'Funciona melhor com snapshots frequentes de alteracoes importantes.',
    ],
  },
  {
    id: 'redo',
    selector: '[data-tutorial="redo"]',
    title: 'Redo',
    description: 'Refaz uma acao desfeita.',
    details: [
      'Util para comparar duas abordagens de modelagem rapidamente.',
      'Se fizer nova edicao, o caminho antigo de redo pode ser substituido.',
    ],
  },
  {
    id: 'grid',
    selector: '[data-tutorial="grid"]',
    title: 'Grid',
    description: 'Liga/desliga grade de referencia no viewport.',
    details: [
      'Facilita noção de escala e orientacao espacial.',
      'Em cenas limpas, desligar grid pode ajudar na avaliacao visual final.',
    ],
  },
  {
    id: 'snap',
    selector: '[data-tutorial="snap"]',
    title: 'Snap',
    description: 'Ativa encaixe para transformacoes mais precisas.',
    details: [
      'Excelente para blocagem, arquitetura e alinhamentos tecnicos.',
      'Desative quando quiser movimentos livres e organicos.',
    ],
  },
  {
    id: 'add-primitive',
    selector: '[data-tutorial="add-primitive"]',
    title: 'Adicionar Primitiva',
    description: 'Cria a base da cena com geometrias simples.',
    details: [
      'Comece por primitivas para blocagem geral da composicao.',
      'Depois refine com edit/sculpt e materiais.',
    ],
  },
  {
    id: 'ai-generate',
    selector: '[data-tutorial="ai-generate"]',
    title: 'Gerar IA',
    description: 'Descreva uma cena e a IA monta varias primitivas para voce.',
    details: [
      'Decompoe objetos complexos em partes (tronco, cabeca, membros, detalhes).',
      'Use prompts detalhados para resultados mais ricos e variados.',
    ],
  },
  {
    id: 'import',
    selector: '[data-tutorial="import"]',
    title: 'Importar Modelo',
    description: 'Importa arquivos GLB/GLTF para a cena atual.',
    details: [
      'Use para kitbash ou basear criacao em asset externo.',
      'Apos importar, confira pivô, escala e material no painel de propriedades.',
    ],
  },
  {
    id: 'export',
    selector: '[data-tutorial="export"]',
    title: 'Exportar',
    description: 'Exporta a cena/objeto para arquivo GLB.',
    details: [
      'Use para backup de milestone e para pipeline externo.',
      'Valide nomenclatura e versao antes de exportar iteracoes finais.',
    ],
  },
  {
    id: 'reset',
    selector: '[data-tutorial="reset"]',
    title: 'Reset',
    description: 'Restaura cena e materiais para estado inicial.',
    details: [
      'Use com cautela quando quiser recomecar um estudo.',
      'Se precisar preservar estado, exporte antes de resetar.',
    ],
  },
  {
    id: 'scene-graph',
    selector: '[data-tutorial="scene-graph-panel"]',
    title: 'Scene Graph',
    description: 'Organiza e seleciona objetos por hierarquia e estrutura.',
    details: [
      'Melhor lugar para gerenciar parent/child em cenas complexas.',
      'Use nomes claros para facilitar navegacao e animacao.',
    ],
  },
  {
    id: 'viewport',
    selector: '[data-tutorial="viewport-panel"]',
    title: 'Viewport 3D',
    description: 'Area principal de visualizacao e manipulacao da cena.',
    details: [
      'Realize blocagem geral aqui antes de micro-ajustes.',
      'Alterne ferramentas com foco no resultado de silhueta e volume.',
    ],
  },
  {
    id: 'properties',
    selector: '[data-tutorial="properties-panel"]',
    title: 'Properties',
    description: 'Ajusta transformacoes, geometria e material do item selecionado.',
    details: [
      'Use para ajustes numericos precisos.',
      'Textura, UV e material ficam mais controlados por aqui.',
    ],
  },
  {
    id: 'timeline',
    selector: '[data-tutorial="timeline-panel"]',
    title: 'Timeline',
    description: 'Controla fluxo temporal e animacao.',
    details: [
      'Defina keyframes e revise timing da acao.',
      'Use playback iterativo para validar ritmo e transicoes.',
    ],
  },
];

const pageSystemSteps: TutorialStep[] = [
  {
    id: 'web-modes',
    selector: '[data-tutorial="mode-bar"]',
    mode: 'page',
    title: 'Modos do Sistema Web',
    description: 'A barra superior separa a produção em Cena, Página, Dados, Interações, Preview e Exportar.',
    details: [
      'Página monta a interface visual do site.',
      'Dados define coleções, variáveis e queries usadas pelos componentes.',
      'Interações conecta HTML, cena 3D, luzes, câmera e estado de dados.',
    ],
  },
  {
    id: 'page-mode',
    selector: '[data-tutorial="mode-page"]',
    mode: 'page',
    title: 'Modo Página',
    description: 'Aqui você edita o site como documento visual, usando elementos web e a cena 3D atual.',
    details: [
      'A página ativa é a rota que está sendo editada no canvas.',
      'Toda edição de layout, blocos e estilos fica gravada nessa página.',
      'Trocar de página muda o documento ativo sem apagar as outras rotas.',
    ],
  },
  {
    id: 'experience-toolbar',
    selector: '[data-tutorial="experience-toolbar"]',
    mode: 'page',
    title: 'Toolbar do Construtor',
    description: 'Reúne templates, blocos, inserção de elementos, salvar/carregar e histórico.',
    details: [
      'Use Templates para aplicar uma página completa.',
      'Use Blocos para inserir seções prontas sem substituir a página inteira.',
      'Salvar gera `.web3d.json` com páginas, cena, dados, variáveis e interações.',
    ],
  },
  {
    id: 'insert-menu',
    selector: '[data-tutorial="page-insert-menu"]',
    mode: 'page',
    title: 'Inserir Elementos',
    description: 'O menu Inserir adiciona layout, mídia, 3D, formulários e componentes conectados a dados.',
    details: [
      'O elemento entra dentro do item selecionado quando ele aceita filhos.',
      'Componentes como Data Table, Data Form e Data Stat usam o schema do modo Dados.',
      'Scene Canvas coloca a cena 3D atual dentro da página.',
    ],
  },
  {
    id: 'page-navigation',
    selector: '[data-tutorial="page-navigation"]',
    mode: 'page',
    title: 'Páginas e Rotas',
    description: 'Este painel controla múltiplas páginas do projeto e qual rota está ativa.',
    details: [
      'Crie, duplique, remova e selecione páginas sem perder a cena 3D global.',
      'Cada página tem `path`, nome, título SEO e flag de rota protegida.',
      'No Preview, links para rotas cadastradas trocam a página ativa.',
    ],
  },
  {
    id: 'route-settings',
    selector: '[data-tutorial="page-route-settings"]',
    mode: 'page',
    title: 'Metadados da Rota',
    description: 'Nome, rota e título SEO ficam aqui porque impactam navegação e exportação.',
    details: [
      'Use rotas curtas como `/`, `/sobre` e `/produto`.',
      'O título SEO descreve a página para export e documentação do projeto.',
      'A flag protegida prepara a página para autenticação em fases futuras.',
    ],
  },
  {
    id: 'project-tree',
    selector: '[data-tutorial="page-tree-structure"]',
    mode: 'page',
    title: 'Árvore da Página',
    description: 'Mostra a hierarquia do documento ativo: sections, containers, textos, botões, dados e canvas 3D.',
    details: [
      'Arraste elementos para reordenar ou reparentar.',
      'Use as abas para alternar entre estrutura, z-index, componentes e cena.',
      'A seleção aqui sincroniza com o canvas e o painel de propriedades.',
    ],
  },
  {
    id: 'page-canvas',
    selector: '[data-tutorial="page-canvas"]',
    mode: 'page',
    title: 'Canvas da Página',
    description: 'É a área visual onde você seleciona, edita texto inline, move e redimensiona elementos.',
    details: [
      'Clique em um elemento para selecioná-lo.',
      'Alt+Click seleciona o pai quando estiver dentro de containers.',
      'Setas movem o elemento selecionado; Shift aumenta o passo.',
    ],
  },
  {
    id: 'page-topbar',
    selector: '[data-tutorial="page-topbar"]',
    mode: 'page',
    title: 'Barra Contextual',
    description: 'Mostra o elemento ativo e ações rápidas como duplicar, subir, descer e remover.',
    details: [
      'Use Duplicar para repetir padrões de layout.',
      'Subir/Descer reorganiza o elemento entre irmãos.',
      'A leitura de tamanho ajuda a ajustar dimensões visualmente.',
    ],
  },
  {
    id: 'device-preview',
    selector: '[data-tutorial="page-device-preview"]',
    mode: 'page',
    title: 'Larguras de Edição',
    description: 'Simula canvas fluido, desktop, tablet e mobile durante a edição.',
    details: [
      'Use esse controle para validar responsividade enquanto constrói.',
      'Os breakpoints do painel de propriedades podem ajustar estilos por tamanho.',
      'Preview faz a checagem final com scroll real.',
    ],
  },
  {
    id: 'properties-panel',
    selector: '[data-tutorial="properties-panel"]',
    mode: 'page',
    title: 'Propriedades do Elemento',
    description: 'Edita conteúdo, layout, estilos, responsividade, pseudoestados e bindings.',
    details: [
      'É onde ficam ajustes finos que não cabem no canvas.',
      'Bindings como `{{vars.statusMessage}}` e `{{record.name}}` conectam UI a dados.',
      'Estados hover/active/focus e breakpoints são parte da liberdade de edição.',
    ],
  },
  {
    id: 'data-mode',
    selector: '[data-tutorial="mode-data"]',
    mode: 'data',
    title: 'Modo Dados',
    description: 'Define a camada de dados que alimenta tabelas, forms, listas, gráficos e interações.',
    details: [
      'Pense nele como o schema interno do site/aplicação.',
      'Coleções viram fontes para componentes visuais.',
      'Variáveis guardam estado runtime simples como contador, loading e mensagens.',
    ],
  },
  {
    id: 'data-panel',
    selector: '[data-tutorial="data-model-panel"]',
    mode: 'data',
    title: 'Painel de Dados',
    description: 'Centraliza schema, coleções, queries, variáveis e configurações de API/ORM.',
    details: [
      'Tudo é salvo no projeto `.web3d.json`.',
      'Exports já incluem JSON de dados, variáveis e arquivos de API/schema quando configurados.',
      'Persistência real em banco ainda depende da próxima integração.',
    ],
  },
  {
    id: 'data-sidebar',
    selector: '[data-tutorial="data-sidebar"]',
    mode: 'data',
    title: 'Coleções, Variáveis e Queries',
    description: 'A lateral do modo Dados alterna entre entidades e estado runtime.',
    details: [
      'Coleções representam tabelas/recursos.',
      'Variáveis representam estado global da experiência.',
      'Queries filtram, ordenam e limitam registros para componentes.',
    ],
  },
  {
    id: 'collection-editor',
    selector: '[data-tutorial="data-collection-editor"]',
    mode: 'data',
    title: 'Editor de Coleção',
    description: 'Aqui você define campos, tipos, obrigatoriedade, índices e API da coleção.',
    details: [
      'Campos `system` ajudam em ids e timestamps.',
      'Tipos como enum, relation, email e url orientam forms e export.',
      'A configuração de API prepara endpoints gerados na exportação.',
    ],
  },
  {
    id: 'field-editor',
    selector: '[data-tutorial="data-field-editor"]',
    mode: 'data',
    title: 'Campos e Tipos',
    description: 'Cada campo controla como os componentes de dados exibem e editam informações.',
    details: [
      'Data Form gera inputs baseado nos campos da coleção.',
      'Data Table e Data List usam labels e nomes dos campos.',
      'Relações e enums deixam o schema pronto para evoluir para backend real.',
    ],
  },
  {
    id: 'query-builder',
    selector: '[data-tutorial="data-query-builder"]',
    mode: 'data',
    title: 'Query Builder',
    description: 'Queries salvas filtram, ordenam e limitam registros sem escrever código.',
    details: [
      'Componentes de dados podem apontar para uma query específica.',
      'Interações podem rodar queries e salvar o resultado em variável.',
      'Isso cria a ponte entre página visual e lógica de aplicação.',
    ],
  },
  {
    id: 'interactions-mode',
    selector: '[data-tutorial="mode-interactions"]',
    mode: 'interactions',
    title: 'Modo Interações',
    description: 'Conecta eventos da página a objetos 3D, luzes, câmera, HTML, dados e variáveis.',
    details: [
      'Escolha trigger, origem, alvo, ação e parâmetros.',
      'Ações de dados podem criar registros, alterar variáveis e exibir toast.',
      'Ações 3D podem mover, rotacionar, mudar material, opacidade e luzes.',
    ],
  },
  {
    id: 'interactions-workspace',
    selector: '[data-tutorial="interactions-workspace"]',
    mode: 'interactions',
    title: 'Fluxo de Interações',
    description: 'Esta área mostra a lógica visual que transforma uma página estática em experiência interativa.',
    details: [
      'Use nomes claros para rastrear comportamentos complexos.',
      'Teste cada interação no Preview antes de exportar.',
      'O debug visual e condições avançadas ainda estão no roadmap.',
    ],
  },
  {
    id: 'preview-mode',
    selector: '[data-tutorial="mode-preview"]',
    mode: 'preview',
    title: 'Preview',
    description: 'Executa a experiência com scroll real, eventos, interações, dados runtime e métricas.',
    details: [
      'Use para testar navegação entre páginas e rotas.',
      'Observe FPS, draw calls, texturas, assets e memória.',
      'É a última checagem antes da exportação.',
    ],
  },
];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export default function TutorialSpotlight({ open, scope = 'scene', onClose }: TutorialSpotlightProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const setActiveMode = useExperienceStore((state) => state.setActiveMode);

  const steps = scope === 'page-system' ? pageSystemSteps : sceneSteps;
  const currentStep = steps[stepIndex];

  useEffect(() => {
    if (!open) return;

    const frameId = window.requestAnimationFrame(() => setStepIndex(0));
    return () => window.cancelAnimationFrame(frameId);
  }, [open, scope]);

  useEffect(() => {
    if (!open || !currentStep?.mode) return;
    setActiveMode(currentStep.mode);
  }, [currentStep?.mode, open, setActiveMode]);

  useEffect(() => {
    if (!open) return;

    const updateRect = () => {
      const element = document.querySelector(currentStep.selector);
      if (!element) {
        setTargetRect(null);
        return;
      }

      const rect = element.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
      element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    };

    const timeoutId = window.setTimeout(updateRect, currentStep.mode ? 120 : 0);
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [open, currentStep.mode, currentStep.selector]);

  const cardStyle = useMemo(() => {
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 720;
    const cardWidth = Math.min(460, viewportWidth - 32);
    const cardHeight = 280;

    if (!targetRect) {
      return {
        top: clamp(viewportHeight * 0.5 - cardHeight * 0.5, 16, viewportHeight - cardHeight - 16),
        left: clamp(viewportWidth * 0.5 - cardWidth * 0.5, 16, viewportWidth - cardWidth - 16),
        width: cardWidth,
      };
    }

    const desiredLeft = targetRect.left + targetRect.width * 0.5 - cardWidth * 0.5;
    const left = clamp(desiredLeft, 16, viewportWidth - cardWidth - 16);

    const belowTop = targetRect.top + targetRect.height + 16;
    const aboveTop = targetRect.top - cardHeight - 16;
    const top = aboveTop > 16 ? aboveTop : clamp(belowTop, 16, viewportHeight - cardHeight - 16);

    return { top, left, width: cardWidth };
  }, [targetRect]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120]" role="dialog" aria-modal="true" aria-label="Tutorial guiado com spotlight">
      <div className="absolute inset-0 bg-black/75" />

      {targetRect && (
        <>
          <div
            className="pointer-events-none absolute z-[121] rounded-xl border-2 border-emerald-300 shadow-[0_0_0_9999px_rgba(0,0,0,0.72),0_0_0_1px_rgba(255,255,255,0.15),0_0_24px_rgba(16,185,129,0.35)]"
            style={{
              top: targetRect.top - 6,
              left: targetRect.left - 6,
              width: targetRect.width + 12,
              height: targetRect.height + 12,
            }}
          />
        </>
      )}

      <section
        className="absolute z-[122] rounded-xl border border-neutral-700/90 bg-[#131517] p-4 text-neutral-100 shadow-[0_12px_60px_rgba(0,0,0,0.45)]"
        style={cardStyle}
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-200/90">
            Passo {stepIndex + 1} de {steps.length}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-neutral-700/80 px-2 py-1 text-[11px] uppercase tracking-[0.1em] text-neutral-300 transition hover:border-neutral-500 hover:text-white"
          >
            Fechar
          </button>
        </div>

        <h3 className="text-base font-semibold text-white">{currentStep.title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-neutral-300">{currentStep.description}</p>

        <ul className="mt-3 list-disc space-y-1 pl-4 text-xs leading-relaxed text-neutral-300">
          {currentStep.details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setStepIndex((prev) => Math.max(0, prev - 1))}
            disabled={stepIndex === 0}
            className="rounded border border-neutral-700/80 px-3 py-2 text-xs font-medium text-neutral-200 transition hover:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Anterior
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-neutral-700/80 px-3 py-2 text-xs font-medium text-neutral-300 transition hover:border-neutral-500 hover:text-white"
            >
              Sair tutorial
            </button>
            <button
              type="button"
              onClick={() => {
                if (stepIndex === steps.length - 1) {
                  onClose();
                  return;
                }
                setStepIndex((prev) => Math.min(steps.length - 1, prev + 1));
              }}
              className="rounded bg-emerald-400 px-3 py-2 text-xs font-semibold text-neutral-950 transition hover:bg-emerald-300"
            >
              {stepIndex === steps.length - 1 ? 'Concluir' : 'Proximo'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
