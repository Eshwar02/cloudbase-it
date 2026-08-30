import { motion } from "framer-motion";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { GlassCard } from "../components/ui/GlassCard";
import { Button } from "../components/ui/Button";
import { LottieCharacter, type CharacterState } from "../components/LottieCharacter";
import { useAuth } from "../hooks/useAuth";

export default function LoginPage() {
  const { loginMut } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<CharacterState>("idle");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(0);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await loginMut.mutateAsync({ email, password });
      setState("yes");
      setTimeout(() => nav("/"), 700);
    } catch {
      setState("no");
      setError("Invalid email or password");
      setShake((s) => s + 1);
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <GlassCard className="w-full max-w-md p-8">
        <LottieCharacter state={state} className="mx-auto mb-4 h-40 w-40" />
        <h1 className="mb-6 text-center text-2xl font-semibold text-brand-blue">Welcome back</h1>
        <motion.form onSubmit={onSubmit} key={shake}
          animate={shake ? { x: [0, -8, 8, -6, 6, 0] } : {}} transition={{ duration: 0.4 }}
          className="space-y-4">
          <input aria-label="Email" type="email" required value={email}
            onChange={(e) => setEmail(e.target.value)} placeholder="Email"
            className="w-full rounded-full border border-white/50 bg-white/70 px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-violet" />
          <input aria-label="Password" type="password" required value={password}
            onChange={(e) => setPassword(e.target.value)} placeholder="Password"
            className="w-full rounded-full border border-white/50 bg-white/70 px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-violet" />
          {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
          <Button type="submit" intent="primary" isLoading={loginMut.isPending} className="w-full">
            Log in
          </Button>
        </motion.form>
        <p className="mt-4 text-center text-sm text-slate-500">
          No account? <Link to="/register" className="text-brand-violet">Create one</Link>
        </p>
      </GlassCard>
    </div>
  );
}
