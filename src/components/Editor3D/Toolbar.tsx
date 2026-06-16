'use client';

import { useRef, useState, type MutableRefObject } from 'react';
import {
  Box,
  ChevronDown,
  Download,
  Grid3X3,
  Magnet,
  MousePointer2,
  Move3D,
  Redo2,
  Rotate3D,
  RotateCcw,
  Scale3D,
  Upload,
  Undo2,
  type LucideIcon,
} from 'lucide-react';
import * as THREE from 'three';
import { exportObjectAsGLB, isModelFile, MODEL_FILE_ACCEPT } from '@/lib/fileOps';
import { primitiveKinds, primitiveLabels } from '@/lib/geometryOps';
import { useEditorStore } from '@/store/editorStore';
import { useHistoryStore } from '@/store/historyStore';
import { useMaterialStore } from '@/store/materialStore';
import { useSceneStore } from '@/store/sceneStore';
import type { ActiveTool, PrimitiveKind } from '@/store/types';

type ToolbarProps = {
  sceneRootRef: MutableRefObject<THREE.Group | null>;
};

const toolLabels: Record<ActiveTool, string> = {
  select: 'Select',
  translate: 'Mover',
  rotate: 'Girar',
  scale: 'Escalar',
};

const toolIcons: Record<ActiveTool, LucideIcon> = {
  select: MousePointer2,
  translate: Move3D,
  rotate: Rotate3D,
  scale: Scale3D,
};

const tools: ActiveTool[] = ['select', 'translate', 'rotate', 'scale'];

const buttonClass =
  'inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md border border-neutral-700/80 bg-[#111315] px-5 py-2.5 text-xs font-medium text-neutral-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:border-emerald-400/70 hover:bg-[#151918] hover:text-emerald-100 disabled:cursor-not-allowed disabled:opacity-35';

const iconButtonClass =
  'inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-md border border-neutral-700/80 bg-[#111315] p-2.5 text-neutral-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:border-emerald-400/70 hover:bg-[#151918] hover:text-emerald-100 disabled:cursor-not-allowed disabled:opacity-35';

function ToolbarDivider() {
  return <div className="mx-1 h-7 w-px bg-neutral-800" />;
}

