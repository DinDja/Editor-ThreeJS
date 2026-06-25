'use client';

import { useMemo, useState } from 'react';
import { Brush, Check, Copy, Crosshair, FlipHorizontal2, Grid3X3, Layers, RotateCcw, Sparkles, Trash2 } from 'lucide-react';
import { applyScaleToPrimitiveGeometry, mergePrimitiveGeometry } from '@/lib/geometryOps';
import {
  bevelEdge,
  booleanEditableMeshes,
  clearMask,
  clearFaceMaterials,
  createPrimitiveEditableMesh,
  deleteFace,
  extrudeFace,
  flipFacesNormals,
  invertMask,
  loopCutMesh,
  recalculateOutwardNormals,
  remeshDyntopoLite,
  setFaceMaterial,
  setFacesMaterial,
  subdivideMesh,
  subdivideFace,
  weldVertices,
} from '@/lib/meshOps';
import { useEditorStore } from '@/store/editorStore';
import { useHistoryStore } from '@/store/historyStore';
import { useMaterialStore } from '@/store/materialStore';
import { useSceneStore } from '@/store/sceneStore';
import { getSubtreeIds } from '@/store/sceneTree';
import {
  cloneEditableMesh,
  type EditorMaterial,
  type MeshSelectionMode,
  type PrimitiveGeometry,
  type PrimitiveKind,
  type SculptFalloff,
  type SceneObject,
  type SculptMode,
  type Vec3,
} from '@/store/types';

type ModelingToolsProps = {
  object: SceneObject;
  material: EditorMaterial;
};

type GeometryFieldKey = keyof PrimitiveGeometry;

type GeometryField = {
  key: GeometryFieldKey;
  label: string;
  min: number;
  max: number;
  step: number;
  integer?: boolean;
};

const buttonClass =
  'inline-flex h-10 min-w-0 cursor-pointer items-center justify-center gap-2 rounded-md border border-neutral-700/80 bg-[#0d0f10] px-4 text-xs font-medium text-neutral-300 transition hover:border-emerald-400/70 hover:text-emerald-100 disabled:cursor-not-allowed disabled:opacity-35';

const dangerButtonClass =
  'inline-flex h-10 min-w-0 cursor-pointer items-center justify-center gap-2 rounded-md border border-neutral-700/80 bg-[#0d0f10] px-4 text-xs font-medium text-neutral-300 transition hover:border-red-400/70 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-35';

const activeButtonClass = 'border-emerald-400/70 bg-emerald-400/10 text-emerald-100';

const inputClass =
  'h-9 w-full rounded-md border border-neutral-700/80 bg-[#0d0f10] px-2.5 text-sm text-neutral-100 outline-none transition focus:border-emerald-400 focus:bg-[#101414]';

const labelClass = 'text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500';

const segmentField = (key: GeometryFieldKey, label: string, max = 128): GeometryField => ({
  key,
  label,
  min: 1,
  max,
  step: 1,
  integer: true,
});

const sizeField = (key: GeometryFieldKey, label: string, max = 20): GeometryField => ({
  key,
  label,
  min: 0.01,
  max,
  step: 0.05,
});

const geometryFieldsByPrimitive: Record<PrimitiveKind, GeometryField[]> = {
  box: [
    sizeField('width', 'Largura'),
    sizeField('height', 'Altura'),
    sizeField('depth', 'Prof.'),
    segmentField('widthSegments', 'Seg. X', 64),
    segmentField('heightSegments', 'Seg. Y', 64),
    segmentField('depthSegments', 'Seg. Z', 64),
  ],
  sphere: [
    sizeField('radius', 'Raio'),
    segmentField('radialSegments', 'Radial', 128),
    segmentField('heightSegments', 'Altura', 96),
  ],
  cylinder: [
    sizeField('radiusTop', 'Topo'),
    sizeField('radiusBottom', 'Base'),
    sizeField('height', 'Altura'),
    segmentField('radialSegments', 'Radial', 128),
    segmentField('heightSegments', 'Altura seg.', 96),
  ],
  cone: [
    sizeField('radiusBottom', 'Base'),
    sizeField('height', 'Altura'),
    segmentField('radialSegments', 'Radial', 128),
    segmentField('heightSegments', 'Altura seg.', 96),
  ],
  torus: [
    sizeField('radius', 'Raio'),
    sizeField('tube', 'Tubo'),
    segmentField('radialSegments', 'Radial', 128),
    segmentField('tubularSegments', 'Tubo seg.', 192),
  ],
  plane: [
    sizeField('width', 'Largura'),
    sizeField('height', 'Altura'),
    segmentField('widthSegments', 'Seg. X', 128),
    segmentField('heightSegments', 'Seg. Y', 128),
  ],
};

const sculptModes: { label: string; value: SculptMode }[] = [
  { label: 'Amassar', value: 'push' },
  { label: 'Puxar', value: 'pull' },
  { label: 'Grab', value: 'grab' },
  { label: 'Inflar', value: 'inflate' },
  { label: 'Suavizar', value: 'smooth' },
  { label: 'Clay', value: 'clay' },
  { label: 'Crease', value: 'crease' },
  { label: 'Flatten', value: 'flatten' },
  { label: 'Pinch', value: 'pinch' },
  { label: 'Mask', value: 'mask' },
];

