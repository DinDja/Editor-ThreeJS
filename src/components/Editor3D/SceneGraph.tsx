'use client';

import { useMemo } from 'react';
import { Box, Boxes, Brush, ChevronLeft, Eye, EyeOff, FileBox, Trash2 } from 'lucide-react';
import { useEditorStore } from '@/store/editorStore';
import { useHistoryStore } from '@/store/historyStore';
import { useMaterialStore } from '@/store/materialStore';
import { useSceneStore } from '@/store/sceneStore';
import type { SceneObject } from '@/store/types';

const rowButton =
  'grid min-w-0 grid-cols-[24px_minmax(0,1fr)_72px] items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition';

function SceneRow({ object, depth, childObjects }: { object: SceneObject; depth: number; childObjects: SceneObject[] }) {
  const selectedObjectId = useEditorStore((state) => state.selectedObjectId);
  const setSelectedObject = useEditorStore((state) => state.setSelectedObject);
  const updateObject = useSceneStore((state) => state.updateObject);
  const removeObject = useSceneStore((state) => state.removeObject);
  const removeMaterial = useMaterialStore((state) => state.removeMaterial);
  const pushSnapshot = useHistoryStore((state) => state.pushSnapshot);

  const selected = selectedObjectId === object.uuid;

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
    <div>
      <div
        className={`${rowButton} ${
          selected
            ? 'bg-amber-300/10 text-amber-100 outline outline-1 outline-amber-300/45'
            : 'text-neutral-300 hover:bg-neutral-800/75'
        }`}
        style={{ paddingLeft: 8 + depth * 14 }}
      >
        <div className={`grid h-6 w-6 place-items-center rounded border ${selected ? 'border-amber-300/35 bg-amber-300/10 text-amber-100' : 'border-neutral-800 bg-neutral-950 text-neutral-500'}`}>
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
        <div className="flex justify-end gap-1">
          <button
            type="button"
            title={object.visible ? 'Ocultar' : 'Mostrar'}
            aria-label={`Visibilidade ${object.name}`}
            onClick={handleVisibility}
            className={`grid h-8 w-8 cursor-pointer place-items-center rounded text-neutral-500 transition hover:bg-neutral-700/80 hover:text-neutral-100 ${
              object.visible ? 'text-emerald-300' : 'text-neutral-600'
            }`}
          >
            {object.visible ? <Eye size={13} /> : <EyeOff size={13} />}
          </button>
          <button
            type="button"
            title="Remover"
            aria-label={`Remover ${object.name}`}
            onClick={handleRemove}
            className="grid h-8 w-8 cursor-pointer place-items-center rounded text-neutral-500 transition hover:bg-red-500/15 hover:text-red-200"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      {childObjects.map((child) => (
        <SceneRow key={child.uuid} object={child} depth={depth + 1} childObjects={[]} />
      ))}
    </div>
  );
}

export default function SceneGraph() {
  const objects = useSceneStore((state) => state.objects);
  const roots = useMemo(() => objects.filter((object) => object.parent === null), [objects]);
  const childrenByParent = useMemo(() => {
    const map = new Map<string, SceneObject[]>();
    for (const object of objects) {
      if (!object.parent) continue;
      map.set(object.parent, [...(map.get(object.parent) ?? []), object]);
    }
    return map;
  }, [objects]);
  const leftPanelCollapsed = useEditorStore((state) => state.leftPanelCollapsed);
  const setLeftPanelCollapsed = useEditorStore((state) => state.setLeftPanelCollapsed);

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
          <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3 max-sm:px-3 max-sm:py-2">
            <div className="flex items-center gap-2">
              <Boxes size={15} className="text-emerald-300" />
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">Scene</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-neutral-800 bg-neutral-950 px-2 py-0.5 text-[11px] tabular-nums text-neutral-500">
                {objects.length}
              </span>
              <button
                type="button"
                onClick={() => setLeftPanelCollapsed(true)}
                className="grid h-7 w-7 cursor-pointer place-items-center rounded text-neutral-500 transition hover:bg-neutral-700/80 hover:text-neutral-100"
                title="Recolher"
              >
                <ChevronLeft size={14} />
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-3 max-sm:p-2">
            {roots.length > 0 ? (
              <div className="space-y-1">
                {roots.map((object) => (
                  <SceneRow key={object.uuid} object={object} depth={0} childObjects={childrenByParent.get(object.uuid) ?? []} />
                ))}
              </div>
            ) : (
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
