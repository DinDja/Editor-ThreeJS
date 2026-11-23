import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeAiText } from './richText.ts';
import { isAvailableTeacherModelId } from './models.ts';
import { normalizeLearningProject, normalizeTeacherResponse } from './types.ts';

test('teacher model availability excludes Google models from the active pool', () => {
  assert.equal(isAvailableTeacherModelId('gemini/gemini-2.5-flash'), false);
  assert.equal(isAvailableTeacherModelId('glm-4.7-flash'), true);
});

test('rich text restores JSON-corrupted LaTeX commands and delimiters', () => {
  const broken = 'Calcule $2\times 2$ e use $\frac{1}{2}$. Compare $a \neq b$. Veja também \\(x^2\\) e \\[x+y\\].';
  const normalized = normalizeAiText(broken);

  assert.match(normalized, /\$2\\times 2\$/);
  assert.match(normalized, /\$\\frac\{1\}\{2\}\$/);
  assert.match(normalized, /\$a \\neq b\$/);
  assert.match(normalized, /\$x\^2\$/);
  assert.match(normalized, /\$\$x\+y\$\$/);
});

test('teacher response keeps only registered editor actions', () => {
  const response = normalizeTeacherResponse({
    reply: 'Vamos investigar as formas.',
    lesson: {
      title: 'Sólidos',
      subjectId: 'mathematics',
      subjectName: 'Matemática',
      topic: 'Geometria espacial',
      level: 'beginner',
      explanation: 'Um sólido geométrico ocupa espaço e possui três dimensões. O cubo tem faces quadradas, enquanto a esfera apresenta uma superfície curva. Comparar essas propriedades permite classificar os objetos pela forma e compreender como as dimensões se relacionam.',
      steps: [{ id: 'step-1', title: 'Observe', content: 'Compare os objetos.', kind: 'explanation' }],
      actions: [
        { id: 'unsafe', type: 'run_script', label: 'Executar código', description: 'Código arbitrário.' },
        { id: 'geometry', type: 'geometry_demo', label: 'Ver sólidos', description: 'Criar sólidos conhecidos.' },
      ],
    },
  });

  assert.equal(response.lesson?.actions.length, 1);
  assert.equal(response.lesson?.actions[0].type, 'geometry_demo');
  assert.match(response.lesson?.explanation ?? '', /três dimensões/);
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

test('teacher response keeps model and failover telemetry', () => {
  const response = normalizeTeacherResponse({
    reply: 'A resposta veio de uma alternativa segura.',
    modelInfo: {
      requestedModelId: 'nvidia/primary',
      requestedModelName: 'Modelo escolhido',
      respondedModelId: 'glm-4.7-flash',
      respondedModelName: 'GLM-4.7-Flash',
      didFailover: true,
      failedAttempts: [{
        modelId: 'nvidia/primary',
        modelName: 'Modelo escolhido',
        provider: 'nvidia',
        reasonCode: 'provider_timeout',
      }],
    },
  });

  assert.equal(response.modelInfo?.respondedModelName, 'GLM-4.7-Flash');
  assert.equal(response.modelInfo?.didFailover, true);
  assert.equal(response.modelInfo?.failedAttempts[0].reasonCode, 'provider_timeout');
});

test('teacher lesson keeps safe researched resources for the lesson cards', () => {
  const response = normalizeTeacherResponse({
    reply: 'Encontrei materiais para continuar estudando.',
    research: {
      query: 'Física: Gravidade',
      providers: ['YouTube', 'Wikipedia'],
      resources: [
        { id: 'video-1', provider: 'YouTube', kind: 'video', title: 'Aula sobre gravidade', description: 'Uma explicação visual.', url: 'https://www.youtube.com/watch?v=abc123' },
        { id: 'unsafe', provider: 'Web', kind: 'reference', title: 'Script', description: 'não deve passar', url: 'javascript:alert(1)' },
      ],
    },
    lesson: {
      explanation: 'A gravidade é uma interação fundamental que influencia o movimento dos corpos e pode ser observada em situações cotidianas e experimentos didáticos.\n\nEla será explorada com exemplos e perguntas ao longo da aula para conectar o conceito à cena 3D.',
      steps: [{ id: 'step-1', title: 'Observe', content: 'Compare os movimentos.', kind: 'explanation' }],
      resources: [{ id: 'video-1', provider: 'YouTube', kind: 'video', title: 'Aula sobre gravidade', description: 'Uma explicação visual.', url: 'https://www.youtube.com/watch?v=abc123' }],
    },
  });

  assert.equal(response.research?.resources.length, 1);
  assert.equal(response.lesson?.resources?.[0].provider, 'YouTube');
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
      {
        id: 'good',
        role: 'teacher',
        content: 'A massa não alterou a aceleração.',
        createdAt: '2026-01-01T00:01:00.000Z',
        modelInfo: {
          requestedModelId: 'nvidia/primary',
          requestedModelName: 'Escolhido',
          respondedModelId: 'zai/fallback',
          respondedModelName: 'Fallback',
          didFailover: true,
          failedAttempts: [{ modelId: 'nvidia/primary', modelName: 'Escolhido', provider: 'nvidia', reasonCode: 'provider_timeout' }],
        },
      },
      { id: 'invalid', role: 'system', content: 'não aceito', createdAt: '2026-01-01T00:02:00.000Z' },
    ],
    history: [],
  });

  assert.equal(migrated.currentSession?.status, 'paused');
  assert.deepEqual(migrated.currentSession?.completedQuestionIds, ['question-1']);
  assert.deepEqual(migrated.currentSession?.appliedActionIds, ['gravity']);
  assert.equal(migrated.messages.length, 1);
  assert.equal(migrated.messages[0].modelInfo?.respondedModelName, 'Fallback');
});
