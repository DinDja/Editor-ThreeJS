'use client';

import { useEffect, useRef, useState, type MutableRefObject, useCallback } from 'react';
import {
  Atom,
  Box,
  Boxes,
  Brush,
  Check,
  ChevronDown,
  Download,
  Grid3X3,
  Heart,
  HelpCircle,
  Magnet,
  MousePointer2,
  Move3D,
  Pause,
  Play,
  PlugZap,
  Redo2,
  Rotate3D,
  RotateCcw,
  Scale3D,
  ScanLine,
  Type,
  Upload,
  Undo2,
  type LucideIcon,
} from 'lucide-react';
import AiPromptModal from './AiPromptModal';
import AssetBrowserModal from './AssetBrowserModal';
import * as THREE from 'three';
import { exportObjectAsGLB, isModelFile, MODEL_FILE_ACCEPT } from '@/lib/fileOps';
import { buildSceneObjectsFromGltf } from '@/lib/gltfImport';
import { primitiveKinds, primitiveLabels } from '@/lib/geometryOps';
import { createPrimitiveEditableMesh } from '@/lib/meshOps';
import { useEditorStore } from '@/store/editorStore';
import { useHistoryStore } from '@/store/historyStore';
import { useMaterialStore } from '@/store/materialStore';
import { usePhysicsStore } from '@/store/physicsStore';
import { useSceneStore } from '@/store/sceneStore';
import { useTimelineStore } from '@/store/timelineStore';
import type { ActiveTool, EffectKind, LightConfig, ObjectSelectionMode, PrimitiveGeometry, PrimitiveKind, ViewportDisplayMode
} from '@/store/types';
import { DEFAULT_LIGHT_CONFIG } from '@/store/types';
import { EFFECT_KINDS, EFFECT_LABELS, EFFECT_PRESETS } from '@/lib/effects';
import { getPhysicsConfig, isPhysicsEnabled } from '@/lib/physics';

type ToolbarProps = {
  sceneRootRef: MutableRefObject<THREE.Group | null>;
  onOpenTutorial: () => void;
};

const toolLabels: Record<ActiveTool, string> = {
  select: 'Select',
  translate: 'Mover',
  rotate: 'Girar',
  scale: 'Escalar',
  edit: 'Editar',
  sculpt: 'Sculpt',
};

const toolIcons: Record<ActiveTool, LucideIcon> = {
  select: MousePointer2,
  translate: Move3D,
  rotate: Rotate3D,
  scale: Scale3D,
  edit: Grid3X3,
  sculpt: Brush,
};

const tools: ActiveTool[] = ['select', 'translate', 'rotate', 'scale', 'edit', 'sculpt'];

const viewportDisplayLabels: Record<ViewportDisplayMode, string> = {
  textured: 'Textura',
  solid: 'Solido',
  wireframe: 'Wire',
  vertices: 'Vertices',
  polygons: 'Poligonos',
  primitive: 'Primitiva',
};

const viewportDisplayModes = Object.keys(viewportDisplayLabels) as ViewportDisplayMode[];

const selectionModeLabels: Record<ObjectSelectionMode, string> = {
  object: 'Objeto',
  subelement: 'Parte',
  mesh: 'Mesh',
};

const selectionModes = Object.keys(selectionModeLabels) as ObjectSelectionMode[];

// ── Compact button classes (32px height, inspired by Spline/Blender) ──
const btnBase = 'inline-flex items-center justify-center shrink-0 h-8 w-8 rounded-md text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed';

const btnTool = 'inline-flex items-center justify-center shrink-0 h-8 w-8 rounded-md text-xs font-medium transition-colors hover:bg-neutral-800';
const btnToolActive = 'bg-emerald-400/10 text-emerald-300 shadow-[inset_0_-2px_0_0_rgb(52,211,153)]';
const btnToolInactive = 'text-neutral-400 hover:text-neutral-100';

const btnToggle = 'inline-flex items-center justify-center shrink-0 h-8 w-8 rounded-md text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-neutral-100';
const btnToggleActive = 'bg-neutral-800 text-emerald-300';

