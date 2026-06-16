import { NextRequest, NextResponse } from 'next/server';
import { generateSceneWithNvidiaNim } from '@/lib/nvidiaNim';

const MIN_PROMPT_LENGTH = 4;
const MAX_PROMPT_LENGTH = 800;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { prompt?: unknown };
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';

    if (prompt.length < MIN_PROMPT_LENGTH) {
      return NextResponse.json({ error: 'Prompt muito curto. Descreva mais detalhes da cena.' }, { status: 400 });
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json({ error: 'Prompt muito longo. Tente ate 800 caracteres.' }, { status: 400 });
    }

    const scene = await generateSceneWithNvidiaNim(prompt);

    return NextResponse.json(scene);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao gerar cena com NVIDIA NIM.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
