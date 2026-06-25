'use client';

import { type ChangeEvent, type ReactNode, useRef, useState } from 'react';
import { Download, FileUp, History, LayoutTemplate, Monitor, MousePointer2, Plus, RotateCcw, Save, Smartphone, Tablet } from 'lucide-react';
import { exportTargetLabel } from '@/lib/export-engine/exportExperience';
import type { ExportTarget, PageNodeType, PreviewDevice } from '@/lib/page-builder/types';
import {
  createProjectExperienceFile,
  downloadProjectExperienceFile,
  parseProjectExperienceFile,
} from '@/lib/project-experience/persistence';
import { listProjectHistory, loadAutosaveEntry, restoreFromEntry } from '@/lib/project-experience/projectHistory';
import { createSceneDocument } from '@/lib/scene-engine/sceneDocument';
import { useExperienceStore } from '@/store/experienceStore';
import { useMaterialStore } from '@/store/materialStore';
import { useSceneStore } from '@/store/sceneStore';
import { useTimelineStore } from '@/store/timelineStore';
import TemplateGallery from './TemplateGallery';

const pageNodeTypes: Array<{ type: PageNodeType; label: string }> = [
  { type: 'section', label: 'Section' },
  { type: 'container', label: 'Container' },
  { type: 'text', label: 'Text' },
  { type: 'button', label: 'Button' },
  { type: 'card', label: 'Card' },
  { type: 'image', label: 'Image' },
  { type: 'video', label: 'Video' },
  { type: 'navbar', label: 'Navbar' },
  { type: 'footer', label: 'Footer' },
  { type: 'sceneCanvas', label: '3D Scene' },
];

const deviceIcons: Record<PreviewDevice, ReactNode> = {
  desktop: <Monitor size={13} />,
  tablet: <Tablet size={13} />,
  mobile: <Smartphone size={13} />,
};

