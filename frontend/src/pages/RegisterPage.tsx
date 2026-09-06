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
    <div className="flex min-h-full items-center justify-center bg-g-rail p-4">
      <GlassCard className="w-full max-w-md p-10">
        <LottieCharacter state={state} className="mx-auto mb-2 h-32 w-32" />
        <h1 className="text-center font-display text-2xl text-g-text">Create your account</h1>
        <p className="mb-6 text-center text-sm text-g-muted">to get started with Cloudbase</p>
        <motion.form onSubmit={onSubmit} className="space-y-4">
          <input aria-label="Name" required value={name} onChange={(e) => { setName(e.target.value); setState("write"); }}
            placeholder="Display name"
            className="w-full rounded-lg border border-g-borderStrong bg-white px-4 py-3 text-g-text outline-none transition-colors focus:border-g-blue focus:ring-1 focus:ring-g-blue" />
          <input aria-label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-lg border border-g-borderStrong bg-white px-4 py-3 text-g-text outline-none transition-colors focus:border-g-blue focus:ring-1 focus:ring-g-blue" />
          <input aria-label="Password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-lg border border-g-borderStrong bg-white px-4 py-3 text-g-text outline-none transition-colors focus:border-g-blue focus:ring-1 focus:ring-g-blue" />
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <Button type="submit" intent="primary" isLoading={registerMut.isPending} className="w-full">
            Sign up
          </Button>
        </motion.form>
        <p className="mt-6 text-center text-sm text-g-muted">
          Have an account? <Link to="/login" className="font-medium text-g-blue hover:underline">Log in</Link>
        </p>
      </GlassCard>
    </div>
  );
}
