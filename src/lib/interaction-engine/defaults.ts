import { createId } from '@/store/types';
import type { InteractionAction, InteractionDocument, InteractionTrigger } from './types';

const defaultParamsByAction: Record<InteractionAction, Record<string, unknown>> = {
  moveObject3D: { position: [0, 0.4, 0] },
  rotateObject3D: { rotation: [0, 0.45, 0], smooth: true },
  scaleObject3D: { scale: [1.08, 1.08, 1.08] },
  changeMaterial: { color: '#00ffcc' },
  changeTexture: { textureUrl: '' },
  changeColor: { color: '#00ffcc' },
  changeOpacity: { opacity: 0.65 },
  toggleLight: { enabled: true },
  moveCamera: { position: [4, 2.8, 6], lookAt: [0, 0.5, 0] },
  animateCamera: { position: [2.5, 2.2, 4], lookAt: [0, 0.6, 0] },
  startAnimation: { animationName: 'default' },
  pauseAnimation: { animationName: 'default' },
  resetAnimation: { animationName: 'default' },
  showElement: {},
  hideElement: {},
  changeText: { text: 'Novo texto' },
  openModal: { title: 'Detalhes', body: 'Conteudo da experiencia' },
  navigateToLink: { href: '#contato' },
  runCustomScript: { code: '' },
};

export const createDefaultInteraction = (
  sourceId: string,
  targetId: string,
  trigger: InteractionTrigger = 'hover',
  action: InteractionAction = 'rotateObject3D',
): InteractionDocument => ({
  id: createId(),
  name: 'Nova interacao',
  trigger,
  sourceId,
  targetId,
  action,
  params: { ...defaultParamsByAction[action] },
  duration: 0.4,
  easing: 'easeOut',
  animation: {
    duration: 0.4,
    easing: 'easeOut',
  },
  enabled: true,
});

export const getDefaultParamsForAction = (action: InteractionAction) => ({
  ...defaultParamsByAction[action],
});
