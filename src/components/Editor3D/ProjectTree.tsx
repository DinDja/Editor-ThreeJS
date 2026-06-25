'use client';

import { useMemo, useState } from 'react';
import {
  ArrowUp,
  Box,
  Boxes,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Component,
  Copy,
  Database,
  FileBarChart,
  FileCode,
  Folder,
  Grid3X3,
  Image as ImageIcon,
  Layers,
  Plus,
  Search,
  Sun,
  Trash2,
  Type,
  Unlink,
} from 'lucide-react';
import { findPageNodeLocation, flattenPageNodes } from '@/lib/page-builder/tree';
import type { ComponentDefinition, PageDocument, PageNode, PageNodeType } from '@/lib/page-builder/types';
import { buildSceneTree, type SceneTreeNode } from '@/store/sceneTree';
import { useEditorStore } from '@/store/editorStore';
import { useExperienceStore } from '@/store/experienceStore';
import { useSceneStore } from '@/store/sceneStore';
import type { SceneObject } from '@/store/types';

const dragPayload = { draggedId: null as string | null };

const LEAF_NODE_TYPES: PageNodeType[] = ['text', 'button', 'image', 'video', 'sceneCanvas', 'input', 'select', 'textarea', 'label', 'menuitem', 'dataTable', 'dataForm', 'dataList', 'dataChart', 'dataStat'];

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
  form: <Check size={13} className="text-sky-300" />,
  input: <Type size={13} className="text-amber-300" />,
  select: <ChevronDown size={13} className="text-violet-300" />,
  textarea: <FileCode size={13} className="text-orange-300" />,
  label: <Type size={13} className="text-neutral-400" />,
  modal: <Grid3X3 size={13} className="text-pink-300" />,
  menu: <Folder size={13} className="text-cyan-300" />,
  menuitem: <Box size={13} className="text-neutral-400" />,
  dataTable: <Database size={13} className="text-emerald-300" />,
  dataForm: <Check size={13} className="text-emerald-300" />,
  dataList: <Database size={13} className="text-sky-300" />,
  dataChart: <FileBarChart size={13} className="text-amber-300" />,
  dataStat: <FileBarChart size={13} className="text-violet-300" />,
  pageRoute: <Folder size={13} className="text-rose-300" />,
};

function objectIcon(object: SceneObject) {
  if (object.lightConfig || object.type === 'Light') return <Sun size={13} className="text-yellow-400" />;
  if (object.type === 'Camera') return <Camera size={13} className="text-sky-400" />;
  if (object.type === 'Group' || object.kind === 'group') return <Folder size={13} />;
  return <Box size={13} />;
}

