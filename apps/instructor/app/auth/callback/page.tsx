import { redirect } from 'next/navigation';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AuthCallbackLegacy({ searchParams }: Props) {
  const params = await searchParams;
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (Array.isArray(v)) v.forEach((vv) => search.append(k, vv));
    else if (v) search.append(k, v);
  });
  const qs = search.toString();
  redirect(qs ? `/instructor/auth/callback?${qs}` : '/instructor/auth/callback');
}
