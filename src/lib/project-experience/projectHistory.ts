import {
  PROJECT_EXPERIENCE_EDITOR_VERSION,
  PROJECT_EXPERIENCE_SCHEMA_VERSION,
  parseProjectExperienceFile,
  type ProjectExperienceFile,
} from './persistence';

const AUTOSAVE_KEY = 'web3d:autosave';
const HISTORY_KEY = 'web3d:project-history';
const MAX_HISTORY_ENTRIES = 24;

export type ProjectHistoryEntry = {
  id: string;
  name: string;
  savedAt: string;
  schemaVersion: number;
  size: number;
  payload: string;
};

const isBrowser = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const safeGet = (key: string): string | null => {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSet = (key: string, value: string) => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Quota exceeded or storage disabled — ignore.
  }
};

type MigrationProject = Omit<ProjectExperienceFile, 'schemaVersion'> & { schemaVersion: number };

export const migrateProjectExperienceFile = (file: ProjectExperienceFile): ProjectExperienceFile => {
  let current = file as MigrationProject;
  while (current.schemaVersion < PROJECT_EXPERIENCE_SCHEMA_VERSION) {
    if (current.schemaVersion === 0) {
      current = {
        ...current,
        schemaVersion: 1,
        assets: current.assets ?? [],
        seo: current.seo ?? { title: current.name, description: '', lang: 'pt-BR' },
        renderer: current.renderer ?? {
          shadows: true,
          dpr: [1, 2] as [number, number],
          background: null,
          toneMapping: 'default',
        },
      };
    } else {
      break;
    }
  }
  const migrated = current as ProjectExperienceFile;
  return { ...migrated, editorVersion: migrated.editorVersion || PROJECT_EXPERIENCE_EDITOR_VERSION };
};

export const autosaveProject = (project: ProjectExperienceFile) => {
  const payload = JSON.stringify(project);
  const entry: ProjectHistoryEntry = {
    id: `autosave-${project.savedAt}`,
    name: project.name,
    savedAt: project.savedAt,
    schemaVersion: project.schemaVersion,
    size: payload.length,
    payload,
  };
  safeSet(AUTOSAVE_KEY, JSON.stringify(entry));
  appendHistoryEntry(entry);
  return entry;
};

export const loadAutosaveEntry = (): ProjectHistoryEntry | null => {
  const raw = safeGet(AUTOSAVE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ProjectHistoryEntry;
  } catch {
    return null;
  }
};

export const restoreAutosave = (): ProjectExperienceFile | null => {
  const entry = loadAutosaveEntry();
  if (!entry) return null;
  return restoreFromEntry(entry);
};

export const restoreFromEntry = (entry: ProjectHistoryEntry): ProjectExperienceFile | null => {
  try {
    const parsed = parseProjectExperienceFile(entry.payload);
    return migrateProjectExperienceFile(parsed);
  } catch {
    return null;
  }
};

const readHistory = (): ProjectHistoryEntry[] => {
  const raw = safeGet(HISTORY_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ProjectHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeHistory = (entries: ProjectHistoryEntry[]) => {
  safeSet(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY_ENTRIES)));
};

export const appendHistoryEntry = (entry: ProjectHistoryEntry) => {
  const entries = readHistory().filter((existing) => existing.id !== entry.id);
  entries.unshift(entry);
  writeHistory(entries);
};

export const listProjectHistory = (): ProjectHistoryEntry[] => readHistory();

export const getHistoryEntry = (id: string): ProjectHistoryEntry | null =>
  readHistory().find((entry) => entry.id === id) ?? null;

export const clearProjectHistory = () => {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(HISTORY_KEY);
    window.localStorage.removeItem(AUTOSAVE_KEY);
  } catch {
    // ignore
  }
};
