import Image from "next/image";
import { getLang } from "@/lib/translations";
import { Hero } from "@/components/Hero";
import { ProblemSection } from "@/components/ProblemSection";
import { TextRevealByWord } from "@/components/TextRevealByWord";
import { SolutionCards } from "@/components/SolutionCards";
import { HowItWorks } from "@/components/HowItWorks";
import { ContainerScroll } from "@/components/ContainerScroll";
import { ValueStack } from "@/components/ValueStack";
import { FAQ } from "@/components/FAQ";
import { CTABlock } from "@/components/CTABlock";
import { DepositBlock } from "@/components/DepositBlock";
import { WaitlistForm } from "@/components/WaitlistForm";
import { getTranslations } from "@/lib/translations";

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
