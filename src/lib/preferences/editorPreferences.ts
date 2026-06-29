export type PageBuilderViewport = 'fluid' | 'desktop' | 'tablet' | 'mobile';

export type EditorPreferences = {
  pageBuilderViewport: PageBuilderViewport;
  activeBreakpoint: string;
  hasSeenTour: boolean;
};

const STORAGE_KEY = 'web3d:editor-prefs';

const isBrowser = () =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const safeGet = (): Partial<EditorPreferences> => {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<EditorPreferences>;
  } catch {
    return {};
  }
};

const safeSet = (prefs: EditorPreferences) => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Quota exceeded or storage disabled - ignore.
  }
};

export const defaultEditorPreferences: EditorPreferences = {
  pageBuilderViewport: 'fluid',
  activeBreakpoint: 'base',
  hasSeenTour: false,
};

export const loadEditorPreferences = (): EditorPreferences => ({
  ...defaultEditorPreferences,
  ...safeGet(),
});

export const saveEditorPreferences = (prefs: EditorPreferences) => {
  safeSet(prefs);
};

export const EDITOR_PREFERENCES_STORAGE_KEY = STORAGE_KEY;
