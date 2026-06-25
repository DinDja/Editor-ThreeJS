'use client';

import { type ChangeEvent, useRef, useState } from 'react';
import {
  Box,
  Boxes,
  Check,
  ChevronDown,
  CircleHelp,
  Database,
  Download,
  FileBarChart,
  FileCode,
  FileUp,
  GitCompare,
  Grid3X3,
  History,
  LayoutTemplate,
  Monitor,
  MousePointer2,
  Plus,
  RotateCcw,
  Save,
  Smartphone,
  Tablet,
  Type,
  Video,
  Image as ImageIcon,
} from 'lucide-react';
import { exportTargetLabel } from '@/lib/export-engine/exportExperience';
import type { ExportTarget, PageDocument, PageNodeType } from '@/lib/page-builder/types';
import {
  createProjectExperienceFile,
  downloadProjectExperienceFile,
  parseProjectExperienceFile,
} from '@/lib/project-experience/persistence';
import { listProjectHistory, loadAutosaveEntry, restoreFromEntry } from '@/lib/project-experience/projectHistory';
import { createSceneDocument } from '@/lib/scene-engine/sceneDocument';
import { useDataModelStore } from '@/store/dataModelStore';
import { useExperienceStore } from '@/store/experienceStore';
import { useMaterialStore } from '@/store/materialStore';
import { useSceneStore } from '@/store/sceneStore';
import { useTimelineStore } from '@/store/timelineStore';
import { useVariableStore } from '@/store/variableStore';
import PageDocumentDiff from './PageDocumentDiff';
import TemplateGallery from './TemplateGallery';
import BlockLibrary from './BlockLibrary';
import { Dropdown, IconButton, MenuDivider, MenuItem, MenuLabel } from './ui/primitives';

type InsertGroup = {
  label: string;
  items: Array<{ type: PageNodeType; label: string; icon: React.ReactNode; hint?: string }>;
};

const insertGroups: InsertGroup[] = [
  {
    label: 'Layout',
    items: [
      { type: 'section', label: 'Section', icon: <LayoutTemplate size={14} />, hint: 'Bloco vertical da página' },
      { type: 'container', label: 'Container', icon: <Grid3X3 size={14} />, hint: 'Agrupa elementos em linha/coluna' },
      { type: 'navbar', label: 'Navbar', icon: <FileCode size={14} />, hint: 'Cabeçalho de navegação' },
      { type: 'footer', label: 'Footer', icon: <FileCode size={14} />, hint: 'Rodapé da página' },
    ],
  },
  {
    label: 'Conteúdo',
    items: [
      { type: 'text', label: 'Texto', icon: <Type size={14} />, hint: 'Título ou parágrafo' },
      { type: 'button', label: 'Botão', icon: <Box size={14} />, hint: 'CTA com link' },
      { type: 'card', label: 'Card', icon: <Box size={14} />, hint: 'Cartão com título e corpo' },
    ],
  },
  {
    label: 'Mídia & 3D',
    items: [
      { type: 'image', label: 'Imagem', icon: <ImageIcon size={14} />, hint: 'Imagem estática' },
      { type: 'video', label: 'Vídeo', icon: <Video size={14} />, hint: 'Player de vídeo' },
      { type: 'sceneCanvas', label: 'Cena 3D', icon: <Boxes size={14} />, hint: 'Vincula a cena atual' },
    ],
  },
  {
    label: 'Formulários & Menus',
    items: [
      { type: 'form', label: 'Formulário', icon: <Check size={14} />, hint: 'Bloco de formulário' },
      { type: 'input', label: 'Input', icon: <Type size={14} />, hint: 'Campo de texto' },
      { type: 'select', label: 'Select', icon: <ChevronDown size={14} />, hint: 'Lista de opções' },
      { type: 'textarea', label: 'Textarea', icon: <FileCode size={14} />, hint: 'Área de texto' },
      { type: 'label', label: 'Label', icon: <Type size={14} />, hint: 'Rótulo de campo' },
      { type: 'modal', label: 'Modal', icon: <Grid3X3 size={14} />, hint: 'Caixa de diálogo' },
      { type: 'menu', label: 'Menu', icon: <LayoutTemplate size={14} />, hint: 'Lista de navegação' },
      { type: 'menuitem', label: 'Item de menu', icon: <Box size={14} />, hint: 'Item dentro de menu' },
    ],
  },
  {
    label: 'Dados',
    items: [
      { type: 'dataTable', label: 'Tabela', icon: <Database size={14} />, hint: 'Lista registros de uma colecao' },
      { type: 'dataForm', label: 'Form dados', icon: <Check size={14} />, hint: 'Cria registros no runtime' },
      { type: 'dataList', label: 'Lista dados', icon: <Database size={14} />, hint: 'Cards repetidos por registro' },
      { type: 'dataChart', label: 'Grafico', icon: <FileBarChart size={14} />, hint: 'Grafico simples por colecao' },
      { type: 'dataStat', label: 'Stat', icon: <FileBarChart size={14} />, hint: 'Indicador agregado' },
      { type: 'pageRoute', label: 'Page Route', icon: <FileCode size={14} />, hint: 'Container de rota/pagina futura' },
    ],
  },
];

