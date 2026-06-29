'use client';

import { useEffect } from 'react';
import { useContextMenu } from '@/store/contextMenuStore';
import { useExperienceStore } from '@/store/experienceStore';
import { usePageBuilderViewModeStore } from '@/store/pageBuilderViewModeStore';
import { findPageNode } from '@/lib/page-builder/tree';
import { MenuPanel } from './ContextMenu';
import type { MenuItem } from './ContextMenu';
import {
  Copy,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  LockOpen,
  Unlink,
  ChevronsUp,
  ChevronsDown,
  ArrowUpToLine,
  ArrowDownToLine,
  ArrowUp,
  ArrowDown,
  Grid3X3,
  Focus,
  Layers,
} from 'lucide-react';

function NodeMenu({ nodeId }: { nodeId: string }) {
  const { menu, hide } = useContextMenu();
  const page = useExperienceStore((s) => s.page);
  const selectedIds = useExperienceStore((s) => s.selectedPageNodeIds);
  const isPartOfSelection = selectedIds.includes(nodeId);
  const ids = isPartOfSelection ? selectedIds : [nodeId];
  const isMulti = ids.length > 1;
  const node = isMulti ? null : findPageNode(page.children, nodeId);

  const items: MenuItem[] = [
    {
      label: 'Duplicar', icon: Copy,
      onClick: () => {
        if (isMulti) useExperienceStore.getState().duplicatePageNodes(ids);
        else useExperienceStore.getState().duplicatePageNode(nodeId);
      },
    },
    {
      label: 'Remover', icon: Trash2, danger: true,
      onClick: () => {
        if (isMulti) useExperienceStore.getState().removePageNodes(ids);
        else useExperienceStore.getState().removePageNode(nodeId);
      },
    },
    { separator: true, onClick: () => {} },
    {
      label: 'Subir', icon: ArrowUp,
      onClick: () => {
        if (isMulti) useExperienceStore.getState().movePageNodes(ids, 'up');
        else useExperienceStore.getState().movePageNode(nodeId, 'up');
      },
    },
    {
      label: 'Descer', icon: ArrowDown,
      onClick: () => {
        if (isMulti) useExperienceStore.getState().movePageNodes(ids, 'down');
        else useExperienceStore.getState().movePageNode(nodeId, 'down');
      },
    },
    { separator: true, onClick: () => {} },
    {
      label: 'Trazer para o topo', icon: ChevronsUp,
      onClick: () => useExperienceStore.getState().reorderPageNodes(ids, 'top'),
    },
    {
      label: 'Trazer para frente', icon: ArrowUpToLine,
      onClick: () => useExperienceStore.getState().reorderPageNodes(ids, 'front'),
    },
    {
      label: 'Enviar para trás', icon: ArrowDownToLine,
      onClick: () => useExperienceStore.getState().reorderPageNodes(ids, 'back'),
    },
    {
      label: 'Enviar para o fundo', icon: ChevronsDown,
      onClick: () => useExperienceStore.getState().reorderPageNodes(ids, 'bottom'),
    },
    { separator: true, onClick: () => {} },
  ];

  if (node && !isMulti) {
    items.push({
      label: node.hidden ? 'Mostrar' : 'Ocultar',
      icon: node.hidden ? Eye : EyeOff,
      onClick: () => useExperienceStore.getState().togglePageNodeVisibility(nodeId),
    });
    items.push({
      label: node.locked ? 'Desbloquear' : 'Bloquear',
      icon: node.locked ? LockOpen : Lock,
      onClick: () => useExperienceStore.getState().togglePageNodeLock(nodeId),
    });
  } else if (isMulti) {
    items.push({
      label: 'Ocultar', icon: EyeOff,
      onClick: () => useExperienceStore.getState().setPageNodesVisibility(ids, true),
    });
    items.push({
      label: 'Bloquear', icon: Lock,
      onClick: () => useExperienceStore.getState().setPageNodesLock(ids, true),
    });
  }

  if (node && !isMulti && node.componentId) {
    items.push({ separator: true, onClick: () => {} });
    items.push({
      label: 'Desvincular', icon: Unlink,
      onClick: () => useExperienceStore.getState().detachComponentInstance(nodeId),
    });
  }

  if (isMulti) {
    items.push({ separator: true, onClick: () => {} });
    items.push({
      label: 'Agrupar em container', icon: Layers,
      onClick: () => useExperienceStore.getState().wrapPageNodesInContainer(ids),
    });
  }

  return <MenuPanel items={items} onClose={hide} x={menu.x} y={menu.y} />;
}

function EmptyPageSpaceMenu() {
  const { menu, hide } = useContextMenu();
  const state = usePageBuilderViewModeStore.getState();

  const items: MenuItem[] = [
    {
      label: 'Alternar Background', icon: Grid3X3,
      onClick: () => {
        const current = usePageBuilderViewModeStore.getState().background;
        const next = current === 'plain' ? 'dots' : current === 'dots' ? 'grid-8' : current === 'grid-8' ? 'grid-16' : 'plain';
        usePageBuilderViewModeStore.getState().setBackground(next);
      },
    },
    {
      label: state.xrayMode ? 'Desativar X-ray' : 'Ativar X-ray',
      icon: Eye,
      onClick: () => usePageBuilderViewModeStore.getState().toggleXray(),
    },
    {
      label: state.showOnlySelection ? 'Mostrar tudo' : 'Apenas seleção',
      icon: Focus,
      onClick: () => usePageBuilderViewModeStore.getState().toggleShowOnlySelection(),
    },
  ];

  return <MenuPanel items={items} onClose={hide} x={menu.x} y={menu.y} />;
}

export default function PageBuilderContextMenu() {
  const { menu, hide } = useContextMenu();

  useEffect(() => {
    if (!menu.visible) return;
    const onScroll = () => hide();
    window.addEventListener('scroll', onScroll, true);
    return () => window.removeEventListener('scroll', onScroll, true);
  }, [menu.visible, hide]);

  if (!menu.visible) return null;
  if (menu.objectId) return <NodeMenu nodeId={menu.objectId} />;
  return <EmptyPageSpaceMenu />;
}
