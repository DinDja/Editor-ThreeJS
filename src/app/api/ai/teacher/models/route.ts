import { NextResponse } from 'next/server';
import { getKnownGeminiModels, listGeminiModels } from '@/lib/learning/geminiModels';

export const runtime = 'nodejs';

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ configured: false, models: [] });

  try {
    const models = await listGeminiModels(apiKey);
    return NextResponse.json({ configured: true, models });
  } catch {
    console.error('[Mestre IA] Falha ao consultar o catálogo de modelos Gemini.');
    return NextResponse.json({
      configured: true,
      models: getKnownGeminiModels(),
      warning: 'O catálogo não pôde ser consultado; exibindo modelos conhecidos. A chamada ainda validará a disponibilidade da chave.',
    }, { status: 502 });
  }
}
