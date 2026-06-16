# Editor ThreeJS

Editor 3D experimental feito com Next.js, React Three Fiber e Three.js. O app funciona como uma base de editor de cena e modelagem: projeto em branco, primitivas, import/export GLB/GLTF, materiais com textura, edicao de malha, sculpt e atalhos de produtividade.

[![Abrir Tutorial](https://img.shields.io/badge/Abrir-Tutorial-10b981?style=for-the-badge)](./TUTORIAL.md)

## Recursos

- Projeto inicia em branco, sem objetos pre-carregados.
- Viewport 3D com `@react-three/fiber`, `@react-three/drei` e controles de orbita.
- Scene Graph para selecionar, ocultar e remover objetos.
- Ferramentas de objeto: Select, Mover, Girar, Escalar, Editar e Sculpt.
- Gizmo com `TransformControls` para transforms e selecoes de malha.
- Painel de propriedades com nome, tipo, visibilidade, posicao, rotacao e escala.
- Editor de material com cor, emissive, metalness, roughness, opacidade e textura.
- Texturas carregadas no viewport e preservadas no export GLB.
- Importacao de modelos `.glb` e `.gltf`.
- Exportacao da cena editada em `.glb`.
- Undo/Redo por snapshots.
- Copiar, colar, duplicar e apagar objetos por atalhos.
- Primitivas: cubo, esfera, cilindro, cone, toro e plano.
- Modelagem de primitivas com dimensoes e segmentos configuraveis.
- Conversao de primitivas e modelos importados para malha editavel.
- Edit Mode com selecao e movimento de vertices e faces.
- Operacoes de malha: extrudar face, subdividir face, apagar face e soldar vertices.
- Sculpt com pincel para amassar, puxar, inflar e suavizar a malha.
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
      EditorShortcuts.tsx
      MaterialEditor.tsx
      MeshEditOverlay.tsx
      ModelingTools.tsx
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
    meshOps.ts

  store/
    editorStore.ts
    historyStore.ts
    initialScene.ts
    materialStore.ts
    sceneStore.ts
    types.ts
```

## Fluxo de Uso

1. Use Add para inserir uma primitiva ou Importar para carregar `.glb`/`.gltf`.
2. Selecione um objeto no Scene Graph ou diretamente no viewport.
3. Use Mover, Girar e Escalar para transformar o objeto.
4. Edite transforms, modelagem e material no painel Properties.
5. Use Editar para selecionar vertices ou faces e mover a selecao com o gizmo.
6. Use Sculpt para deformar a malha com pincel.
7. Use Exportar para baixar a cena atual como `.glb`.

## Modelagem

### Edit Mode

O modo Editar converte primitivas e modelos importados para uma malha editavel. Em modelos importados, a geometria e achatada em uma malha unica para permitir edicao direta.

No painel Modelagem:

- Vertices: seleciona pontos individuais; use Shift para selecao multipla.
- Faces: seleciona triangulos da malha.
- Extrudar: cria volume a partir da face selecionada.
- Subdividir: divide uma face selecionada em triangulos menores.
- Soldar: junta vertices selecionados no centro da selecao.
- Face: apaga a face selecionada.

### Sculpt

O modo Sculpt deforma a malha com um pincel:

- Amassar: empurra a superficie para dentro.
- Puxar: puxa a superficie para fora.
- Inflar: expande a regiao ao redor do ponto do pincel.
- Suavizar: aproxima vertices dos vizinhos para suavizar a forma.

Use os controles Raio e Forca no painel Modelagem para ajustar o pincel.

## Atalhos

| Atalho | Acao |
| --- | --- |
| `Ctrl+Z` | Desfazer |
| `Ctrl+Y` | Refazer |
| `Ctrl+Shift+Z` | Refazer |
| `Ctrl+C` | Copiar objeto selecionado |
| `Ctrl+V` | Colar objeto copiado |
| `Ctrl+D` | Duplicar objeto selecionado |
| `Delete` / `Backspace` | Apagar objeto ou face selecionada |
| `G` | Mover |
| `R` | Girar |
| `S` | Escalar |
| `E` | Entrar em Edit Mode ou extrudar face selecionada |
| `V` | Selecao de vertices |
| `F` | Selecao de faces |
| `B` | Sculpt |
| `Esc` | Limpar selecao e voltar para Select |
| `[` | Diminuir raio do pincel |
| `]` | Aumentar raio do pincel |

Os atalhos nao disparam enquanto voce esta digitando em inputs, selects ou textareas.

## Modelos

Modelos colocados em `public/` podem ser servidos diretamente pelo app. A rota `src/app/api/models/route.ts` lista arquivos `.glb` e `.gltf` encontrados nessa pasta.

## Agente IA (NVIDIA NIM)

O editor agora tem um agente para gerar cenas com primitivas via NVIDIA NIM usando o modelo `meta/llama-3.1-8b-instruct`.

### Variaveis de ambiente

Crie o arquivo `.env` (ou use `.env.local`) com:

```env
NVIDIA_NIM_API_KEY=your_nvidia_nim_api_key
NVIDIA_NIM_MODEL=meta/llama-3.1-8b-instruct
NVIDIA_NIM_BASE_URL=https://integrate.api.nvidia.com/v1
```

No Vercel, configure as mesmas variaveis no projeto:

- `NVIDIA_NIM_API_KEY`
- `NVIDIA_NIM_MODEL`
- `NVIDIA_NIM_BASE_URL`

Depois, faca redeploy para aplicar.

### Endpoint

`POST /api/ai/generate`

Body:

```json
{
  "prompt": "cidade sci-fi com torres e uma plataforma central"
}
```

Resposta:

```json
{
  "objects": [
    {
      "name": "Torre Central",
      "primitive": "cylinder",
      "position": [0, 1.5, 0],
      "rotation": [0, 0, 0],
      "scale": [1, 1, 1],
      "geometry": { "radiusTop": 0.8, "radiusBottom": 1.1, "height": 3 },
      "material": {
        "color": "#9fb3ff",
        "metalness": 0.45,
        "roughness": 0.3,
        "emissive": "#101a4d",
        "emissiveIntensity": 0.25,
        "opacity": 1
      }
    }
  ]
}
```

### Uso no editor

Na toolbar, use o botao `Gerar IA`, descreva a cena e o app cria automaticamente primitivas e materiais.

## Troubleshooting

### A textura deixou o viewport escuro

As texturas agora sao carregadas pelo cache do React Three Fiber e aplicadas em uma copia configurada para o material. Se o navegador ainda mostrar estado antigo, faca um hard refresh:

```text
Ctrl + Shift + R
```

### Modelos grandes demoram para aparecer

Arquivos GLB grandes podem levar alguns segundos para carregar, especialmente em desenvolvimento. Enquanto isso, o viewport continua ativo e mostra o grid.

### Exportacao nao baixa arquivo

Confira se existe algum objeto na cena e tente novamente em um navegador moderno com suporte a WebGL e downloads por Blob.

## Status

Este projeto ainda esta em desenvolvimento. A base atual ja cobre cena, materiais, import/export, atalhos, edicao de malha e sculpt. Proximas evolucoes naturais incluem arestas, bevel, loop cut, booleanos, multi-materiais por face e timeline com keyframes reais.
