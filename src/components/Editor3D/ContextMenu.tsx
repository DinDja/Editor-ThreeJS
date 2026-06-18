'use client';

import { useEffect, useRef, useState } from 'react';
import { useContextMenu } from '@/store/contextMenuStore';
import { useEditorStore } from '@/store/editorStore';
import { useSceneStore } from '@/store/sceneStore';
import { useMaterialStore } from '@/store/materialStore';
import { useHistoryStore } from '@/store/historyStore';
import { createPrimitiveEditableMesh } from '@/lib/meshOps';
import { primitiveLabels } from '@/lib/geometryOps';
import {
  cloneEditableMesh,
  cloneSceneObject,
  type EditorMaterial,
  type PrimitiveKind,
  type SceneObject,
  type Vec3,
} from '@/store/types';
import { getSubtreeIds, type SceneDuplicateResult } from '@/store/sceneTree';
import {
  Copy,
  Trash2,
  Eye,
  EyeOff,
  Crosshair,
  RotateCcw,
  FlipHorizontal2,
  Box,
  Brush,
  ClipboardPaste,
  Grid3X3,
  Magnet,
} from 'lucide-react';

type ClipboardData = { object: SceneObject; material: EditorMaterial | null };
let clipboard: ClipboardData | null = null;

const offsetPosition = (position: Vec3, offset = 0.45): Vec3 => [position[0] + offset, position[1], position[2]];

const cloneMaterialPatch = (material: EditorMaterial): Partial<Omit<EditorMaterial, 'uuid' | 'objectId'>> => ({
  name: material.name,
  color: material.color,
  metalness: material.metalness,
  roughness: material.roughness,
  emissive: material.emissive,
  emissiveIntensity: material.emissiveIntensity,
  opacity: material.opacity,
  textureUrl: material.textureUrl,
  textureName: material.textureName,
  normalMapUrl: material.normalMapUrl,
  roughnessMapUrl: material.roughnessMapUrl,
  displacementMapUrl: material.displacementMapUrl,
});

const cloneDuplicateMaterials = (
  duplicate: SceneDuplicateResult,
  materials: ReturnType<typeof useMaterialStore.getState>,
  suffix: string,
) => {
  duplicate.materialIdMap.forEach((newMaterialId, oldMaterialId) => {
    const sourceMaterial = materials.materials[oldMaterialId];
    if (!sourceMaterial) return;
    const newObjectId = duplicate.idMap.get(sourceMaterial.objectId);
    if (!newObjectId) return;
    const newMaterial = materials.createMaterialForObject(newObjectId, newMaterialId, `${sourceMaterial.name} ${suffix}`);
    materials.updateMaterial(newMaterial.uuid, cloneMaterialPatch(sourceMaterial));
  });
};

type MenuItem = {
  label?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
  onClick: () => void;
};

