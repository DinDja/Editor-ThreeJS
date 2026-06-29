'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, Copy, Eye, EyeOff, Layers, Lock, LockOpen, MoveDown, MoveUp, Package, Plus, Trash2, Unlink, Group } from 'lucide-react';
import { useExperienceStore } from '@/store/experienceStore';

type MenuItem = {
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  onClick: () => void;
  danger?: boolean;
  divider?: boolean;
  disabled?: boolean;
};

type Position = { x: number; y: number };

type PageContextMenuProps = {
  state: PageContextMenuState | null;
  onClose: () => void;
};

type PageContextMenuState = {
  position: Position;
  nodeId: string;
  nodeName: string;
  isMulti: boolean;
  isLocked: boolean;
  isHidden: boolean;
  isComponentInstance: boolean;
};

export default function PageContextMenu({ state, onClose }: PageContextMenuProps) {
  useEffect(() => {
    if (!state) return;
    const onScroll = () => onClose();
    window.addEventListener('scroll', onScroll, true);
    return () => window.removeEventListener('scroll', onScroll, true);
  }, [state, onClose]);

  if (!state) return null;

  const store = useExperienceStore.getState();
  const selectedIds = store.selectedPageNodeIds;
  const activeIds = state.isMulti && selectedIds.length > 1 ? selectedIds : [state.nodeId];
  const isComponentInstance = state.isComponentInstance;

  const items: MenuItem[] = [
    {
      label: 'Duplicar',
      icon: <Copy size={12} />,
      shortcut: 'Ctrl+D',
      onClick: () => {
        if (activeIds.length > 1) store.duplicatePageNodes(activeIds);
        else store.duplicatePageNode(state.nodeId);
        onClose();
      },
    },
    {
      label: 'Subir',
      icon: <MoveUp size={12} />,
      onClick: () => {
        if (activeIds.length > 1) store.movePageNodes(activeIds, 'up');
        else store.movePageNode(state.nodeId, 'up');
        onClose();
      },
    },
    {
      label: 'Descer',
      icon: <MoveDown size={12} />,
      onClick: () => {
        if (activeIds.length > 1) store.movePageNodes(activeIds, 'down');
        else store.movePageNode(state.nodeId, 'down');
        onClose();
      },
      divider: true,
    },
    {
      label: state.isLocked ? 'Desbloquear' : 'Bloquear',
      icon: state.isLocked ? <LockOpen size={12} /> : <Lock size={12} />,
      onClick: () => {
        if (activeIds.length > 1) {
          const next = !state.isLocked;
          store.setPageNodesLock(activeIds, next);
        } else {
          store.togglePageNodeLock(state.nodeId);
        }
        onClose();
      },
      divider: true,
    },
    {
      label: state.isHidden ? 'Mostrar' : 'Ocultar',
      icon: state.isHidden ? <Eye size={12} /> : <EyeOff size={12} />,
      onClick: () => {
        if (activeIds.length > 1) {
          const next = !state.isHidden;
          store.setPageNodesVisibility(activeIds, next);
        } else {
          store.togglePageNodeVisibility(state.nodeId);
        }
        onClose();
      },
    },
    {
      label: 'Agrupar em container',
      icon: <Group size={12} />,
      onClick: () => {
        store.wrapPageNodesInContainer(activeIds);
        onClose();
      },
      disabled: activeIds.length < 2,
      divider: true,
    },
    {
      label: 'Trazer para frente',
      icon: <Layers size={12} />,
      onClick: () => {
        store.reorderPageNodes(activeIds, 'front');
        onClose();
      },
    },
    {
      label: 'Enviar para trás',
      icon: <Layers size={12} className="rotate-180" />,
      onClick: () => {
        store.reorderPageNodes(activeIds, 'back');
        onClose();
      },
      divider: true,
    },
    {
      label: 'Criar componente…',
      icon: <Package size={12} />,
      disabled: activeIds.length < 1,
      onClick: () => {
        const name = window.prompt('Nome do componente:', state.nodeName);
        if (name && name.trim()) {
          store.createComponentFromSelection(name.trim(), activeIds);
        }
        onClose();
      },
    },
  ];

  if (isComponentInstance && activeIds.length === 1) {
    items.push({
      label: 'Desvincular componente',
      icon: <Unlink size={12} />,
      onClick: () => {
        store.detachComponentInstance(state.nodeId);
        onClose();
      },
      divider: true,
    });
  }

  items.push({
    label: state.isMulti ? `Remover ${activeIds.length} elementos` : 'Remover',
    icon: <Trash2 size={12} />,
    shortcut: 'Delete',
    onClick: () => {
      if (activeIds.length > 1) store.removePageNodes(activeIds);
      else store.removePageNode(state.nodeId);
      onClose();
    },
    danger: true,
  });

  // Position with viewport edge detection
  const x = Math.min(state.position.x, window.innerWidth - 240);
  const y = Math.min(state.position.y, window.innerHeight - items.length * 28 - 20);

  return (
    <div
      className="fixed z-[150] min-w-[200px] rounded-md border border-neutral-700/80 bg-neutral-950/95 p-1 shadow-2xl backdrop-blur"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
        {state.isMulti ? `${activeIds.length} elementos` : state.nodeName}
      </div>
      {items.map((item, index) => (
        <div key={index}>
          {item.divider && <div className="my-1 h-px bg-neutral-800" />}
          <button
            type="button"
            disabled={item.disabled}
            onClick={item.onClick}
            className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[12px] transition ${
              item.disabled
                ? 'cursor-not-allowed text-neutral-600'
                : item.danger
                  ? 'text-red-300 hover:bg-red-400/10'
                  : 'text-neutral-200 hover:bg-neutral-800 hover:text-emerald-200'
            }`}
          >
            {item.icon && <span className="grid h-5 w-5 shrink-0 place-items-center text-neutral-500">{item.icon}</span>}
            <span className="flex-1">{item.label}</span>
            {item.shortcut && <span className="text-[10px] text-neutral-600">{item.shortcut}</span>}
          </button>
        </div>
      ))}
    </div>
  );
}

export type { PageContextMenuState };
