'use client';

import { useCallback, useEffect, useState } from 'react';
import { Box, Download, ImagePlus, Loader2, Search, X } from 'lucide-react';
import { useEditorStore } from '@/store/editorStore';
import { useHistoryStore } from '@/store/historyStore';
import { useMaterialStore } from '@/store/materialStore';
import { useSceneStore } from '@/store/sceneStore';
import { buildSceneObjectsFromGltf } from '@/lib/gltfImport';

type PolyHavenAsset = {
  id: string;
  name: string;
  categories: string[];
  tags: string[];
  polycount: number | null;
  dimensions: number[] | null;
  description: string;
  downloadCount: number;
  thumbnailUrl: string | null;
  assetType: 'models' | 'textures';
};

type PolyHavenResponse = {
  assets: PolyHavenAsset[];
  categories: string[];
  error?: string;
};

type AssetBrowserModalProps = {
  open: boolean;
  onClose: () => void;
};

type AssetLibrary = 'models' | 'textures';

type TextureMapsResponse = {
  maps?: {
    diffuse: string | null;
    normal: string | null;
    roughness: string | null;
    displacement: string | null;
  };
  error?: string;
};

const numberFormatter = new Intl.NumberFormat('pt-BR');

const formatPolycount = (polycount: number | null) => {
  if (!polycount) return 'sem contagem';
  return `${numberFormatter.format(polycount)} tris`;
};

const formatDimensions = (dimensions: number[] | null) => {
  if (!dimensions?.length) return 'sem dimensoes';
  return dimensions.map((value) => numberFormatter.format(Math.round(value))).join(' x ');
};

