import { useRef, useState } from "react";

interface SpeakButtonProps {
  word: string;
  size?: "sm" | "md" | "lg";
}

export default function SpeakButton({ word, size = "md" }: SpeakButtonProps) {
  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  function speak() {
    if (!window.speechSynthesis) return;

    // Stop any current speech
    window.speechSynthesis.cancel();

    if (speaking) {
      setSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-US";
    utterance.rate = 0.85;
    utterance.pitch = 1;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }

  if (!window.speechSynthesis) return null;

  return (
    <button
      type="button"
      className={`speak-btn speak-btn--${size}${speaking ? " speaking" : ""}`}
      title={`השמע הגייה: ${word}`}
      onClick={speak}
      aria-label={`השמע את המילה ${word}`}
    >
      <span className="speak-icon">{speaking ? "🔊" : "🔈"}</span>
    </button>
  );
}
