import { jsonrepair } from 'jsonrepair';

const extractJson = (content: string) => {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? content.trim();
  const first = candidate.indexOf('{');
  if (first < 0) throw new Error('Resposta estruturada ausente.');

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = first; index < candidate.length; index += 1) {
    const character = candidate[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') inString = true;
    else if (character === '{') depth += 1;
    else if (character === '}') {
      depth -= 1;
      if (depth === 0) return candidate.slice(first, index + 1);
    }
  }

  return candidate.slice(first);
};

export const parseTeacherJsonResponse = (content: string): unknown =>
  JSON.parse(jsonrepair(extractJson(content))) as unknown;
