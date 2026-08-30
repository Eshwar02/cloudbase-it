import Lottie from "lottie-react";
import idle from "../assets/lottie/idle.json";
import yes from "../assets/lottie/yes.json";
import no from "../assets/lottie/no.json";
import write from "../assets/lottie/write.json";

export type CharacterState = "idle" | "yes" | "no" | "write" | "success";

const MAP: Record<CharacterState, unknown> = {
  idle, yes, no, write, success: yes,
};

export function LottieCharacter({ state, className = "" }: { state: CharacterState; className?: string }) {
  const loop = state === "idle";
  return (
    <div className={className} data-testid="lottie-character" data-state={state}>
      <Lottie animationData={MAP[state] as object} loop={loop} autoplay />
    </div>
  );
}
