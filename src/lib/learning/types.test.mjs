import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeLearningProject, normalizeTeacherResponse } from './types.ts';

test('teacher response keeps only registered editor actions', () => {
  const response = normalizeTeacherResponse({
    reply: 'Vamos investigar as formas.',
    lesson: {
      title: 'Sólidos',
      subjectId: 'mathematics',
      subjectName: 'Matemática',
      topic: 'Geometria espacial',
      level: 'beginner',
      steps: [{ id: 'step-1', title: 'Observe', content: 'Compare os objetos.', kind: 'explanation' }],
      actions: [
        { id: 'unsafe', type: 'run_script', label: 'Executar código', description: 'Código arbitrário.' },
        { id: 'geometry', type: 'geometry_demo', label: 'Ver sólidos', description: 'Criar sólidos conhecidos.' },
      ],
    },
  });

  assert.equal(response.lesson?.actions.length, 1);
  assert.equal(response.lesson?.actions[0].type, 'geometry_demo');
});

test('teacher response limits lesson content and rejects empty replies', () => {
  const response = normalizeTeacherResponse({
    reply: 'Sua aula está pronta.',
    lesson: {
      steps: Array.from({ length: 12 }, (_, index) => ({ id: `step-${index}`, title: `Etapa ${index}`, content: 'Observe e descreva.' })),
      questions: Array.from({ length: 8 }, (_, index) => ({ id: `question-${index}`, prompt: `Pergunta ${index}` })),
    },
  });

  assert.equal(response.lesson?.steps.length, 8);
  assert.equal(response.lesson?.questions.length, 6);
  assert.throws(() => normalizeTeacherResponse({ reply: '   ' }), /resposta vazia/i);
});

test('learning project migration keeps valid progress and filters invalid messages', () => {
  const migrated = normalizeLearningProject({
    currentSession: {
      id: 'session-1',
      subjectId: 'physics',
      subjectName: 'Física',
      topic: 'Gravidade',
      level: 'intermediate',
      status: 'paused',
      completedStepIds: ['step-1'],
      completedQuestionIds: ['question-1'],
      appliedActionIds: ['gravity'],
      startedAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:10:00.000Z',
    },
    messages: [
      { id: 'good', role: 'student', content: 'A massa não alterou a aceleração.', createdAt: '2026-01-01T00:01:00.000Z' },
      { id: 'invalid', role: 'system', content: 'não aceito', createdAt: '2026-01-01T00:02:00.000Z' },
    ],
    history: [],
  });

  assert.equal(migrated.currentSession?.status, 'paused');
  assert.deepEqual(migrated.currentSession?.completedQuestionIds, ['question-1']);
  assert.deepEqual(migrated.currentSession?.appliedActionIds, ['gravity']);
  assert.equal(migrated.messages.length, 1);
});
