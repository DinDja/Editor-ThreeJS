'use client';

import { useMemo, useState } from 'react';
import {
  Atom,
  Box,
  Boxes,
  Brush,
  Camera,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Eye,
  EyeOff,
  FileBox,
  Folder,
  Lock,
  LockOpen,
  Plus,
  CircleDot,
  Cuboid,
  Play,
  Sun,
  Trash2,
} from 'lucide-react';
import { useEditorStore } from '@/store/editorStore';
import { useHistoryStore } from '@/store/historyStore';
import { useMaterialStore } from '@/store/materialStore';
import { usePhysicsStore } from '@/store/physicsStore';
import { useSceneStore } from '@/store/sceneStore';
import { buildSceneTree, getSubtreeIds, type SceneTreeNode } from '@/store/sceneTree';
import type { Layer, SceneObject } from '@/store/types';
import { getPhysicsConfig, PHYSICS_BODY_LABELS, PHYSICS_COLLIDER_LABELS } from '@/lib/physics';

const rowButton =
  'flex min-w-0 items-center gap-1.5 rounded-md px-2 py-2.5 text-left text-sm transition sm:py-2';

const objectIcon = (object: SceneObject) => {
  if (object.effect) return <Brush size={13} />;
  if (object.lightConfig || object.type === 'Light') return <Sun size={13} className="text-yellow-400" />;
  if (object.type === 'Camera') return <Camera size={13} className="text-sky-400" />;
  if (object.type === 'Group' || object.kind === 'group') return <Folder size={13} />;
  if (object.kind === 'model') return <FileBox size={13} />;
  return <Box size={13} />;
};

function PhysicsIndicators({ object }: { object: SceneObject }) {
  const simulationMode = usePhysicsStore((state) => state.mode);
  const playback = usePhysicsStore((state) => state.playback);
  const physics = getPhysicsConfig(object);

  if (!physics.enabled) return <div className="h-6" />;

  const bodyColor =
    physics.bodyType === 'dynamic'
      ? 'text-emerald-300'
      : physics.bodyType === 'kinematic'
        ? 'text-cyan-300'
        : 'text-amber-300';

  return (
    <div className="flex h-6 items-center justify-end gap-1 text-neutral-600">
      <Atom size={12} className="text-cyan-300" aria-label="Fisica ativa" />
      <Cuboid size={12} className="text-neutral-400" aria-label={PHYSICS_COLLIDER_LABELS[physics.colliderType]} />
      <CircleDot size={12} className={bodyColor} aria-label={PHYSICS_BODY_LABELS[physics.bodyType]} />
      {simulationMode === 'simulation' && playback !== 'stopped' && (
        <Play size={12} className="text-emerald-300" aria-label="Simulando" />
      )}
    </div>
  );
}

