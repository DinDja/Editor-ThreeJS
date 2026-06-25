import type { ExportTarget, ProjectExperience } from '@/lib/page-builder/types';

export type ExportFile = {
  path: string;
  content: string;
  language: 'tsx' | 'ts' | 'json' | 'html' | 'css' | 'js' | 'prisma';
};

export type ExportBundle = {
  target: ExportTarget;
  files: ExportFile[];
};

export type ExportSnapshot = ProjectExperience;