const sculptFalloffs: { label: string; value: SculptFalloff }[] = [
  { label: 'Smooth', value: 'smooth' },
  { label: 'Sphere', value: 'sphere' },
  { label: 'Sharp', value: 'sharp' },
  { label: 'Linear', value: 'linear' },
];

const clampValue = (value: number, field: GeometryField) => {
  if (!Number.isFinite(value)) return field.min;

  const clamped = Math.min(field.max, Math.max(field.min, value));
  return field.integer ? Math.round(clamped) : Number(clamped.toFixed(3));
};

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

const offsetPosition = (position: Vec3, offset: number): Vec3 => [position[0] + offset, position[1], position[2]];

export default function ModelingTools({ object, material }: ModelingToolsProps) {
  const [arrayCount, setArrayCount] = useState(3);
  const [arraySpacing, setArraySpacing] = useState(1.25);
  const [subdividePasses, setSubdividePasses] = useState(1);
  const [dyntopoPasses, setDyntopoPasses] = useState(6);
  const [dyntopoEdgeLength, setDyntopoEdgeLength] = useState(0.32);
  const [bevelAmount, setBevelAmount] = useState(0.12);
  const [faceMaterialColor, setFaceMaterialColor] = useState(material.color);
  const [booleanTargetId, setBooleanTargetId] = useState('');
  const objects = useSceneStore((state) => state.objects);
  const addObject = useSceneStore((state) => state.addObject);
  const updateObject = useSceneStore((state) => state.updateObject);
  const removeObject = useSceneStore((state) => state.removeObject);
  const materials = useMaterialStore((state) => state.materials);
  const createMaterialForObject = useMaterialStore((state) => state.createMaterialForObject);
  const updateMaterial = useMaterialStore((state) => state.updateMaterial);
  const removeMaterial = useMaterialStore((state) => state.removeMaterial);
  const removeMaterialsForObjects = useMaterialStore((state) => state.removeMaterialsForObjects);
  const activeTool = useEditorStore((state) => state.activeTool);
  const meshSelectionMode = useEditorStore((state) => state.meshSelectionMode);
  const meshSelectMode = useEditorStore((state) => state.meshSelectMode);
  const setMeshSelectMode = useEditorStore((state) => state.setMeshSelectMode);
  const meshSnapEnabled = useEditorStore((state) => state.meshSnapEnabled);
  const meshSnapTarget = useEditorStore((state) => state.meshSnapTarget);
  const setMeshSnapEnabled = useEditorStore((state) => state.setMeshSnapEnabled);
  const setMeshSnapTarget = useEditorStore((state) => state.setMeshSnapTarget);
  const selectedVertexIndices = useEditorStore((state) => state.selectedVertexIndices);
  const selectedEdgeVertexIndices = useEditorStore((state) => state.selectedEdgeVertexIndices);
  const selectedFaceIndex = useEditorStore((state) => state.selectedFaceIndex);
  const selectedFaceIndices = useEditorStore((state) => state.selectedFaceIndices);
  const sculptMode = useEditorStore((state) => state.sculptMode);
  const sculptFalloff = useEditorStore((state) => state.sculptFalloff);
  const sculptSymmetryX = useEditorStore((state) => state.sculptSymmetryX);
  const sculptFrontFacesOnly = useEditorStore((state) => state.sculptFrontFacesOnly);
  const sculptAccumulate = useEditorStore((state) => state.sculptAccumulate);
  const sculptSpacing = useEditorStore((state) => state.sculptSpacing);
  const sculptRadius = useEditorStore((state) => state.sculptRadius);
  const sculptStrength = useEditorStore((state) => state.sculptStrength);
  const sculptPressureStrength = useEditorStore((state) => state.sculptPressureStrength);
  const sculptPressureRadius = useEditorStore((state) => state.sculptPressureRadius);
  const sculptPenSmoothing = useEditorStore((state) => state.sculptPenSmoothing);
  const sculptPointerType = useEditorStore((state) => state.sculptPointerType);
  const setSelectedObject = useEditorStore((state) => state.setSelectedObject);
  const setActiveTool = useEditorStore((state) => state.setActiveTool);
  const setMeshSelectionMode = useEditorStore((state) => state.setMeshSelectionMode);
  const setSelectedFace = useEditorStore((state) => state.setSelectedFace);
  const setSculptMode = useEditorStore((state) => state.setSculptMode);
  const setSculptFalloff = useEditorStore((state) => state.setSculptFalloff);
  const setSculptSymmetryX = useEditorStore((state) => state.setSculptSymmetryX);
  const setSculptFrontFacesOnly = useEditorStore((state) => state.setSculptFrontFacesOnly);
  const setSculptAccumulate = useEditorStore((state) => state.setSculptAccumulate);
  const setSculptSpacing = useEditorStore((state) => state.setSculptSpacing);
  const setSculptRadius = useEditorStore((state) => state.setSculptRadius);
  const setSculptStrength = useEditorStore((state) => state.setSculptStrength);
  const setSculptPressureStrength = useEditorStore((state) => state.setSculptPressureStrength);
  const setSculptPressureRadius = useEditorStore((state) => state.setSculptPressureRadius);
  const setSculptPenSmoothing = useEditorStore((state) => state.setSculptPenSmoothing);
  const pushSnapshot = useHistoryStore((state) => state.pushSnapshot);
  const primitive = object.kind === 'primitive' ? object.primitive ?? 'box' : null;
  const objectMaterials = useMemo(
    () =>
      Object.values(materials)
        .filter((item) => item.objectId === object.uuid)
        .sort((a, b) => (a.uuid === object.materialId ? -1 : b.uuid === object.materialId ? 1 : a.name.localeCompare(b.name))),
    [materials, object.materialId, object.uuid],
  );
  const booleanTargets = objects.filter((item) => item.uuid !== object.uuid && item.visible && (item.editableMesh || item.primitive));
  const geometry = useMemo(
    () => (primitive ? mergePrimitiveGeometry(primitive, object.geometry) : null),
    [object.geometry, primitive],
  );
  const geometryFields = primitive ? geometryFieldsByPrimitive[primitive] : [];

  const createCopy = (sourceObject: SceneObject, sourceMaterial: EditorMaterial, index: number, spacing: number) => {
    const copy = addObject({
      name: index === 1 ? `${sourceObject.name} Copy` : `${sourceObject.name} Copy ${index}`,
      kind: sourceObject.kind,
      source: sourceObject.source,
      sourceType: sourceObject.sourceType,
      primitive: sourceObject.primitive,
      geometry: sourceObject.geometry ? { ...sourceObject.geometry } : undefined,
      editableMesh: sourceObject.editableMesh ? cloneEditableMesh(sourceObject.editableMesh) : undefined,
      position: offsetPosition(sourceObject.position, spacing * index),
      rotation: [...sourceObject.rotation],
      scale: [...sourceObject.scale],
      visible: sourceObject.visible,
      parent: sourceObject.parent,
    });
    const newMaterial = createMaterialForObject(copy.uuid, copy.materialId, `${sourceMaterial.name} Copy`);
    updateMaterial(newMaterial.uuid, cloneMaterialPatch(sourceMaterial));
    return copy;
  };

  const handleDuplicate = () => {
    pushSnapshot();
    const copy = createCopy(object, material, 1, 0.45);
    setSelectedObject(copy.uuid);
  };

  const enterEditMode = (mode: MeshSelectionMode) => {
    setSelectedObject(object.uuid);
    setMeshSelectionMode(mode);

    if (!object.editableMesh) {
      pushSnapshot();

      if (primitive) {
        updateObject(object.uuid, {
          editableMesh: createPrimitiveEditableMesh(primitive, object.geometry),
        });
      }
    }

    setActiveTool('edit');
  };

  const enterSculptMode = () => {
    setSelectedObject(object.uuid);

    if (!object.editableMesh) {
      pushSnapshot();

      if (primitive) {
        updateObject(object.uuid, {
          editableMesh: createPrimitiveEditableMesh(primitive, object.geometry),
        });
      }
    }

    setActiveTool('sculpt');
  };

  const handleArray = () => {
    const count = Math.max(1, Math.min(24, Math.round(arrayCount)));
    const spacing = Number.isFinite(arraySpacing) ? arraySpacing : 1.25;
    pushSnapshot();

    let lastCopy: SceneObject | null = null;
    for (let index = 1; index <= count; index += 1) {
      lastCopy = createCopy(object, material, index, spacing);
    }

    setSelectedObject(lastCopy?.uuid ?? object.uuid);
  };

  const handleRemove = () => {
    pushSnapshot();
    const ids = getSubtreeIds(objects, object.uuid);
    removeObject(object.uuid);
    removeMaterialsForObjects(ids);
    useEditorStore.getState().clearSelectedObjects();
  };

  const handleResetTransform = () => {
    pushSnapshot();
    updateObject(object.uuid, {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    });
  };

  const handleCenter = () => {
    pushSnapshot();
    updateObject(object.uuid, { position: [0, 0, 0] });
  };

  const handleMirror = (axis: number) => {
    pushSnapshot();
    const nextScale = [...object.scale] as Vec3;
    nextScale[axis] = nextScale[axis] === 0 ? -1 : nextScale[axis] * -1;
    updateObject(object.uuid, { scale: nextScale });
  };

  const handleApplyScale = () => {
    if (!primitive) return;

    pushSnapshot();
    updateObject(object.uuid, {
      geometry: applyScaleToPrimitiveGeometry(primitive, object.geometry, object.scale),
      scale: [1, 1, 1],
    });
  };

  const handleSubdivide = (direction: 1 | -1) => {
    if (!primitive || !geometry) return;

    pushSnapshot();
    const factor = direction > 0 ? 2 : 0.5;
    const nextGeometry = { ...geometry };

    for (const field of geometryFields) {
      if (!field.integer) continue;
      const current = Number(nextGeometry[field.key] ?? field.min);
      nextGeometry[field.key] = clampValue(current * factor, field);
    }

    updateObject(object.uuid, { geometry: nextGeometry });
  };

  const handleExtrudeFace = () => {
    if (!object.editableMesh || selectedFaceIndex === null) return;

    pushSnapshot();
    updateObject(object.uuid, { editableMesh: extrudeFace(object.editableMesh, selectedFaceIndex) });
  };

  const handleDeleteFace = () => {
    if (!object.editableMesh || selectedFaceIndex === null) return;

    pushSnapshot();
    updateObject(object.uuid, { editableMesh: deleteFace(object.editableMesh, selectedFaceIndex) });
    setSelectedFace(null);
  };

  const handleSubdivideFace = () => {
    if (!object.editableMesh || selectedFaceIndex === null) return;

    pushSnapshot();
    updateObject(object.uuid, { editableMesh: subdivideFace(object.editableMesh, selectedFaceIndex) });
    setSelectedFace(null);
  };

  const handleWeldVertices = () => {
    if (!object.editableMesh || selectedVertexIndices.length < 2) return;

    pushSnapshot();
    updateObject(object.uuid, { editableMesh: weldVertices(object.editableMesh, selectedVertexIndices) });
  };

  const handleBevelEdge = () => {
    if (!object.editableMesh || !selectedEdgeVertexIndices) return;

    pushSnapshot();
    updateObject(object.uuid, {
      editableMesh: bevelEdge(object.editableMesh, selectedEdgeVertexIndices, Math.max(0.01, Math.min(0.45, bevelAmount))),
    });
  };

  const handleLoopCut = () => {
    if (!object.editableMesh || !selectedEdgeVertexIndices) return;

    pushSnapshot();
    updateObject(object.uuid, { editableMesh: loopCutMesh(object.editableMesh, selectedEdgeVertexIndices) });
  };

  const handleAssignFaceMaterial = (materialId: string) => {
    if (!object.editableMesh) return;
    const targetFaces = selectedFaceIndices.length > 0 ? selectedFaceIndices : selectedFaceIndex !== null ? [selectedFaceIndex] : [];
    if (targetFaces.length === 0) return;

    pushSnapshot();
    updateObject(object.uuid, {
      editableMesh: setFacesMaterial(object.editableMesh, targetFaces, materialId === object.materialId ? null : materialId),
    });
  };

  const handleFlipNormals = () => {
    if (!object.editableMesh) return;
    const targetFaces = selectedFaceIndices.length > 0 ? selectedFaceIndices : selectedFaceIndex !== null ? [selectedFaceIndex] : [];
    pushSnapshot();
    updateObject(object.uuid, {
      editableMesh:
        targetFaces.length > 0
          ? flipFacesNormals(object.editableMesh, targetFaces)
          : flipFacesNormals(object.editableMesh, Array.from({ length: Math.floor(object.editableMesh.indices.length / 3) }, (_, i) => i)),
    });
  };

  const handleRecalculateNormals = () => {
    if (!object.editableMesh) return;
    pushSnapshot();
    updateObject(object.uuid, { editableMesh: recalculateOutwardNormals(object.editableMesh) });
  };

  const toggleFlatShading = () => {
    pushSnapshot();
    updateObject(object.uuid, {
      metadata: { ...object.metadata, flatShading: object.metadata.flatShading !== true },
    });
  };

  const handleCreateFaceMaterial = () => {
    if (!object.editableMesh || selectedFaceIndex === null) return;

    pushSnapshot();
    const nextMaterial = createMaterialForObject(object.uuid, undefined, `Face ${objectMaterials.length}`);
    updateMaterial(nextMaterial.uuid, {
      ...cloneMaterialPatch(material),
      name: nextMaterial.name,
      color: faceMaterialColor,
    });
    updateObject(object.uuid, { editableMesh: setFaceMaterial(object.editableMesh, selectedFaceIndex, nextMaterial.uuid) });
  };

  const handleClearFaceMaterials = () => {
    if (!object.editableMesh) return;

    pushSnapshot();
    updateObject(object.uuid, { editableMesh: clearFaceMaterials(object.editableMesh) });
  };

  const getBooleanMesh = (target: SceneObject) => {
    if (target.editableMesh) return target.editableMesh;
    if (target.kind === 'primitive' && target.primitive) return createPrimitiveEditableMesh(target.primitive, target.geometry);
    return null;
  };

  const handleBoolean = (operation: 'union' | 'subtract' | 'intersect') => {
    if (!object.editableMesh || !booleanTargetId) return;

    const target = objects.find((item) => item.uuid === booleanTargetId);
    if (!target) return;

    const cutterMesh = getBooleanMesh(target);
    if (!cutterMesh) return;

    pushSnapshot();
    updateObject(object.uuid, {
      editableMesh: booleanEditableMeshes({
        baseMesh: object.editableMesh,
        cutterMesh,
        baseTransform: object,
        cutterTransform: target,
        operation,
        appendMaterialId: target.materialId,
      }),
    });
  };

  const handleRemeshLite = () => {
    if (!object.editableMesh) return;

    pushSnapshot();
    updateObject(object.uuid, {
      editableMesh: remeshDyntopoLite(
        object.editableMesh,
        Math.max(1, Math.min(20, Math.round(dyntopoPasses))),
        Math.max(0.05, Math.min(2, dyntopoEdgeLength)),
      ),
    });
  };

  const handleSubdivideMesh = () => {
    if (!object.editableMesh) return;

    pushSnapshot();
    updateObject(object.uuid, {
      editableMesh: subdivideMesh(object.editableMesh, Math.max(1, Math.min(6, Math.round(subdividePasses)))),
    });
  };

  const handleMaskClear = () => {
    if (!object.editableMesh) return;
    pushSnapshot();
    updateObject(object.uuid, { editableMesh: clearMask(object.editableMesh) });
  };

  const handleMaskInvert = () => {
    if (!object.editableMesh) return;
    pushSnapshot();
    updateObject(object.uuid, { editableMesh: invertMask(object.editableMesh) });
  };

  const updateGeometryField = (field: GeometryField, rawValue: number) => {
    if (!primitive || !geometry) return;

    updateObject(object.uuid, {
      geometry: {
        ...geometry,
        [field.key]: clampValue(rawValue, field),
      },
    });
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-2 rounded-md border border-neutral-800 bg-neutral-950/45 p-3">
        <span className={labelClass}>Selecao de sub-elementos</span>
        <div className="grid grid-cols-3 gap-2">
          {(['click', 'box', 'lasso'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setMeshSelectMode(mode)}
              className={`${buttonClass} ${meshSelectMode === mode ? activeButtonClass : ''}`}
              title={mode === 'click' ? 'Selecionar por clique' : mode === 'box' ? 'Selecao por caixa (arraste)' : 'Selecao por lazo (arraste)'}
            >
              {mode === 'click' ? 'Click' : mode === 'box' ? 'Box' : 'Lasso'}
            </button>
          ))}
        </div>
        <label className="flex h-11 cursor-pointer items-center justify-between gap-3 rounded-md border border-neutral-700/80 bg-[#0d0f10] px-3 text-xs font-medium text-neutral-300 transition hover:border-emerald-400/70 hover:text-emerald-100">
          <span>Snap ao transformar sub-elemento</span>
          <input
            type="checkbox"
            checked={meshSnapEnabled}
            onChange={(event) => setMeshSnapEnabled(event.target.checked)}
            className="h-4 w-4 cursor-pointer accent-emerald-400"
          />
        </label>
        {meshSnapEnabled && (
          <div className="grid grid-cols-4 gap-2">
            {(['off', 'vertex', 'edge', 'face'] as const).map((target) => (
              <button
                key={target}
                type="button"
                onClick={() => setMeshSnapTarget(target)}
                className={`${buttonClass} ${meshSnapTarget === target ? activeButtonClass : ''}`}
                title={`Snap para ${target}`}
              >
                {target === 'off' ? 'Off' : target === 'vertex' ? 'Vert' : target === 'edge' ? 'Edge' : 'Face'}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => enterEditMode('vertex')}
          className={`${buttonClass} ${activeTool === 'edit' && meshSelectionMode === 'vertex' ? activeButtonClass : ''}`}
        >
          <Grid3X3 size={13} />
          Vertices
        </button>
        <button
          type="button"
          onClick={() => enterEditMode('edge')}
          className={`${buttonClass} ${activeTool === 'edit' && meshSelectionMode === 'edge' ? activeButtonClass : ''}`}
        >
          <Grid3X3 size={13} />
          Arestas
        </button>
        <button
          type="button"
          onClick={() => enterEditMode('face')}
          className={`${buttonClass} ${activeTool === 'edit' && meshSelectionMode === 'face' ? activeButtonClass : ''}`}
        >
          <Grid3X3 size={13} />
          Faces
        </button>
        <button
          type="button"
          onClick={enterSculptMode}
          className={`${buttonClass} ${activeTool === 'sculpt' ? activeButtonClass : ''}`}
        >
          <Brush size={13} />
          Sculpt
        </button>
      </div>

      <div className="grid gap-3 rounded-md border border-neutral-800 bg-neutral-950/45 p-3">
        <div className="grid grid-cols-2 gap-2">
          {sculptModes.map((mode) => (
            <button
              key={mode.value}
              type="button"
              onClick={() => {
                setSculptMode(mode.value);
                enterSculptMode();
              }}
              className={`${buttonClass} ${activeTool === 'sculpt' && sculptMode === mode.value ? activeButtonClass : ''}`}
            >
              {mode.label}
            </button>
          ))}
        </div>
        <label className="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className={labelClass}>Raio <span className="text-neutral-600">[ ]</span></span>
            <span className="w-10 text-right text-xs tabular-nums text-neutral-400">{sculptRadius.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={0.05}
            max={3}
            step={0.05}
            value={sculptRadius}
            onChange={(event) => setSculptRadius(Number(event.target.value))}
            className="h-1.5 w-full cursor-pointer accent-emerald-400"
          />
        </label>
        <label className="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className={labelClass}>Forca <span className="text-neutral-600">Up/Dn</span></span>
            <span className="w-10 text-right text-xs tabular-nums text-neutral-400">{sculptStrength.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={0.01}
            max={0.75}
            step={0.01}
            value={sculptStrength}
            onChange={(event) => setSculptStrength(Number(event.target.value))}
            className="h-1.5 w-full cursor-pointer accent-emerald-400"
          />
        </label>
        <label className="grid gap-2">
          <span className={labelClass}>Falloff <span className="text-neutral-600">Shift+F</span></span>
          <select
            value={sculptFalloff}
            onChange={(event) => setSculptFalloff(event.target.value as SculptFalloff)}
            className={inputClass}
          >
            {sculptFalloffs.map((falloff) => (
              <option key={falloff.value} value={falloff.value}>
                {falloff.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex h-11 cursor-pointer items-center justify-between gap-3 rounded-md border border-neutral-700/80 bg-[#0d0f10] px-3 text-xs font-medium text-neutral-300 transition hover:border-emerald-400/70 hover:text-emerald-100">
          <span>Simetria X</span>
          <input
            type="checkbox"
            checked={sculptSymmetryX}
            onChange={(event) => setSculptSymmetryX(event.target.checked)}
            className="h-4 w-4 cursor-pointer accent-emerald-400"
          />
        </label>
        <label className="flex h-11 cursor-pointer items-center justify-between gap-3 rounded-md border border-neutral-700/80 bg-[#0d0f10] px-3 text-xs font-medium text-neutral-300 transition hover:border-emerald-400/70 hover:text-emerald-100">
          <span>Front Faces Only</span>
          <input
            type="checkbox"
            checked={sculptFrontFacesOnly}
            onChange={(event) => setSculptFrontFacesOnly(event.target.checked)}
            className="h-4 w-4 cursor-pointer accent-emerald-400"
          />
        </label>
        <label className="flex h-11 cursor-pointer items-center justify-between gap-3 rounded-md border border-neutral-700/80 bg-[#0d0f10] px-3 text-xs font-medium text-neutral-300 transition hover:border-emerald-400/70 hover:text-emerald-100">
          <span>Accumulate</span>
          <input
            type="checkbox"
            checked={sculptAccumulate}
            onChange={(event) => setSculptAccumulate(event.target.checked)}
            className="h-4 w-4 cursor-pointer accent-emerald-400"
          />
        </label>
        <label className="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className={labelClass}>Stroke Spacing</span>
            <span className="w-10 text-right text-xs tabular-nums text-neutral-400">{sculptSpacing.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={sculptSpacing}
            onChange={(event) => setSculptSpacing(Number(event.target.value))}
            className="h-1.5 w-full cursor-pointer accent-emerald-400"
          />
        </label>

        <div className="border-t border-neutral-700/40 pt-3">
          <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500">
            Tablet / Pressao
          </span>
          <div className="grid gap-2">
            <label className="flex h-11 cursor-pointer items-center justify-between gap-3 rounded-md border border-neutral-700/80 bg-[#0d0f10] px-3 text-xs font-medium text-neutral-300 transition hover:border-emerald-400/70 hover:text-emerald-100">
              <span>Pressao na Forca</span>
              <input
                type="checkbox"
                checked={sculptPressureStrength}
                onChange={(event) => setSculptPressureStrength(event.target.checked)}
                className="h-4 w-4 cursor-pointer accent-emerald-400"
              />
            </label>
            <label className="flex h-11 cursor-pointer items-center justify-between gap-3 rounded-md border border-neutral-700/80 bg-[#0d0f10] px-3 text-xs font-medium text-neutral-300 transition hover:border-emerald-400/70 hover:text-emerald-100">
              <span>Pressao no Raio</span>
              <input
                type="checkbox"
                checked={sculptPressureRadius}
                onChange={(event) => setSculptPressureRadius(event.target.checked)}
                className="h-4 w-4 cursor-pointer accent-emerald-400"
              />
            </label>
            <label className="grid gap-2">
              <div className="flex items-center justify-between gap-3">
                <span className={labelClass}>Suavizacao (Stabilizer)</span>
                <span className="w-10 text-right text-xs tabular-nums text-neutral-400">{sculptPenSmoothing.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={0.9}
                step={0.05}
                value={sculptPenSmoothing}
                onChange={(event) => setSculptPenSmoothing(Number(event.target.value))}
                className="h-1.5 w-full cursor-pointer accent-emerald-400"
              />
            </label>
            <div className="rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-[11px]">
              <span className="block text-[10px] uppercase tracking-[0.14em] text-neutral-500">Dispositivo</span>
              <span className="tabular-nums text-neutral-200">
                {sculptPointerType === 'pen' ? 'Caneta' : sculptPointerType === 'touch' ? 'Toque' : 'Mouse'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={handleMaskClear} disabled={!object.editableMesh} className={buttonClass}>
            Limpar Mask
          </button>
          <button type="button" onClick={handleMaskInvert} disabled={!object.editableMesh} className={buttonClass}>
            Inverter Mask
          </button>
        </div>
      </div>

      {object.editableMesh && (
        <div className="grid gap-2">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2">
              <span className="block text-[10px] uppercase tracking-[0.14em] text-neutral-500">Vertices</span>
              <span className="tabular-nums text-neutral-200">{object.editableMesh.vertices.length}</span>
            </div>
            <div className="rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2">
              <span className="block text-[10px] uppercase tracking-[0.14em] text-neutral-500">Faces</span>
              <span className="tabular-nums text-neutral-200">{Math.floor(object.editableMesh.indices.length / 3)}</span>
            </div>
          </div>

          <div className="grid gap-2 rounded-md border border-neutral-800 bg-neutral-950/50 p-2.5">
            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1">
                <span className={labelClass}>Subdiv Passes</span>
                <input
                  type="number"
                  min={1}
                  max={6}
                  step={1}
                  value={subdividePasses}
                  onChange={(event) => setSubdividePasses(Math.max(1, Math.min(6, Math.round(event.target.valueAsNumber || 1))))}
                  className={inputClass}
                />
              </label>
              <button type="button" onClick={handleSubdivideMesh} className={buttonClass}>
                <Grid3X3 size={13} />
                Subdividir Malha
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1">
                <span className={labelClass}>DynTopo Passes</span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  step={1}
                  value={dyntopoPasses}
                  onChange={(event) => setDyntopoPasses(Math.max(1, Math.min(20, Math.round(event.target.valueAsNumber || 1))))}
                  className={inputClass}
                />
              </label>
              <label className="grid gap-1">
                <span className={labelClass}>Edge Target</span>
                <input
                  type="number"
                  min={0.05}
                  max={2}
                  step={0.01}
                  value={dyntopoEdgeLength}
                  onChange={(event) => setDyntopoEdgeLength(Number.isFinite(event.target.valueAsNumber) ? event.target.valueAsNumber : 0.32)}
                  className={inputClass}
                />
              </label>
            </div>
          </div>

          <div className="grid gap-2 rounded-md border border-neutral-800 bg-neutral-950/50 p-2.5">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <label className="grid gap-1">
                <span className={labelClass}>Bevel</span>
                <input
                  type="number"
                  min={0.01}
                  max={0.45}
                  step={0.01}
                  value={bevelAmount}
                  onChange={(event) => setBevelAmount(Number.isFinite(event.target.valueAsNumber) ? event.target.valueAsNumber : 0.12)}
                  className={inputClass}
                />
              </label>
              <button type="button" onClick={handleBevelEdge} disabled={!selectedEdgeVertexIndices} className={buttonClass}>
                <Grid3X3 size={13} />
                Bevel
              </button>
            </div>
            <button type="button" onClick={handleLoopCut} disabled={!selectedEdgeVertexIndices} className={buttonClass}>
              <Grid3X3 size={13} />
              Loop Cut
            </button>
          </div>

          <div className="grid gap-2 rounded-md border border-neutral-800 bg-neutral-950/50 p-2.5">
            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1">
                <span className={labelClass}>
                  Material da face {selectedFaceIndices.length > 1 ? `(${selectedFaceIndices.length})` : ''}
                </span>
                <select
                  value={
                    selectedFaceIndex === null
                      ? object.materialId
                      : object.editableMesh.faceMaterialIds?.[selectedFaceIndex] ?? object.materialId
                  }
                  onChange={(event) => handleAssignFaceMaterial(event.target.value)}
                  disabled={selectedFaceIndex === null && selectedFaceIndices.length === 0}
                  className={inputClass}
                >
                  {objectMaterials.map((item) => (
                    <option key={item.uuid} value={item.uuid}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1">
                <span className={labelClass}>Nova cor</span>
                <input
                  type="color"
                  value={faceMaterialColor}
                  onChange={(event) => setFaceMaterialColor(event.target.value)}
                  className="h-9 w-full cursor-pointer rounded-md border border-neutral-700/80 bg-[#0d0f10] p-1"
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={handleCreateFaceMaterial} disabled={selectedFaceIndex === null} className={buttonClass}>
                Face Mat
              </button>
              <button type="button" onClick={handleClearFaceMaterials} className={buttonClass}>
                Limpar Mats
              </button>
            </div>
          </div>

          <div className="grid gap-2 rounded-md border border-neutral-800 bg-neutral-950/50 p-2.5">
            <span className={labelClass}>Normais / Shading</span>
            <div className="grid grid-cols-3 gap-2">
              <button type="button" onClick={handleFlipNormals} disabled={!object.editableMesh} className={buttonClass} title="Inverter normais (faces selecionadas ou todas)">
                <FlipHorizontal2 size={13} />
                Flip
              </button>
              <button type="button" onClick={handleRecalculateNormals} disabled={!object.editableMesh} className={buttonClass} title="Recalcular normais para fora">
                <Sparkles size={13} />
                Recalc
              </button>
              <button
                type="button"
                onClick={toggleFlatShading}
                disabled={!object.editableMesh && !object.metadata.flatShading}
                className={`${buttonClass} ${object.metadata.flatShading === true ? activeButtonClass : ''}`}
                title="Alternar flat / smooth shading"
              >
                <Grid3X3 size={13} />
                {object.metadata.flatShading === true ? 'Flat' : 'Smooth'}
              </button>
            </div>
          </div>

          <div className="grid gap-2 rounded-md border border-neutral-800 bg-neutral-950/50 p-2.5">
            <label className="grid gap-1">
              <span className={labelClass}>Booleano alvo</span>
              <select value={booleanTargetId} onChange={(event) => setBooleanTargetId(event.target.value)} className={inputClass}>
                <option value="">Selecionar</option>
                {booleanTargets.map((target) => (
                  <option key={target.uuid} value={target.uuid}>
                    {target.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button type="button" onClick={() => handleBoolean('union')} disabled={!booleanTargetId} className={buttonClass}>
                Union
              </button>
              <button type="button" onClick={() => handleBoolean('subtract')} disabled={!booleanTargetId} className={buttonClass}>
                Subtrair
              </button>
              <button type="button" onClick={() => handleBoolean('intersect')} disabled={!booleanTargetId} className={buttonClass}>
                Intersect
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleExtrudeFace}
              disabled={selectedFaceIndex === null}
              className={buttonClass}
            >
              <Layers size={13} />
              Extrudar
            </button>
            <button
              type="button"
              onClick={handleSubdivideFace}
              disabled={selectedFaceIndex === null}
              className={buttonClass}
            >
              <Grid3X3 size={13} />
              Subdividir
            </button>
            <button
              type="button"
              onClick={handleWeldVertices}
              disabled={selectedVertexIndices.length < 2}
              className={buttonClass}
            >
              <Check size={13} />
              Soldar
            </button>
            <button
              type="button"
              onClick={handleDeleteFace}
              disabled={selectedFaceIndex === null}
              className={dangerButtonClass}
            >
              <Trash2 size={13} />
              Face
            </button>
            <button
              type="button"
              onClick={handleRemeshLite}
              disabled={!object.editableMesh}
              className={buttonClass}
            >
              <Grid3X3 size={13} />
              DynTopo Lite
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={handleDuplicate} className={buttonClass}>
          <Copy size={13} />
          Duplicar
        </button>
        <button type="button" onClick={handleRemove} className={dangerButtonClass}>
          <Trash2 size={13} />
          Remover
        </button>
        <button type="button" onClick={handleCenter} className={buttonClass}>
          <Crosshair size={13} />
          Centro
        </button>
        <button type="button" onClick={handleResetTransform} className={buttonClass}>
          <RotateCcw size={13} />
          Reset
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {['X', 'Y', 'Z'].map((axis, index) => (
          <button key={axis} type="button" onClick={() => handleMirror(index)} className={buttonClass}>
            <FlipHorizontal2 size={13} />
            {axis}
          </button>
        ))}
      </div>

      <div className="grid gap-2 rounded-md border border-neutral-800 bg-neutral-950/45 p-3">
        <div className="grid grid-cols-2 gap-2">
          <label className="grid gap-1">
            <span className={labelClass}>Array</span>
            <input
              type="number"
              min={1}
              max={24}
              step={1}
              value={arrayCount}
              onChange={(event) => setArrayCount(Math.max(1, Math.min(24, Math.round(event.target.valueAsNumber || 1))))}
              className={inputClass}
            />
          </label>
          <label className="grid gap-1">
            <span className={labelClass}>Espaco</span>
            <input
              type="number"
              min={-20}
              max={20}
              step={0.05}
              value={arraySpacing}
              onChange={(event) => setArraySpacing(Number.isFinite(event.target.valueAsNumber) ? event.target.valueAsNumber : 1.25)}
              className={inputClass}
            />
          </label>
        </div>
        <button type="button" onClick={handleArray} className={buttonClass}>
          <Layers size={13} />
          Criar array
        </button>
      </div>

      {primitive && geometry && (
        <div className="grid gap-3 border-t border-neutral-800 pt-4">
          <div className="grid grid-cols-3 gap-2">
            <button type="button" onClick={handleApplyScale} className={buttonClass}>
              <Check size={13} />
              Escala
            </button>
            <button type="button" onClick={() => handleSubdivide(1)} className={buttonClass}>
              <Grid3X3 size={13} />
              Mais seg.
            </button>
            <button type="button" onClick={() => handleSubdivide(-1)} className={buttonClass}>
              <Grid3X3 size={13} />
              Menos seg.
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {geometryFields.map((field) => (
              <label key={field.key} className="grid gap-1">
                <span className={labelClass}>{field.label}</span>
                <input
                  type="number"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  value={Number(geometry[field.key] ?? field.min)}
                  onFocus={pushSnapshot}
                  onChange={(event) => updateGeometryField(field, event.target.valueAsNumber)}
                  className={inputClass}
                />
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