function PagesPanel() {
  const pages = useExperienceStore((state) => state.pages);
  const activePageId = useExperienceStore((state) => state.activePageId);
  const setActivePage = useExperienceStore((state) => state.setActivePage);
  const addPage = useExperienceStore((state) => state.addPage);
  const duplicatePage = useExperienceStore((state) => state.duplicatePage);
  const removePage = useExperienceStore((state) => state.removePage);
  const updatePageMeta = useExperienceStore((state) => state.updatePageMeta);
  const activePage = pages.find((page) => page.id === activePageId) ?? pages[0];

  const confirmRemove = (page: PageDocument) => {
    if (pages.length <= 1) return;
    if (window.confirm(`Remover a página "${page.name}"?`)) removePage(page.id);
  };

  return (
    <section data-tutorial="page-navigation" className="border-b border-neutral-800 bg-[#121416] px-2.5 py-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-neutral-500">Páginas</div>
          <div className="truncate text-[10px] text-neutral-600">{pages.length} rota(s) no projeto</div>
        </div>
        <button
          type="button"
          onClick={() => addPage(`Página ${pages.length + 1}`, `/pagina-${pages.length + 1}`)}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-emerald-400/30 bg-emerald-400/10 text-emerald-200 transition hover:border-emerald-300/60"
          title="Criar nova página"
        >
          <Plus size={12} />
        </button>
      </div>

      <div className="mb-2 grid max-h-36 gap-1 overflow-auto pr-1 ed-scroll">
        {pages.map((page) => {
          const selected = page.id === activePageId;
          return (
            <div
              key={page.id}
              className={`group flex min-w-0 items-center gap-1 rounded-md border px-1.5 py-1 transition ${
                selected
                  ? 'border-emerald-400/35 bg-emerald-400/10 text-emerald-100'
                  : 'border-neutral-800 bg-neutral-950/40 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
              }`}
              title={`${page.name} · ${page.path ?? '/'}`}
            >
              <button
                type="button"
                onClick={() => setActivePage(page.id)}
                className="flex min-w-0 flex-1 items-center gap-2 rounded px-0.5 text-left"
              >
                <FileCode size={12} className={selected ? 'text-emerald-300' : 'text-neutral-600'} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-medium">{page.name}</span>
                  <span className="block truncate text-[9px] text-neutral-600">{page.path ?? '/'}</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => duplicatePage(page.id)}
                className="grid h-6 w-6 shrink-0 place-items-center rounded text-neutral-600 opacity-0 transition hover:bg-neutral-800 hover:text-neutral-200 group-hover:opacity-100"
                title="Duplicar página"
              >
                <Copy size={10} />
              </button>
              <button
                type="button"
                onClick={() => confirmRemove(page)}
                disabled={pages.length <= 1}
                className="grid h-6 w-6 shrink-0 place-items-center rounded text-neutral-600 opacity-0 transition hover:bg-red-500/15 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-20 group-hover:opacity-100"
                title="Remover página"
              >
                <Trash2 size={10} />
              </button>
            </div>
          );
        })}
      </div>

      {activePage && (
        <div data-tutorial="page-route-settings" className="grid gap-1.5 rounded-md border border-neutral-800 bg-neutral-950/50 p-2">
          <label className="grid gap-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-neutral-600">
            Nome
            <input
              value={activePage.name}
              onChange={(event) => updatePageMeta({ name: event.target.value, title: activePage.title === activePage.name ? event.target.value : activePage.title })}
              className="h-7 rounded border border-neutral-800 bg-[#0d0f10] px-2 text-[11px] font-normal normal-case tracking-normal text-neutral-200 outline-none focus:border-emerald-500/60"
            />
          </label>
          <label className="grid gap-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-neutral-600">
            Rota
            <input
              value={activePage.path ?? '/'}
              onChange={(event) => updatePageMeta({ path: event.target.value })}
              className="h-7 rounded border border-neutral-800 bg-[#0d0f10] px-2 font-mono text-[11px] font-normal normal-case tracking-normal text-neutral-200 outline-none focus:border-emerald-500/60"
            />
          </label>
          <label className="grid gap-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-neutral-600">
            Título SEO
            <input
              value={activePage.title ?? activePage.name}
              onChange={(event) => updatePageMeta({ title: event.target.value })}
              className="h-7 rounded border border-neutral-800 bg-[#0d0f10] px-2 text-[11px] font-normal normal-case tracking-normal text-neutral-200 outline-none focus:border-emerald-500/60"
            />
          </label>
          <label className="flex items-center gap-2 text-[10px] text-neutral-500">
            <input
              type="checkbox"
              checked={activePage.protected ?? false}
              onChange={(event) => updatePageMeta({ protected: event.target.checked })}
              className="h-3.5 w-3.5 accent-emerald-500"
            />
            Protegida por autenticação
          </label>
        </div>
      )}
    </section>
  );
}


