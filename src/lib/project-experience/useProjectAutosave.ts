'use client';

import { useEffect, useRef } from 'react';
import { createProjectExperienceFile } from '@/lib/project-experience/persistence';
import { autosaveProject } from '@/lib/project-experience/projectHistory';
import { createSceneDocument } from '@/lib/scene-engine/sceneDocument';
import { useDataModelStore } from '@/store/dataModelStore';
import { useExperienceStore } from '@/store/experienceStore';
import { useMaterialStore } from '@/store/materialStore';
import { useSceneStore } from '@/store/sceneStore';
import { useTimelineStore } from '@/store/timelineStore';
import { useVariableStore } from '@/store/variableStore';

const AUTOSAVE_DEBOUNCE_MS = 4000;

export function useProjectAutosave() {
  const timerRef = useRef<number | null>(null);
  const lastSerializedRef = useRef<string>('');

  useEffect(() => {
    const performAutosave = () => {
      const scene = createSceneDocument({
        objects: useSceneStore.getState().objects,
        materials: useMaterialStore.getState().materials,
        keyframes: useTimelineStore.getState().keyframes,
        layers: useSceneStore.getState().layers,
        referenceImages: useSceneStore.getState().referenceImages,
      });
      const experience = useExperienceStore.getState();
      const project = createProjectExperienceFile({
        page: experience.page,
        pages: experience.pages,
        activePageId: experience.activePageId,
        scene,
        interactions: experience.interactions,
        settings: experience.settings,
        components: experience.components,
        dataSchema: useDataModelStore.getState().schema,
        variables: useVariableStore.getState().document,
      });
      const serialized = JSON.stringify(project);
      if (serialized === lastSerializedRef.current) return;
      lastSerializedRef.current = serialized;
      autosaveProject(project);
    };

    const schedule = () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(performAutosave, AUTOSAVE_DEBOUNCE_MS);
    };

    const unsubscribers = [
      useSceneStore.subscribe(schedule),
      useMaterialStore.subscribe(schedule),
      useTimelineStore.subscribe(schedule),
      useExperienceStore.subscribe(schedule),
      useDataModelStore.subscribe(schedule),
      useVariableStore.subscribe(schedule),
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);
}
