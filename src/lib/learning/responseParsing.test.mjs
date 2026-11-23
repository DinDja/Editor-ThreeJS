import assert from 'node:assert/strict';
import test from 'node:test';
import { parseTeacherJsonResponse } from './responseParsing.ts';

test('parses JSON surrounded by model commentary and code fences', () => {
  const parsed = parseTeacherJsonResponse(
    'Resposta:\n```json\n{"reply":"O objeto { fica no texto."}\n```\nEspero que ajude.',
  );

  assert.deepEqual(parsed, { reply: 'O objeto { fica no texto.' });
});

test('repairs common JSON formatting errors without losing nested objects', () => {
  const parsed = parseTeacherJsonResponse('{"reply":"Tudo certo", "lesson":{"steps":[{"title":"Observe",},]},}');

  assert.deepEqual(parsed, {
    reply: 'Tudo certo',
    lesson: { steps: [{ title: 'Observe' }] },
  });
});

test('rejects output that has no JSON object', () => {
  assert.throws(() => parseTeacherJsonResponse('Não consegui estruturar a resposta.'), /estruturada ausente/i);
});
