"use client";

import React, { useRef, useEffect, useState } from "react";
import { useScroll, useTransform, motion, type MotionValue } from "framer-motion";

export function ContainerScroll({
  titleComponent,
  children,
}: {
  titleComponent: string | React.ReactNode;
  children: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
  });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(typeof window !== "undefined" && window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const scaleOutput = isMobile ? [0.7, 0.9] : [1.05, 1];
  const rotate = useTransform(scrollYProgress, [0, 1], [20, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], scaleOutput);
  const translate = useTransform(scrollYProgress, [0, 1], [0, -100]);

  return (
    <div
      className="flex h-[60rem] md:h-[80rem] min-w-0 w-full max-w-full items-center justify-center relative p-4 md:p-12 overflow-x-hidden"
      ref={containerRef}
    >
      <div
        className="py-10 md:py-40 w-full relative"
        style={{ perspective: "1000px" }}
      >
        <ContainerScrollHeader translate={translate} titleComponent={titleComponent} />
        <ContainerScrollCard rotate={rotate} scale={scale}>
          {children}
        </ContainerScrollCard>
      </div>
    </div>
  );
}

function ContainerScrollHeader({
  translate,
  titleComponent,
}: {
  translate: MotionValue<number>;
  titleComponent: string | React.ReactNode;
}) {
  return (
    <motion.div
      style={{ translateY: translate }}
      className="max-w-5xl mx-auto text-center"
    >
      {typeof titleComponent === "string" ? (
        <h2 className="font-heading text-3xl font-bold text-text-primary md:text-4xl">
          {titleComponent}
        </h2>
      ) : (
        titleComponent
      )}
    </motion.div>
  );
}

function ContainerScrollCard({
  rotate,
  scale,
  children,
}: {
  rotate: MotionValue<number>;
  scale: MotionValue<number>;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      style={{
        rotateX: rotate,
        scale,
        boxShadow:
          "0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 149px 60px #0000000a, 0 233px 65px #00000003",
      }}
      className="max-w-5xl -mt-12 mx-auto h-[30rem] md:h-[40rem] w-full border-4 border-white/20 p-2 md:p-6 bg-background rounded-[30px] shadow-2xl"
    >
      <div className="h-full w-full overflow-hidden rounded-2xl bg-white/5 border border-white/10 md:p-4 flex items-center justify-center">
        {children}
      </div>
    </motion.div>
  );
}
