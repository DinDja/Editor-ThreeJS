# Brain App

Editor 3D experimental feito com Next.js, React Three Fiber e Three.js. O projeto saiu de um visualizador de modelos e agora funciona como uma base de editor de cena: objetos selecionaveis, transformacoes, materiais, import/export de GLB/GLTF e estrutura preparada para animacao e modelagem.

## Recursos

- Viewport 3D com `@react-three/fiber`, `@react-three/drei` e controles de orbita.
- Scene Graph para selecionar, ocultar e remover objetos.
- Ferramentas de transform: Select, Mover, Girar e Escalar.
- Gizmo com `TransformControls`.
- Painel de propriedades com nome, tipo, visibilidade, posicao, rotacao e escala.
- Editor de material com cor, emissive, metalness, roughness, opacidade e textura.
- Importacao de modelos `.glb` e `.gltf`.
- Exportacao da cena editada em `.glb`.
- Undo/Redo basico por snapshots.
- Primitivas iniciais: cubo, esfera, cilindro, cone, toro e plano.
- Layout responsivo para desktop, tablet e mobile.
- Base tecnica para raycasting acelerado com `three-mesh-bvh`.

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Three.js
- React Three Fiber
- Drei
- Zustand
- Lucide React
- three-mesh-bvh

## Como Rodar

Instale as dependencias:

```bash
npm install
```

Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

Abra no navegador:

```text
http://localhost:3000
```

## Scripts

```bash
npm run dev
```

Inicia o app em modo desenvolvimento.

```bash
npm run build
```

Gera a build de producao.

```bash
npm run start
```

Serve a build de producao.

```bash
npm run lint
```

Executa o ESLint.

## Estrutura

```text
src/
  app/
    layout.tsx
    page.tsx
    globals.css
    api/models/route.ts

  components/
    Editor3D/
      Canvas3D.tsx
      MaterialEditor.tsx
      Properties.tsx
      SceneGraph.tsx
      Timeline.tsx
      Toolbar.tsx
      TransformGizmo.tsx
      index.tsx
    ModelViewer.tsx

  lib/
    animation.ts
    fileOps.ts
    geometryOps.ts

  store/
    editorStore.ts
    historyStore.ts
    initialScene.ts
    materialStore.ts
    sceneStore.ts
    types.ts
```

## Fluxo de Uso

1. Selecione um objeto no Scene Graph ou diretamente no viewport.
2. Escolha uma ferramenta na toolbar: Select, Mover, Girar ou Escalar.
3. Edite transforms e material no painel Properties.
4. Use Add para inserir primitivas.
5. Use Importar para carregar `.glb` ou `.gltf`.
6. Use Exportar para baixar a cena atual como `.glb`.

## Modelos

Modelos colocados em `public/` podem ser servidos diretamente pelo app. A rota `src/app/api/models/route.ts` lista arquivos `.glb` e `.gltf` encontrados nessa pasta.

## Roadmap

### Animacao

- Timeline com playhead arrastavel.
- Keyframes de posicao, rotacao e escala.
- Playback com `THREE.AnimationMixer`.
- Exportacao de `AnimationClip` dentro do GLB.

### Modelagem

- Selecao de vertices, arestas e faces.
- Raycasting acelerado com BVH.
- Operacoes de malha: subdivisao, extrusao, bevel, delete, smooth e decimate.
- Booleanos com CSG.

## Troubleshooting

### A tela ficou escura ou sem estilos

Reinicie o servidor de desenvolvimento:

```bash
npm run dev
```

Depois faca um hard refresh no navegador:

```text
Ctrl + Shift + R
```

### Modelos grandes demoram para aparecer

Arquivos GLB grandes podem levar alguns segundos para carregar, especialmente em desenvolvimento. Enquanto isso, o viewport continua ativo e mostra o grid.

### Exportacao nao baixa arquivo

Confira se existe algum objeto na cena e tente novamente em um navegador moderno com suporte a WebGL e downloads por Blob.

## Status

Este projeto ainda esta em desenvolvimento. A fundacao do editor de cena e materiais ja esta implementada; animacao e modelagem avancada estao preparadas no roadmap.
# Editor-ThreeJS