function PageRow({ item }: { item: { node: PageNode; depth: number; parentId: string | null } }) {
  const selectedPageNodeId = useExperienceStore((state) => state.selectedPageNodeId);
  const setSelectedPageNode = useExperienceStore((state) => state.setSelectedPageNode);
  const movePageNode = useExperienceStore((state) => state.movePageNode);
  const reparentPageNode = useExperienceStore((state) => state.reparentPageNode);
  const removePageNode = useExperienceStore((state) => state.removePageNode);
  const detachComponentInstance = useExperienceStore((state) => state.detachComponentInstance);
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
    if (position === 'inside' && canAcceptChild(item.node)) {
      reparentPageNode(draggedId, item.node.id);
    } else {
      const target = findPageNodeLocation(useExperienceStore.getState().page.children, item.node.id);
      reparentPageNode(draggedId, target?.parentId ?? null, (target?.index ?? 0) + (position === 'after' ? 1 : 0));
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

    const isComponentInstance = !!item.node.componentId;

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
      <div className={`grid h-6 w-6 shrink-0 place-items-center rounded border border-neutral-800 bg-neutral-950 text-neutral-500 ${isComponentInstance ? 'border-emerald-400/40' : ''}`}>
        {isComponentInstance ? <Layers size={11} className="text-emerald-300" /> : pageNodeIcons[item.node.type]}
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
      {isComponentInstance && (
        <span className="mr-1 rounded bg-emerald-400/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.08em] text-emerald-300">
          Instancia
        </span>
      )}
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
      {isComponentInstance ? (
        <button
          type="button"
          onClick={() => detachComponentInstance(item.node.id)}
          className="grid h-7 w-7 shrink-0 place-items-center rounded text-neutral-600 opacity-0 transition hover:bg-amber-500/15 hover:text-amber-200 group-hover:opacity-100"
          title="Desvincular componente"
        >
          <Unlink size={11} />
        </button>
      ) : null}
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

function ComponentRow({ component, onAdd, onSync, onRemove }: {
  component: ComponentDefinition;
  onAdd: () => void;
  onSync: () => void;
  onRemove: () => void;
}) {
  const page = useExperienceStore((state) => state.page);
  const instances = useMemo(() => {
    const allInstances: string[] = [];
    const walk = (nodes: PageNode[]) => {
      for (const n of nodes) {
        if (n.componentId === component.id) allInstances.push(n.name);
        if (n.children) walk(n.children);
      }
    };
    walk(page.children);
    return allInstances;
  }, [component.id, page.children]);

  return (
    <div className="group flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-neutral-300 transition hover:bg-neutral-800/70">
      <div className="grid h-6 w-6 shrink-0 place-items-center rounded border border-emerald-400/20 bg-neutral-950 text-neutral-500">
        <Layers size={11} className="text-emerald-300" />
      </div>
      <span className="min-w-0 flex-1 truncate text-[12px]">{component.name}</span>
      {instances.length > 0 && (
        <span className="mr-1 text-[9px] text-neutral-600">{instances.length} inst.</span>
      )}
      <div className="flex shrink-0 gap-0.5 opacity-0 transition group-hover:opacity-100">
        <button
          type="button"
          onClick={onAdd}
          className="grid h-6 w-6 place-items-center rounded text-neutral-600 transition hover:bg-neutral-800 hover:text-neutral-200"
          title="Adicionar na pagina"
        >
          <Plus size={11} />
        </button>
        <button
          type="button"
          onClick={onSync}
          className="grid h-6 w-6 place-items-center rounded text-neutral-600 transition hover:bg-neutral-800 hover:text-neutral-200"
          title="Sincronizar instancias"
        >
          <Copy size={10} />
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="grid h-6 w-6 place-items-center rounded text-neutral-600 transition hover:bg-red-500/15 hover:text-red-200"
          title="Remover componente"
        >
          <Trash2 size={10} />
        </button>
      </div>
    </div>
  );
}

function LayersRow({ node }: { node: PageNode }) {
  const selectedPageNodeId = useExperienceStore((state) => state.selectedPageNodeId);
  const setSelectedPageNode = useExperienceStore((state) => state.setSelectedPageNode);
  const updatePageNodeStyle = useExperienceStore((state) => state.updatePageNodeStyle);
  const zIndex = typeof node.styles.base.zIndex === 'number' ? node.styles.base.zIndex : 0;
  const isSelected = selectedPageNodeId === node.id;
  const zPct = Math.min(100, Math.max(0, Math.round(((zIndex + 1) / 51) * 100)));

  return (
    <div
      className={`group flex items-center gap-1.5 rounded-md py-1 pr-1 text-[11px] transition ${
        isSelected ? 'bg-emerald-400/10 text-emerald-100' : 'text-neutral-400 hover:bg-neutral-800/70'
      }`}
      style={{ paddingLeft: 8, cursor: 'pointer' }}
      onClick={() => setSelectedPageNode(node.id)}
    >
      <span className="flex w-6 justify-center text-[10px] text-neutral-600">{zIndex}</span>
      <div className="h-1 w-full rounded-full bg-neutral-800">
        <div className="h-1 rounded-full bg-emerald-400/70 transition-all" style={{ width: `${zPct}%` }} />
      </div>
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded border border-neutral-800 bg-neutral-950 text-neutral-500">
        {pageNodeIcons[node.type]}
      </span>
      <span className="min-w-0 flex-1 truncate">{node.name}</span>
      <div className="flex shrink-0 gap-0.5 opacity-0 transition group-hover:opacity-100">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); updatePageNodeStyle(node.id, { zIndex: Math.max(0, zIndex + 1) }); }}
          className="grid h-5 w-5 place-items-center rounded text-neutral-600 transition hover:bg-neutral-800 hover:text-neutral-200"
          title="Aumentar z-index"
        >
          <ArrowUp size={10} />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); updatePageNodeStyle(node.id, { zIndex: Math.max(0, zIndex - 1) }); }}
          className="grid h-5 w-5 place-items-center rounded text-neutral-600 transition hover:bg-neutral-800 hover:text-neutral-200"
          title="Diminuir z-index"
        >
          <ChevronDown size={10} />
        </button>
      </div>
    </div>
  );
}

