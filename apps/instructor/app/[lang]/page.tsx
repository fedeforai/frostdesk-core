import Image from "next/image";
import { getLang } from "@/lib/landing/translations";
import { Hero } from "@/components/landing/Hero";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { TextRevealByWord } from "@/components/landing/TextRevealByWord";
import { SolutionCards } from "@/components/landing/SolutionCards";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ContainerScroll } from "@/components/landing/ContainerScroll";
import { ValueStack } from "@/components/landing/ValueStack";
import { FAQ } from "@/components/landing/FAQ";
import { CTABlock } from "@/components/landing/CTABlock";
import { DepositBlock } from "@/components/landing/DepositBlock";
import { WaitlistForm } from "@/components/landing/WaitlistForm";
import { getTranslations } from "@/lib/landing/translations";

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = getLang(lang);
  const t = getTranslations(locale);

  return (
    <>
      <Hero lang={locale} />
      <ProblemSection lang={locale} />
      <TextRevealByWord text={t.solution.title} className="font-heading" />
      <SolutionCards lang={locale} />
      <HowItWorks lang={locale} />
      <ContainerScroll titleComponent={t.containerScroll.title}>
        <div className="flex flex-col h-full w-full items-center justify-center gap-4 md:gap-6">
          <div className="relative w-full max-w-2xl aspect-video rounded-xl overflow-hidden flex-shrink-0">
            <Image
              src="/frostdesk-ski-card.png"
              alt="FrostDesk: one inbox, AI drafts, booking automation"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 672px"
              priority={false}
            />
          </div>
          <p className="font-heading text-lg text-text-primary text-center max-w-xl mx-auto">
            One inbox. AI drafts. Booking automation. Your calendar, full.
          </p>
        </div>
      </ContainerScroll>
      <ValueStack lang={locale} />
      <FAQ lang={locale} />
      <CTABlock lang={locale} />
      <DepositBlock lang={locale} />
      <WaitlistForm lang={locale} />
    </>
  );
}
