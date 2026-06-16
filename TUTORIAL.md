# Tutorial do Editor ThreeJS

Este tutorial mostra o fluxo basico para criar, editar, modelar, esculpir, aplicar materiais e exportar uma cena no Editor ThreeJS.

## 1. Abrir o Editor

Inicie o servidor:

```bash
npm run dev
```

Abra:

```text
http://localhost:3000
```

O projeto comeca em branco. Use a toolbar superior para adicionar objetos, importar modelos e alternar ferramentas.

## 2. Criar um Objeto

1. Clique em `Add`.
2. Escolha uma primitiva: Cubo, Esfera, Cilindro, Cone, Toro ou Plano.
3. O objeto aparece na cena e fica selecionado.

Voce tambem pode clicar em `Importar` para carregar um arquivo `.glb` ou `.gltf`.

## 3. Selecionar e Transformar

Selecione objetos pelo viewport ou pelo Scene Graph.

Use as ferramentas:

- `Select`: selecionar e orbitar a camera.
- `Mover`: mover o objeto.
- `Girar`: rotacionar o objeto.
- `Escalar`: alterar escala.

Atalhos uteis:

- `G`: mover.
- `R`: girar.
- `S`: escalar.
- `Esc`: voltar para Select.

## 4. Editar Propriedades

No painel Properties, voce pode alterar:

- Nome do objeto.
- Visibilidade.
- Posicao, rotacao e escala.
- Material e textura.
- Configuracoes de modelagem.

## 5. Aplicar Material e Textura

No bloco Material:

1. Ajuste `Cor`, `Emissive`, `Metalness`, `Roughness` e `Opacidade`.
2. Clique em `Selecionar imagem` para adicionar uma textura.
3. Use o botao de lixeira para remover a textura.

As texturas aparecem no viewport e tambem entram no GLB exportado.

## 6. Modelar uma Primitiva

Com uma primitiva selecionada, use o bloco Modelagem para:

- Duplicar o objeto.
- Criar arrays.
- Espelhar nos eixos X, Y ou Z.
- Aplicar escala na geometria.
- Aumentar ou reduzir segmentos.
- Alterar largura, altura, profundidade, raio e segmentos.

Mais segmentos deixam a malha melhor para edicao e sculpt.

## 7. Edit Mode

Use `Editar`, `Vertices` ou `Faces` para entrar no modo de edicao de malha.

### Vertices

1. Clique em `Vertices`.
2. Clique nos pontos brancos da malha.
3. Use Shift para selecionar multiplos vertices.
4. Arraste o gizmo para mover os vertices selecionados.
5. Use `Soldar` para juntar vertices selecionados.

### Faces

1. Clique em `Faces`.
2. Clique nos pontos azuis no centro das faces.
3. Use o gizmo para mover a face selecionada.
4. Use `Extrudar` para puxar volume da face.
5. Use `Subdividir` para dividir uma face em triangulos menores.
6. Use `Face` para apagar a face selecionada.

Atalhos:

- `V`: modo vertices.
- `F`: modo faces.
- `E`: extrudar face selecionada.
- `Delete`: apagar face selecionada.

## 8. Sculpt

O modo Sculpt serve para deformar a malha como um pincel.

1. Selecione um objeto.
2. Clique em `Sculpt` ou pressione `B`.
3. Escolha o modo do pincel:
   - `Amassar`: empurra a superficie para dentro.
   - `Puxar`: puxa a superficie para fora.
   - `Inflar`: expande a regiao clicada.
   - `Suavizar`: suaviza os vertices proximos.
4. Ajuste `Raio` e `Forca`.
5. Clique e arraste sobre o modelo no viewport.

Atalhos do pincel:

- `[`: diminuir raio.
- `]`: aumentar raio.

## 9. Copiar, Colar e Apagar

Atalhos globais:

- `Ctrl+C`: copiar objeto.
- `Ctrl+V`: colar objeto.
- `Ctrl+D`: duplicar objeto.
- `Delete` ou `Backspace`: apagar objeto selecionado.
- `Ctrl+Z`: desfazer.
- `Ctrl+Y` ou `Ctrl+Shift+Z`: refazer.

Os atalhos nao disparam enquanto voce esta digitando em campos de texto.

## 10. Exportar

Quando a cena estiver pronta:

1. Clique em `Exportar`.
2. O app baixa um arquivo `editor-scene.glb`.
3. O GLB inclui objetos, transforms, materiais e texturas aplicadas.

## Dicas

- Para sculpt, use malhas com mais segmentos.
- Se a textura parecer antiga no navegador, faca hard refresh com `Ctrl + Shift + R`.
- Modelos GLB importados podem ser convertidos para uma malha editavel, mas a hierarquia e achatada em uma malha unica.
- Use o Scene Graph para encontrar objetos rapidamente em cenas maiores.
