'use client';

import { useMemo, useState } from 'react';
import { Download, FileCode, FileArchive } from 'lucide-react';
import {
  createExperienceSnapshot,
  downloadExportManifest,
  downloadExportZip,
  downloadSingleExportFile,
  exportTargetLabel,
  generateExportBundle,
  getExportAssets,
} from '@/lib/export-engine/exportExperience';
import { createSceneDocument } from '@/lib/scene-engine/sceneDocument';
import { useDataModelStore } from '@/store/dataModelStore';
import { useExperienceStore } from '@/store/experienceStore';
import { useMaterialStore } from '@/store/materialStore';
import { useSceneStore } from '@/store/sceneStore';
import { useTimelineStore } from '@/store/timelineStore';
import { useVariableStore } from '@/store/variableStore';
import CodeHighlighter from './CodeHighlighter';

export default function ExportWorkspace() {
  const page = useExperienceStore((state) => state.page);
  const pages = useExperienceStore((state) => state.pages);
  const activePageId = useExperienceStore((state) => state.activePageId);
  const interactions = useExperienceStore((state) => state.interactions);
  const settings = useExperienceStore((state) => state.settings);
  const exportTarget = useExperienceStore((state) => state.exportTarget);
  const objects = useSceneStore((state) => state.objects);
  const layers = useSceneStore((state) => state.layers);
  const referenceImages = useSceneStore((state) => state.referenceImages);
  const materials = useMaterialStore((state) => state.materials);
  const keyframes = useTimelineStore((state) => state.keyframes);
  const dataSchema = useDataModelStore((state) => state.schema);
  const variables = useVariableStore((state) => state.document);

  const snapshot = useMemo(() => {
    const scene = createSceneDocument({ objects, materials, keyframes, layers, referenceImages });
    return createExperienceSnapshot({ page, pages, activePageId, scene, interactions, settings: { ...settings, exportTarget }, dataSchema, variables });
  }, [activePageId, dataSchema, exportTarget, interactions, keyframes, layers, materials, objects, page, pages, referenceImages, settings, variables]);

  const bundle = useMemo(() => generateExportBundle(snapshot, exportTarget), [exportTarget, snapshot]);
  const assets = useMemo(() => getExportAssets(snapshot), [snapshot]);

  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [zipping, setZipping] = useState(false);
  const selectedFile = bundle.files.find((file) => file.path === selectedPath) ?? bundle.files[0];

  const handleDownloadZip = async () => {
    setZipping(true);
    try {
      await downloadExportZip(bundle, assets);
    } finally {
      setZipping(false);
    }
  };

  return (
    <div className="grid h-full grid-cols-[300px_minmax(0,1fr)] overflow-hidden bg-[#0d0f10] max-lg:grid-cols-1">
      <aside className="min-h-0 overflow-auto border-r border-neutral-800 bg-[#151719] p-3">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
            {exportTargetLabel[exportTarget]}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleDownloadZip}
              disabled={zipping}
              className="grid h-8 w-8 place-items-center rounded-md border border-amber-400/30 bg-amber-400/10 text-amber-200 transition hover:border-amber-300/60 disabled:opacity-50"
              title={zipping ? 'Empacotando ZIP...' : 'Baixar ZIP com assets'}
            >
              <FileArchive size={14} />
            </button>
            <button
              type="button"
              onClick={() => downloadExportManifest(bundle)}
              className="grid h-8 w-8 place-items-center rounded-md border border-emerald-400/30 bg-emerald-400/10 text-emerald-200 transition hover:border-emerald-300/60"
              title="Baixar manifesto"
            >
              <Download size={14} />
            </button>
          </div>
        </div>
        <div className="mb-2 rounded-md border border-neutral-800 bg-neutral-950 px-2.5 py-1.5 text-[10px] text-neutral-500">
          {assets.length} asset(s) referenciado(s) - {assets.filter((a) => a.kind === 'model').length} modelo(s), {assets.filter((a) => a.kind === 'texture').length} textura(s)
        </div>
        <div className="grid gap-1">
          {bundle.files.map((file) => (
            <button
              key={file.path}
              type="button"
              onClick={() => setSelectedPath(file.path)}
              className={`flex min-w-0 items-center gap-2 rounded-md px-2 py-2 text-left text-xs transition ${
                selectedFile.path === file.path
                  ? 'bg-emerald-400/10 text-emerald-100'
                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100'
              }`}
            >
              <FileCode size={13} className="shrink-0" />
              <span className="min-w-0 flex-1 truncate">{file.path}</span>
            </button>
          ))}
        </div>
      </aside>

      <section className="flex min-h-0 flex-col overflow-hidden">
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-neutral-800 bg-[#151719] px-4">
          <div className="min-w-0 truncate text-sm font-medium text-neutral-200">{selectedFile.path}</div>
          <button
            type="button"
            onClick={() => downloadSingleExportFile(selectedFile)}
            className="flex h-8 items-center gap-1.5 rounded-md border border-neutral-700/60 px-3 text-xs text-neutral-300 transition hover:border-emerald-400/50 hover:text-emerald-200"
          >
            <Download size={13} />
            Baixar
          </button>
        </div>
        <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap bg-[#0f1113] p-4 text-xs leading-6">
          <CodeHighlighter code={selectedFile.content} language={selectedFile.language} />
        </pre>
      </section>
    </div>
  );
}
