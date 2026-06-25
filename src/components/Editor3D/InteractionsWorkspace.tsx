'use client';

import { ArrowRight, MousePointer2, Plus, Trash2 } from 'lucide-react';
import { INTERACTION_ACTION_LABELS, INTERACTION_TRIGGER_LABELS } from '@/lib/interaction-engine/types';
import { flattenPageNodes } from '@/lib/page-builder/tree';
import { useExperienceStore } from '@/store/experienceStore';
import { useSceneStore } from '@/store/sceneStore';

export default function InteractionsWorkspace() {
  const page = useExperienceStore((state) => state.page);
  const interactions = useExperienceStore((state) => state.interactions);
  const selectedInteractionId = useExperienceStore((state) => state.selectedInteractionId);
  const setSelectedInteraction = useExperienceStore((state) => state.setSelectedInteraction);
  const addInteraction = useExperienceStore((state) => state.addInteraction);
  const removeInteraction = useExperienceStore((state) => state.removeInteraction);
  const objects = useSceneStore((state) => state.objects);
  const pageNodes = flattenPageNodes(page);

  const getName = (id: string) =>
    pageNodes.find((item) => item.node.id === id)?.node.name ??
    objects.find((object) => object.uuid === id)?.name ??
    (id === 'current-scene' ? 'Scene atual' : id);

  return (
    <div className="h-full overflow-auto bg-[#0d0f10] p-5">
      <div className="mx-auto grid max-w-5xl gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
            <MousePointer2 size={14} className="text-emerald-300" />
            Interaction Engine
          </div>
          <button
            type="button"
            onClick={() => addInteraction()}
            className="flex h-8 items-center gap-1.5 rounded-md border border-emerald-400/30 bg-emerald-400/10 px-3 text-xs text-emerald-200 transition hover:border-emerald-300/60"
          >
            <Plus size={13} />
            Nova
          </button>
        </div>

        {interactions.length === 0 ? (
          <div className="grid min-h-[320px] place-items-center rounded-md border border-neutral-800 bg-neutral-950/35 text-sm text-neutral-500">
            Sem Interações. Clique em Nova para criar uma.
          </div>
        ) : (
          <div className="grid gap-2">
            {interactions.map((interaction) => {
              const selected = selectedInteractionId === interaction.id;
              return (
                <button
                  key={interaction.id}
                  type="button"
                  onClick={() => setSelectedInteraction(interaction.id)}
                  className={`grid gap-3 rounded-md border p-3 text-left transition ${
                    selected
                      ? 'border-emerald-400/40 bg-emerald-400/8'
                      : 'border-neutral-800 bg-neutral-950/35 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-neutral-100">{interaction.name}</div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-neutral-600">
                        {interaction.enabled ? 'enabled' : 'disabled'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        removeInteraction(interaction.id);
                      }}
                      className="grid h-8 w-8 place-items-center rounded text-neutral-600 transition hover:bg-red-500/15 hover:text-red-200"
                      title="Remover"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 text-xs">
                    <div className="rounded-md border border-neutral-800 bg-[#111315] p-2">
                      <span className="block text-[10px] uppercase tracking-[0.14em] text-neutral-600">Trigger</span>
                      <span className="text-neutral-200">{INTERACTION_TRIGGER_LABELS[interaction.trigger]}</span>
                    </div>
                    <ArrowRight size={14} className="text-neutral-600" />
                    <div className="rounded-md border border-neutral-800 bg-[#111315] p-2">
                      <span className="block text-[10px] uppercase tracking-[0.14em] text-neutral-600">Action</span>
                      <span className="text-neutral-200">{INTERACTION_ACTION_LABELS[interaction.action]}</span>
                    </div>
                    <ArrowRight size={14} className="text-neutral-600" />
                    <div className="rounded-md border border-neutral-800 bg-[#111315] p-2">
                      <span className="block text-[10px] uppercase tracking-[0.14em] text-neutral-600">Target</span>
                      <span className="text-neutral-200">{getName(interaction.targetId)}</span>
                    </div>
                  </div>
                  <div className="truncate text-xs text-neutral-500">{getName(interaction.sourceId)}</div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
