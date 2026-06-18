import { existsSync, statSync } from 'fs';
import { readFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

export async function GET() {
  // Se INSTALLER_URL estiver definido, redireciona (cloud, GitHub Releases, etc.)
  const externalUrl = process.env.INSTALLER_URL;
  if (externalUrl) {
    return NextResponse.redirect(externalUrl, 302);
  }

  // Fallback: servidor local (self-hosted)
  const installerDir = process.env.INSTALLER_DIR || path.join(process.cwd(), 'release');
  const installerName = process.env.INSTALLER_NAME || 'Editor.3D-1.0.0-setup.exe';
  const installerPath = path.join(installerDir, installerName);

  if (!existsSync(installerPath)) {
    return NextResponse.json(
      { error: 'Instalador nao disponivel no momento.' },
      { status: 404 },
    );
  }

  const stat = statSync(installerPath);
  const fileBuffer = await readFile(installerPath);

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${installerName}"`,
      'Content-Length': String(stat.size),
    },
  });
}

export const dynamic = 'force-dynamic';
