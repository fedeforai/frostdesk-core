"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";

interface TextRevealByWordProps {
  text: string;
  className?: string;
}

export function TextRevealByWord({ text, className = "" }: TextRevealByWordProps) {
  const targetRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start 0.65", "end 0.35"],
  });
  const words = text.split(/\s+/).filter(Boolean);

  return (
    <div ref={targetRef} className={`relative z-0 min-h-[80vh] ${className}`.trim()} aria-hidden>
      <div className="sticky top-0 mx-auto flex min-h-[50%] max-w-4xl items-center justify-center bg-transparent px-4 py-12 md:py-16">
        <p
          className={`flex flex-wrap justify-center gap-x-2 gap-y-1 p-4 text-2xl font-bold md:p-6 md:text-3xl lg:text-4xl ${className}`.trim()}
        >
          {words.map((word, i) => {
            const start = i / words.length;
            const end = Math.min(start + 1 / words.length, 1);
            return (
              <TextRevealWord key={`${word}-${i}`} progress={scrollYProgress} range={[start, end]}>
                {word}
              </TextRevealWord>
            );
          })}
        </p>
      </div>
    </div>
  );
}

function TextRevealWord({
  children,
  progress,
  range,
}: {
  children: React.ReactNode;
  progress: MotionValue<number>;
  range: [number, number];
}) {
  const opacity = useTransform(progress, [range[0], range[1]], [0, 1]);
  const y = useTransform(progress, [range[0], range[1]], [6, 0]);
  return (
    <span className="relative inline-block shrink-0 overflow-hidden align-baseline whitespace-nowrap">
      <span className="inline-block text-muted/40" aria-hidden>
        {children}
      </span>
      <motion.span
        style={{ opacity, y }}
        className="absolute left-0 top-0 inline-block whitespace-nowrap text-text-primary"
        aria-hidden
      >
        {children}
      </motion.span>
    </span>
  );
}