const btnAction = 'inline-flex items-center justify-center shrink-0 h-8 gap-1.5 rounded-md border border-neutral-700/50 bg-neutral-900/50 px-3 text-[11px] font-medium text-neutral-400 transition-colors hover:border-neutral-600 hover:bg-neutral-800 hover:text-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed';

const selectClass = 'h-8 appearance-none rounded-md border border-neutral-700/50 bg-neutral-900 pl-7 pr-7 text-[11px] font-medium text-neutral-400 outline-none transition-colors hover:border-neutral-600 focus:border-emerald-500 cursor-pointer';

const selectChevron = 'pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-neutral-600';

type AiPrimitiveDraft = {
  name: string;
  primitive: PrimitiveKind;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  visible?: boolean;
  parentName?: string;
  editableMesh?: boolean;
  geometry?: PrimitiveGeometry;
  material?: Partial<{
    color: string;
    metalness: number;
    roughness: number;
    emissive: string;
    emissiveIntensity: number;
    opacity: number;
    textureRepeatX: number;
    textureRepeatY: number;
    textureOffsetX: number;
    textureOffsetY: number;
    textureRotation: number;
  }>;
};

type AiGenerateResponse = {
  objects: AiPrimitiveDraft[];
};

function ToolbarDivider() {
  return <div className="mx-1 h-5 w-px bg-neutral-800" />;
}

