"use client";

import { resumeAI } from "@/lib/humanApi";

export function HumanResumeAIButton({
  conversationId,
}: {
  conversationId: string;
}) {
  const handleClick = async () => {
    try {
      await resumeAI(conversationId);
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <button
      onClick={handleClick}
      style={{
        padding: "8px 12px",
        background: "#0f172a",
        color: "white",
        borderRadius: 6,
        fontWeight: 600,
      }}
    >
      Resume AI
    </button>
  );
}
