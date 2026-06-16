'use client';

import { useEffect, useMemo, useState } from 'react';

type TutorialSpotlightProps = {
  open: boolean;
  onClose: () => void;
};

type TutorialStep = {
  id: string;
  selector: string;
  title: string;
  description: string;
  details: string[];
};

type Rect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const steps: TutorialStep[] = [
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

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export default function TutorialSpotlight({ open, onClose }: TutorialSpotlightProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);

  const currentStep = steps[stepIndex];

  useEffect(() => {
    if (!open) return;
    setStepIndex(0);
  }, [open]);

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

    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [open, currentStep.selector]);

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
