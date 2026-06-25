import type { Vec3 } from '@/store/types';

export type InteractionTrigger =
  | 'pageLoad'
  | 'click'
  | 'hover'
  | 'mouseMove'
  | 'scroll'
  | 'sectionEnter'
  | 'sectionLeave'
  | 'doubleClick'
  | 'focus'
  | 'blur';

export type InteractionAction =
  | 'moveObject3D'
  | 'rotateObject3D'
  | 'scaleObject3D'
  | 'changeMaterial'
  | 'changeTexture'
  | 'changeColor'
  | 'changeOpacity'
  | 'toggleLight'
  | 'moveCamera'
  | 'animateCamera'
  | 'startAnimation'
  | 'pauseAnimation'
  | 'resetAnimation'
  | 'showElement'
  | 'hideElement'
  | 'changeText'
  | 'openModal'
  | 'navigateToLink'
  | 'runCustomScript'
  | 'createRecord'
  | 'updateRecord'
  | 'deleteRecord'
  | 'loadCollection'
  | 'runQuery'
  | 'setVariable'
  | 'incrementVariable'
  | 'toggleVariable'
  | 'showToast'
  | 'setLoading'
  | 'setError';

export type InteractionCondition = {
  id: string;
  field: 'breakpoint' | 'scrollProgress' | 'elementVisible' | 'custom';
  operator: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'contains';
  value: string | number | boolean;
};

export type AnimationSettings = {
  duration: number;
  easing: 'linear' | 'ease' | 'easeIn' | 'easeOut' | 'easeInOut' | 'spring';
  delay?: number;
  repeat?: number;
};

export type InteractionDocument = {
  id: string;
  name: string;
  trigger: InteractionTrigger;
  sourceId: string;
  targetId: string;
  action: InteractionAction;
  params: Record<string, unknown>;
  condition?: InteractionCondition;
  duration?: number;
  easing?: AnimationSettings['easing'];
  animation?: AnimationSettings;
  enabled: boolean;
};

export type RuntimeInteractionContext = {
  progress?: number;
  pointer?: { x: number; y: number };
  delta?: Vec3;
};

export const INTERACTION_TRIGGER_LABELS: Record<InteractionTrigger, string> = {
  pageLoad: 'Page load',
  click: 'Click',
  hover: 'Hover',
  mouseMove: 'Mouse move',
  scroll: 'Scroll',
  sectionEnter: 'Section enter',
  sectionLeave: 'Section leave',
  doubleClick: 'Double click',
  focus: 'Focus',
  blur: 'Blur',
};

export const INTERACTION_ACTION_LABELS: Record<InteractionAction, string> = {
  moveObject3D: 'Mover objeto 3D',
  rotateObject3D: 'Rotacionar objeto 3D',
  scaleObject3D: 'Escalar objeto 3D',
  changeMaterial: 'Trocar material',
  changeTexture: 'Trocar textura',
  changeColor: 'Alterar cor',
  changeOpacity: 'Alterar opacidade',
  toggleLight: 'Ligar/desligar luz',
  moveCamera: 'Mover camera',
  animateCamera: 'Animar camera',
  startAnimation: 'Iniciar animacao',
  pauseAnimation: 'Pausar animacao',
  resetAnimation: 'Resetar animacao',
  showElement: 'Mostrar elemento HTML',
  hideElement: 'Esconder elemento HTML',
  changeText: 'Trocar texto',
  openModal: 'Abrir modal',
  navigateToLink: 'Navegar para link',
  runCustomScript: 'Script customizado',
  createRecord: 'Criar registro',
  updateRecord: 'Atualizar registro',
  deleteRecord: 'Apagar registro',
  loadCollection: 'Carregar colecao',
  runQuery: 'Executar query',
  setVariable: 'Definir variavel',
  incrementVariable: 'Incrementar variavel',
  toggleVariable: 'Alternar variavel',
  showToast: 'Mostrar toast',
  setLoading: 'Set loading',
  setError: 'Set error',
};

export const INTERACTION_TRIGGERS = Object.keys(INTERACTION_TRIGGER_LABELS) as InteractionTrigger[];
export const INTERACTION_ACTIONS = Object.keys(INTERACTION_ACTION_LABELS) as InteractionAction[];
