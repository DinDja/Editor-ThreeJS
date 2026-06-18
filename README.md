<div align="center">

# Editor ThreeJS

**Editor 3D experimental — Next.js + React Three Fiber + Electron**

Base de editor de cena e modelagem: projeto em branco, primitivas, import/export GLB/GLTF, materiais com textura, edicao de malha, sculpt, fisica, animacao, behaviors, efeitos, scripts e atalhos de produtividade.

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
- [Stack](#stack)
- [Como Rodar](#como-rodar)
- [Desktop](#desktop)
- [Scripts](#scripts)
- [Estrutura](#estrutura)
- [Fluxo de Uso](#fluxo-de-uso)
- [Modelagem](#modelagem)
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

- Ferramentas: Select, Mover, Girar, Escalar, Editar e Sculpt.
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

- Selecao e movimento de vertices e faces.
- Operacoes: extrudar face, subdividir face, apagar face e soldar vertices.

### Sculpt

- Pincel para amassar, puxar, agarrar, inflar, suavizar, clay, crease, flatten, pinch e mask.
- Falloff suave, esferico, afiado e linear.
- Controles de raio e forca.

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

- Agente NVIDIA NIM para gerar cenas com primitivas via prompt.

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
| IA | NVIDIA NIM (meta/llama-3.1-8b-instruct) |

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
      EditorShortcuts.tsx
      index.tsx
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
    scriptEngine.tsx

  store/
    contextMenuStore.ts
    editorStore.ts
    historyStore.ts
    initialScene.ts
    materialStore.ts
    physicsStore.ts
    sceneStore.ts
    sceneTree.ts
    timelineStore.ts
    types.ts
```

</details>

---

## Fluxo de Uso

```text
 Add / Importar GLB
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
        +---> Edit Mode (vertices / faces)
        +---> Sculpt (pincel)
        +---> Fisica / Behaviors / Scripts / Efeitos
        +---> Animar (Timeline + keyframes)
        |
        v
 Exportar cena -> .glb
```

1. Use `Add` para inserir uma primitiva ou `Importar` para carregar `.glb`/`.gltf`.
2. Selecione um objeto no Scene Graph ou diretamente no viewport.
3. Use Mover, Girar e Escalar para transformar o objeto.
4. Edite transforms, modelagem e material no painel Properties.
5. Use `Editar` para selecionar vertices ou faces e mover a selecao com o gizmo.
6. Use `Sculpt` para deformar a malha com pincel.
7. Aplique fisica, behaviors, efeitos ou scripts conforme necessario.
8. Crie keyframes na Timeline para animar objetos.
9. Use `Exportar` para baixar a cena atual como `.glb`.

---

## Modelagem

<details>
<summary><b>Edit Mode</b></summary>

O modo Editar converte primitivas e modelos importados para uma malha editavel. Em modelos importados, a geometria e achatada em uma malha unica para permitir edicao direta.

No painel Modelagem:

- **Vertices**: seleciona pontos individuais; use Shift para selecao multipla.
- **Faces**: seleciona triangulos da malha.
- **Extrudar**: cria volume a partir da face selecionada.
- **Subdividir**: divide uma face selecionada em triangulos menores.
- **Soldar**: junta vertices selecionados no centro da selecao.
- **Face**: apaga a face selecionada.

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
| `F` | Selecao de faces |
| `B` | Sculpt |
| `Esc` | Limpar selecao e voltar para Select |
| `[` | Diminuir raio do pincel |
| `]` | Aumentar raio do pincel |

Os atalhos nao disparam enquanto voce esta digitando em inputs, selects ou textareas.

---

## Modelos

Modelos colocados em `public/` podem ser servidos diretamente pelo app. A rota `src/app/api/models/route.ts` lista arquivos `.glb` e `.gltf` encontrados nessa pasta.

---

## Agente IA (NVIDIA NIM)

O editor tem um agente para gerar cenas com primitivas via NVIDIA NIM usando o modelo `meta/llama-3.1-8b-instruct`.

<details>
<summary><b>Variaveis de ambiente</b></summary>

Crie o arquivo `.env` (ou use `.env.local`) com:

```env
NVIDIA_NIM_API_KEY=your_nvidia_nim_api_key
NVIDIA_NIM_MODEL=meta/llama-3.1-8b-instruct
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

</details>

Na toolbar, use o botao `Gerar IA`, descreva a cena e o app cria automaticamente primitivas e materiais.

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

- [x] Cena, materiais, import/export, atalhos
- [x] Edicao de malha (vertices/faces) e sculpt
- [x] Fisica com Rapier3D
- [x] Timeline com keyframes
- [x] Behaviors procedurais
- [x] Efeitos de particulas e fluid
- [x] Scripts por objeto
- [x] Layers e imagens de referencia
- [x] Desktop Electron
- [x] Agente IA (NVIDIA NIM)
- [ ] Operacoes de aresta (bevel, loop cut)
- [ ] Booleanos entre malhas
- [ ] Timeline com keyframes reais exportaveis
- [ ] Multi-materiais por face avancado

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

Este projeto esta em desenvolvimento ativo. A base atual cobre cena, materiais, import/export, atalhos, edicao de malha, sculpt, fisica, animacao, behaviors, efeitos e scripts.

<div align="center">

[![GitHub issues](https://img.shields.io/github/issues/DinDja/Editor-ThreeJS?style=flat-square)](https://github.com/DinDja/Editor-ThreeJS/issues)
[![GitHub stars](https://img.shields.io/github/stars/DinDja/Editor-ThreeJS?style=flat-square)](https://github.com/DinDja/Editor-ThreeJS)
[![GitHub forks](https://img.shields.io/github/forks/DinDja/Editor-ThreeJS?style=flat-square)](https://github.com/DinDja/Editor-ThreeJS)
[![GitHub last commit](https://img.shields.io/github/last-commit/DinDja/Editor-ThreeJS?style=flat-square)](https://github.com/DinDja/Editor-ThreeJS)

</div>
