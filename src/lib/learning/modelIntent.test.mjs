import assert from 'node:assert/strict';
import test from 'node:test';
import { isExplicit3DModelRequest } from './modelIntent.ts';

test('modeling intent recognizes direct requests without capturing ordinary learning questions', () => {
  assert.equal(isExplicit3DModelRequest('faça o modelo'), true);
  assert.equal(isExplicit3DModelRequest('Crie um modelo 3D de uma célula animal'), true);
  assert.equal(isExplicit3DModelRequest('Quero criar uma cena 3D de uma célula'), true);
  assert.equal(isExplicit3DModelRequest('Quero uma maquete tridimensional do sistema solar'), true);
  assert.equal(isExplicit3DModelRequest('Explique o modelo atômico de Dalton'), false);
  assert.equal(isExplicit3DModelRequest('Como funciona uma célula animal?'), false);
});