function SceneRow({
  node,
  layer,
  collapsedIds,
  onToggle,
}: {
  node: SceneTreeNode;
  layer: Layer;
  collapsedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  const object = node.object;
  const selectedObjectIds = useEditorStore((state) => state.selectedObjectIds);
  const setSelectedObject = useEditorStore((state) => state.setSelectedObject);
  const updateObject = useSceneStore((state) => state.updateObject);
  const removeObject = useSceneStore((state) => state.removeObject);
  const objects = useSceneStore((state) => state.objects);
  const removeMaterialsForObjects = useMaterialStore((state) => state.removeMaterialsForObjects);
  const pushSnapshot = useHistoryStore((state) => state.pushSnapshot);

  const selected = selectedObjectIds.includes(object.uuid);
  const hasChildren = node.children.length > 0;
  const expanded = !collapsedIds.has(object.uuid);
  const rowHidden = !layer.visible || !object.visible;
  const locked = layer.locked || object.locked;

  const handleVisibility = () => {
    pushSnapshot();
    updateObject(object.uuid, { visible: !object.visible });
  };

  const handleLock = () => {
    pushSnapshot();
    updateObject(object.uuid, { locked: !object.locked });
  };

  const handleRemove = () => {
    pushSnapshot();
    const ids = getSubtreeIds(objects, object.uuid);
    removeObject(object.uuid);
    removeMaterialsForObjects(ids);
    if (selectedObjectIds.some((id) => ids.includes(id))) useEditorStore.getState().clearSelectedObjects();
  };

  return (
    <div>
      <div
        className={`${rowButton} ${
          selected
            ? 'bg-amber-300/10 text-amber-100 outline outline-1 outline-amber-300/45'
            : rowHidden
              ? 'text-neutral-600 hover:bg-neutral-800/45'
              : 'text-neutral-300 hover:bg-neutral-800/75'
        }`}
        style={{ paddingLeft: 8 + node.depth * 16 }}
      >
        <button
          type="button"
          onClick={() => hasChildren && onToggle(object.uuid)}
          disabled={!hasChildren}
          title={expanded ? 'Recolher' : 'Expandir'}
          className="grid h-6 w-6 shrink-0 place-items-center rounded text-neutral-500 transition enabled:hover:bg-neutral-700 enabled:hover:text-neutral-100 disabled:opacity-20"
        >
          <ChevronDown size={14} className={`transition ${expanded ? 'rotate-0' : '-rotate-90'}`} />
        </button>
        <div
          className={`grid h-6 w-6 shrink-0 place-items-center rounded border ${
            selected
              ? 'border-amber-300/35 bg-amber-300/10 text-amber-100'
              : locked
                ? 'border-neutral-800 bg-neutral-950 text-amber-300'
                : 'border-neutral-800 bg-neutral-950 text-neutral-500'
          }`}
        >
          {objectIcon(object)}
        </div>
        <button
          type="button"
          onClick={(e) => setSelectedObject(object.uuid, e.shiftKey || e.ctrlKey)}
          className="min-w-0 flex-1 truncate text-left"
          title={object.name}
        >
          {object.name}
        </button>
        <div className="hidden shrink-0 lg:flex lg:items-center"><PhysicsIndicators object={object} /></div>
        <div className="flex shrink-0 justify-end gap-0.5">
          <button
            type="button"
            title={object.visible ? 'Ocultar' : 'Mostrar'}
            aria-label={`Visibilidade ${object.name}`}
            onClick={handleVisibility}
            className={`grid min-h-7 min-w-7 cursor-pointer place-items-center rounded transition hover:bg-neutral-700/80 hover:text-neutral-100 touch-manipulation ${
              object.visible ? 'text-emerald-300' : 'text-neutral-600'
            }`}
          >
            {object.visible ? <Eye size={12} /> : <EyeOff size={12} />}
          </button>
          <button
            type="button"
            title={object.locked ? 'Destravar' : 'Travar'}
            aria-label={`Travar ${object.name}`}
            onClick={handleLock}
            className={`grid min-h-7 min-w-7 cursor-pointer place-items-center rounded transition hover:bg-neutral-700/80 hover:text-neutral-100 touch-manipulation ${
              object.locked ? 'text-amber-300' : 'text-neutral-600'
            }`}
          >
            {object.locked ? <Lock size={12} /> : <LockOpen size={12} />}
          </button>
          <button
            type="button"
            title="Remover"
            aria-label={`Remover ${object.name}`}
            onClick={handleRemove}
            className="grid min-h-7 min-w-7 cursor-pointer place-items-center rounded text-neutral-500 transition hover:bg-red-500/15 hover:text-red-200 touch-manipulation"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      {hasChildren && expanded && (
        <div className="space-y-px">
          {node.children.map((child) => (
            <SceneRow
              key={child.object.uuid}
              node={child}
              layer={layer}
              collapsedIds={collapsedIds}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LayerRow({ layer }: { layer: Layer }) {
  const layers = useSceneStore((state) => state.layers);
  const objects = useSceneStore((state) => state.objects);
  const updateLayer = useSceneStore((state) => state.updateLayer);
  const removeLayer = useSceneStore((state) => state.removeLayer);
  const reorderLayers = useSceneStore((state) => state.reorderLayers);
  const selectedObjectIds = useEditorStore((state) => state.selectedObjectIds);
  const clearSelectedObjects = useEditorStore((state) => state.clearSelectedObjects);
  const pushSnapshot = useHistoryStore((state) => state.pushSnapshot);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(layer.name);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  const sortedLayers = useMemo(
    () => [...layers].sort((a, b) => a.order - b.order),
    [layers],
  );
  const layerIndex = sortedLayers.findIndex((l) => l.id === layer.id);
  const layerNodes = useMemo(
    () => buildSceneTree(objects).filter((node) => node.object.layerId === layer.id),
    [objects, layer.id],
  );
  const layerObjectCount = objects.filter((object) => object.layerId === layer.id).length;

  const toggleNode = (id: string) => {
    setCollapsedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleVisibility = () => {
    pushSnapshot();
    updateLayer(layer.id, { visible: !layer.visible });
  };

  const handleToggleLock = () => {
    pushSnapshot();
    updateLayer(layer.id, { locked: !layer.locked });
  };

  const handleRemoveLayer = () => {
    if (layers.length <= 1) return;
    pushSnapshot();
    const objectsInLayer = objects.filter((o) => o.layerId === layer.id);
    if (selectedObjectIds.some((id) => objectsInLayer.some((o) => o.uuid === id))) {
      clearSelectedObjects();
    }
    removeLayer(layer.id);
  };

  const handleMoveUp = () => {
    if (layerIndex <= 0) return;
    pushSnapshot();
    reorderLayers(layerIndex, layerIndex - 1);
  };

  const handleMoveDown = () => {
    if (layerIndex >= sortedLayers.length - 1) return;
    pushSnapshot();
    reorderLayers(layerIndex, layerIndex + 1);
  };

  const handleNameSubmit = () => {
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== layer.name) {
      pushSnapshot();
      updateLayer(layer.id, { name: trimmed });
    } else {
      setNameDraft(layer.name);
    }
    setEditingName(false);
  };

  return (
    <div className="rounded-md border border-neutral-800 bg-neutral-950/40">
      <div className="flex items-center gap-2 px-2 py-1.5">
        <div className="flex flex-col gap-px">
          <button
            type="button"
            onClick={handleMoveUp}
            disabled={layerIndex <= 0}
            title="Subir camada"
            className="grid h-3.5 w-3.5 cursor-pointer place-items-center rounded text-neutral-600 transition enabled:hover:bg-neutral-700 enabled:hover:text-neutral-200 disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <ChevronUp size={11} />
          </button>
          <button
            type="button"
            onClick={handleMoveDown}
            disabled={layerIndex >= sortedLayers.length - 1}
            title="Descer camada"
            className="grid h-3.5 w-3.5 cursor-pointer place-items-center rounded text-neutral-600 transition enabled:hover:bg-neutral-700 enabled:hover:text-neutral-200 disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <ChevronDown size={11} />
          </button>
        </div>
        <div className="h-5 w-1 shrink-0 rounded-full" style={{ backgroundColor: layer.color }} />
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {editingName ? (
            <input
              type="text"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={handleNameSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleNameSubmit();
                if (e.key === 'Escape') {
                  setNameDraft(layer.name);
                  setEditingName(false);
                }
              }}
              autoFocus
              className="h-6 min-w-0 flex-1 rounded border border-emerald-500/50 bg-[#0d0f10] px-1.5 text-xs text-neutral-100 outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setNameDraft(layer.name);
                setEditingName(true);
              }}
              className="min-w-0 truncate text-left text-xs font-medium tracking-wide text-neutral-200 hover:text-emerald-300"
              title="Renomear camada"
            >
              {layer.name}
            </button>
          )}
          <span className="shrink-0 rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] tabular-nums text-neutral-500">
            {layerObjectCount}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={handleToggleVisibility}
            title={layer.visible ? 'Ocultar camada' : 'Mostrar camada'}
            className={`grid min-h-7 min-w-7 cursor-pointer place-items-center rounded transition hover:bg-neutral-700/80 touch-manipulation ${
              layer.visible ? 'text-emerald-300' : 'text-neutral-600'
            }`}
          >
            {layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
          </button>
          <button
            type="button"
            onClick={handleToggleLock}
            title={layer.locked ? 'Destravar camada' : 'Travar camada'}
            className={`grid min-h-7 min-w-7 cursor-pointer place-items-center rounded transition hover:bg-neutral-700/80 touch-manipulation ${
              layer.locked ? 'text-amber-300' : 'text-neutral-600'
            }`}
          >
            {layer.locked ? <Lock size={12} /> : <LockOpen size={12} />}
          </button>
          <button
            type="button"
            title="Remover camada"
            onClick={handleRemoveLayer}
            disabled={layers.length <= 1}
            className="grid min-h-7 min-w-7 cursor-pointer place-items-center rounded text-neutral-600 transition hover:bg-red-500/15 hover:text-red-200 disabled:opacity-20 disabled:cursor-not-allowed touch-manipulation"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {layerNodes.length > 0 && (
        <div className="border-t border-neutral-800/60 px-1 pb-1.5 pt-1">
          <div className="space-y-px">
            {layerNodes.map((node) => (
              <SceneRow key={node.object.uuid} node={node} layer={layer} collapsedIds={collapsedIds} onToggle={toggleNode} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SceneGraph() {
  const layers = useSceneStore((state) => state.layers);
  const objects = useSceneStore((state) => state.objects);
  const addLayer = useSceneStore((state) => state.addLayer);
  const leftPanelCollapsed = useEditorStore((state) => state.leftPanelCollapsed);
  const setLeftPanelCollapsed = useEditorStore((state) => state.setLeftPanelCollapsed);
  const pushSnapshot = useHistoryStore((state) => state.pushSnapshot);

  const sortedLayers = useMemo(
    () => [...layers].sort((a, b) => a.order - b.order),
    [layers],
  );

  const handleAddLayer = () => {
    pushSnapshot();
    addLayer();
  };

  return (
    <aside className="flex h-full min-h-0 flex-col border-r border-neutral-800 bg-[#151719] max-lg:border-b max-lg:border-r-0">
      {leftPanelCollapsed ? (
        <div className="flex items-center justify-center border-b border-neutral-800 py-3">
          <button
            type="button"
            onClick={() => setLeftPanelCollapsed(false)}
            className="grid h-7 w-7 cursor-pointer place-items-center rounded text-neutral-500 transition hover:bg-neutral-700/80 hover:text-neutral-100"
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
                Scene Graph
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAddLayer}
                className="grid min-h-9 min-w-9 cursor-pointer place-items-center rounded text-neutral-500 transition hover:bg-emerald-500/15 hover:text-emerald-200 touch-manipulation"
                title="Nova camada"
              >
                <Plus size={16} />
              </button>
              <button
                type="button"
                onClick={() => setLeftPanelCollapsed(true)}
                className="grid min-h-9 min-w-9 cursor-pointer place-items-center rounded text-neutral-500 transition hover:bg-neutral-700/80 hover:text-neutral-100 touch-manipulation"
                title="Recolher"
              >
                <ChevronLeft size={16} />
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 space-y-1 overflow-auto p-2 sm:p-3">
            {sortedLayers.map((layer) => (
              <LayerRow key={layer.id} layer={layer} />
            ))}
            {objects.length === 0 && (
              <div className="grid h-full place-items-center text-center text-sm text-neutral-500">
                Cena vazia
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
