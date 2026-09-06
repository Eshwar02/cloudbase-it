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
    <div className="flex min-h-full items-center justify-center bg-g-rail p-4">
      <GlassCard className="w-full max-w-md p-10">
        <LottieCharacter state={state} className="mx-auto mb-2 h-32 w-32" />
        <h1 className="text-center font-display text-2xl text-g-text">Sign in</h1>
        <p className="mb-6 text-center text-sm text-g-muted">to continue to Cloudbase</p>
        <motion.form onSubmit={onSubmit} key={shake}
          animate={shake ? { x: [0, -8, 8, -6, 6, 0] } : {}} transition={{ duration: 0.4 }}
          className="space-y-4">
          <input aria-label="Email" type="email" required value={email}
            onChange={(e) => setEmail(e.target.value)} placeholder="Email"
            className="w-full rounded-lg border border-g-borderStrong bg-white px-4 py-3 text-g-text outline-none transition-colors focus:border-g-blue focus:ring-1 focus:ring-g-blue" />
          <input aria-label="Password" type="password" required value={password}
            onChange={(e) => setPassword(e.target.value)} placeholder="Password"
            className="w-full rounded-lg border border-g-borderStrong bg-white px-4 py-3 text-g-text outline-none transition-colors focus:border-g-blue focus:ring-1 focus:ring-g-blue" />
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <Button type="submit" intent="primary" isLoading={loginMut.isPending} className="w-full">
            Log in
          </Button>
        </motion.form>
        <p className="mt-6 text-center text-sm text-g-muted">
          No account? <Link to="/register" className="font-medium text-g-blue hover:underline">Create one</Link>
        </p>
      </GlassCard>
    </div>
  );
}
