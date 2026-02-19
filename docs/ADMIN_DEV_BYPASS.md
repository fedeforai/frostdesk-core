# Admin access in development

## Bypass (solo in dev)

Se l’API è avviata con **NODE_ENV !== 'production'** (es. `pnpm dev` senza impostare `NODE_ENV=production`):

- **Qualsiasi utente autenticato** (JWT valido) viene considerato admin.
- Non serve avere una riga in `public.admin_users` per accedere all’admin in locale.
- In **produzione** il controllo resta obbligatorio: solo gli utenti in `admin_users` possono accedere.

Così puoi usare l’admin in sviluppo anche prima di aver inserito il tuo `user_id` in `admin_users`.

## Log in caso di 403

- **In dev:** se l’utente non è in `admin_users`, in console vedi un warning con `userId` e il suggerimento di aggiungerlo a `admin_users` (il bypass ti fa entrare comunque).
- **In produzione:** prima del 403 viene loggato il `userId` che non è in `admin_users`, così puoi correggere i dati o aggiungere l’utente.

## Verificare che API e DB siano lo stesso progetto

L’API usa `DATABASE_URL` (e Supabase URL/key) da `apps/api/.env` (o dalla root). L’INSERT in `admin_users` va fatto **sullo stesso database** a cui punta `DATABASE_URL` dell’API. Se l’API punta a un altro progetto Supabase, il controllo `admin_users` legge da lì e non vedrà le righe inserite nell’altro DB.
