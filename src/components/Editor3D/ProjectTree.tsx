'use client';

import { useMemo, useState } from 'react';
import {
  Box,
  Boxes,
  Camera,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  FileCode,
  Folder,
  Grid3X3,
  Image as ImageIcon,
  Plus,
  Sun,
  Trash2,
  Type,
} from 'lucide-react';
import { flattenPageNodes } from '@/lib/page-builder/tree';
import type { PageNode, PageNodeType } from '@/lib/page-builder/types';
import { buildSceneTree, type SceneTreeNode } from '@/store/sceneTree';
import { useEditorStore } from '@/store/editorStore';
import { useExperienceStore } from '@/store/experienceStore';
import { useSceneStore } from '@/store/sceneStore';
import type { SceneObject } from '@/store/types';

const dragPayload = { draggedId: null as string | null };

const LEAF_NODE_TYPES: PageNodeType[] = ['text', 'button', 'image', 'video', 'sceneCanvas'];

const canAcceptChild = (parent: PageNode): boolean => !LEAF_NODE_TYPES.includes(parent.type);

const pageNodeIcons: Record<PageNodeType, React.ReactNode> = {
  section: <Folder size={13} />,
  container: <Grid3X3 size={13} />,
  text: <Type size={13} className="text-sky-300" />,
  button: <Box size={13} className="text-emerald-300" />,
  image: <ImageIcon size={13} className="text-violet-300" />,
  video: <FileCode size={13} className="text-amber-300" />,
  card: <Box size={13} className="text-orange-300" />,
  navbar: <FileCode size={13} className="text-cyan-300" />,
  footer: <FileCode size={13} className="text-neutral-400" />,
  sceneCanvas: <Boxes size={13} className="text-emerald-300" />,
};

const quickAddTypes: PageNodeType[] = ['section', 'container', 'text', 'button', 'card', 'sceneCanvas'];

function objectIcon(object: SceneObject) {
  if (object.lightConfig || object.type === 'Light') return <Sun size={13} className="text-yellow-400" />;
  if (object.type === 'Camera') return <Camera size={13} className="text-sky-400" />;
  if (object.type === 'Group' || object.kind === 'group') return <Folder size={13} />;
  return <Box size={13} />;
}

function TreeSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-md border border-neutral-800 bg-neutral-950/35">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-2.5 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400 transition hover:bg-neutral-800/55"
      >
        <span className="text-emerald-300">{icon}</span>
        {title}
        <ChevronDown size={13} className={`ml-auto text-neutral-600 transition ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && <div className="border-t border-neutral-800/70 p-1.5">{children}</div>}
    </div>
  );
}

function PageRow({ item }: { item: { node: PageNode; depth: number; parentId: string | null } }) {
  const selectedPageNodeId = useExperienceStore((state) => state.selectedPageNodeId);
  const setSelectedPageNode = useExperienceStore((state) => state.setSelectedPageNode);
  const movePageNode = useExperienceStore((state) => state.movePageNode);
  const reparentPageNode = useExperienceStore((state) => state.reparentPageNode);
  const removePageNode = useExperienceStore((state) => state.removePageNode);
  const clearSelectedObjects = useEditorStore((state) => state.clearSelectedObjects);
  const selected = selectedPageNodeId === item.node.id;
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | 'inside' | null>(null);

  const computeDropPosition = (event: React.DragEvent<HTMLElement>): 'before' | 'after' | 'inside' => {
    const rect = event.currentTarget.getBoundingClientRect();
    const offset = event.clientY - rect.top;
    const ratio = offset / rect.height;
    if (!canAcceptChild(item.node)) {
      return ratio < 0.5 ? 'before' : 'after';
    }
    if (ratio < 0.25) return 'before';
    if (ratio > 0.75) return 'after';
    return 'inside';
  };

  const handleDragStart = (event: React.DragEvent<HTMLElement>) => {
    dragPayload.draggedId = item.node.id;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', item.node.id);
  };

  const handleDragOver = (event: React.DragEvent<HTMLElement>) => {
    if (!dragPayload.draggedId || dragPayload.draggedId === item.node.id) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDropPosition(computeDropPosition(event));
  };

  const handleDragLeave = () => setDropPosition(null);

  const handleDrop = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const draggedId = dragPayload.draggedId;
    setDropPosition(null);
    if (!draggedId || draggedId === item.node.id) return;
    const position = computeDropPosition(event);
    const siblings = item.parentId
      ? useExperienceStore.getState().page.children
      : useExperienceStore.getState().page.children;
    void siblings;
    if (position === 'inside' && canAcceptChild(item.node)) {
      reparentPageNode(draggedId, item.node.id);
    } else {
      reparentPageNode(draggedId, item.parentId);
      const targetIndex = useExperienceStore.getState().page.children.findIndex((node) => node.id === item.node.id);
      reparentPageNode(draggedId, item.parentId, position === 'before' ? targetIndex : targetIndex + 1);
    }
    dragPayload.draggedId = null;
  };

  const handleDragEnd = () => {
    dragPayload.draggedId = null;
    setDropPosition(null);
  };

  const dropIndicatorClass =
    dropPosition === 'before'
      ? 'before'
      : dropPosition === 'after'
        ? 'after'
        : dropPosition === 'inside'
          ? 'inside'
          : '';

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
      className={`group relative flex items-center gap-1.5 rounded-md py-1.5 pr-1 text-sm transition ${
        selected
          ? 'bg-emerald-400/10 text-emerald-100 outline outline-1 outline-emerald-400/35'
          : 'text-neutral-300 hover:bg-neutral-800/70'
      } ${dropPosition === 'inside' ? 'ring-1 ring-sky-400/70' : ''}`}
      style={{ paddingLeft: 8 + item.depth * 14 }}
    >
      {dropPosition === 'before' && <span className="absolute inset-x-1 top-0 h-px bg-sky-400" />}
      {dropPosition === 'after' && <span className="absolute inset-x-1 bottom-0 h-px bg-sky-400" />}
      <div className="grid h-6 w-6 shrink-0 place-items-center rounded border border-neutral-800 bg-neutral-950 text-neutral-500">
        {pageNodeIcons[item.node.type]}
      </div>
      <button
        type="button"
        onClick={() => {
          clearSelectedObjects();
          setSelectedPageNode(item.node.id);
        }}
        className="min-w-0 flex-1 truncate text-left"
        title={item.node.name}
      >
        {item.node.name}
      </button>
      <div className={`flex shrink-0 opacity-0 transition group-hover:opacity-100 ${dropIndicatorClass ? 'pointer-events-none' : ''}`}>
        <button
          type="button"
          onClick={() => movePageNode(item.node.id, 'up')}
          className="grid h-7 w-6 place-items-center rounded text-neutral-600 transition hover:bg-neutral-800 hover:text-neutral-200"
          title="Mover para cima"
        >
          <ChevronUp size={12} />
        </button>
        <button
          type="button"
          onClick={() => movePageNode(item.node.id, 'down')}
          className="grid h-7 w-6 place-items-center rounded text-neutral-600 transition hover:bg-neutral-800 hover:text-neutral-200"
          title="Mover para baixo"
        >
          <ChevronDown size={12} />
        </button>
      </div>
      <button
        type="button"
        onClick={() => removePageNode(item.node.id)}
        className="grid h-7 w-7 shrink-0 place-items-center rounded text-neutral-600 opacity-0 transition hover:bg-red-500/15 hover:text-red-200 group-hover:opacity-100"
        title="Remover"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

function SceneRow({ node, depth = 0 }: { node: SceneTreeNode; depth?: number }) {
  const selectedObjectIds = useEditorStore((state) => state.selectedObjectIds);
  const setSelectedObject = useEditorStore((state) => state.setSelectedObject);
  const requestFrameObject = useEditorStore((state) => state.requestFrameObject);
  const setSelectedPageNode = useExperienceStore((state) => state.setSelectedPageNode);
  const selected = selectedObjectIds.includes(node.object.uuid);

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setSelectedPageNode(null);
          setSelectedObject(node.object.uuid);
          requestFrameObject(node.object.uuid);
        }}
        className={`flex w-full items-center gap-1.5 rounded-md py-1.5 pr-2 text-left text-sm transition ${
          selected
            ? 'bg-amber-300/10 text-amber-100 outline outline-1 outline-amber-300/35'
            : 'text-neutral-300 hover:bg-neutral-800/70'
        }`}
        style={{ paddingLeft: 8 + depth * 14 }}
        title={node.object.name}
      >
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded border border-neutral-800 bg-neutral-950 text-neutral-500">
          {objectIcon(node.object)}
        </span>
        <span className="min-w-0 flex-1 truncate">{node.object.name}</span>
      </button>
      {node.children.map((child) => (
        <SceneRow key={child.object.uuid} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function ProjectTree() {
  const page = useExperienceStore((state) => state.page);
  const addPageNode = useExperienceStore((state) => state.addPageNode);
  const leftPanelCollapsed = useEditorStore((state) => state.leftPanelCollapsed);
  const setLeftPanelCollapsed = useEditorStore((state) => state.setLeftPanelCollapsed);
  const objects = useSceneStore((state) => state.objects);
  const pageNodes = useMemo(() => flattenPageNodes(page), [page]);
  const sceneTree = useMemo(() => buildSceneTree(objects), [objects]);

  return (
    <aside className="flex h-full min-h-0 flex-col border-r border-neutral-800 bg-[#151719] max-lg:border-b max-lg:border-r-0">
      {leftPanelCollapsed ? (
        <div className="flex items-center justify-center border-b border-neutral-800 py-3">
          <button
            type="button"
            onClick={() => setLeftPanelCollapsed(false)}
            className="grid h-7 w-7 place-items-center rounded text-neutral-500 transition hover:bg-neutral-700/80 hover:text-neutral-100"
            title="Expandir"
          >
            <ChevronLeft size={14} className="rotate-180" />
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between border-b border-neutral-800 px-3 py-2.5 sm:px-4 sm:py-3">
            <div className="flex items-center gap-2">
              <Boxes size={15} className="text-emerald-300" />
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                Project
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setLeftPanelCollapsed(true)}
              className="grid min-h-9 min-w-9 place-items-center rounded text-neutral-500 transition hover:bg-neutral-700/80 hover:text-neutral-100"
              title="Recolher"
            >
              <ChevronLeft size={16} />
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 border-b border-neutral-800/70 p-2">
            {quickAddTypes.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => addPageNode(type)}
                className="grid h-8 w-8 place-items-center rounded-md border border-neutral-800 bg-neutral-950 text-neutral-500 transition hover:border-emerald-400/40 hover:text-emerald-200"
                title={`Adicionar ${type}`}
              >
                {type === 'section' ? <Plus size={13} /> : pageNodeIcons[type]}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-auto p-2 sm:p-3">
            <TreeSection title="Page" icon={<FileCode size={13} />}>
              <div className="space-y-px">
                {pageNodes.map((item) => (
                  <PageRow key={item.node.id} item={item} />
                ))}
              </div>
            </TreeSection>
            <TreeSection title="Scene" icon={<Boxes size={13} />}>
              {sceneTree.length === 0 ? (
                <div className="px-2 py-3 text-xs text-neutral-500">Cena vazia</div>
              ) : (
                <div className="space-y-px">
                  {sceneTree.map((node) => (
                    <SceneRow key={node.object.uuid} node={node} />
                  ))}
                </div>
              )}
            </TreeSection>
          </div>
        </>
      )}
    </aside>
  );
}
