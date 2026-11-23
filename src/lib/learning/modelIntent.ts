export const isExplicit3DModelRequest = (prompt: string) => {
  const normalized = prompt
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('pt-BR');

  return /\b(?:faz|faca|cria|crie|criar|gera|gere|gerar|monta|monte|montar|construa|construi|construir|modela|modele|modelar|produza|produz|produzir)\b.{0,60}\b(?:modelo|modelagem|cena|objeto|maquete|3d|tridimensional)\b/.test(normalized)
    || /\b(?:modelo|cena|objeto|maquete)\s+(?:3d|tridimensional)\b/.test(normalized);
};
