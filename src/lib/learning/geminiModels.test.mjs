import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeGeminiModels } from './geminiModels.ts';

test('exposes Gemini API models that support generateContent and deduplicates aliases', () => {
  const models = normalizeGeminiModels({
    models: [
      {
        name: 'models/gemini-flash-001',
        baseModelId: 'gemini-flash',
        displayName: 'Gemini Flash',
        supportedGenerationMethods: ['generateContent'],
      },
      {
        name: 'models/gemini-flash-latest',
        baseModelId: 'gemini-flash',
        displayName: 'Gemini Flash Latest',
        supportedGenerationMethods: ['generateContent'],
      },
      {
        name: 'models/text-embedding',
        baseModelId: 'text-embedding',
        supportedGenerationMethods: ['embedContent'],
      },
    ],
  });

  assert.equal(models.length, 1);
  assert.equal(models[0].id, 'gemini/gemini-flash');
  assert.equal(models[0].provider, 'gemini');
  assert.equal(models[0].name, 'Gemini Flash');
});

test('ignores malformed Gemini model resources', () => {
  assert.deepEqual(normalizeGeminiModels({ models: [{ baseModelId: '../private', supportedGenerationMethods: ['generateContent'] }] }), []);
});