export default function Toolbar({ sceneRootRef }: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const activeTool = useEditorStore((state) => state.activeTool);
  const setActiveTool = useEditorStore((state) => state.setActiveTool);
  const showGrid = useEditorStore((state) => state.showGrid);
  const setShowGrid = useEditorStore((state) => state.setShowGrid);
  const snapping = useEditorStore((state) => state.snapping);
  const setSnapping = useEditorStore((state) => state.setSnapping);
  const setSelectedObject = useEditorStore((state) => state.setSelectedObject);
  const addObject = useSceneStore((state) => state.addObject);
  const addPrimitive = useSceneStore((state) => state.addPrimitive);
  const resetScene = useSceneStore((state) => state.resetScene);
  const createMaterialForObject = useMaterialStore((state) => state.createMaterialForObject);
  const resetMaterials = useMaterialStore((state) => state.resetMaterials);
  const undo = useHistoryStore((state) => state.undo);
  const redo = useHistoryStore((state) => state.redo);
  const pushSnapshot = useHistoryStore((state) => state.pushSnapshot);
  const undoCount = useHistoryStore((state) => state.undoStack.length);
  const redoCount = useHistoryStore((state) => state.redoStack.length);

  const handleAddPrimitive = (primitive: PrimitiveKind) => {
    pushSnapshot();
    const object = addPrimitive(primitive);
    createMaterialForObject(object.uuid, object.materialId, `Material ${object.name}`);
    setSelectedObject(object.uuid);
    setActiveTool('translate');
  };

  const handleModelFile = (file: File | undefined) => {
    if (!file || !isModelFile(file)) return;

    pushSnapshot();
    const name = file.name.replace(/\.(glb|gltf)$/i, '').replace(/[_-]+/g, ' ');
    const object = addObject({
      name,
      kind: 'model',
      source: URL.createObjectURL(file),
      sourceType: 'upload',
      position: [0, 0, 0],
    });
    createMaterialForObject(object.uuid, object.materialId, `Material ${name}`);
    setSelectedObject(object.uuid);
    setActiveTool('translate');
  };

  const handleExport = async () => {
    if (!sceneRootRef.current || exporting) return;

    setExporting(true);
    try {
      await exportObjectAsGLB(sceneRootRef.current, 'brain-editor-scene.glb');
    } finally {
      setExporting(false);
    }
  };

  const handleReset = () => {
    pushSnapshot();
    resetScene();
    resetMaterials();
    setSelectedObject('object-brain');
    setActiveTool('select');
  };

  return (
    <header className="flex min-h-[72px] items-center gap-2.5 overflow-x-auto overflow-y-hidden border-b border-neutral-800 bg-[#17191b] px-3 py-2.5 text-neutral-100 shadow-[0_1px_0_rgba(255,255,255,0.03)] max-sm:min-h-[64px]">
      <div className="mr-2 hidden min-w-32 shrink-0 items-center gap-2 sm:flex">
        <div className="grid h-8 w-8 place-items-center rounded-md border border-emerald-400/35 bg-emerald-400/10 text-emerald-200">
          <Box size={17} strokeWidth={2.2} />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold leading-4 text-neutral-100">Brain Editor</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Scene</div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-950/80 p-1">
        {tools.map((tool) => (
          (() => {
            const Icon = toolIcons[tool];

            return (
              <button
                key={tool}
                type="button"
                title={toolLabels[tool]}
                aria-label={toolLabels[tool]}
                onClick={() => setActiveTool(tool)}
                className={`inline-flex h-10 min-w-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md px-4 text-xs font-medium transition ${
                  activeTool === tool
                    ? 'bg-emerald-400 text-neutral-950 shadow-[0_0_0_1px_rgba(16,185,129,0.25),0_8px_18px_rgba(16,185,129,0.15)]'
                    : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100'
                }`}
              >
                <Icon size={15} />
                <span className="hidden lg:inline">{toolLabels[tool]}</span>
              </button>
            );
          })()
        ))}
      </div>

      <div className="shrink-0">
        <ToolbarDivider />
      </div>

      <button type="button" title="Undo" aria-label="Undo" onClick={undo} disabled={undoCount === 0} className={iconButtonClass}>
        <Undo2 size={15} />
      </button>
      <button type="button" title="Redo" aria-label="Redo" onClick={redo} disabled={redoCount === 0} className={iconButtonClass}>
        <Redo2 size={15} />
      </button>

      <div className="shrink-0">
        <ToolbarDivider />
      </div>

      <button
        type="button"
        title="Grid"
        aria-label="Grid"
        onClick={() => setShowGrid(!showGrid)}
        className={`${iconButtonClass} ${showGrid ? 'border-emerald-400/70 bg-emerald-400/10 text-emerald-100' : ''}`}
      >
        <Grid3X3 size={15} />
      </button>
      <button
        type="button"
        title="Snap"
        aria-label="Snap"
        onClick={() => setSnapping(!snapping)}
        className={`${iconButtonClass} ${snapping ? 'border-amber-300/70 bg-amber-300/10 text-amber-100' : ''}`}
      >
        <Magnet size={15} />
      </button>

      <div className="relative shrink-0">
        <select
          aria-label="Adicionar primitiva"
          defaultValue=""
          onChange={(event) => {
            const primitive = event.target.value as PrimitiveKind;
            if (primitive) handleAddPrimitive(primitive);
            event.currentTarget.value = '';
          }}
          className="h-11 cursor-pointer appearance-none rounded-md border border-neutral-700/80 bg-[#111315] py-0 pl-11 pr-10 text-xs font-medium text-neutral-300 outline-none transition hover:border-emerald-400/70 focus:border-emerald-400"
        >
          <option value="" disabled>
            Add
          </option>
          {primitiveKinds.map((primitive) => (
            <option key={primitive} value={primitive}>
              {primitiveLabels[primitive]}
            </option>
          ))}
        </select>
        <Box size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
        <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2 max-md:ml-0">
        <input
          ref={fileInputRef}
          type="file"
          accept={MODEL_FILE_ACCEPT}
          className="sr-only"
          onChange={(event) => {
            handleModelFile(event.target.files?.[0]);
            event.currentTarget.value = '';
          }}
        />
        <button type="button" onClick={() => fileInputRef.current?.click()} className={buttonClass}>
          <Upload size={14} />
          <span className="hidden sm:inline">Importar</span>
        </button>
        <button type="button" onClick={handleExport} disabled={exporting} className={buttonClass}>
          <Download size={14} />
          <span className="hidden sm:inline">{exporting ? 'Exportando' : 'Exportar'}</span>
        </button>
        <button type="button" onClick={handleReset} className={buttonClass}>
          <RotateCcw size={14} />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>
    </header>
  );
}
