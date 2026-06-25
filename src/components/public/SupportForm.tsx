'use client';

import { useState, type FormEvent } from 'react';
import { Send, Loader2, CheckCircle2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

const subjectOptions = [
  { value: 'duvida', label: 'Duvida' },
  { value: 'bug', label: 'Bug / Problema tecnico' },
  { value: 'sugestao', label: 'Sugestao' },
  { value: 'comercial', label: 'Duvida comercial' },
  { value: 'outro', label: 'Outro' },
];

export default function SupportForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('duvida');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email.trim() || !message.trim()) {
      setError('Preencha todos os campos obrigatorios.');
      return;
    }

    setSubmitting(true);
    try {
      // TODO: Conectar ao endpoint de suporte da API
      // const response = await fetch('/api/support', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ name, email, subject, message }),
      // });
      await new Promise((r) => setTimeout(r, 1000));
      setSent(true);
    } catch {
      setError('Erro ao enviar. Tente novamente mais tarde.');
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center sm:p-12">
        <CheckCircle2 size={40} className="mx-auto text-emerald-400" />
        <h3 className="mt-4 text-lg font-semibold text-neutral-100">Mensagem enviada</h3>
        <p className="mt-2 text-sm text-neutral-400">
          Recebemos sua solicitacao. Responderemos em ate 2 dias uteis pelo e-mail informado.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Nome"
          name="name"
          placeholder="Seu nome completo"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={submitting}
        />
        <Input
          label="E-mail"
          name="email"
          type="email"
          placeholder="voce@exemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={submitting}
        />
      </div>

      <div className="grid gap-2">
        <label
          htmlFor="subject"
          className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-400"
        >
          Tipo de solicitacao
        </label>
        <select
          id="subject"
          name="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          disabled={submitting}
          className="h-11 w-full rounded-lg border border-neutral-800 bg-[#0f1113] px-3.5 text-sm text-neutral-100 outline-none transition focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {subjectOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2">
        <label
          htmlFor="message"
          className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-400"
        >
          Mensagem
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          placeholder="Descreva sua duvida, sugestao ou problema..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={submitting}
          className="w-full rounded-lg border border-neutral-800 bg-[#0f1113] px-3.5 py-3 text-sm text-neutral-100 placeholder:text-neutral-600 outline-none transition focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
        />
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          type="submit"
          size="lg"
          loading={submitting}
          iconRight={!submitting ? <Send size={15} /> : undefined}
        >
          {submitting ? 'Enviando...' : 'Enviar mensagem'}
        </Button>
      </div>
    </form>
  );
}