function MenuPanel({ items, onClose, x, y }: { items: MenuItem[]; onClose: () => void; x: number; y: number }) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({ left: x, top: y });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    let nx = x;
    let ny = y;
    if (rect.right > window.innerWidth) nx = window.innerWidth - rect.width - 8;
    if (rect.bottom > window.innerHeight) ny = window.innerHeight - rect.height - 8;
    setStyle({ left: nx, top: ny });
  }, [x, y]);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[200px] overflow-hidden rounded-lg border border-neutral-700/80 bg-neutral-900/95 py-1 shadow-2xl backdrop-blur"
      style={style}
    >
      {items.map((item, i) =>
        item.separator ? (
          <div key={i} className="mx-2 my-1 border-t border-neutral-700/50" />
        ) : (
          <button
            key={i}
            type="button"
            disabled={item.disabled}
            onClick={() => {
              item.onClick();
              onClose();
            }}
            className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition ${
              item.danger
                ? 'text-red-300 hover:bg-red-500/15 hover:text-red-200'
                : 'text-neutral-300 hover:bg-neutral-700/70 hover:text-neutral-100'
            } ${item.disabled ? 'cursor-not-allowed opacity-35' : 'cursor-pointer'}`}
          >
            {item.icon && <item.icon size={13} className="shrink-0" />}
            <span className="truncate">{item.label}</span>
          </button>
        ),
      )}
    </div>
  );
}

function ObjectMenu({ objectId }: { objectId: string }) {
  const { menu, hide } = useContextMenu();
  const object = useSceneStore((s) => s.objects.find((o) => o.uuid === objectId));
  const mirrorAxes: [string, number][] = [['X', 0], ['Y', 1], ['Z', 2]];

  if (!object) return null;

  const items: MenuItem[] = [
    {
      label: 'Duplicar', icon: Copy,
      onClick: () => {
        const state = useHistoryStore.getState();
        const scene = useSceneStore.getState();
        const mats = useMaterialStore.getState();
        const editor = useEditorStore.getState();
        state.pushSnapshot();
        const duplicate = scene.duplicateObject(object.uuid);
        if (!duplicate) return;
        cloneDuplicateMaterials(duplicate, mats, 'Copy');
        editor.setSelectedObject(duplicate.rootId);
      },
    },
    {
      label: 'Copiar', icon: Copy,
      onClick: () => {
        const mats = useMaterialStore.getState();
        const mat = mats.materials[object.materialId] ?? null;
        clipboard = { object: cloneSceneObject(object), material: mat ? { ...mat } : null };
      },
    },
    {
      label: 'Colar', icon: ClipboardPaste, disabled: !clipboard,
      onClick: () => {
        if (!clipboard) return;
        const state = useHistoryStore.getState();
        const scene = useSceneStore.getState();
        const mats = useMaterialStore.getState();
        const editor = useEditorStore.getState();
        state.pushSnapshot();
        const copy = scene.addObject({
          name: `${clipboard.object.name} Paste`, kind: clipboard.object.kind,
          source: clipboard.object.source, sourceType: clipboard.object.sourceType,
          primitive: clipboard.object.primitive,
          geometry: clipboard.object.geometry ? { ...clipboard.object.geometry } : undefined,
          editableMesh: clipboard.object.editableMesh ? cloneEditableMesh(clipboard.object.editableMesh) : undefined,
          position: offsetPosition(clipboard.object.position), rotation: [...clipboard.object.rotation],
          scale: [...clipboard.object.scale], visible: clipboard.object.visible, parent: clipboard.object.parent,
        });
        if (clipboard.material) {
          const nm = mats.createMaterialForObject(copy.uuid, copy.materialId, `${clipboard.material.name} Paste`);
          mats.updateMaterial(nm.uuid, cloneMaterialPatch(clipboard.material));
        }
        clipboard = {
          object: cloneSceneObject(copy),
          material: clipboard.material ? { ...(mats.materials[copy.materialId] ?? clipboard.material) } : null,
        };
        editor.setSelectedObject(copy.uuid);
      },
    },
    {
      label: 'Remover', icon: Trash2, danger: true,
      onClick: () => {
        const state = useHistoryStore.getState();
        const scene = useSceneStore.getState();
        const mats = useMaterialStore.getState();
        const editor = useEditorStore.getState();
        state.pushSnapshot();
        const ids = getSubtreeIds(scene.objects, object.uuid);
        scene.removeObject(object.uuid);
        mats.removeMaterialsForObjects(ids);
        editor.setSelectedObject(null);
      },
    },
    { separator: true, onClick: () => {} },
    {
      label: object.visible ? 'Ocultar' : 'Mostrar', icon: object.visible ? EyeOff : Eye,
      onClick: () => {
        const state = useHistoryStore.getState();
        const scene = useSceneStore.getState();
        state.pushSnapshot();
        scene.updateObject(object.uuid, { visible: !object.visible });
      },
    },
    {
      label: 'Centralizar', icon: Crosshair,
      onClick: () => {
        const state = useHistoryStore.getState();
        const scene = useSceneStore.getState();
        state.pushSnapshot();
        scene.updateObject(object.uuid, { position: [0, 0, 0] });
      },
    },
    {
      label: 'Reset Transform', icon: RotateCcw,
      onClick: () => {
        const state = useHistoryStore.getState();
        const scene = useSceneStore.getState();
        state.pushSnapshot();
        scene.updateObject(object.uuid, { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] });
      },
    },
    { separator: true, onClick: () => {} },
    ...mirrorAxes.map(([axis, index]) => ({
      label: `Espelhar ${axis}`, icon: FlipHorizontal2,
      onClick: () => {
        const state = useHistoryStore.getState();
        const scene = useSceneStore.getState();
        state.pushSnapshot();
        const scale = [...object.scale] as Vec3;
        scale[index] = scale[index] === 0 ? -1 : scale[index] * -1;
        scene.updateObject(object.uuid, { scale });
      },
    })),
    ...(object.kind === 'primitive'
      ? [
          { separator: true, onClick: () => {} } as MenuItem,
          {
            label: 'Editar Malha', icon: Grid3X3,
            onClick: () => {
              if (!object.editableMesh && object.primitive) {
                useHistoryStore.getState().pushSnapshot();
                useSceneStore.getState().updateObject(object.uuid, {
                  editableMesh: createPrimitiveEditableMesh(object.primitive, object.geometry),
                });
              }
              useEditorStore.getState().setActiveTool('edit');
            },
          },
          {
            label: 'Sculpt', icon: Brush,
            onClick: () => {
              if (!object.editableMesh && object.primitive) {
                useHistoryStore.getState().pushSnapshot();
                useSceneStore.getState().updateObject(object.uuid, {
                  editableMesh: createPrimitiveEditableMesh(object.primitive, object.geometry),
                });
              }
              useEditorStore.getState().setActiveTool('sculpt');
            },
          },
        ]
      : []),
  ];

  return <MenuPanel items={items} onClose={hide} x={menu.x} y={menu.y} />;
}

function EmptySpaceMenu() {
  const { menu, hide } = useContextMenu();
  const primitives: PrimitiveKind[] = ['box', 'sphere', 'cylinder', 'cone', 'torus', 'plane'];
  const editorState = useEditorStore.getState();

  const items: MenuItem[] = [
    {
      label: 'Colar', icon: ClipboardPaste, disabled: !clipboard,
      onClick: () => {
        if (!clipboard) return;
        const state = useHistoryStore.getState();
        const scene = useSceneStore.getState();
        const mats = useMaterialStore.getState();
        const editor = useEditorStore.getState();
        state.pushSnapshot();
        const copy = scene.addObject({
          name: `${clipboard.object.name} Paste`, kind: clipboard.object.kind,
          source: clipboard.object.source, sourceType: clipboard.object.sourceType,
          primitive: clipboard.object.primitive,
          geometry: clipboard.object.geometry ? { ...clipboard.object.geometry } : undefined,
          editableMesh: clipboard.object.editableMesh ? cloneEditableMesh(clipboard.object.editableMesh) : undefined,
          position: offsetPosition(clipboard.object.position), rotation: [...clipboard.object.rotation],
          scale: [...clipboard.object.scale], visible: clipboard.object.visible, parent: clipboard.object.parent,
        });
        if (clipboard.material) {
          const nm = mats.createMaterialForObject(copy.uuid, copy.materialId, `${clipboard.material.name} Paste`);
          mats.updateMaterial(nm.uuid, cloneMaterialPatch(clipboard.material));
        }
        clipboard = {
          object: cloneSceneObject(copy),
          material: clipboard.material ? { ...(mats.materials[copy.materialId] ?? clipboard.material) } : null,
        };
        editor.setSelectedObject(copy.uuid);
      },
    },
    { separator: true, onClick: () => {} },
    ...primitives.map((primitive) => ({
      label: `Adicionar ${primitiveLabels[primitive]}`, icon: Box,
      onClick: () => {
        const state = useHistoryStore.getState();
        const scene = useSceneStore.getState();
        const mats = useMaterialStore.getState();
        const editor = useEditorStore.getState();
        state.pushSnapshot();
        const object = scene.addPrimitive(primitive);
        mats.createMaterialForObject(object.uuid, object.materialId, `Material ${object.name}`);
        editor.setSelectedObject(object.uuid);
        editor.setActiveTool('translate');
      },
    })),
    { separator: true, onClick: () => {} },
    {
      label: editorState.showGrid ? 'Esconder Grid' : 'Mostrar Grid', icon: Grid3X3,
      onClick: () => useEditorStore.getState().setShowGrid(!useEditorStore.getState().showGrid),
    },
    {
      label: editorState.snapping ? 'Desativar Snap' : 'Ativar Snap', icon: Magnet,
      onClick: () => useEditorStore.getState().setSnapping(!useEditorStore.getState().snapping),
    },
  ];

  return <MenuPanel items={items} onClose={hide} x={menu.x} y={menu.y} />;
}

export default function ContextMenu() {
  const { menu } = useContextMenu();
  if (!menu.visible) return null;
  if (menu.objectId) return <ObjectMenu objectId={menu.objectId} />;
  return <EmptySpaceMenu />;
}
