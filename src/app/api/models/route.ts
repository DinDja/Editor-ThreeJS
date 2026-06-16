import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const publicDir = path.join(process.cwd(), 'public');

  try {
    const files = fs.readdirSync(publicDir);
    const models = files
      .filter((f) => f.endsWith('.glb') || f.endsWith('.gltf'))
      .map((f) => {
        const name = f.replace(/\.(glb|gltf)$/i, '').replace(/[_\-]/g, ' ');
        const label = name.charAt(0).toUpperCase() + name.slice(1);
        return { path: '/' + f, label };
      });

    return NextResponse.json({ models });
  } catch {
    return NextResponse.json({ models: [] });
  }
}