type ExperienceToolbarProps = {
  onOpenTutorial?: () => void;
};

export default function ExperienceToolbar({ onOpenTutorial }: ExperienceToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [blocksOpen, setBlocksOpen] = useState(false);
  const [diffData, setDiffData] = useState<{ oldDoc: PageDocument; newDoc: PageDocument } | null>(null);
  const activeMode = useExperienceStore((state) => state.activeMode);
  const page = useExperienceStore((state) => state.page);
  const pages = useExperienceStore((state) => state.pages);
  const activePageId = useExperienceStore((state) => state.activePageId);
  const interactions = useExperienceStore((state) => state.interactions);
  const settings = useExperienceStore((state) => state.settings);
  const activeBreakpoint = useExperienceStore((state) => state.activeBreakpoint);
  const breakpoints = useExperienceStore((state) => state.page.responsive);
  const components = useExperienceStore((state) => state.components);
  const exportTarget = useExperienceStore((state) => state.exportTarget);
  const addPageNode = useExperienceStore((state) => state.addPageNode);
  const addInteraction = useExperienceStore((state) => state.addInteraction);
  const setActiveBreakpoint = useExperienceStore((state) => state.setActiveBreakpoint);
  const setExportTarget = useExperienceStore((state) => state.setExportTarget);
  const objects = useSceneStore((state) => state.objects);
  const layers = useSceneStore((state) => state.layers);
  const referenceImages = useSceneStore((state) => state.referenceImages);
  const materials = useMaterialStore((state) => state.materials);
  const keyframes = useTimelineStore((state) => state.keyframes);
  const dataSchema = useDataModelStore((state) => state.schema);
  const addCollection = useDataModelStore((state) => state.addCollection);
  const variables = useVariableStore((state) => state.document);

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
      pages,
      activePageId,
      scene,
      interactions,
      settings,
      components,
      dataSchema,
      variables,
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
    useDataModelStore.getState().loadSchema(project.dataSchema);
    useVariableStore.getState().loadVariables(project.variables);
    useExperienceStore.getState().loadExperience({
      page: project.page,
      pages: project.pages,
      activePageId: project.activePageId,
      interactions: project.interactions,
      settings: project.settings,
      components: project.components,
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

  const compareWithEntry = (id: string) => {
    const entry = listProjectHistory().find((item) => item.id === id);
    if (!entry) return;
    try {
      const parsed = parseProjectExperienceFile(entry.payload);
      setDiffData({ oldDoc: parsed.page, newDoc: page });
      setHistoryOpen(false);
    } catch {
      window.alert('Nao foi possivel comparar esta versao.');
    }
  };

  const historyEntries = historyOpen ? listProjectHistory().slice(0, 8) : [];

  return (
    <header data-tutorial="experience-toolbar" className="flex h-12 shrink-0 items-center gap-2 border-b border-neutral-800/80 bg-[#1a1d20] px-2.5 text-neutral-100">
      <input
        ref={fileInputRef}
        type="file"
        accept=".web3d.json,application/json"
        className="hidden"
        onChange={loadProject}
      />

      {/* Left: contextual actions */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {activeMode === 'page' && (
          <>
            <button
              type="button"
              onClick={() => setGalleryOpen(true)}
              data-tutorial="page-templates"
              className="flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-emerald-600/40 bg-emerald-950/30 px-3 text-[11px] font-semibold text-emerald-300 transition hover:border-emerald-500/60 hover:bg-emerald-900/40"
              title="Galeria de templates (páginas completas)"
            >
              <LayoutTemplate size={13} />
              Templates
            </button>
            <button
              type="button"
              onClick={() => setBlocksOpen(true)}
              data-tutorial="page-blocks"
              className="flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-sky-500/40 bg-sky-950/30 px-3 text-[11px] font-semibold text-sky-300 transition hover:border-sky-400/60 hover:bg-sky-900/40"
              title="Biblioteca de blocos prontos para inserir"
            >
              <Boxes size={13} />
              Blocos
            </button>

            <Dropdown
              trigger={({ toggle, open }) => (
                <button
                  type="button"
                  onClick={toggle}
                  data-tutorial="page-insert-menu"
                  className={`flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-3 text-[11px] font-medium transition ${
                    open
                      ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-200'
                      : 'border-neutral-700/60 bg-neutral-900/50 text-neutral-300 hover:border-emerald-400/40 hover:text-emerald-200'
                  }`}
                  title="Inserir elemento na página"
                >
                  <Plus size={13} />
                  Inserir
                  <ChevronDown size={11} className={`transition ${open ? 'rotate-180' : ''}`} />
                </button>
              )}
              panelClassName="w-[280px] max-h-[420px] overflow-auto ed-scroll"
            >
              {({ close }) => (
                <>
                  {insertGroups.map((group, gi) => (
                    <div key={group.label}>
                      {gi > 0 && <MenuDivider />}
                      <MenuLabel>{group.label}</MenuLabel>
                      {group.items.map((item) => (
                        <MenuItem
                          key={item.type}
                          icon={item.icon}
                          label={item.label}
                          hint={item.hint}
                          onClick={() => {
                            addPageNode(item.type);
                            close();
                          }}
                        />
                      ))}
                    </div>
                  ))}
                </>
              )}
            </Dropdown>
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

        {activeMode === 'data' && (
          <button
            type="button"
            onClick={() => addCollection()}
            data-tutorial="data-new-collection"
            className="flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-emerald-600/40 bg-emerald-950/30 px-3 text-[11px] font-semibold text-emerald-300 transition hover:border-emerald-500/60 hover:bg-emerald-900/40"
          >
            <Database size={12} />
            Nova colecao
          </button>
        )}

        {activeMode === 'preview' && (
          <div className="inline-flex shrink-0 items-center gap-0.5 rounded-lg border border-neutral-800 bg-neutral-950/60 p-0.5">
            <button
              type="button"
              onClick={() => setActiveBreakpoint('base')}
              className={`flex h-8 items-center gap-1.5 rounded-md px-3 text-[11px] font-medium transition ${
                activeBreakpoint === 'base' ? 'bg-emerald-400/15 text-emerald-200' : 'text-neutral-500 hover:bg-neutral-800 hover:text-neutral-200'
              }`}
            >
              <Monitor size={13} />
              desktop
            </button>
            {breakpoints.filter((bp) => bp.name !== 'base').map((bp) => (
              <button
                key={bp.name}
                type="button"
                onClick={() => setActiveBreakpoint(bp.name)}
                className={`flex h-8 items-center gap-1.5 rounded-md px-3 text-[11px] font-medium transition ${
                  activeBreakpoint === bp.name ? 'bg-emerald-400/15 text-emerald-200' : 'text-neutral-500 hover:bg-neutral-800 hover:text-neutral-200'
                }`}
              >
                {bp.width <= 480 ? <Smartphone size={13} /> : bp.width <= 900 ? <Tablet size={13} /> : <Monitor size={13} />}
                {bp.name}
              </button>
            ))}
          </div>
        )}

        {activeMode === 'export' && (
          <div className="relative shrink-0">
            <select
              aria-label="Formato de exportacao"
              value={exportTarget}
              onChange={(event) => setExportTarget(event.target.value as ExportTarget)}
              className="h-8 appearance-none rounded-md border border-neutral-700/60 bg-neutral-900 px-8 text-[11px] font-medium text-neutral-300 outline-none transition hover:border-neutral-600 focus:border-emerald-500 ed-focus"
            >
              {(Object.keys(exportTargetLabel) as ExportTarget[]).map((target) => (
                <option key={target} value={target}>{exportTargetLabel[target]}</option>
              ))}
            </select>
            <Download size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          </div>
        )}
      </div>

      {/* Right: project actions */}
      <div className="flex shrink-0 items-center gap-1.5">
        {onOpenTutorial && (
          <button
            type="button"
            onClick={onOpenTutorial}
            className="grid h-8 w-8 place-items-center rounded-md border border-neutral-700/60 bg-neutral-900/60 text-neutral-400 transition hover:border-sky-400/40 hover:text-sky-200"
            title="Tutorial guiado do construtor web"
          >
            <CircleHelp size={13} />
          </button>
        )}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setHistoryOpen((open) => !open)}
            className="flex h-8 items-center gap-1.5 rounded-md border border-neutral-700/60 bg-neutral-900/60 px-2.5 text-[11px] font-medium text-neutral-400 transition hover:border-amber-400/40 hover:text-amber-200"
            title="Histórico de versões / autosave"
          >
            <History size={12} />
            Histórico
          </button>
          {historyOpen && (
            <div className="absolute right-0 top-9 z-50 w-72 rounded-lg border border-neutral-700/80 bg-neutral-950/95 p-1.5 shadow-2xl backdrop-blur">
              <button
                type="button"
                onClick={restoreAutosave}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[11px] text-neutral-300 transition hover:bg-neutral-800 hover:text-emerald-200"
              >
                <RotateCcw size={12} />
                Restaurar autosave
              </button>
              <div className="my-1 h-px bg-neutral-800/80" />
              {historyEntries.length === 0 ? (
                <div className="px-2.5 py-2 text-[11px] text-neutral-500">Sem versões salvas</div>
              ) : (
                historyEntries.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => restoreHistoryEntry(entry.id)}
                    className="flex w-full flex-col gap-0.5 rounded-md px-2.5 py-2 text-left text-[11px] text-neutral-300 transition hover:bg-neutral-800 hover:text-emerald-200"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium">{entry.name}</span>
                      <span
                        className="grid h-5 w-5 place-items-center rounded text-neutral-600 hover:bg-neutral-700 hover:text-neutral-200"
                        onClick={(e) => { e.stopPropagation(); compareWithEntry(entry.id); }}
                        title="Comparar com versão atual"
                      >
                        <GitCompare size={10} />
                      </span>
                    </div>
                    <span className="text-[10px] text-neutral-500">
                      {new Date(entry.savedAt).toLocaleString()} - {(entry.size / 1024).toFixed(1)} KB
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        <IconButton icon={<Save size={13} />} label="Salvar projeto" onClick={saveProject} />
        <IconButton icon={<FileUp size={13} />} label="Carregar projeto" onClick={() => fileInputRef.current?.click()} />
      </div>

      {galleryOpen && <TemplateGallery onClose={() => setGalleryOpen(false)} />}
      {blocksOpen && <BlockLibrary onClose={() => setBlocksOpen(false)} />}
      {diffData && (
        <PageDocumentDiff
          oldDoc={diffData.oldDoc}
          newDoc={diffData.newDoc}
          onClose={() => setDiffData(null)}
        />
      )}
    </header>
  );
}