export default function ExperienceToolbar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const activeMode = useExperienceStore((state) => state.activeMode);
  const page = useExperienceStore((state) => state.page);
  const interactions = useExperienceStore((state) => state.interactions);
  const settings = useExperienceStore((state) => state.settings);
  const previewDevice = useExperienceStore((state) => state.previewDevice);
  const exportTarget = useExperienceStore((state) => state.exportTarget);
  const addPageNode = useExperienceStore((state) => state.addPageNode);
  const addInteraction = useExperienceStore((state) => state.addInteraction);
  const setPreviewDevice = useExperienceStore((state) => state.setPreviewDevice);
  const setExportTarget = useExperienceStore((state) => state.setExportTarget);
  const objects = useSceneStore((state) => state.objects);
  const layers = useSceneStore((state) => state.layers);
  const referenceImages = useSceneStore((state) => state.referenceImages);
  const materials = useMaterialStore((state) => state.materials);
  const keyframes = useTimelineStore((state) => state.keyframes);

  const saveProject = () => {
    const scene = createSceneDocument({
      objects,
      materials,
      keyframes,
      layers,
      referenceImages,
      name: 'Main Scene',
    });
    const project = createProjectExperienceFile({
      page,
      scene,
      interactions,
      settings,
    });

    downloadProjectExperienceFile(project);
  };

  const loadProject = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const project = parseProjectExperienceFile(await file.text());
      applyProject(project);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Nao foi possivel carregar o projeto.');
    } finally {
      event.currentTarget.value = '';
    }
  };

  const applyProject = (project: ReturnType<typeof parseProjectExperienceFile>) => {
    useSceneStore.getState().setLayers(project.scene.layers ?? []);
    useSceneStore.getState().setObjects(project.scene.objects ?? []);
    useSceneStore.getState().setReferenceImages(project.scene.referenceImages ?? []);
    useMaterialStore.getState().setMaterials(
      Object.fromEntries((project.scene.materials ?? []).map((material) => [material.uuid, material])),
    );
    useTimelineStore.getState().setKeyframes(project.scene.animations ?? []);
    useExperienceStore.getState().loadExperience({
      page: project.page,
      interactions: project.interactions,
      settings: project.settings,
    });
  };

  const restoreAutosave = () => {
    const entry = loadAutosaveEntry();
    if (!entry) {
      window.alert('Nao ha autosave disponivel.');
      return;
    }
    if (!window.confirm(`Restaurar autosave de ${new Date(entry.savedAt).toLocaleString()}? O estado atual sera substituido.`)) return;
    const project = restoreFromEntry(entry);
    if (!project) {
      window.alert('Nao foi possivel restaurar o autosave.');
      return;
    }
    applyProject(project);
    setHistoryOpen(false);
  };

  const restoreHistoryEntry = (id: string) => {
    const entry = listProjectHistory().find((item) => item.id === id);
    if (!entry) return;
    if (!window.confirm(`Restaurar versao de ${new Date(entry.savedAt).toLocaleString()}?`)) return;
    const project = restoreFromEntry(entry);
    if (project) applyProject(project);
    setHistoryOpen(false);
  };

  const historyEntries = historyOpen ? listProjectHistory().slice(0, 8) : [];

  return (
    <header className="flex h-12 shrink-0 items-center border-b border-neutral-800/80 bg-[#1a1b1e] px-2 text-neutral-100">
      <input
        ref={fileInputRef}
        type="file"
        accept=".web3d.json,application/json"
        className="hidden"
        onChange={loadProject}
      />
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
        {activeMode === 'page' && (
          <>
            <button
              type="button"
              onClick={() => setGalleryOpen(true)}
              className="flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-emerald-600/40 bg-emerald-950/30 px-3 text-[11px] font-semibold text-emerald-300 transition hover:border-emerald-500/60 hover:bg-emerald-900/40"
              title="Galeria de templates"
            >
              <LayoutTemplate size={13} />
              Templates
            </button>
            <div className="h-5 w-px shrink-0 bg-neutral-800" />
            {pageNodeTypes.map((item) => (
              <button
                key={item.type}
                type="button"
                onClick={() => addPageNode(item.type)}
                className="flex h-8 shrink-0 items-center gap-1 rounded-md border border-neutral-700/50 bg-neutral-900/50 px-2.5 text-[11px] font-medium text-neutral-400 transition hover:border-emerald-400/40 hover:text-emerald-200"
              >
                <Plus size={12} />
                {item.label}
              </button>
            ))}
          </>
        )}

        {activeMode === 'interactions' && (
          <button
            type="button"
            onClick={() => addInteraction()}
            className="flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-emerald-600/40 bg-emerald-950/30 px-3 text-[11px] font-semibold text-emerald-300 transition hover:border-emerald-500/60 hover:bg-emerald-900/40"
          >
            <MousePointer2 size={12} />
            Nova interacao
          </button>
        )}

        {activeMode === 'preview' && (
          <div className="flex shrink-0 items-center gap-1 rounded-md bg-neutral-900/60 p-0.5">
            {(['desktop', 'tablet', 'mobile'] as PreviewDevice[]).map((device) => (
              <button
                key={device}
                type="button"
                onClick={() => setPreviewDevice(device)}
                className={`flex h-8 items-center gap-1 rounded-md px-3 text-[11px] font-medium transition ${
                  previewDevice === device ? 'bg-emerald-400/10 text-emerald-200' : 'text-neutral-500 hover:bg-neutral-800 hover:text-neutral-200'
                }`}
              >
                {deviceIcons[device]}
                {device}
              </button>
            ))}
          </div>
        )}

        {activeMode === 'export' && (
          <>
            <div className="relative shrink-0">
              <select
                aria-label="Formato de exportacao"
                value={exportTarget}
                onChange={(event) => setExportTarget(event.target.value as ExportTarget)}
                className="h-8 appearance-none rounded-md border border-neutral-700/50 bg-neutral-900 px-8 text-[11px] font-medium text-neutral-400 outline-none transition hover:border-neutral-600 focus:border-emerald-500"
              >
                {(Object.keys(exportTargetLabel) as ExportTarget[]).map((target) => (
                  <option key={target} value={target}>{exportTargetLabel[target]}</option>
                ))}
              </select>
              <Download size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
            </div>
          </>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setHistoryOpen((open) => !open)}
            className="flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-neutral-700/50 bg-neutral-900/60 px-2.5 text-[11px] font-medium text-neutral-400 transition hover:border-amber-400/40 hover:text-amber-200"
            title="Historico de versoes / autosave"
          >
            <History size={12} />
            Historico
          </button>
          {historyOpen && (
            <div className="absolute right-0 top-9 z-50 w-72 rounded-md border border-neutral-700 bg-neutral-950 p-1.5 shadow-2xl">
              <button
                type="button"
                onClick={restoreAutosave}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[11px] text-neutral-300 transition hover:bg-neutral-800 hover:text-emerald-200"
              >
                <RotateCcw size={12} />
                Restaurar autosave
              </button>
              <div className="my-1 border-t border-neutral-800" />
              {historyEntries.length === 0 ? (
                <div className="px-2.5 py-2 text-[11px] text-neutral-500">Sem versoes salvas</div>
              ) : (
                historyEntries.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => restoreHistoryEntry(entry.id)}
                    className="flex w-full flex-col gap-0.5 rounded-md px-2.5 py-2 text-left text-[11px] text-neutral-300 transition hover:bg-neutral-800 hover:text-emerald-200"
                  >
                    <span className="truncate font-medium">{entry.name}</span>
                    <span className="text-[10px] text-neutral-500">
                      {new Date(entry.savedAt).toLocaleString()} - {(entry.size / 1024).toFixed(1)} KB
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={saveProject}
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-neutral-700/50 bg-neutral-900/60 px-2.5 text-[11px] font-medium text-neutral-400 transition hover:border-emerald-400/40 hover:text-emerald-200"
          title="Salvar projeto"
        >
          <Save size={12} />
          Salvar
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-neutral-700/50 bg-neutral-900/60 px-2.5 text-[11px] font-medium text-neutral-400 transition hover:border-sky-400/40 hover:text-sky-200"
          title="Carregar projeto"
        >
          <FileUp size={12} />
          Carregar
        </button>
      </div>
      {galleryOpen && <TemplateGallery onClose={() => setGalleryOpen(false)} />}
    </header>
  );
}
