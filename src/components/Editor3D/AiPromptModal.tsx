'use client';

import { useState, type FormEvent } from 'react';
import { Bot, Loader2, X } from 'lucide-react';

type AiPromptModalProps = {
  open: boolean;
  generating: boolean;
  error: string | null;
  onSubmit: (prompt: string) => void;
  onClose: () => void;
};

export default function AiPromptModal({ open, generating, error, onSubmit, onClose }: AiPromptModalProps) {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || generating) return;
    onSubmit(prompt.trim());
  };

  const handleClose = () => {
    if (generating) return;
    setPrompt('');
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-[2px]"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-neutral-800/60 bg-[#17191b] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho - Alinhamento óptico ajustado */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide text-neutral-200">
            Modelar com IA
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={generating}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-neutral-300 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Label e Input */}
          <div className="space-y-2">
            <label htmlFor="ai-prompt" className="block text-xs font-medium text-neutral-400">
              Descreva a cena que deseja gerar
            </label>
            <textarea
              id="ai-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex: robô futurista com base metálica, luzes neon e pedestal"
              rows={4}
              disabled={generating}
              className="w-full resize-none rounded-lg border border-neutral-800 bg-[#111315] p-3 text-sm text-neutral-200 placeholder-neutral-600 outline-none transition-all focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Feedback de Erro - Tipografia e espaçamento mais limpos */}
          {error && (
            <div className="mt-3 rounded-lg border border-red-950 bg-red-950/20 px-3.5 py-2.5 text-xs text-red-400">
              {error}
            </div>
          )}

          {/* Rodapé - Ajuste nos tamanhos dos botões (h-9) para maior elegância */}
          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={generating}
              className="inline-flex h-9 cursor-pointer items-center justify-center rounded-lg border border-neutral-800 bg-transparent px-4 text-xs font-medium text-neutral-400 transition-colors hover:bg-neutral-800/40 hover:text-neutral-200 disabled:cursor-not-allowed disabled:opacity-30"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!prompt.trim() || generating}
              className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 text-xs font-semibold text-neutral-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-30"
            >
              {generating ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Gerando...</span>
                </>
              ) : (
                <>
                  <Bot size={13} />
                  <span>Gerar Cena</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}