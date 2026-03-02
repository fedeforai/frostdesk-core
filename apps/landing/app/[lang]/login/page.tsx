import { getLang, getTranslations } from "@/lib/translations";
import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = getLang(lang);
  const t = getTranslations(locale);

  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <h1 className="text-2xl font-bold text-text-primary">{t.login.title}</h1>
      <p className="mt-2 text-muted">{t.login.sub}</p>
      <LoginForm lang={locale} />
    </div>
  );
}
