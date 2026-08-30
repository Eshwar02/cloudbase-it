import { motion } from "framer-motion";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { GlassCard } from "../components/ui/GlassCard";
import { Button } from "../components/ui/Button";
import { LottieCharacter, type CharacterState } from "../components/LottieCharacter";
import { useAuth } from "../hooks/useAuth";

export default function RegisterPage() {
  const { registerMut } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<CharacterState>("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setState("write");
    try {
      await registerMut.mutateAsync({ email, password, display_name: name });
      setState("success");
      setTimeout(() => nav("/login"), 800);
    } catch (err: any) {
      setState("no");
      setError(err?.response?.status === 409 ? "That email is already registered" : "Could not create account");
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <GlassCard className="w-full max-w-md p-8">
        <LottieCharacter state={state} className="mx-auto mb-4 h-40 w-40" />
        <h1 className="mb-6 text-center text-2xl font-semibold text-brand-violet">Create account</h1>
        <motion.form onSubmit={onSubmit} className="space-y-4">
          <input aria-label="Name" required value={name} onChange={(e) => { setName(e.target.value); setState("write"); }}
            placeholder="Display name"
            className="w-full rounded-full border border-white/50 bg-white/70 px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-violet" />
          <input aria-label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-full border border-white/50 bg-white/70 px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-violet" />
          <input aria-label="Password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-full border border-white/50 bg-white/70 px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-violet" />
          {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
          <Button type="submit" intent="secondary" isLoading={registerMut.isPending} className="w-full">
            Sign up
          </Button>
        </motion.form>
        <p className="mt-4 text-center text-sm text-slate-500">
          Have an account? <Link to="/login" className="text-brand-blue">Log in</Link>
        </p>
      </GlassCard>
    </div>
  );
}
