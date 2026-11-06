import type { LearningSubject } from './types';

export const LEARNING_SUBJECTS: LearningSubject[] = [
  {
    id: 'mathematics',
    name: 'Matemática',
    description: 'Formas, números, medidas e relações.',
    topics: ['Geometria espacial', 'Área e volume', 'Proporção e escala'],
  },
  {
    id: 'physics',
    name: 'Física',
    description: 'Movimento, forças, energia e fenômenos naturais.',
    topics: ['Gravidade e queda dos corpos', 'Colisões', 'Movimento e velocidade'],
  },
  {
    id: 'chemistry',
    name: 'Química',
    description: 'Matéria, elementos, moléculas e transformações.',
    topics: ['Estrutura atômica', 'Moléculas', 'Estados da matéria'],
  },
  {
    id: 'biology',
    name: 'Biologia',
    description: 'Seres vivos, células e relações entre organismos.',
    topics: ['Estrutura de uma célula', 'Ecossistemas', 'Cadeias alimentares'],
  },
  {
    id: 'geography',
    name: 'Geografia',
    description: 'Paisagens, territórios e sistemas da Terra.',
    topics: ['Relevo e bacias hidrográficas', 'Biomas brasileiros', 'Urbanização'],
  },
  {
    id: 'history',
    name: 'História',
    description: 'Sociedades, acontecimentos e transformações no tempo.',
    topics: ['Revolução Industrial', 'Civilizações antigas', 'História do Brasil'],
  },
  {
    id: 'arts-design',
    name: 'Artes e design',
    description: 'Composição, formas, materiais, cores e criação.',
    topics: ['Teoria das cores', 'Composição visual', 'Escultura e forma'],
  },
  {
    id: 'computing',
    name: 'Computação',
    description: 'Lógica, algoritmos e experiências interativas.',
    topics: ['Lógica condicional', 'Eventos e interações', 'Algoritmos'],
  },
  {
    id: 'languages',
    name: 'Linguagens',
    description: 'Leitura, escrita, gramática e comunicação.',
    topics: ['Interpretação de texto', 'Vocabulário em inglês', 'Narrativa interativa'],
  },
  {
    id: 'interdisciplinary',
    name: 'Interdisciplinar',
    description: 'Projetos que conectam diferentes áreas do conhecimento.',
    topics: ['Cidade sustentável', 'Museu interativo', 'Construindo um ecossistema'],
  },
];

export const findLearningSubject = (id: string) =>
  LEARNING_SUBJECTS.find((subject) => subject.id === id) ?? LEARNING_SUBJECTS[0];