type TreeTab = 'estrutura' | 'camadas' | 'componentes' | 'cena';

const treeTabs: Array<{ id: TreeTab; label: string; icon: React.ReactNode }> = [
  { id: 'estrutura', label: 'Estrutura', icon: <FileCode size={12} /> },
  { id: 'camadas', label: 'Camadas', icon: <Layers size={12} /> },
  { id: 'componentes', label: 'Comp.', icon: <Component size={12} /> },
  { id: 'cena', label: 'Cena', icon: <Boxes size={12} /> },
];

export default function ProjectTree() {
  const [componentNameInput, setComponentNameInput] = useState('');
  const [showComponentInput, setShowComponentInput] = useState(false);
  const [activeTab, setActiveTab] = useState<TreeTab>('estrutura');
  const [query, setQuery] = useState('');
  const page = useExperienceStore((state) => state.page);
  const components = useExperienceStore((state) => state.components);
  const createComponentFromSelection = useExperienceStore((state) => state.createComponentFromSelection);
  const addComponentInstance = useExperienceStore((state) => state.addComponentInstance);
  const removeComponent = useExperienceStore((state) => state.removeComponent);
  const syncComponentInstances = useExperienceStore((state) => state.syncComponentInstances);
  const selectedPageNodeId = useExperienceStore((state) => state.selectedPageNodeId);
  const leftPanelCollapsed = useEditorStore((state) => state.leftPanelCollapsed);
  const setLeftPanelCollapsed = useEditorStore((state) => state.setLeftPanelCollapsed);
  const objects = useSceneStore((state) => state.objects);
  const pageNodes = useMemo(() => flattenPageNodes(page), [page]);
  const filteredPageNodes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pageNodes;
    return pageNodes.filter((item) => item.node.name.toLowerCase().includes(q) || item.node.type.toLowerCase().includes(q));
  }, [pageNodes, query]);
  const sceneTree = useMemo(() => buildSceneTree(objects), [objects]);

  return (
    <aside data-tutorial="project-tree" className="flex h-full min-h-0 flex-col border-r border-neutral-800 bg-[#151719] max-lg:border-b max-lg:border-r-0">
      {leftPanelCollapsed ? (
        <div className="flex items-center justify-center border-b border-neutral-800 py-3">
          <button
            type="button"
            onClick={() => setLeftPanelCollapsed(false)}
            className="grid h-7 w-7 place-items-center rounded text-neutral-500 transition hover:bg-neutral-700/80 hover:text-neutral-100"
            title="Expandir"
            aria-label="Expandir painel"
          >
            <ChevronLeft size={14} className="rotate-180" />
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between border-b border-neutral-800 px-3 py-2.5 sm:px-4 sm:py-3">
            <div className="flex items-center gap-2">
              <Boxes size={15} className="text-emerald-300" />
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                Projeto
              </h2>
            </div>
            <div className="flex items-center gap-1">
              {showComponentInput ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (componentNameInput.trim() && selectedPageNodeId) {
                      createComponentFromSelection(componentNameInput.trim(), [selectedPageNodeId]);
                      setComponentNameInput('');
                      setShowComponentInput(false);
                    }
                  }}
                  className="flex items-center gap-1"
                >
                  <input
                    autoFocus
                    value={componentNameInput}
                    onChange={(e) => setComponentNameInput(e.target.value)}
                    placeholder="Nome do componente"
                    className="h-7 w-28 rounded border border-emerald-400/30 bg-[#0d0f10] px-2 text-[10px] text-neutral-200 outline-none placeholder:text-neutral-600"
                    onBlur={() => { setTimeout(() => setShowComponentInput(false), 200); }}
                  />
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowComponentInput(true)}
                  disabled={!selectedPageNodeId}
                  className="grid h-7 w-7 place-items-center rounded-md border border-neutral-800 bg-neutral-950 text-neutral-500 transition hover:border-emerald-400/40 hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-30"
                  title="Criar componente do elemento selecionado"
                  aria-label="Criar componente"
                >
                  <Component size={12} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setLeftPanelCollapsed(true)}
                className="grid min-h-8 min-w-8 place-items-center rounded text-neutral-500 transition hover:bg-neutral-700/80 hover:text-neutral-100"
                title="Recolher"
                aria-label="Recolher painel"
              >
                <ChevronLeft size={16} />
              </button>
            </div>
          </div>

          <PagesPanel />

          {(activeTab === 'estrutura' || activeTab === 'camadas') && (
            <div className="flex items-center gap-1.5 border-b border-neutral-800/70 px-2 py-1.5">
              <Search size={11} className="shrink-0 text-neutral-600" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filtrar…"
                className="h-7 min-w-0 flex-1 bg-transparent text-[10px] text-neutral-200 outline-none placeholder:text-neutral-600"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="text-[10px] text-neutral-600 transition hover:text-neutral-300"
                  aria-label="Limpar filtro"
                >
                  limpar
                </button>
              )}
            </div>
          )}

          <div data-tutorial="page-tree-tabs" className="flex shrink-0 items-center gap-0.5 border-b border-neutral-800/70 bg-neutral-950/30 px-1 py-1">
            {treeTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex h-7 min-w-0 flex-1 items-center justify-center gap-1 rounded-md px-1.5 text-[9px] font-semibold uppercase tracking-[0.08em] transition ${
                  activeTab === tab.id
                    ? 'bg-emerald-400/12 text-emerald-200 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.3)]'
                    : 'text-neutral-500 hover:bg-neutral-800 hover:text-neutral-200'
                }`}
                title={tab.label}
              >
                {tab.icon}
                <span className="hidden min-[360px]:inline truncate">{tab.label}</span>
              </button>
            ))}
          </div>

          <div data-tutorial="page-tree-structure" className="ed-scroll min-h-0 flex-1 space-y-2 overflow-auto p-2 sm:p-3">
            {activeTab === 'estrutura' && (
              <div className="space-y-px">
                {filteredPageNodes.length === 0 ? (
                  <div className="px-2 py-4 text-center text-[11px] text-neutral-600">
                    {query ? 'Nenhum elemento encontrado' : 'Página vazia — use Inserir na toolbar'}
                  </div>
                ) : (
                  filteredPageNodes.map((item) => <PageRow key={item.node.id} item={item} />)
                )}
              </div>
            )}

            {activeTab === 'camadas' && (
              <div className="space-y-0.5">
                <div className="px-1 pb-1.5 text-[9px] font-medium uppercase tracking-[0.16em] text-neutral-600">
                  Z-index · topo → base
                </div>
                {filteredPageNodes.length === 0 ? (
                  <div className="px-2 py-4 text-center text-[11px] text-neutral-600">
                    {query ? 'Nenhum elemento encontrado' : 'Página vazia'}
                  </div>
                ) : (
                  [...filteredPageNodes]
                    .sort((a, b) => {
                      const az = typeof a.node.styles.base.zIndex === 'number' ? a.node.styles.base.zIndex : 0;
                      const bz = typeof b.node.styles.base.zIndex === 'number' ? b.node.styles.base.zIndex : 0;
                      return bz - az;
                    })
                    .map((item) => <LayersRow key={item.node.id} node={item.node} />)
                )}
              </div>
            )}

            {activeTab === 'componentes' && (
              <div className="space-y-1">
                {components.length === 0 ? (
                  <div className="grid place-items-center gap-2 px-4 py-8 text-center">
                    <div className="grid h-10 w-10 place-items-center rounded-lg border border-neutral-800 bg-neutral-950 text-neutral-600">
                      <Component size={16} />
                    </div>
                    <p className="text-[11px] text-neutral-500">Nenhum componente salvo.</p>
                    <p className="max-w-[200px] text-[10px] leading-3 text-neutral-600">
                      Selecione um elemento e clique no ícone <Component size={10} className="inline" /> do cabeçalho para criá-lo.
                    </p>
                  </div>
                ) : (
                  components.map((comp) => (
                    <ComponentRow
                      key={comp.id}
                      component={comp}
                      onAdd={() => addComponentInstance(comp.id)}
                      onSync={() => syncComponentInstances(comp.id)}
                      onRemove={() => {
                        if (window.confirm(`Remover componente "${comp.name}"?`)) removeComponent(comp.id);
                      }}
                    />
                  ))
                )}
              </div>
            )}

            {activeTab === 'cena' && (
              <div className="space-y-px">
                {sceneTree.length === 0 ? (
                  <div className="grid place-items-center gap-2 px-4 py-8 text-center">
                    <div className="grid h-10 w-10 place-items-center rounded-lg border border-neutral-800 bg-neutral-950 text-neutral-600">
                      <Boxes size={16} />
                    </div>
                    <p className="text-[11px] text-neutral-500">Cena vazia.</p>
                    <p className="max-w-[200px] text-[10px] leading-3 text-neutral-600">
                      Vá ao modo Cena para adicionar objetos 3D.
                    </p>
                  </div>
                ) : (
                  sceneTree.map((node) => <SceneRow key={node.object.uuid} node={node} />)
                )}
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
