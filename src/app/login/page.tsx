'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Eye, EyeOff, KeyRound, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import BrandMark from '@/components/auth/BrandMark';
import TupiPattern from '@/components/auth/TupiPattern';
import Button from '@/components/ui/Button';
import Checkbox from '@/components/ui/Checkbox';
import Input from '@/components/ui/Input';

type LoginErrors = {
  email?: string;
  password?: string;
  form?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const microTexts = [
  'Arandu como princípio. Tecnologia como caminho.',
  'Do território aos dados, da ideia à ação.',
  'Uma jornada digital com identidade brasileira.',
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<LoginErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [microIndex] = useState(0);

  const validate = (): LoginErrors => {
    const next: LoginErrors = {};
    if (!email.trim()) {
      next.email = 'Informe seu e-mail institucional.';
    } else if (!EMAIL_PATTERN.test(email.trim())) {
      next.email = 'Formato de e-mail inválido.';
    }
    if (!password) {
      next.password = 'Digite sua senha de acesso.';
    } else if (password.length < 6) {
      next.password = 'A senha deve ter ao menos 6 caracteres.';
    }
    return next;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 700));
      router.push('/editor');
    } catch {
      setErrors({ form: 'Não foi possível autenticar. Tente novamente.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSocial = (provider: 'sso' | 'sso-alt') => {
    setSubmitting(true);
    setTimeout(() => {
      router.push('/editor');
    }, 600);
    void provider;
  };

  return (
    <main className="relative min-h-screen w-full bg-[#0a0c0d] text-neutral-100">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -left-40 top-0 h-[640px] w-[640px] rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute -right-32 bottom-0 h-[520px] w-[520px] rounded-full bg-cyan-500/5 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.06),_transparent_55%)]" />
      </div>

      <div className="grid h-dvh w-full lg:grid-cols-[1.1fr_1fr]">
        <section className="relative hidden flex-col justify-between overflow-hidden border-r border-neutral-800/60 bg-gradient-to-br from-[#0e1012] via-[#0c0e10] to-[#0a0c0d] px-14 py-24 lg:flex xl:px-20 xl:py-28">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <TupiPattern className="absolute -right-32 -top-32 h-[680px] w-[680px] text-emerald-400" />
            <TupiPattern
              variant="rings"
              className="absolute -left-24 -bottom-24 h-[420px] w-[420px] text-emerald-500/40"
            />
            <TupiPattern
              variant="constellation"
              className="absolute right-10 bottom-10 h-[180px] w-[180px] text-emerald-300/30"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(10,12,13,0.6)_75%,rgba(10,12,13,0.95)_100%)]" />
          </div>

          <div className="relative z-10 flex items-center justify-between">
            <BrandMark />
            <span className="hidden rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-emerald-300/80 sm:inline-flex">
              Plataforma · v1.0
            </span>
          </div>

          <div className="relative z-10 max-w-xl">
            <div className="mb-14 inline-flex items-center gap-2 rounded-full border border-neutral-800/80 bg-neutral-900/60 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-emerald-300/90">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              Território · Conhecimento · Ação
            </div>

            <h1 className="text-balance text-4xl font-semibold leading-[1.08] tracking-tight text-neutral-50 sm:text-5xl xl:text-[56px]">
              Entre no <span className="text-emerald-300">fluxo</span> do
              <br />
              conhecimento.
            </h1>

            <p className="mt-12 max-w-lg text-pretty text-[15px] leading-relaxed text-neutral-400">
              Uma experiência digital guiada por tecnologia, território e
              inteligência. Modele cenas, organize dados e transforme
              informações em decisões com uma interface brasileira, clara e
              autoral.
            </p>

            <ul className="mt-20 grid gap-6 text-sm text-neutral-300 sm:grid-cols-2">
              <li className="flex items-start gap-3">
                <ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-400" />
                <span>Acesso seguro com criptografia ponta a ponta.</span>
              </li>
              <li className="flex items-start gap-3">
                <Sparkles size={16} className="mt-0.5 shrink-0 text-emerald-400" />
                <span>IA aplicada à modelagem e à curadoria de cena.</span>
              </li>
              <li className="flex items-start gap-3">
                <KeyRound size={16} className="mt-0.5 shrink-0 text-emerald-400" />
                <span>Integração institucional via SSO disponível.</span>
              </li>
              <li className="flex items-start gap-3">
                <Mail size={16} className="mt-0.5 shrink-0 text-emerald-400" />
                <span>Suporte humano em horário institucional.</span>
              </li>
            </ul>
          </div>

          <div className="relative z-10 flex flex-col gap-3 text-[11px] text-neutral-500">
            <p className="uppercase tracking-[0.28em] text-emerald-400/60">
              {microTexts[microIndex]}
            </p>
            <p>
              © {new Date().getFullYear()} Monhang Editor — todos os direitos
              reservados.
            </p>
          </div>
        </section>

        <section className="relative flex flex-col overflow-y-auto px-6 py-16 sm:px-10 sm:py-20 lg:px-16 lg:py-24 xl:px-24">
          <div className="m-auto flex w-full max-w-md flex-col">
            <div className="mb-14 flex items-center justify-between lg:hidden">
              <BrandMark />
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-emerald-300/80">
                v1.0
              </span>
            </div>

            <h2 className="mb-2 pb-2 text-2xl font-semibold tracking-tight text-neutral-50 sm:text-3xl">
              Acessar plataforma
            </h2>

            <div className="rounded-2xl border border-neutral-800/80 bg-gradient-to-b from-[#131517] to-[#0e1012] p-8 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.7)] backdrop-blur-sm sm:p-12">
              <form onSubmit={handleSubmit} noValidate className="grid gap-7">
                <Input
                  label="E-mail"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="voce@organizacao.gov.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={errors.email}
                  iconLeft={<Mail size={15} />}
                  disabled={submitting}
                />

                <div className="grid gap-2.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-400"
                    >
                      Senha
                    </label>
                  </div>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center text-neutral-500">
                      <KeyRound size={15} />
                    </span>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={submitting}
                      aria-invalid={Boolean(errors.password) || undefined}
                      aria-describedby={errors.password ? 'password-error' : undefined}
                      className={`h-11 w-full rounded-lg border bg-[#0f1113] pl-10 pr-10 text-sm text-neutral-100 placeholder:text-neutral-600 outline-none transition focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50 ${
                        errors.password
                          ? 'border-red-500/60 focus:border-red-500/70 focus:ring-red-500/20'
                          : 'border-neutral-800'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      tabIndex={-1}
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      className="absolute inset-y-0 right-0 flex w-10 cursor-pointer items-center justify-center text-neutral-500 transition hover:text-neutral-200"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                    <a
                      href="#recuperar"
                      className="text-[11px] font-medium text-emerald-400/90 outline-none transition hover:text-emerald-300 focus-visible:text-emerald-300"
                    >
                      Esqueci a senha
                    </a>
                  {errors.password && (
                    <p id="password-error" className="text-[11px] text-red-400">
                      {errors.password}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Checkbox
                    name="remember"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    label="Manter acesso neste dispositivo"
                  />
                </div>

                {errors.form && (
                  <div
                    role="alert"
                    className="rounded-lg border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300"
                  >
                    {errors.form}
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  loading={submitting}
                  iconRight={!submitting ? <ArrowRight size={15} /> : undefined}
                  className="mt-3 w-full"
                >
                  {submitting ? 'Autenticando...' : 'Entrar no editor'}
                </Button>
              </form>

              <div className="py-5 my-10 flex items-center gap-3 text-[11px] uppercase tracking-[0.22em] text-neutral-600">
                <span className="h-px flex-1 bg-neutral-800" />
                <span>ou continue com</span>
                <span className="h-px flex-1 bg-neutral-800" />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => handleSocial('sso')}
                  disabled={submitting}
                  className="w-full"
                >
                  SSO institucional
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => handleSocial('sso-alt')}
                  disabled={submitting}
                  className="w-full"
                >
                  gov.br
                </Button>
              </div>
            </div>

            <p className="mt-10 text-center text-[12px] text-neutral-500 py-2">
              Não possui cadastro?{' '}
              <a
                href="#solicitar"
                className="font-medium text-emerald-400 outline-none transition hover:text-emerald-300 focus-visible:text-emerald-300"
              >
                Solicitar acesso
              </a>
            </p>

            <p className="mt-12 text-center text-[10px] uppercase tracking-[0.28em] text-neutral-600 lg:hidden">
              {microTexts[microIndex]}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
