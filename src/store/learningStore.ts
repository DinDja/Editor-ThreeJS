import { create } from 'zustand';
import { createId } from './types';
import {
  createInitialLearningProject,
  normalizeLearningProject,
  type LearningMessage,
  type LearningProjectState,
  type LearningSession,
  type LearningSessionStatus,
  type LearningLevel,
  type TeacherActionSuggestion,
  type TeacherLessonPlan,
  type TeacherAssessment,
  type MindMapMark,
} from '@/lib/learning/types';
import type { AvailableTeacherModelId } from '@/lib/learning/models';

type StartLearningInput = {
  subjectId: string;
  subjectName: string;
  topic: string;
  level: LearningLevel;
};

type LearningState = {
  project: LearningProjectState;
  setModelId: (modelId: AvailableTeacherModelId) => void;
  startSession: (input: StartLearningInput) => LearningSession;
  addMessage: (message: Omit<LearningMessage, 'id' | 'createdAt'>) => void;
  setLesson: (lesson: TeacherLessonPlan) => void;
  addActions: (actions: TeacherActionSuggestion[]) => void;
  markStepComplete: (stepId: string) => void;
  markQuestionComplete: (questionId: string) => void;
  markActionApplied: (actionId: string) => void;
  setMindMapMark: (nodeId: string, mark: MindMapMark | null) => void;
  setMindMapNote: (nodeId: string, note: string) => void;
  setSessionStatus: (status: LearningSessionStatus) => void;
  clearCurrentSession: () => void;
  loadLearningProject: (project: unknown) => void;
};

const now = () => new Date().toISOString();

const summarizeSession = (session: LearningSession) => ({
  id: session.id,
  subjectName: session.subjectName,
  topic: session.topic,
  status: session.status,
  completedAt: now(),
});

export const useLearningStore = create<LearningState>((set, get) => ({
  project: createInitialLearningProject(),

  setModelId: (modelId) => set((state) => ({
    project: { ...state.project, modelId },
  })),

  startSession: (input) => {
    const timestamp = now();
    const current = get().project.currentSession;
    const nextSession: LearningSession = {
      id: createId(),
      subjectId: input.subjectId,
      subjectName: input.subjectName,
      topic: input.topic.trim().slice(0, 180),
      level: input.level,
      status: 'active',
      lesson: null,
      completedStepIds: [],
      completedQuestionIds: [],
      appliedActionIds: [],
      mindMapMarks: {},
      mindMapNotes: {},
      startedAt: timestamp,
      updatedAt: timestamp,
    };
    set((state) => ({
      project: {
        ...state.project,
        currentSession: nextSession,
        messages: [],
        history: current
          ? [...state.project.history, summarizeSession(current)].slice(-30)
          : state.project.history,
      },
    }));
    return nextSession;
  },

  addMessage: (message) =>
    set((state) => {
      const createdAt = now();
      const nextMessage: LearningMessage = {
        ...message,
        id: createId(),
        createdAt,
      };
      const currentSession = state.project.currentSession;
      return {
        project: {
          ...state.project,
          messages: [...state.project.messages, nextMessage].slice(-40),
          currentSession: currentSession ? { ...currentSession, updatedAt: createdAt } : null,
        },
      };
    }),

  setLesson: (lesson) =>
    set((state) => {
      if (!state.project.currentSession) return state;
      return {
        project: {
          ...state.project,
          currentSession: {
            ...state.project.currentSession,
            subjectId: lesson.subjectId,
            subjectName: lesson.subjectName,
            lesson,
            updatedAt: now(),
          },
        },
      };
    }),

  addActions: (actions) =>
    set((state) => {
      const session = state.project.currentSession;
      if (!session?.lesson || actions.length === 0) return state;
      const existingIds = new Set(session.lesson.actions.map((action) => action.id));
      const additions = actions.filter((action) => !existingIds.has(action.id));
      return {
        project: {
          ...state.project,
          currentSession: {
            ...session,
            lesson: { ...session.lesson, actions: [...session.lesson.actions, ...additions].slice(0, 4) },
            updatedAt: now(),
          },
        },
      };
    }),

  markStepComplete: (stepId) =>
    set((state) => {
      const session = state.project.currentSession;
      if (!session || session.completedStepIds.includes(stepId)) return state;
      return {
        project: {
          ...state.project,
          currentSession: {
            ...session,
            completedStepIds: [...session.completedStepIds, stepId].slice(0, 30),
            updatedAt: now(),
          },
        },
      };
    }),

  markQuestionComplete: (questionId) =>
    set((state) => {
      const session = state.project.currentSession;
      if (!session || session.completedQuestionIds.includes(questionId)) return state;
      return {
        project: {
          ...state.project,
          currentSession: {
            ...session,
            completedQuestionIds: [...session.completedQuestionIds, questionId].slice(0, 20),
            updatedAt: now(),
          },
        },
      };
    }),

  markActionApplied: (actionId) =>
    set((state) => {
      const session = state.project.currentSession;
      if (!session || session.appliedActionIds.includes(actionId)) return state;
      return {
        project: {
          ...state.project,
          currentSession: {
            ...session,
            appliedActionIds: [...session.appliedActionIds, actionId].slice(0, 8),
            updatedAt: now(),
          },
        },
      };
    }),

  setMindMapMark: (nodeId, mark) =>
    set((state) => {
      const session = state.project.currentSession;
      const id = nodeId.trim().slice(0, 80);
      if (!session || !id) return state;
      const marks = { ...session.mindMapMarks };
      if (mark) marks[id] = mark;
      else delete marks[id];
      return {
        project: {
          ...state.project,
          currentSession: {
            ...session,
            mindMapMarks: Object.fromEntries(Object.entries(marks).slice(-64)),
            updatedAt: now(),
          },
        },
      };
    }),

  setMindMapNote: (nodeId, note) =>
    set((state) => {
      const session = state.project.currentSession;
      const id = nodeId.trim().slice(0, 80);
      if (!session || !id) return state;
      const notes = { ...session.mindMapNotes };
      const trimmed = note.trim().slice(0, 360);
      if (trimmed) notes[id] = trimmed;
      else delete notes[id];
      return {
        project: {
          ...state.project,
          currentSession: {
            ...session,
            mindMapNotes: Object.fromEntries(Object.entries(notes).slice(-64)),
            updatedAt: now(),
          },
        },
      };
    }),

  setSessionStatus: (status) =>
    set((state) => {
      const session = state.project.currentSession;
      if (!session) return state;
      const updated = { ...session, status, updatedAt: now() };
      return {
        project: {
          ...state.project,
          currentSession: updated,
          history: status === 'completed'
            ? [...state.project.history, summarizeSession(updated)].slice(-30)
            : state.project.history,
        },
      };
    }),

  clearCurrentSession: () =>
    set((state) => ({
      project: { ...state.project, currentSession: null, messages: [] },
    })),

  loadLearningProject: (project) => set({ project: normalizeLearningProject(project) }),
}));

export const getLearningAssessment = (message: LearningMessage): TeacherAssessment | undefined => message.assessment;
