# Admin login: 400 su Supabase e redirect a login

## Cosa significa il 400 su `token?grant_type=password`

La richiesta **non** arriva alla tabella `admin_users`. Il flusso è:

1. **Supabase Auth** (email/password) → se risponde **400**, il login è rifiutato e non viene creato nessun JWT.
2. Solo **dopo** un login Supabase valido, l’app usa il JWT per chiamare l’API `/admin/check`, che controlla `admin_users`.

Quindi: **400 = Supabase Auth rifiuta le credenziali** (prima di qualsiasi controllo su `admin_users`).

## Cosa controllare su Vercel

1. **Variabili d’ambiente**
   - In Vercel (Project → Settings → Environment Variables) devono essere impostate:
     - `NEXT_PUBLIC_SUPABASE_URL` = URL del progetto Supabase (es. `https://xxx.supabase.co`)
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon key dello **stesso** progetto.
   - Devono essere **identici** al progetto in cui l’utente è stato creato in Authentication (e in cui hai inserito la riga in `admin_users`).

2. **Stesso progetto Supabase**
   - L’utente deve esistere in **Authentication** (Supabase Dashboard → Authentication → Users).
   - La riga in `admin_users` deve usare lo stesso `user_id` (UUID) di quell’utente.
   - Se l’admin è stato creato in un altro progetto Supabase, il login darà 400 (o “user not found”).

3. **Email confermata**
   - Se in Supabase è attivato “Confirm email”, l’utente deve aver confermato l’email, altrimenti il login può essere rifiutato (es. 400).

4. **Password corretta**
   - Verifica che la password usata nel form sia quella impostata per quell’email in Supabase (puoi resettarla da Authentication → Users → User → Reset password).

## Come verificare

- In **Supabase Dashboard** → Authentication → Users: controlla che l’email che usi per il login esista e che il suo UUID sia quello che hai in `public.admin_users`.
- Fai un test di login con la stessa email/password da **Supabase Dashboard** (Authentication → Users → “Sign in with…” o da un piccolo script che usa `signInWithPassword` con le stesse variabili d’ambiente di Vercel) per confermare che Supabase accetta le credenziali.

## curl 401 su `/admin/check`

`curl http://localhost:3001/admin/check` senza header `Authorization: Bearer <token>` restituisce **401** per design: senza token non sei autenticato. Non indica che l’utente manca da `admin_users`; indica solo che la richiesta è senza token.
