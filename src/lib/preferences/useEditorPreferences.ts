'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  defaultEditorPreferences,
  loadEditorPreferences,
  saveEditorPreferences,
  type EditorPreferences,
  type PageBuilderViewport,
} from './editorPreferences';

const deepEqual = (a: EditorPreferences, b: EditorPreferences) =>
  a.pageBuilderViewport === b.pageBuilderViewport &&
  a.activeBreakpoint === b.activeBreakpoint &&
  a.hasSeenTour === b.hasSeenTour;

export type UseEditorPreferencesResult = {
  preferences: EditorPreferences;
  setViewport: (viewport: PageBuilderViewport) => void;
  setActiveBreakpoint: (breakpoint: string) => void;
  markTourSeen: () => void;
};

export function useEditorPreferences(): UseEditorPreferencesResult {
  const [preferences, setPreferences] = useState<EditorPreferences>(defaultEditorPreferences);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    setPreferences(loadEditorPreferences());
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    const previous = loadEditorPreferences();
    if (deepEqual(previous, preferences)) return;
    saveEditorPreferences(preferences);
  }, [preferences]);

  const setViewport = useCallback((viewport: PageBuilderViewport) => {
    setPreferences((current) => (current.pageBuilderViewport === viewport ? current : { ...current, pageBuilderViewport: viewport }));
  }, []);

  const setActiveBreakpoint = useCallback((breakpoint: string) => {
    setPreferences((current) => (current.activeBreakpoint === breakpoint ? current : { ...current, activeBreakpoint: breakpoint }));
  }, []);

  const markTourSeen = useCallback(() => {
    setPreferences((current) => (current.hasSeenTour ? current : { ...current, hasSeenTour: true }));
  }, []);

  return { preferences, setViewport, setActiveBreakpoint, markTourSeen };
}