export default function AssetBrowserModal({ open, onClose }: AssetBrowserModalProps) {
  const [library, setLibrary] = useState<AssetLibrary>('models');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [assets, setAssets] = useState<PolyHavenAsset[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);
  const objects = useSceneStore((state) => state.objects);
  const addObject = useSceneStore((state) => state.addObject);
  const addObjects = useSceneStore((state) => state.addObjects);
  const createMaterialForObject = useMaterialStore((state) => state.createMaterialForObject);
  const materials = useMaterialStore((state) => state.materials);
  const updateMaterial = useMaterialStore((state) => state.updateMaterial);
  const selectedObjectId = useEditorStore((state) => state.selectedObjectId);
  const setSelectedObject = useEditorStore((state) => state.setSelectedObject);
  const setActiveTool = useEditorStore((state) => state.setActiveTool);
  const pushSnapshot = useHistoryStore((state) => state.pushSnapshot);
  const selectedObject = objects.find((object) => object.uuid === selectedObjectId);
  const selectedMaterial = selectedObject && !selectedObject.effect ? materials[selectedObject.materialId] : null;

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ limit: '48', type: library });
        const trimmedQuery = query.trim();
        if (trimmedQuery) params.set('q', trimmedQuery);
        if (category) params.set('category', category);

        const response = await fetch(`/api/assets/polyhaven?${params.toString()}`, {
          signal: controller.signal,
        });
        const payload = (await response.json()) as PolyHavenResponse;

        if (!response.ok) {
          throw new Error(payload.error ?? 'Falha ao carregar a biblioteca Poly Haven.');
        }

        setAssets(payload.assets ?? []);
        setCategories(payload.categories ?? []);
      } catch (fetchError) {
        if (controller.signal.aborted) return;
        const message = fetchError instanceof Error ? fetchError.message : 'Falha ao carregar a biblioteca Poly Haven.';
        setError(message);
        setAssets([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 180);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [category, library, open, query]);

  const handleUseAsset = useCallback(
    async (asset: PolyHavenAsset) => {
      if (importingId) return;

      setImportingId(asset.id);

      try {
        if (library === 'textures') {
          if (!selectedMaterial) {
            throw new Error('Selecione um objeto para aplicar a textura.');
          }

          const response = await fetch(`/api/assets/polyhaven/${encodeURIComponent(asset.id)}/texture?resolution=1k`);
          const payload = (await response.json()) as TextureMapsResponse;
          if (!response.ok || !payload.maps?.diffuse) {
            throw new Error(payload.error ?? 'Falha ao carregar textura Poly Haven.');
          }

          pushSnapshot();
          updateMaterial(selectedMaterial.uuid, {
            color: '#ffffff',
            metalness: 0,
            roughness: payload.maps.roughness ? 1 : selectedMaterial.roughness,
            textureUrl: payload.maps.diffuse,
            textureName: asset.name,
            normalMapUrl: payload.maps.normal,
            roughnessMapUrl: payload.maps.roughness,
            displacementMapUrl: payload.maps.displacement,
          });
          onClose();
          return;
        }

        pushSnapshot();
        const source = `/api/assets/polyhaven/${encodeURIComponent(asset.id)}/gltf?resolution=1k&delivery=direct`;

        try {
          const imported = await buildSceneObjectsFromGltf({ source, name: asset.name, sourceType: 'public' });
          addObjects(imported.objects);
          imported.materials.forEach((draft) => {
            const created = createMaterialForObject(draft.objectId, draft.materialId, draft.name);
            updateMaterial(created.uuid, draft.patch);
          });
          setSelectedObject(imported.rootId);
        } catch (error) {
          console.warn('Falha ao preservar hierarquia Poly Haven, usando importacao legada:', error);
          const object = addObject({
            name: asset.name,
            kind: 'model',
            source,
            sourceType: 'public',
            position: [0, 0, 0],
          });
          createMaterialForObject(object.uuid, object.materialId, `Material ${asset.name}`);
          setSelectedObject(object.uuid);
        }

        setActiveTool('translate');
        onClose();
      } catch (assetError) {
        const message = assetError instanceof Error ? assetError.message : 'Falha ao usar asset Poly Haven.';
        setError(message);
      } finally {
        setImportingId(null);
      }
    },
    [
      addObject,
      addObjects,
      createMaterialForObject,
      importingId,
      library,
      onClose,
      pushSnapshot,
      selectedMaterial,
      setActiveTool,
      setSelectedObject,
      updateMaterial,
    ],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-neutral-800/80 bg-[#17191b] text-neutral-100 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-wrap items-center gap-3 border-b border-neutral-800 px-4 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Box size={17} className="shrink-0 text-emerald-300" />
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-neutral-100">Assets Poly Haven</h2>
              <p className="truncate text-[11px] uppercase tracking-[0.12em] text-neutral-500">
                {library === 'models' ? 'Modelos 3D CC0' : 'Texturas PBR CC0'}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 overflow-hidden rounded-md border border-neutral-700/80 bg-[#111315] p-0.5">
            {(['models', 'textures'] as AssetLibrary[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setLibrary(item);
                  setCategory('');
                }}
                className={`h-9 rounded px-3 text-xs font-medium transition ${
                  library === item ? 'bg-emerald-400 text-neutral-950' : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100'
                }`}
              >
                {item === 'models' ? 'Modelos' : 'Texturas'}
              </button>
            ))}
          </div>

          <div className="flex min-w-0 flex-1 items-center gap-2 max-md:w-full max-md:flex-none">
            <label className="relative min-w-[180px] flex-1">
              <span className="sr-only">Buscar assets</span>
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={library === 'models' ? 'Buscar modelos' : 'Buscar texturas'}
                className="h-10 w-full rounded-md border border-neutral-700/80 bg-[#111315] pl-9 pr-3 text-xs text-neutral-200 outline-none transition focus:border-emerald-400"
              />
            </label>

            <select
              aria-label="Categoria"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="h-10 min-w-[150px] rounded-md border border-neutral-700/80 bg-[#111315] px-3 text-xs text-neutral-200 outline-none transition focus:border-emerald-400"
            >
              <option value="">Todas</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            aria-label="Fechar biblioteca"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-neutral-500 transition hover:bg-neutral-800 hover:text-neutral-200"
          >
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-4 rounded-md border border-red-900/80 bg-red-950/25 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          )}

          {loading && assets.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-xs uppercase tracking-[0.16em] text-neutral-500">
              <Loader2 size={16} className="mr-2 animate-spin" />
              Carregando assets
            </div>
          ) : assets.length === 0 ? (
            <div className="flex h-64 items-center justify-center rounded-md border border-dashed border-neutral-800 text-sm text-neutral-500">
              Nenhum modelo encontrado
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3">
              {assets.map((asset) => (
                <article key={asset.id} className="overflow-hidden rounded-md border border-neutral-800 bg-[#111315]">
                  <div className="aspect-square bg-neutral-950">
                    {asset.thumbnailUrl ? (
                      <div
                        role="img"
                        aria-label={asset.name}
                        className="h-full w-full bg-cover bg-center"
                        style={{ backgroundImage: `url(${asset.thumbnailUrl})` }}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-neutral-700">
                        <Box size={28} />
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 p-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-medium text-neutral-100" title={asset.name}>
                        {asset.name}
                      </h3>
                      <p className="mt-1 truncate text-[11px] uppercase tracking-[0.12em] text-neutral-500">
                        {asset.categories.slice(0, 2).join(' / ') || 'modelo'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[11px] text-neutral-400">
                      <span>{library === 'models' ? formatPolycount(asset.polycount) : formatDimensions(asset.dimensions)}</span>
                      <span className="rounded border border-emerald-400/40 px-1.5 py-0.5 text-emerald-200">CC0</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleUseAsset(asset)}
                      disabled={importingId !== null || (library === 'textures' && !selectedMaterial)}
                      className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-neutral-700/80 bg-neutral-900 px-3 text-xs font-medium text-neutral-200 transition hover:border-emerald-400/70 hover:text-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {importingId === asset.id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : library === 'models' ? (
                        <Download size={13} />
                      ) : (
                        <ImagePlus size={13} />
                      )}
                      <span>
                        {importingId === asset.id
                          ? library === 'models'
                            ? 'Importando'
                            : 'Aplicando'
                          : library === 'models'
                            ? 'Importar'
                            : selectedMaterial
                              ? 'Aplicar'
                              : 'Selecionar objeto'}
                      </span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
