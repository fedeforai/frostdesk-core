import { getLang } from "@/lib/translations";
import { Hero } from "@/components/Hero";
import { ProblemSection } from "@/components/ProblemSection";
import { SolutionCards } from "@/components/SolutionCards";
import { HowItWorks } from "@/components/HowItWorks";
import { ValueStack } from "@/components/ValueStack";
import { FAQ } from "@/components/FAQ";
import { CTABlock } from "@/components/CTABlock";
import { DepositBlock } from "@/components/DepositBlock";
import { WaitlistForm } from "@/components/WaitlistForm";

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = getLang(lang);

  return (
    <>
      <Hero lang={locale} />
      <ProblemSection lang={locale} />
      <SolutionCards lang={locale} />
      <HowItWorks lang={locale} />
      <ValueStack lang={locale} />
      <FAQ lang={locale} />
      <CTABlock lang={locale} />
      <DepositBlock lang={locale} />
      <WaitlistForm lang={locale} />
    </>
  );
}