export default function Toolbar({ sceneRootRef, onOpenTutorial }: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const refImageInputRef = useRef<HTMLInputElement>(null);
  const toolbarRef = useRef<HTMLElement>(null);
  const toolbarDragRef = useRef({
    pointerId: -1,
    startX: 0,
    startScrollLeft: 0,
    moved: false,
    blockClick: false,
  });
  const [exporting, setExporting] = useState(false);
  const [importingModel, setImportingModel] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [assetBrowserOpen, setAssetBrowserOpen] = useState(false);
  const [toolbarDragging, setToolbarDragging] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const activeTool = useEditorStore((state) => state.activeTool);
  const setActiveTool = useEditorStore((state) => state.setActiveTool);
  const showGrid = useEditorStore((state) => state.showGrid);
  const setShowGrid = useEditorStore((state) => state.setShowGrid);
  const snapping = useEditorStore((state) => state.snapping);
  const setSnapping = useEditorStore((state) => state.setSnapping);
  const viewportDisplayMode = useEditorStore((state) => state.viewportDisplayMode);
  const setViewportDisplayMode = useEditorStore((state) => state.setViewportDisplayMode);
  const objectSelectionMode = useEditorStore((state) => state.objectSelectionMode);
  const setObjectSelectionMode = useEditorStore((state) => state.setObjectSelectionMode);
  const setSelectedObject = useEditorStore((state) => state.setSelectedObject);
  const clearSelectedObjects = useEditorStore((state) => state.clearSelectedObjects);
  const selectedObjectIds = useEditorStore((state) => state.selectedObjectIds);
  const objects = useSceneStore((state) => state.objects);
  const addObject = useSceneStore((state) => state.addObject);
  const addObjects = useSceneStore((state) => state.addObjects);
  const addPrimitive = useSceneStore((state) => state.addPrimitive);
  const addReferenceImage = useSceneStore((state) => state.addReferenceImage);
  const updateObject = useSceneStore((state) => state.updateObject);
  const groupObjects = useSceneStore((state) => state.groupObjects);
  const ungroupObject = useSceneStore((state) => state.ungroupObject);
  const resetScene = useSceneStore((state) => state.resetScene);
  const createMaterialForObject = useMaterialStore((state) => state.createMaterialForObject);
  const updateMaterial = useMaterialStore((state) => state.updateMaterial);
  const removeMaterialsForObjects = useMaterialStore((state) => state.removeMaterialsForObjects);
  const resetMaterials = useMaterialStore((state) => state.resetMaterials);
  const undo = useHistoryStore((state) => state.undo);
  const redo = useHistoryStore((state) => state.redo);
  const pushSnapshot = useHistoryStore((state) => state.pushSnapshot);
  const undoCount = useHistoryStore((state) => state.undoStack.length);
  const redoCount = useHistoryStore((state) => state.redoStack.length);
  const simulationMode = usePhysicsStore((state) => state.mode);
  const simulationPlayback = usePhysicsStore((state) => state.playback);
  const gravityEnabled = usePhysicsStore((state) => state.gravityEnabled);
  const showColliders = usePhysicsStore((state) => state.showColliders);
  const showPhysicsDebug = usePhysicsStore((state) => state.showDebug);
  const hasSimulationResult = usePhysicsStore((state) => state.hasSimulationResult);
  const playSimulation = usePhysicsStore((state) => state.playSimulation);
  const pauseSimulation = usePhysicsStore((state) => state.pauseSimulation);
  const stopSimulation = usePhysicsStore((state) => state.stopSimulation);
  const resetSimulation = usePhysicsStore((state) => state.resetSimulation);
  const stepSimulation = usePhysicsStore((state) => state.stepSimulation);
  const toggleGravity = usePhysicsStore((state) => state.toggleGravity);
  const setShowColliders = usePhysicsStore((state) => state.setShowColliders);
  const setShowPhysicsDebug = usePhysicsStore((state) => state.setShowDebug);
  const requestApplySimulation = usePhysicsStore((state) => state.requestApplySimulation);
  const requestImpulse = usePhysicsStore((state) => state.requestImpulse);
  const selectedObject = objects.find((object) => object.uuid === (selectedObjectIds[0] ?? null));
  const physicsObjectCount = objects.filter(isPhysicsEnabled).length;
  const selectedPhysics = selectedObject ? getPhysicsConfig(selectedObject) : null;
  const canImpulseSelected =
    simulationMode === 'simulation' &&
    Boolean(selectedObjectIds[0] && selectedPhysics?.enabled && selectedPhysics.bodyType === 'dynamic');

  const handleAddPrimitive = (primitive: PrimitiveKind) => {
    pushSnapshot();
    const object = addPrimitive(primitive);
    createMaterialForObject(object.uuid, object.materialId, `Material ${object.name}`);
    setSelectedObject(object.uuid);
    setActiveTool('translate');
  };

  const handleAddEffect = (kind: EffectKind) => {
    pushSnapshot();
    const preset = EFFECT_PRESETS[kind];
    const object = addObject({
      name: EFFECT_LABELS[kind],
      kind: 'effect',
      effect: { ...preset },
      position: [0, 0.5, 0],
    });
    createMaterialForObject(object.uuid, object.materialId, `Material ${object.name}`);
    setSelectedObject(object.uuid);
    setActiveTool('translate');
  };

  const handleAddLight = (kind: LightConfig['kind']) => {
    pushSnapshot();
    const name = `Spotlight ${objects.filter((o) => o.lightConfig?.kind === kind).length + 1}`;
    const defaultTarget: [number, number, number] = kind === 'spot' ? [0, 0, -3] : kind === 'directional' ? [0, 0, -5] : [0, 0, 0];
    const object = addObject({
      name,
      kind: 'light',
      lightConfig: { ...DEFAULT_LIGHT_CONFIG, kind, target: defaultTarget },
      position: kind === 'ambient' ? [0, 0, 0] : [2, 3, 4],
    });
    createMaterialForObject(object.uuid, object.materialId, `Material ${name}`);
    setSelectedObject(object.uuid);
    setActiveTool('translate');
  };

  const handleModelFile = async (file: File | undefined) => {
    if (!file || !isModelFile(file) || importingModel) return;

    setImportingModel(true);
    const source = URL.createObjectURL(file);
    const name = file.name.replace(/\.(glb|gltf)$/i, '').replace(/[_-]+/g, ' ');

    try {
      pushSnapshot();
      const imported = await buildSceneObjectsFromGltf({ source, name, sourceType: 'upload' });
      addObjects(imported.objects);
      imported.materials.forEach((draft) => {
        const created = createMaterialForObject(draft.objectId, draft.materialId, draft.name);
        updateMaterial(created.uuid, draft.patch);
      });
      setSelectedObject(imported.rootId);
      setActiveTool('translate');
    } catch (error) {
      console.warn('Falha ao preservar hierarquia GLTF, usando importacao legada:', error);
      const object = addObject({
        name,
        kind: 'model',
        source,
        sourceType: 'upload',
        position: [0, 0, 0],
      });
      createMaterialForObject(object.uuid, object.materialId, `Material ${name}`);
      setSelectedObject(object.uuid);
      setActiveTool('translate');
    } finally {
      setImportingModel(false);
    }
  };

  const handleReferenceFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return;

    pushSnapshot();
    const url = URL.createObjectURL(file);
    const name = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
    addReferenceImage(url, name);
  };

  const handleAddText = () => {
    const text = window.prompt('Digite o texto para 3D:', '');
    if (!text) return;
    pushSnapshot();
    const object = addObject({
      name: `Texto: ${text}`,
      kind: 'text',
      textConfig: { text, size: 1, depth: 0.3, curveSegments: 8, bevelEnabled: false, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 4 },
      position: [0, 0.5, 0],
    });
    createMaterialForObject(object.uuid, object.materialId, `Material Texto`);
    setSelectedObject(object.uuid);
    setActiveTool('translate');
  };

  const handleGroupSelected = () => {
    if (selectedObjectIds.length === 0) return;
    pushSnapshot();
    const group = groupObjects(selectedObjectIds, 'Grupo');
    if (group) {
      createMaterialForObject(group.uuid, group.materialId, `Material ${group.name}`);
      setSelectedObject(group.uuid);
      setActiveTool('translate');
    }
  };

  const handleUngroupSelected = () => {
    if (!selectedObject || selectedObject.children.length === 0) return;
    pushSnapshot();
    ungroupObject(selectedObject.uuid);
    removeMaterialsForObjects([selectedObject.uuid]);
    clearSelectedObjects();
  };

  const keyframes = useTimelineStore((state) => state.keyframes);
  const fps = useTimelineStore((state) => state.fps);

  const handleExport = async () => {
    if (!sceneRootRef.current || exporting) return;

    setExporting(true);
    try {
      await exportObjectAsGLB(sceneRootRef.current, 'editor-scene.glb', {
        keyframes,
        objects,
        fps,
      });
    } finally {
      setExporting(false);
    }
  };

  const handleTool = (tool: ActiveTool) => {
    if (tool !== 'edit' && tool !== 'sculpt') {
      setActiveTool(tool);
      return;
    }

    if (selectedObject && !selectedObject.editableMesh) {
      pushSnapshot();

      if (selectedObject.kind === 'primitive' && selectedObject.primitive) {
        updateObject(selectedObject.uuid, {
          editableMesh: createPrimitiveEditableMesh(selectedObject.primitive, selectedObject.geometry),
        });
      }
    }

    setActiveTool(tool);
  };

  const handleReset = () => {
    pushSnapshot();
    resetScene();
    resetMaterials();
    clearSelectedObjects();
    setActiveTool('select');
  };

  useEffect(() => {
    const handlePointerMove = (event: globalThis.PointerEvent) => {
      const drag = toolbarDragRef.current;
      const toolbar = toolbarRef.current;
      if (!toolbar || drag.pointerId !== event.pointerId) return;

      const deltaX = event.clientX - drag.startX;
      if (Math.abs(deltaX) > 4) {
        drag.moved = true;
      }

      if (!drag.moved) return;
      event.preventDefault();
      toolbar.scrollLeft = drag.startScrollLeft - deltaX;
    };

    const handlePointerUp = (event: globalThis.PointerEvent) => {
      const drag = toolbarDragRef.current;
      if (drag.pointerId !== event.pointerId) return;

      if (!drag.moved) {
        drag.pointerId = -1;
        setToolbarDragging(false);
        return;
      }

      drag.blockClick = true;
      drag.pointerId = -1;
      setToolbarDragging(false);
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);

    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  const handleToolbarPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest('input, select, textarea, option')) return;

    const toolbar = toolbarRef.current;
    if (!toolbar || toolbar.scrollWidth <= toolbar.clientWidth) return;

    toolbarDragRef.current.pointerId = event.pointerId;
    toolbarDragRef.current.startX = event.clientX;
    toolbarDragRef.current.startScrollLeft = toolbar.scrollLeft;
    toolbarDragRef.current.moved = false;
    toolbarDragRef.current.blockClick = false;
    setToolbarDragging(true);
  };

  const handleToolbarClickCapture = (event: React.MouseEvent<HTMLElement>) => {
    if (!toolbarDragRef.current.blockClick) return;
    toolbarDragRef.current.blockClick = false;
    event.preventDefault();
    event.stopPropagation();
  };

  const runAiGenerate = useCallback(async (prompt: string) => {
    setGeneratingAi(true);
    setAiError(null);
    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message = typeof payload?.error === 'string' ? payload.error : 'Falha ao gerar cena com IA.';
        throw new Error(message);
      }

      const payload = (await response.json()) as AiGenerateResponse;
      if (!Array.isArray(payload.objects) || payload.objects.length === 0) {
        throw new Error('A IA nao retornou objetos para montar a cena.');
      }

      pushSnapshot();

      let lastObjectId: string | null = null;
      const createdObjects: Array<{ uuid: string; name: string; parentName?: string }> = [];

      payload.objects.forEach((item) => {
        const object = addObject({
          name: item.name,
          kind: 'primitive',
          primitive: item.primitive,
          geometry: item.geometry,
          position: item.position ?? [0, 0.5, 0],
          rotation: item.rotation ?? [0, 0, 0],
          scale: item.scale ?? [1, 1, 1],
          visible: item.visible ?? true,
          editableMesh: item.editableMesh ? createPrimitiveEditableMesh(item.primitive, item.geometry) : undefined,
        });

        createMaterialForObject(object.uuid, object.materialId, `Material ${item.name}`);

        const materialPatch = {
          color: item.material?.color,
          metalness: item.material?.metalness,
          roughness: item.material?.roughness,
          emissive: item.material?.emissive,
          emissiveIntensity: item.material?.emissiveIntensity,
          opacity: item.material?.opacity,
          textureRepeatX: item.material?.textureRepeatX,
          textureRepeatY: item.material?.textureRepeatY,
          textureOffsetX: item.material?.textureOffsetX,
          textureOffsetY: item.material?.textureOffsetY,
          textureRotation: item.material?.textureRotation,
        };

        updateMaterial(
          object.materialId,
          Object.fromEntries(Object.entries(materialPatch).filter(([, value]) => value !== undefined)),
        );

        createdObjects.push({ uuid: object.uuid, name: item.name, parentName: item.parentName });
        lastObjectId = object.uuid;
      });

      const nameToId = new Map(createdObjects.map((item) => [item.name.toLowerCase(), item.uuid]));
      createdObjects.forEach((item) => {
        if (!item.parentName) return;
        const parentId = nameToId.get(item.parentName.toLowerCase());
        if (!parentId || parentId === item.uuid) return;
        updateObject(item.uuid, { parent: parentId });
      });

      setAiModalOpen(false);

      if (lastObjectId) {
        setSelectedObject(lastObjectId);
        setActiveTool('translate');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao gerar cena com IA.';
      setAiError(message);
    } finally {
      setGeneratingAi(false);
    }
  }, [addObject, createMaterialForObject, pushSnapshot, setSelectedObject, setActiveTool, updateMaterial, updateObject]);

  return (
    <header
      ref={toolbarRef}
      onPointerDown={handleToolbarPointerDown}
      onClickCapture={handleToolbarClickCapture}
      className={`flex h-12 select-none items-center gap-1 overflow-x-auto overflow-y-hidden border-b border-neutral-800/80 bg-[#1a1b1e] px-2 text-neutral-100 ${
        toolbarDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
    >
      {/* ── Transform Tools ── */}
      <div data-tutorial="tools-group" className="flex shrink-0 items-center gap-0.5 rounded-md bg-neutral-900/60 p-0.5">
        {tools.map((tool) => {
          const Icon = toolIcons[tool];
          const isActive = activeTool === tool;
          return (
            <button
              key={tool}
              type="button"
              title={toolLabels[tool]}
              aria-label={toolLabels[tool]}
              aria-current={isActive ? 'true' : undefined}
              data-tutorial={`tool-${tool}`}
              onClick={() => handleTool(tool)}
              className={`${btnTool} ${isActive ? btnToolActive : btnToolInactive}`}
            >
              <Icon size={14} />
            </button>
          );
        })}
      </div>

      <ToolbarDivider />

      {/* ── History ── */}
      <button type="button" title="Desfazer (Ctrl+Z)" aria-label="Undo" onClick={undo} disabled={undoCount === 0} className={btnBase}>
        <Undo2 size={14} />
      </button>
      <button type="button" title="Refazer (Ctrl+Shift+Z)" aria-label="Redo" onClick={redo} disabled={redoCount === 0} className={btnBase}>
        <Redo2 size={14} />
      </button>

      <ToolbarDivider />

      {/* ── Viewport Controls ── */}
      <button
        type="button"
        title={showGrid ? 'Ocultar grade' : 'Mostrar grade'}
        aria-label="Grid"
        onClick={() => setShowGrid(!showGrid)}
        className={`${btnToggle} ${showGrid ? btnToggleActive : ''}`}
      >
        <Grid3X3 size={14} />
      </button>
      <button
        type="button"
        title={snapping ? 'Desativar snap' : 'Ativar snap'}
        aria-label="Snap"
        onClick={() => setSnapping(!snapping)}
        className={`${btnToggle} ${snapping ? btnToggleActive : ''}`}
      >
        <Magnet size={14} />
      </button>

      <div className="relative shrink-0">
        <select
          aria-label="Modo de visualizacao"
          value={viewportDisplayMode}
          onChange={(e) => setViewportDisplayMode(e.target.value as ViewportDisplayMode)}
          className={`${selectClass} w-[100px]`}
        >
          {viewportDisplayModes.map((mode) => (
            <option key={mode} value={mode}>{viewportDisplayLabels[mode]}</option>
          ))}
        </select>
        <ChevronDown size={12} className={selectChevron} />
      </div>

      <div className="relative shrink-0">
        <select
          aria-label="Modo de selecao"
          value={objectSelectionMode}
          onChange={(e) => setObjectSelectionMode(e.target.value as ObjectSelectionMode)}
          className={`${selectClass} w-[96px]`}
        >
          {selectionModes.map((mode) => (
            <option key={mode} value={mode}>{selectionModeLabels[mode]}</option>
          ))}
        </select>
        <MousePointer2 size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
        <ChevronDown size={12} className={selectChevron} />
      </div>

      <ToolbarDivider />

      {/* ── Simulation Controls ── */}
      <div className="flex shrink-0 items-center gap-0.5 rounded-md bg-neutral-900/60 p-0.5">
        <span
          title={`${physicsObjectCount} objetos com fisica`}
          className={`grid h-8 min-w-8 place-items-center rounded-md px-2 text-[10px] font-semibold ${
            simulationMode === 'simulation' ? 'bg-cyan-400/10 text-cyan-300' : 'text-neutral-500'
          }`}
        >
          <Atom size={14} />
        </span>
        <button
          type="button"
          title="Play simulation"
          aria-label="Play simulation"
          onClick={playSimulation}
          disabled={physicsObjectCount === 0}
          className={`${btnToggle} ${simulationPlayback === 'playing' ? btnToggleActive : ''}`}
        >
          <Play size={14} />
        </button>
        <button
          type="button"
          title="Pause simulation"
          aria-label="Pause simulation"
          onClick={pauseSimulation}
          disabled={simulationMode !== 'simulation'}
          className={`${btnToggle} ${simulationPlayback === 'paused' && simulationMode === 'simulation' ? btnToggleActive : ''}`}
        >
          <Pause size={14} />
        </button>
        <button
          type="button"
          title="Stop simulation e voltar ao estado original"
          aria-label="Stop simulation"
          onClick={stopSimulation}
          disabled={simulationMode !== 'simulation'}
          className={btnToggle}
        >
          <Box size={14} />
        </button>
        <button
          type="button"
          title="Reset simulation"
          aria-label="Reset simulation"
          onClick={resetSimulation}
          disabled={physicsObjectCount === 0}
          className={btnToggle}
        >
          <RotateCcw size={14} />
        </button>
        <button
          type="button"
          title="Step simulation"
          aria-label="Step simulation"
          onClick={stepSimulation}
          disabled={physicsObjectCount === 0}
          className={btnToggle}
        >
          <Redo2 size={14} />
        </button>
      </div>

      <button
        type="button"
        title={gravityEnabled ? 'Desativar gravidade global' : 'Ativar gravidade global'}
        aria-label="Toggle gravity"
        onClick={toggleGravity}
        className={`${btnToggle} ${gravityEnabled ? btnToggleActive : ''}`}
      >
        <Move3D size={14} />
      </button>
      <button
        type="button"
        title={showColliders ? 'Ocultar colliders' : 'Mostrar colliders'}
        aria-label="Toggle colliders"
        onClick={() => setShowColliders(!showColliders)}
        className={`${btnToggle} ${showColliders ? btnToggleActive : ''}`}
      >
        <Boxes size={14} />
      </button>
      <button
        type="button"
        title={showPhysicsDebug ? 'Ocultar debug physics' : 'Mostrar debug physics'}
        aria-label="Toggle physics debug"
        onClick={() => setShowPhysicsDebug(!showPhysicsDebug)}
        className={`${btnToggle} ${showPhysicsDebug ? btnToggleActive : ''}`}
      >
        <ScanLine size={14} />
      </button>
      <button
        type="button"
        title="Aplicar impulso no selecionado"
        aria-label="Aplicar impulso"
        onClick={() => {
          const selectedId = selectedObjectIds[0];
          if (selectedId) requestImpulse(selectedId);
        }}
        disabled={!canImpulseSelected}
        className={btnToggle}
      >
        <PlugZap size={14} />
      </button>
      <button
        type="button"
        title="Aplicar resultado da simulacao na cena"
        aria-label="Aplicar resultado da simulacao"
        onClick={requestApplySimulation}
        disabled={!hasSimulationResult}
        className={btnAction}
      >
        <Check size={12} />
        <span>Aplicar</span>
      </button>

      <ToolbarDivider />

      <button type="button" title="Agrupar selecionado" aria-label="Agrupar" onClick={handleGroupSelected} disabled={selectedObjectIds.length === 0} className={btnBase}>
        <Boxes size={14} />
      </button>
      <button type="button" title="Desagrupar selecionado" aria-label="Desagrupar" onClick={handleUngroupSelected} disabled={!selectedObject || selectedObject.children.length === 0} className={btnBase}>
        <Grid3X3 size={14} />
      </button>

      <ToolbarDivider />

      {/* ── Create Group ── */}
      <div className="relative shrink-0">
        <select
          aria-label="Adicionar primitiva"
          data-tutorial="add-primitive"
          defaultValue=""
          onChange={(e) => {
            const val = e.target.value as PrimitiveKind;
            if (val) handleAddPrimitive(val);
            e.currentTarget.value = '';
          }}
          className={`${selectClass} w-[90px]`}
        >
          <option value="" disabled>Primitiva</option>
          {primitiveKinds.map((p) => (
            <option key={p} value={p}>{primitiveLabels[p]}</option>
          ))}
        </select>
        <Box size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
        <ChevronDown size={12} className={selectChevron} />
      </div>

      <div className="relative shrink-0">
        <select
          aria-label="Adicionar efeito"
          defaultValue=""
          onChange={(e) => {
            const val = e.target.value as EffectKind;
            if (val) handleAddEffect(val);
            e.currentTarget.value = '';
          }}
          className={`${selectClass} w-[90px]`}
        >
          <option value="" disabled>Efeito</option>
          {EFFECT_KINDS.map((k) => (
            <option key={k} value={k}>{EFFECT_LABELS[k]}</option>
          ))}
        </select>
        <Box size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
        <ChevronDown size={12} className={selectChevron} />
      </div>

      <div className="relative shrink-0">
        <select
          aria-label="Adicionar luz"
          defaultValue=""
          onChange={(e) => {
            const val = e.target.value as LightConfig['kind'];
            if (val) handleAddLight(val);
            e.currentTarget.value = '';
          }}
          className={`${selectClass} w-[90px]`}
        >
          <option value="" disabled>Luz</option>
          <option value="spot">Spotlight</option>
          <option value="point">Puntual</option>
          <option value="directional">Direcional</option>
          <option value="ambient">Ambiente</option>
        </select>
        <Box size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
        <ChevronDown size={12} className={selectChevron} />
      </div>

      <button type="button" title="Criar texto 3D" aria-label="Criar texto 3D" onClick={handleAddText} className={btnBase}>
        <Type size={14} />
      </button>

      <ToolbarDivider />

      {/* ── File & Assets ── */}
      <input
        ref={fileInputRef}
        type="file"
        accept={MODEL_FILE_ACCEPT}
        className="sr-only"
        onChange={(e) => { handleModelFile(e.target.files?.[0]); e.currentTarget.value = ''; }}
      />
      <input
        ref={refImageInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => { handleReferenceFile(e.target.files?.[0]); e.currentTarget.value = ''; }}
      />

      <button type="button" title="Importar modelo 3D" aria-label="Importar" onClick={() => fileInputRef.current?.click()} disabled={importingModel} className={btnAction}>
        <Upload size={12} />
        <span>{importingModel ? '...' : 'Importar'}</span>
      </button>
      <button type="button" title="Abrir biblioteca de assets" aria-label="Assets" onClick={() => setAssetBrowserOpen(true)} className={btnAction}>
        <Box size={12} />
        <span>Assets</span>
      </button>
      <button type="button" title="Adicionar imagem de referencia" aria-label="Referencia" onClick={() => refImageInputRef.current?.click()} className={btnAction}>
        <Heart size={12} />
        <span>Ref.</span>
      </button>
      <button type="button" title="Exportar cena como GLB" aria-label="Exportar" onClick={handleExport} disabled={exporting} className={btnAction}>
        <Download size={12} />
        <span>{exporting ? '...' : 'Exportar'}</span>
      </button>

      <div className="ml-auto flex shrink-0 items-center gap-1">
        <button type="button" title="Resetar cena" aria-label="Reset" onClick={handleReset} className={btnBase}>
          <RotateCcw size={14} />
        </button>
        <button type="button" title="Abrir tutorial" aria-label="Tutorial" onClick={onOpenTutorial} className={btnBase}>
          <HelpCircle size={14} />
        </button>
        <a
          href="/api/download/desktop"
          title="Baixar versao desktop"
          aria-label="Download desktop"
          className="inline-flex items-center justify-center shrink-0 h-8 gap-1.5 rounded-md border border-emerald-600/40 bg-emerald-950/30 px-2.5 text-[11px] font-medium text-emerald-400 transition-colors hover:border-emerald-500/60 hover:bg-emerald-900/40 hover:text-emerald-300"
        >
          <img src="/windows-icon.png" alt="" className="h-3.5 w-3.5 brightness-[4] invert-[0.65]" />
          <span className="hidden sm:inline">Desktop</span>
        </a>
      </div>

      <AiPromptModal
        open={aiModalOpen}
        generating={generatingAi}
        error={aiError}
        onSubmit={runAiGenerate}
        onClose={() => { setAiModalOpen(false); setAiError(null); }}
      />
      <AssetBrowserModal open={assetBrowserOpen} onClose={() => setAssetBrowserOpen(false)} />
    </header>
  );
}
