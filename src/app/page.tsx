'use client';

import dynamic from 'next/dynamic';

const Editor3D = dynamic(() => import('@/components/Editor3D'), { ssr: false });

export default function Home() {
  return <Editor3D />;
}
