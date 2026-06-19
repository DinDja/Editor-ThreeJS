<div align="center">

# Editor ThreeJS

**Editor 3D experimental — Next.js + React Three Fiber + Electron**

Editor de cena e modelagem 3D com viewport interativo, primitivas, import/export GLB/GLTF, materiais PBR com texturas, modelagem poligonal (Draw Polygon, Knife, Edge Loop/Ring, Bridge, Fill, Inset), edit mode (vertices/arestas/faces), sculpt com 10 modos e fallback de pressao para mouse, fisica Rapier3D, timeline com keyframes, behaviors procedurais, efeitos de particulas, fluid, scripts JavaScript por objeto, geracao de malhas via IA (NVIDIA NIM), layers, imagens de referencia, asset browser (Poly Haven), atalhos de produtividade e app desktop Windows.

[![Tutorial](https://img.shields.io/badge/Abrir-Tutorial-10b981?style=for-the-badge)](./TUTORIAL.md)
[![Download Desktop](https://img.shields.io/badge/Baixar-Desktop_Windows-0078D4?style=for-the-badge&logo=windows&logoColor=white)](#desktop)
[![Demo Online](https://img.shields.io/badge/Demo-Online-ff4785?style=for-the-badge&logo=vercel&logoColor=white)](https://editor-threejs.vercel.app)

</div>

---

## Badges

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Status](https://img.shields.io/badge/status-em%20desenvolvimento-orange)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=black)
![Three.js](https://img.shields.io/badge/Three.js-r184-000000?logo=three.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss&logoColor=black)
![Electron](https://img.shields.io/badge/Electron-35-47848f?logo=electron&logoColor=white)
![Rapier](https://img.shields.io/badge/Physics-Rapier3D-0055ff)
![Zustand](https://img.shields.io/badge/State-Zustand-brown)
![License](https://img.shields.io/badge/license-MIT-green)
![PRs](https://img.shields.io/badge/PRs-bem--vindos-brightgreen)

---

## Sumario

- [Recursos](#recursos)
- [Analise para Editor Profissional](#analise-para-editor-profissional)
- [Stack](#stack)
- [Como Rodar](#como-rodar)
- [Desktop](#desktop)
- [Scripts](#scripts)
- [Estrutura](#estrutura)
- [Fluxo de Uso](#fluxo-de-uso)
- [Modelagem](#modelagem)
- [Modelagem Poligonal](#modelagem-poligonal)
- [Sculpt](#sculpt)
- [Fisica](#fisica)
- [Animacao](#animacao)
- [Behaviors](#behaviors)
- [Efeitos](#efeitos)
- [Scripts por Objeto](#scripts-por-objeto)
- [Iluminacao](#iluminacao)
- [Atalhos](#atalhos)
- [Modelos](#modelos)
- [Agente IA (NVIDIA NIM)](#agente-ia-nvidia-nim)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)
- [Contribuindo](#contribuindo)

---

## Recursos

### Cena e Interface

- Projeto inicia em branco, sem objetos pre-carregados.
- Viewport 3D com `@react-three/fiber`, `@react-three/drei` e controles de orbita.
- Scene Graph para selecionar, ocultar, bloquear e remover objetos.
- Painel de propriedades com nome, tipo, visibilidade, posicao, rotacao e escala.
- Context menu no Scene Graph para acoes rapidas.
- Layout responsivo para desktop, tablet e mobile.
- Tutorial integrado com spotlight guiado.
- Modos de viewport: texturizado, solido, wireframe, vertices, poligonos e primitiva.
- Layers com visibilidade, bloqueio e cor.
- Imagens de referencia para modelagem.

### Objetos e Ferramentas

- Ferramentas: Select, Mover, Girar, Escalar, Editar, Sculpt, Draw Polygon e Knife.
- Gizmo com `TransformControls` para transforms e selecoes de malha.
- Primitivas: cubo, esfera, cilindro, cone, toro e plano.
- Texto 3D com depth e bevel.
- Importacao de SVG com extrusao.
- Modelagem de primitivas com dimensoes e segmentos configuraveis.
- Conversao de primitivas e modelos importados para malha editavel.
- Importacao de modelos `.glb` e `.gltf`.
- Exportacao da cena editada em `.glb`.
- Asset Browser integrado (Poly Haven).
- Undo/Redo por snapshots.
- Copiar, colar, duplicar e apagar objetos por atalhos.

### Materiais

- Editor de material com cor, emissive, metalness, roughness e opacidade.
- Textura difusa, normal map, roughness map e displacement map.
- Texturas carregadas no viewport e preservadas no export GLB.
- Repeticao, offset e rotacao de textura.
- Multi-materiais por face.

### Edit Mode

- Selecao e movimento de vertices, arestas e faces (multipla para vertices/faces).
- Operacoes: extrudar face, subdividir face, apagar face, soldar vertices, bevel de aresta, loop cut, booleanos (union/subtract/intersect), bridge edges, fill face, inset face, flip normals, merge by distance, edge loop select e edge ring select.
- Estrutura interna `PolygonMesh` com vertices/edges/faces explicitos (IDs + adjacencia) para operacoes topologicas.
- Conversao bidirecional entre `PolygonMesh` e `EditableMesh` (Three.js BufferGeometry).

### Sculpt

- Pincel para amassar, puxar, agarrar, inflar, suavizar, clay, crease, flatten, pinch e mask.
- Falloff suave, esferico, afiado e linear.
- Controles de raio e forca.
- Fallback de pressao para mouse baseado em velocidade do cursor (mouse rapido = menos forca, mouse lento = mais forca).
- Smoothing default 0.35 para estabilizar strokes de mouse.
- Simetria X, front faces only, accumulate, spacing e estabilizador de caneta configuraveis.

### Fisica

- Integracao com `@dimforge/rapier3d-compat`.
- Corpos dinamico, estatico e cinematico.
- Colliders: box, sphere, capsule, cylinder, mesh e convex hull.
- Massa, friccao, restituicao e damping.
- Triggers e lock de eixos.

### Animacao

- Timeline com keyframes de transform.
- Interpolacao: hold, linear e ease.
- FPS, start/end frame e playhead configuraveis.

### Behaviors

- Pular, andar, acelerar, rolar, gravidade, bolha e deformar massa.
- Parametros por behavior.

### Efeitos

- Fogos, fogo, fumaca, brilho, luz e superficie liquida (fluid).
- Cor, intensidade, tamanho e count por efeito.

### Scripts

- Motor de scripts JavaScript por objeto.
- API com `THREE`, `position`, `rotation`, `scale`, `delta` e `elapsed`.
- Logs no console com prefixo `[Script]`.

### IA

- Agente NVIDIA NIM para gerar malhas 3D (vertices + faces) via prompt.
- Decomposicao automatica em varias partes com hierarquia via parentName.
- Retry automatico quando a cena fica simples demais.
- Compactacao de layout para manter a composicao centralizada.
- Subdivisao e suavizacao procedural das malhas geradas.

---

## Analise para Editor Profissional

O editor possui uma base solida para manipulacao 3D, mas para atingir o nivel de editores profissionais (Blender, Unity, Unreal, Maya), as seguintes areas precisam de desenvolvimento:

### Prioridade Alta (Core)
| Funcionalidade | Descricao | Impacto |
| --- | --- | --- |
| Save/Load de Projeto | Formato `.e3d` com compressao e versionamento | Essencial para fluxo de trabalho real |
| Export multi-formato | FBX, OBJ, USD, STL, DAE | Compatibilidade com outros softwares |
| Import multi-formato | FBX, OBJ, USD, 3DS | Importar assets de diversas fontes |
| Node Editor (Materiais) | Sistema de nos para shaders PBR e custom | Criacao de materiais complexos |
| Editor de UVs | Unwrapping, painting, alinhamento | Texturizacao profissional |
| Rigging/Skinning | Bones, IK/FK, weight painting | Animacao de personagens |

### Prioridade Media (Avancado)
| Funcionalidade | Descricao | Impacto |
| --- | --- | --- |
| Modifiers | Mirror, Array, Solidify, Subdivision, Decimate | Modelagem nao-destrutiva |
| Constraints | Look At, Copy Transform, Limit Distance | Animacao e controle procedural |
| Particle System | Editor visual com curvas, colisao, sub-emitters | Efeitos visuais complexos |
| Post-Processing | Bloom, SSAO, DOF, Motion Blur, Tonemap | Qualidade visual final |
| Lightmap Baking | Baking de luz estatica | Performance em cenas grandes |
| Terrain Editor | Heightmap, sculpting, texturizacao | Criacao de mundos |

### Prioridade Baixa (Especializado)
| Funcionalidade | Descricao | Impacto |
| --- | --- | --- |
| Fluid Simulation | Liquidos, gases, SPH/FLIP | Efeitos especiais |
| Cloth Simulation | Tecidos, bandeiras, roupas | Realismo fisico |
| Hair/Fur System | Cabelos, pelos, grama | Personagens realistas |
| NavMesh/Pathfinding | Navegacao para IA | Games e simulacoes |
| Plugin System | API para extensoes | Extensibilidade |
| Multi-user Editing | Edicao colaborativa | Trabalho em equipe |

### Comparativo com Editores Profissionais
| Recurso | Este Editor | Blender | Unity | Unreal |
| --- | --- | --- | --- | --- |
| Modelagem poligonal | Sim | Sim | Basico | Basico |
| Sculpt | Sim | Sim | Nao | Nao |
| Node Materials | Nao | Sim | Sim | Sim |
| Rigging/Animation | Basico | Sim | Sim | Sim |
| UV Editor | Nao | Sim | Sim | Sim |
| Physics | Sim | Sim | Sim | Sim |
| Particle System | Basico | Sim | Sim | Sim |
| Terrain | Nao | Sim | Sim | Sim |
| Post-Processing | Nao | Sim | Sim | Sim |
| Scripting | Sim | Sim | Sim | Sim |
| VR/AR | Nao | Nao | Sim | Sim |

---

## Stack

| Camada | Tecnologia |
| --- | --- |
| Framework | Next.js 16 |
| UI | React 19, Tailwind CSS 4 |
| Linguagem | TypeScript |
| 3D | Three.js, React Three Fiber, Drei |
| Fisica | Rapier3D (`@dimforge/rapier3d-compat`) |
| Estado | Zustand |
| Icones | Lucide React |
| Performance | three-mesh-bvh |
| Desktop | Electron 35, electron-builder |
| IA | NVIDIA NIM (nvidia/llama-3.1-nemotron-70b-instruct, meta/llama-3.1-8b-instruct) |

---

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

---

## Desktop

O editor tambem roda como app desktop Windows via Electron.

<details>
<summary><b>Configurar build desktop</b></summary>

Gere o instalador Windows:

```bash
npm run dist
```

Para Windows, macOS e Linux:

```bash
npm run dist:all
```

Os instaladores sao gerados em `release/`.

</details>

<details>
<summary><b>Servir instalador pelo app</b></summary>

Defina no `.env`:

```env
# Opcao 1: URL externa (GitHub Releases, S3, Google Drive)
INSTALLER_URL=https://github.com/DinDja/Editor-ThreeJS/releases/download/App/Editor.3D-1.0.0-setup.exe

# Opcao 2: arquivo local (self-hosted)
INSTALLER_DIR=./release
INSTALLER_NAME=Editor.3D-1.0.0-setup.exe
```

O botao Desktop na toolbar dispara o download pela rota `/api/download/desktop`.

</details>

---

## Scripts

| Script | Descricao |
| --- | --- |
| `npm run dev` | Inicia o app em modo desenvolvimento |
| `npm run build` | Gera a build de producao |
| `npm run start` | Serve a build de producao |
| `npm run lint` | Executa o ESLint |
| `npm run icons` | Gera icones do app |
| `npm run electron` | Abre o app no Electron (requer build) |
| `npm run electron:dev` | Next dev na porta 3456 para Electron |
| `npm run dist` | Build + instalador Windows x64 |
| `npm run dist:all` | Build + instaladores Win/Mac/Linux |

---

## Estrutura

<details>
<summary><b>Ver arvore de arquivos</b></summary>

```text
src/
  app/
    layout.tsx
    page.tsx
    globals.css
    api/
      ai/generate/route.ts
      assets/polyhaven/
      assets/proxy/
      download/desktop/route.ts
      models/route.ts

  components/
    Editor3D/
      AiPromptModal.tsx
      AssetBrowserModal.tsx
      Canvas3D.tsx
      CollapsibleSection.tsx
      ContextMenu.tsx
      DrawPolygonOverlay.tsx
      EditorShortcuts.tsx
      index.tsx
      KnifeOverlay.tsx
      MaterialEditor.tsx
      MeshEditOverlay.tsx
      ModelingTools.tsx
      PhysicsRuntime.tsx
      Properties.tsx
      SceneGraph.tsx
      Timeline.tsx
      Toolbar.tsx
      TransformGizmo.tsx
      TutorialSpotlight.tsx
    ModelViewer.tsx

  lib/
    aiMeshEnhancer.ts
    animation.ts
    behaviors.tsx
    effects.tsx
    fileOps.ts
    fluid.tsx
    geometryOps.ts
    gltfImport.ts
    meshOps.ts
    nvidiaNim.ts
    physics.ts
    polygonMesh.ts
    scriptEngine.tsx

  store/
    contextMenuStore.ts
    editorStore.ts
    historyStore.ts
    initialScene.ts
    materialStore.ts
    physicsStore.ts
    polygonMeshStore.ts
    sceneStore.ts
    sceneTree.ts
    timelineStore.ts
    types.ts
```

</details>

---

## Fluxo de Uso

```text
 Add / Importar GLB / Gerar IA
         |
         v
  Selecionar objeto (viewport ou Scene Graph)
         |
         v
  Transformar (Mover / Girar / Escalar)
         |
         v
  Editar Properties (transforms, material, modelagem)
         |
         +---> Edit Mode (vertices / arestas / faces)
         +---> Draw Polygon (desenhar poligonos do zero)
         +---> Knife (cortar faces interativamente)
         +---> Sculpt (pincel)
         +---> Fisica / Behaviors / Scripts / Efeitos
         +---> Animar (Timeline + keyframes)
         |
         v
  Exportar cena -> .glb
```

1. Use `Add` para inserir uma primitiva, `Importar` para carregar `.glb`/`.gltf`, ou `Gerar IA` para criar malhas via prompt.
2. Selecione um objeto no Scene Graph ou diretamente no viewport.
3. Use Mover, Girar e Escalar para transformar o objeto.
4. Edite transforms, modelagem e material no painel Properties.
5. Use `Editar` para selecionar vertices, arestas ou faces e mover a selecao com o gizmo.
6. Use `Draw Polygon` para desenhar poligonos clicando no viewport e fechando faces.
7. Use `Knife` para cortar faces interativamente com preview de linha.
8. Use `Sculpt` para deformar a malha com pincel.
9. Aplique fisica, behaviors, efeitos ou scripts conforme necessario.
10. Crie keyframes na Timeline para animar objetos.
11. Use `Exportar` para baixar a cena atual como `.glb`.

---

## Modelagem

<details>
<summary><b>Edit Mode</b></summary>

O modo Editar converte primitivas e modelos importados para uma malha editavel. Em modelos importados, a geometria e achatada em uma malha unica para permitir edicao direta.

No painel Modelagem:

- **Vertices**: seleciona pontos individuais; use Shift para selecao multipla.
- **Edges**: seleciona arestas (atalho `2`); use Shift para selecao multipla.
- **Faces**: seleciona triangulos da malha; use Shift para selecao multipla.
- **Extrudar**: cria volume a partir da face selecionada.
- **Subdividir**: divide uma face selecionada em triangulos menores.
- **Soldar**: junta vertices selecionados no centro da selecao.
- **Bevel Edge**: chanfra uma aresta selecionada criando novos vertices e faces.
- **Loop Cut**: corta todas as arestas paralelas a selecionada inserindo midpoints.
- **Boolean**: union, subtract e intersect com outro objeto da cena.
- **Bridge Edges**: une duas arestas selecionadas com faces.
- **Fill Face**: preenche uma face a partir de vertices selecionados.
- **Inset Face**: cria inset de uma face selecionada.
- **Flip Normals**: inverte a ordem dos vertices de faces selecionadas.
- **Merge by Distance**: funde vertices proximos por threshold.
- **Delete Vertex/Edge/Face**: remove o subelemento selecionado.

</details>

<details>
<summary><b>Modelagem de primitivas</b></summary>

- Duplicar o objeto.
- Criar arrays.
- Espelhar nos eixos X, Y ou Z.
- Aplicar escala na geometria.
- Aumentar ou reduzir segmentos.
- Alterar largura, altura, profundidade, raio e segmentos.

Mais segmentos deixam a malha melhor para edicao e sculpt.

</details>

---

## Modelagem Poligonal

Alem do Edit Mode classico, o editor tem ferramentas dedicadas para modelagem poligonal manual, inspiradas no Edit Mode do Blender.

### Draw Polygon

Desenhe poligonos do zero clicando no viewport.

1. Ative a ferramenta com `P` ou botao `Draw Polygon` (icone caneta) na toolbar.
2. Clique no grid XZ para criar vertices. Uma linha amarela conecta os pontos.
3. Ao aproximar do 1º vertice (esfera fica verde) e clicar, a face se fecha.
4. Alternativamente, pressione `Enter` ou clique com o botao direito para fechar.
5. `Esc` cancela o desenho.

Se houver um objeto de malha selecionado, a nova face e adicionada a ele. Caso contrario, um novo objeto `Mesh` e criado.

### Knife Tool

Corte faces interativamente com preview de linha.

1. Ative com `K` ou botao `Knife` (icone tesoura) na toolbar.
2. Clique na superficie da malha para definir pontos de corte. Uma linha vermelha mostra o caminho.
3. Pressione `Enter` ou clique com o botao direito para aplicar o corte.
4. `Esc` cancela.

O corte cria novos vertices nos pontos de intersecao e divide as faces atravessadas em duas.

### Edge Loop / Edge Ring Select

- **Edge Loop**: seleciona um loop continuo de arestas a partir de uma aresta. Disponivel no `polygonMeshStore`.
- **Edge Ring**: seleciona um ring de arestas paralelas. Disponivel no `polygonMeshStore`.

### Estrutura PolygonMesh

A estrutura interna `PolygonMesh` mantem vertices, edges e faces com IDs explicitos e adjacencia:

```typescript
type PolygonMesh = {
  vertices: Map<VertexId, { id, position }>;
  edges: Map<EdgeId, { id, a, b, faces[] }>;
  faces: Map<FaceId, { id, vertices[], edges[] }>;
};
```

Conversao bidirecional com `EditableMesh` (triangulado) permite renderizar via Three.js e exportar GLB.

---

## Sculpt

O modo Sculpt deforma a malha com um pincel:

| Modo | Acao |
| --- | --- |
| Amassar (push) | Empurra a superficie para dentro |
| Puxar (pull) | Puxa a superficie para fora |
| Agarrar (grab) | Arrasta a regiao sob o pincel |
| Inflar (inflate) | Expande a regiao ao redor do ponto |
| Suavizar (smooth) | Aproxima vertices dos vizinhos |
| Clay | Adiciona volume em camadas |
| Crease | Cria vincos na superficie |
| Flatten | Achatar a superficie |
| Pinch | Pinca vertices para o centro do pincel |
| Mask | Protege regioes da edicao |

Falloff: suave, esferico, afiado e linear.

Use os controles **Raio** e **Forca** no painel Modelagem para ajustar o pincel.

<details>
<summary><b>Suporte a mouse e caneta</b></summary>

| Recurso | Comportamento |
| --- | --- |
| Pressao (caneta) | Usa pressao real do tablet quando `Pressao na Forca` ou `Pressao no Raio` estao ativos |
| Pressao (mouse) | Fallback por velocidade do cursor: mouse rapido = menos forca (35-100%) |
| Smoothing | Estabilizador de stroke, default 0.35 para suavizar tremores de mouse |
| Spacing | Distancia minima entre stamps do pincel |
| Symmetry X | Espelha o stroke no eixo X |
| Front Faces Only | Afeta apenas faces voltadas para a camera |
| Accumulate | Permite acumular deformacao no mesmo vertice durante um stroke |

O dispositivo ativo (mouse/caneta/toque) e detectado automaticamente.

</details>

---

## Fisica

Integracao com Rapier3D para simulacao em tempo real.

<details>
<summary><b>Tipos de corpo</b></summary>

| Tipo | Descricao |
| --- | --- |
| Dinamico | Responde a forcas e colisoes |
| Estatico | Nao se move, serve de obstaculo |
| Cinematico | Movido manualmente, empurra outros |

</details>

<details>
<summary><b>Colliders</b></summary>

- Box
- Sphere
- Capsule
- Cylinder
- Mesh (geometria exata)
- Convex hull

</details>

<details>
<summary><b>Propriedades</b></summary>

- Massa
- Friccao
- Restituicao (bounce)
- Linear damping
- Angular damping
- Gravity scale
- Is trigger
- Lock de translacao/rotacao por eixo

</details>

---

## Animacao

Timeline com keyframes de transform por objeto.

<details>
<summary><b>Detalhes</b></summary>

- FPS configuravel (padrao 30).
- Start/end frame e duracao.
- Playhead arrastavel.
- Keyframes de posicao, rotacao e escala.
- Interpolacao:
  - `hold` — mantem o valor ate o proximo keyframe.
  - `linear` — interpolacao linear.
  - `ease` — suaviza entrada e saida.

</details>

---

## Behaviors

Animacoes procedurais aplicadas por objeto, sem precisar de keyframes.

| Behavior | Descricao |
| --- | --- |
| Pular | Salto periodico com cooldown |
| Andar | Oscilacao vertical + deslocamento |
| Acelerar | Velocidade crescente ate maximo |
| Rolar | Rotacao continua no eixo X ou Z |
| Gravidade | Cai ate um groundY |
| Bolha | Oscilacao suave tipo flutuacao |
| Massa (Deformar) | Squash and stretch |

---

## Efeitos

Efeitos de particulas e shaders aplicaveis a qualquer objeto.

| Efeito | Descricao |
| --- | --- |
| Fogos | Explosao de particulas coloridas |
| Fogo | Chamas com flicker |
| Fumaca | Particulas opacas ascendentes |
| Brilho | Sparkles pontuais |
| Luz | Glow esferico |
| Superficie Liquida | Simulacao de fluido com shaders |

Cada efeito tem cor, intensidade, tamanho e count configuraveis.

---

## Scripts por Objeto

Cada objeto pode ter scripts JavaScript proprioss executados a cada frame.

<details>
<summary><b>API disponivel</b></summary>

```typescript
type ScriptContext = {
  object: SceneObject;
  group: THREE.Group;
  delta: number;
  elapsed: number;
  THREE: typeof THREE;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  console: Pick<Console, 'log' | 'warn' | 'error'>;
};
```

Exemplo:

```javascript
// Rotacao continua
api.update = ({ group, delta }) => {
  group.rotation.y += delta * 1.5;
};
```

Logs aparecem no console do navegador com prefixo `[Script]`.

</details>

---

## Iluminacao

Tipos de luz suportados:

| Luz | Props |
| --- | --- |
| Spot | angulo, penumbra, target, sombra |
| Point | distancia, decay, sombra |
| Directional | direcao, sombra |
| Ambient | intensidade global |

Props comuns: cor, intensidade, `castShadow`, `shadowBias`, `shadowRadius`.

---

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
| `2` | Selecao de arestas |
| `F` | Selecao de faces |
| `B` | Sculpt |
| `P` | Draw Polygon (ou toggle pressao se estiver em Sculpt) |
| `K` | Knife Tool |
| `X` | Inverte modo do sculpt (push<->pull, inflate<->pinch) |
| `Shift+F` | Cicla falloff do sculpt |
| `Arrow Up` | Aumenta forca do sculpt |
| `Arrow Down` | Diminui forca do sculpt |
| `Esc` | Limpar selecao e voltar para Select |
| `[` | Diminuir raio do pincel |
| `]` | Aumentar raio do pincel |
| `;` | Aumentar smoothing do pen |
| `'` | Diminuir smoothing do pen |

Os atalhos nao disparam enquanto voce esta digitando em inputs, selects ou textareas.

---

## Modelos

Modelos colocados em `public/` podem ser servidos diretamente pelo app. A rota `src/app/api/models/route.ts` lista arquivos `.glb` e `.gltf` encontrados nessa pasta.

---

## Agente IA (NVIDIA NIM)

O editor tem um agente para gerar **malhas 3D** (vertices + faces) via NVIDIA NIM. Usa o modelo `nvidia/llama-3.1-nemotron-70b-instruct` como primario e `meta/llama-3.1-8b-instruct` como fallback.

A IA retorna objetos com geometria real (arrays de vertices e faces trianguladas), decompostos em varias partes com hierarquia via `parentName`. As malhas passam por subdivisao e suavizacao procedural antes de entrar na cena.

<details>
<summary><b>Variaveis de ambiente</b></summary>

Crie o arquivo `.env` (ou use `.env.local`) com:

```env
NVIDIA_NIM_API_KEY=your_nvidia_nim_api_key
NVIDIA_NIM_MODEL_PRIMARY=nvidia/llama-3.1-nemotron-70b-instruct
NVIDIA_NIM_MODEL_FALLBACK=meta/llama-3.1-8b-instruct
NVIDIA_NIM_BASE_URL=https://integrate.api.nvidia.com/v1
```

No Vercel, configure as mesmas variaveis no projeto e faca redeploy para aplicar.

</details>

<details>
<summary><b>Endpoint</b></summary>

`POST /api/ai/generate`

Body:

```json
{
  "prompt": "robo futurista com base metalica, luzes neon e pedestal"
}
```

Resposta:

```json
{
  "objects": [
    {
      "name": "Torre Central",
      "vertices": [[-0.5,-0.5,-0.5],[0.5,-0.5,-0.5],...],
      "faces": [[0,1,2],[0,2,3],...],
      "position": [0, 1.5, 0],
      "rotation": [0, 0, 0],
      "scale": [1, 1, 1],
      "parentName": "Base",
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

Cada objeto tem 20-60 vertices e 40-120 faces em media, formando superficies solidas reconhaveis.

</details>

<details>
<summary><b>Retry automatico</b></summary>

Se a primeira geracao ficar simples demais (<40 vertices totais ou <3 objetos), o agente refaca com um prompt reforcado pedindo mais decomposicao e detalhes. Um segundo retry acontece se ainda estiver simples.

</details>

Na toolbar, use o botao `Gerar IA` (icone sparkles fucsia), descreva a cena e o app cria automaticamente as malhas com materiais.

---

## Troubleshooting

<details>
<summary><b>A textura deixou o viewport escuro</b></summary>

As texturas sao carregadas pelo cache do React Three Fiber e aplicadas em uma copia configurada para o material. Se o navegador ainda mostrar estado antigo, faca um hard refresh:

```text
Ctrl + Shift + R
```

</details>

<details>
<summary><b>Modelos grandes demoram para aparecer</b></summary>

Arquivos GLB grandes podem levar alguns segundos para carregar, especialmente em desenvolvimento. Enquanto isso, o viewport continua ativo e mostra o grid.

</details>

<details>
<summary><b>Exportacao nao baixa arquivo</b></summary>

Confira se existe algum objeto na cena e tente novamente em um navegador moderno com suporte a WebGL e downloads por Blob.

</details>

---

## Roadmap

### Concluído
- [x] Cena, materiais, import/export, atalhos
- [x] Edicao de malha (vertices/arestas/faces) e sculpt
- [x] Fisica com Rapier3D
- [x] Timeline com keyframes
- [x] Behaviors procedurais
- [x] Efeitos de particulas e fluid
- [x] Scripts por objeto
- [x] Layers e imagens de referencia
- [x] Desktop Electron
- [x] Agente IA (NVIDIA NIM) gerando malhas com vertices/faces
- [x] Operacoes de aresta (bevel, loop cut)
- [x] Booleanos entre malhas
- [x] Modelagem poligonal: Draw Polygon, Knife, Edge Loop/Ring, Bridge, Fill, Inset
- [x] Sculpt com fallback de pressao para mouse

### Em Progresso / Planejado
- [ ] Box / Lasso select de sub-elementos
- [ ] Hover preview antes de clicar
- [ ] Flip/Recalculate Normals e Smooth/Flat Shading na UI
- [ ] Timeline com keyframes reais exportaveis
- [ ] Multi-materiais por face avancado
- [ ] Snap to vertex/edge/face durante transform de sub-elemento

### Funcionalidades ausentes/não planejadas

#### Core
- [ ] **Save/Load de Projeto** - Formato `.e3d` com compressao
- [ ] **Exportacao multi-formato** - FBX, OBJ, USD, STL, DAE
- [ ] **Importacao multi-formato** - FBX, OBJ, USD, 3DS, DAE
- [ ] **Sistema de Preferences** - Configuracoes do usuario, temas, atalhos customizaveis
- [ ] **Sistema de Templates/Presets** - Templates de cena, materiais, iluminacao

#### Modelagem Avancada
- [ ] **Node Editor (Geometry Nodes)** - Geometria procedural visual
- [ ] **Modifiers nao-destrutivos** - Mirror, Array, Solidify, Subdivision, Decimate, Weld
- [ ] **Editor de UVs** - Unwrapping, painting, alinhamento
- [ ] **Sistema de Constraints** - Look At, Copy Transform, Limit Distance, Clamp To, Path Follow
- [ ] **Curvas e Splines** - Bezier, NURBS, extrusao ao longo de curva
- [ ] **Voxel Sculpting** - Sculpting volumetrico com Dyntopo

#### Animacao e Rigging
- [ ] **Sistema de Ossos (Armature)** - Bones, joints, IK/FK
- [ ] **Skinning/Weight Painting** - Vertex weights, influence
- [ ] **Shape Keys/Morph Targets** - Blend shapes para expressoes
- [ ] **Graph Editor** - Curvas de animacao editaveis
- [ ] **Motion Capture** - Import BVH, retargeting
- [ ] **Constraint Animation** - Animar constraints

#### Materiais e Shaders
- [ ] **Node-Based Material Editor** - Sistema de nos para shaders (PBR, custom)
- [ ] **Shader Generator** - GLSL/HLSL customizado
- [ ] **Texture Painting** - Pintura direta no modelo 3D
- [ ] **Procedural Textures** - Noise, gradients, patterns
- [ ] **Material Layers/Blending** - Mascara, mistura de materiais

#### Iluminacao e Render
- [ ] **Lightmap Baking** - Baking de luz estatica
- [ ] **Global Illumination** - GI em tempo real ou baked
- [ ] **Post-Processing Stack** - Bloom, SSAO, DOF, Motion Blur, Tonemap, LUT
- [ ] **Raytracing/Pathtracing** - Render offline de alta qualidade
- [ ] **HDRI Environment** - Iluminacao por imagem HDR
- [ ] **Area Lights** - Luzes retangulares, discos, esferas

#### Efeitos e Simulacao
- [ ] **Particle System avancado** - Editor visual com curvas, emissao, colisao, sub-emitters
- [ ] **Fluid Simulation** - Liquidos, gases, SPH/FLIP
- [ ] **Cloth Simulation** - Tecidos, bandeiras, roupas
- [ ] **Hair/Fur System** - Cabelos, pelos, grama
- [ ] **Destruction/Fracture** - Destruicao procedural
- [ ] **Soft Body** - Corpos moles, gelatina

#### Cena e Mundo
- [ ] **Terrain Editor** - Heightmap, sculpting, texturizacao de terreno
- [ ] **Foliage/Scatter System** - Pintura de vegetacao, rocks, detalhes
- [ ] **Water System** - Oceanos, rios, lagos com shaders
- [ ] **Sky/Atmosphere** - Ceus procedurais, nuvens, neblina volumetrica
- [ ] **Volumetric Lighting** - God rays, fog volumetrico

#### Audio e Interatividade
- [ ] **Audio Spatial** - Audio 3D posicional, HRTF
- [ ] **Audio Triggers** - Sons por evento, zonas
- [ ] **Dialogue System** - Sistema de dialogo/in-game UI
- [ ] **Input System** - Mapeamento de controles, gamepads

#### Performance e Debug
- [ ] **Profiling Tools** - Draw calls, triangulos, FPS, memory, GPU stats
- [ ] **LOD System** - Level of Detail automatico
- [ ] **Occlusion Culling** - PVS, portais
- [ ] **Shader Debugger** - Visualizar normals, UVs, lightmaps, overdraw
- [ ] **Physics Debugger** - Visualizar colliders, contacts, rays

#### IA e Automacao
- [ ] **NavMesh/Pathfinding** - Navegacao para personagens
- [ ] **Behavior Trees** - IA para NPCs
- [ ] **Scripting avancado** - TypeScript/JavaScript com API completa
- [ ] **Plugin System** - API para extensoes, marketplace

#### Colaboracao
- [ ] **Version Control** - Git-like para cenas, merge/diff visual
- [ ] **Multi-user Editing** - Edicao colaborativa em tempo real
- [ ] **Cloud Sync** - Salvamento na nuvem, compartilhamento
- [ ] **Asset Library** - Biblioteca compartilhada de assets

---

## Contribuindo

1. Fork o repositorio.
2. Crie uma branch: `git checkout -b feat/minha-feature`.
3. Commit: `git commit -m "feat: minha feature"`.
4. Push: `git push origin feat/minha-feature`.
5. Abra um Pull Request.

PRs sao bem-vindas. Para bugs, abra uma [Issue](https://github.com/DinDja/Editor-ThreeJS/issues).

---

## Status

Este projeto esta em desenvolvimento ativo. A base atual cobre cena, materiais, import/export, atalhos, edicao de malha, modelagem poligonal (Draw Polygon, Knife, Edge Loop/Ring), sculpt com suporte a mouse, fisica, animacao, behaviors, efeitos, scripts e geracao de malhas via IA.



<div align="center">

[![GitHub issues](https://img.shields.io/github/issues/DinDja/Editor-ThreeJS?style=flat-square)](https://github.com/DinDja/Editor-ThreeJS/issues)
[![GitHub stars](https://img.shields.io/github/stars/DinDja/Editor-ThreeJS?style=flat-square)](https://github.com/DinDja/Editor-ThreeJS)
[![GitHub forks](https://img.shields.io/github/forks/DinDja/Editor-ThreeJS?style=flat-square)](https://github.com/DinDja/Editor-ThreeJS)
[![GitHub last commit](https://img.shields.io/github/last-commit/DinDja/Editor-ThreeJS?style=flat-square)](https://github.com/DinDja/Editor-ThreeJS)

</div>
