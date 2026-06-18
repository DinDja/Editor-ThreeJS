'use client';

import { useMemo, useState } from 'react';
import {
  Box,
  Boxes,
  Brush,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  FileBox,
  Lock,
  LockOpen,
  Plus,
  Trash2,
} from 'lucide-react';
import { useEditorStore } from '@/store/editorStore';
import { useHistoryStore } from '@/store/historyStore';
import { useMaterialStore } from '@/store/materialStore';
import { useSceneStore } from '@/store/sceneStore';
import type { Layer, SceneObject } from '@/store/types';

const rowButton =
  'grid min-w-0 grid-cols-[24px_minmax(0,1fr)_80px] items-center gap-2 rounded-md px-2 py-2.5 text-left text-sm transition sm:py-2';

function SceneRow({ object, layer }: { object: SceneObject; layer: Layer }) {
  const selectedObjectId = useEditorStore((state) => state.selectedObjectId);
  const setSelectedObject = useEditorStore((state) => state.setSelectedObject);
  const updateObject = useSceneStore((state) => state.updateObject);
  const removeObject = useSceneStore((state) => state.removeObject);
  const removeMaterial = useMaterialStore((state) => state.removeMaterial);
  const pushSnapshot = useHistoryStore((state) => state.pushSnapshot);

  const selected = selectedObjectId === object.uuid;
  const layerHidden = !layer.visible;
  const rowHidden = layerHidden || !object.visible;

  const handleVisibility = () => {
    pushSnapshot();
    updateObject(object.uuid, { visible: !object.visible });
  };

  const handleRemove = () => {
    pushSnapshot();
    removeObject(object.uuid);
    removeMaterial(object.materialId);
    if (selected) setSelectedObject(null);
  };

  return (
    <div
      className={`${rowButton} ${
        selected
          ? 'bg-amber-300/10 text-amber-100 outline outline-1 outline-amber-300/45'
          : rowHidden
            ? 'text-neutral-600 hover:bg-neutral-800/45'
            : 'text-neutral-300 hover:bg-neutral-800/75'
      }`}
      style={{ paddingLeft: 20 }}
    >
      <div
        className={`grid h-6 w-6 place-items-center rounded border ${
          selected
            ? 'border-amber-300/35 bg-amber-300/10 text-amber-100'
            : 'border-neutral-800 bg-neutral-950 text-neutral-500'
        }`}
      >
        {object.effect ? <Brush size={13} /> : object.kind === 'model' ? <FileBox size={13} /> : <Box size={13} />}
      </div>
      <button
        type="button"
        onClick={() => setSelectedObject(object.uuid)}
        className="min-w-0 truncate text-left"
        title={object.name}
      >
        {object.name}
      </button>
      <div className="flex justify-end gap-0.5">
        <button
          type="button"
          title={object.visible ? 'Ocultar' : 'Mostrar'}
          aria-label={`Visibilidade ${object.name}`}
          onClick={handleVisibility}
          className={`grid min-h-10 min-w-10 cursor-pointer place-items-center rounded transition hover:bg-neutral-700/80 hover:text-neutral-100 touch-manipulation ${
            object.visible ? 'text-emerald-300' : 'text-neutral-600'
          }`}
        >
          {object.visible ? <Eye size={15} /> : <EyeOff size={15} />}
        </button>
        <button
          type="button"
          title="Remover"
          aria-label={`Remover ${object.name}`}
          onClick={handleRemove}
          className="grid min-h-10 min-w-10 cursor-pointer place-items-center rounded text-neutral-500 transition hover:bg-red-500/15 hover:text-red-200 touch-manipulation"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

function LayerRow({ layer, isLast }: { layer: Layer; isLast: boolean }) {
  const layers = useSceneStore((state) => state.layers);
  const objects = useSceneStore((state) => state.objects);
  const updateLayer = useSceneStore((state) => state.updateLayer);
  const removeLayer = useSceneStore((state) => state.removeLayer);
  const reorderLayers = useSceneStore((state) => state.reorderLayers);
  const moveObjectsToLayer = useSceneStore((state) => state.moveObjectsToLayer);
  const selectedObjectId = useEditorStore((state) => state.selectedObjectId);
  const setSelectedObject = useEditorStore((state) => state.setSelectedObject);
  const pushSnapshot = useHistoryStore((state) => state.pushSnapshot);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(layer.name);

  const sortedLayers = useMemo(
    () => [...layers].sort((a, b) => a.order - b.order),
    [layers],
  );
  const layerIndex = sortedLayers.findIndex((l) => l.id === layer.id);
  const layerObjects = useMemo(
    () =>
      objects
        .filter((o) => o.layerId === layer.id && o.parent === null)
        .sort((a, b) => a.createdAt - b.createdAt),
    [objects, layer.id],
  );

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
    if (selectedObjectId && objectsInLayer.some((o) => o.uuid === selectedObjectId)) {
      setSelectedObject(null);
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
      {/* Layer Header */}
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
        <div
          className="h-5 w-1 shrink-0 rounded-full"
          style={{ backgroundColor: layer.color }}
        />
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {editingName ? (
            <input
              type="text"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={handleNameSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleNameSubmit();
                if (e.key === 'Escape') { setNameDraft(layer.name); setEditingName(false); }
              }}
              autoFocus
              className="h-6 min-w-0 flex-1 rounded border border-emerald-500/50 bg-[#0d0f10] px-1.5 text-xs text-neutral-100 outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => { setNameDraft(layer.name); setEditingName(true); }}
              className="min-w-0 truncate text-left text-xs font-medium tracking-wide text-neutral-200 hover:text-emerald-300"
              title="Renomear camada"
            >
              {layer.name}
            </button>
          )}
          <span className="shrink-0 rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] tabular-nums text-neutral-500">
            {layerObjects.length}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={handleToggleVisibility}
            title={layer.visible ? 'Ocultar camada' : 'Mostrar camada'}
            className={`grid min-h-9 min-w-9 cursor-pointer place-items-center rounded transition hover:bg-neutral-700/80 touch-manipulation ${
              layer.visible ? 'text-emerald-300' : 'text-neutral-600'
            }`}
          >
            {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
          <button
            type="button"
            onClick={handleToggleLock}
            title={layer.locked ? 'Destravar camada' : 'Travar camada'}
            className={`grid min-h-9 min-w-9 cursor-pointer place-items-center rounded transition hover:bg-neutral-700/80 touch-manipulation ${
              layer.locked ? 'text-amber-300' : 'text-neutral-600'
            }`}
          >
            {layer.locked ? <Lock size={14} /> : <LockOpen size={14} />}
          </button>
          <button
            type="button"
            title="Remover camada"
            onClick={handleRemoveLayer}
            disabled={layers.length <= 1}
            className="grid min-h-9 min-w-9 cursor-pointer place-items-center rounded text-neutral-600 transition hover:bg-red-500/15 hover:text-red-200 disabled:opacity-20 disabled:cursor-not-allowed touch-manipulation"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Objects in Layer */}
      {layerObjects.length > 0 && (
        <div className="border-t border-neutral-800/60 px-1 pb-1.5 pt-1">
          <div className="space-y-px">
            {layerObjects.map((obj) => (
              <SceneRow key={obj.uuid} object={obj} layer={layer} />
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
                Camadas
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
            {sortedLayers.map((layer, i) => (
              <LayerRow key={layer.id} layer={layer} isLast={i === sortedLayers.length - 1} />
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
