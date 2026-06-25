import type { Metadata } from 'next';
import { SITE } from '@/lib/seo';
import FAQAccordion from '@/components/public/FAQAccordion';

export const metadata: Metadata = {
  title: 'Central de Ajuda',
  description: 'Central de Ajuda do Monhang Editor 3D. Respostas para as principais duvidas sobre modelagem 3D, cenas, interacoes e exportacao.',
  alternates: { canonical: `${SITE.url}/ajuda` },
};

type HelpCategory = {
  title: string;
  icon: string;
  items: { question: string; answer: string }[];
};

const helpCategories: HelpCategory[] = [
  {
    title: 'Primeiros Passos',
    icon: 'Rocket',
    items: [
      {
        question: 'Como criar meu primeiro projeto?',
        answer:
          'Apos fazer login, clique em "Novo Projeto" no painel inicial. Voce pode comecar com uma cena vazia ou escolher um template. A interface do editor sera aberta automaticamente no Modo Cena para voce comecar a modelagem.',
      },
      {
        question: 'Quais navegadores sao compativeis?',
        answer:
          'O Monhang Editor 3D funciona melhor no Google Chrome, Microsoft Edge e Firefox. Para performance ideal com WebGL, mantenha seu navegador e drivers de placa de video atualizados.',
      },
    ],
  },
  {
    title: 'Modo Cena',
    icon: 'Box',
    items: [
      {
        question: 'Como importar um modelo 3D?',
        answer:
          'No Modo Cena, clique em "Importar" na barra de ferramentas ou arraste um arquivo GLB/GLTF diretamente para o canvas 3D. Formatos suportados incluem GLB, GLTF, OBJ e FBX.',
      },
      {
        question: 'Como usar uma cena 3D em uma pagina?',
        answer:
          'No Modo Pagina, insira um bloco "Cena 3D" e selecione a cena que voce criou no Modo Cena. A cena sera renderizada com WebGL dentro da pagina. Voce pode redimensionar e posicionar o canvas como qualquer outro bloco.',
      },
      {
        question: 'O que fazer se o modelo nao aparecer?',
        answer:
          'Verifique se o arquivo esta no formato correto (GLB/GLTF de preferencia), se o modelo tem escala compativel com a cena, se ha iluminacao na cena e se a camera esta posicionada corretamente. Tente clicar em "Enquadrar" na barra de ferramentas.',
      },
      {
        question: 'O que fazer se a textura nao carregar?',
        answer:
          'Confira se o arquivo de textura esta no mesmo diretorio do modelo e se o caminho no material esta correto. Formatos compativeis: PNG, JPG, WEBP. Texturas muito grandes podem demorar para carregar.',
      },
      {
        question: 'Como reduzir o peso de uma cena?',
        answer:
          'Reduza a quantidade de poligonos dos modelos (use decimacao), comprima texturas (use formatos como WEBP), limite o numero de luzes e sombras, e evite objetos fora do campo de visao. No Modo Cena, o painel de Estatisticas mostra o uso de recursos.',
      },
    ],
  },
  {
    title: 'Modo Pagina',
    icon: 'Layout',
    items: [
      {
        question: 'Como criar uma landing page com elementos 3D?',
        answer:
          'No Modo Pagina, monte sua pagina com blocos HTML (titulos, textos, botoes) e insira blocos "Cena 3D" nos locais onde deseja renderizacao WebGL. A cena 3D pode servir como background, hero ou componente interativo.',
      },
      {
        question: 'Posso usar CSS customizado?',
        answer:
          'Sim. Voce pode adicionar classes CSS customizadas nos blocos HTML e definir estilos globais no painel de configuracao da pagina. O sistema preserva suas customizacoes na exportacao.',
      },
    ],
  },
  {
    title: 'Modo Interacoes',
    icon: 'MousePointerClick',
    items: [
      {
        question: 'Como criar uma interacao?',
        answer:
          'No Modo Interacoes, selecione um elemento (HTML ou 3D) e escolha um gatilho (click, hover, scroll, timer). Depois defina a acao: animar, mostrar/esconder, navegar ou executar script. O editor visual mostra a conexao entre gatilho e acao.',
      },
    ],
  },
  {
    title: 'Preview',
    icon: 'Eye',
    items: [
      {
        question: 'Como testar no Preview?',
        answer:
          'Clique no botao "Preview" na barra superior do editor. O Preview carrega sua pagina completa com cenas 3D, interacoes e scripts funcionando. E uma simulacao exata do resultado exportado. Para sair, clique em "Voltar ao Editor".',
      },
    ],
  },
  {
    title: 'Exportacao',
    icon: 'Download',
    items: [
      {
        question: 'Como exportar para Next.js?',
        answer:
          'No Modo Exportacao, selecione "Next.js" como formato de saida. O sistema gera um projeto completo com estrutura App Router, componentes React, arquivos de cena 3D e todas as dependencias. Basta descompactar e rodar `npm install && npm run dev`.',
      },
      {
        question: 'Como exportar para React?',
        answer:
          'No Modo Exportacao, selecione "React" como formato de saida. O sistema gera um componente React funcional com a cena 3D embutida, pronto para ser integrado a qualquer projeto React existente.',
      },
      {
        question: 'O codigo exportado e realmente funcional?',
        answer:
          'Sim. O codigo exportado utiliza Three.js e React Three Fiber, e funciona exatamente como o Preview. Voce pode editar, versionar e implantar livremente em qualquer hospedagem com suporte a Node.js.',
      },
    ],
  },
  {
    title: 'Importacao de GLB/GLTF',
    icon: 'Upload',
    items: [
      {
        question: 'Quais formatos 3D sao suportados?',
        answer:
          'GLB (recomendado), GLTF, OBJ e FBX. O formato GLB e o ideal por ser compacto, autossuficiente e amplamente suportado pelo Three.js. Para OBJ e FBX, recomendamos converter para GLB antes da importacao quando possivel.',
      },
      {
        question: 'Meu modelo tem animacoes. Elas serao preservadas?',
        answer:
          'Sim. O Monhang Editor 3D suporta animacoes embutidas em arquivos GLB/GLTF. Voce pode controlar, pausar e sincronizar animacoes no Modo Interacoes e na Timeline.',
      },
    ],
  },
  {
    title: 'Performance',
    icon: 'Zap',
    items: [
      {
        question: 'Como melhorar o FPS da cena?',
        answer:
          'Reduza a contagem de poligonos, limite o numero de sombras e reflexos, use texturas otimizadas (maximo 2048x2048), evite muitas luzes dinamicas, e remova objetos fora de vista. O painel de Estatisticas mostra FPS, draw calls e uso de GPU.',
      },
    ],
  },
  {
    title: 'Conta e Acesso',
    icon: 'User',
    items: [
      {
        question: 'Como recuperar minha senha?',
        answer:
          'Na tela de login, clique em "Esqueci a senha" e siga as instrucoes enviadas para seu e-mail cadastrado. Se nao receber o e-mail, verifique a caixa de spam ou entre em contato pelo suporte.',
      },
    ],
  },
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-50 sm:text-4xl">
          Central de Ajuda
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-400 max-w-2xl">
          Encontre respostas para as principais duvidas sobre o Monhang Editor 3D. Navegue por categoria ou use a busca do seu navegador (Ctrl+F) para encontrar topicos especificos.
        </p>
      </div>

      <div className="mt-10 grid gap-6">
        {helpCategories.map((cat) => (
          <div
            key={cat.title}
            className="rounded-xl border border-neutral-800/60 bg-[#0f1113] p-5 sm:p-6"
          >
            <h2 className="text-base font-semibold text-neutral-100">
              {cat.title}
            </h2>
            <div className="mt-3">
              <FAQAccordion items={cat.items} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-xl border border-neutral-800/60 bg-[#0f1113] p-6 text-center">
        <p className="text-sm text-neutral-400">
          Nao encontrou o que procurava?{' '}
          <a href="/suporte" className="font-medium text-emerald-400 underline hover:text-emerald-300">
            Entre em contato com o suporte
          </a>.
        </p>
      </div>
    </div>
  );
}
