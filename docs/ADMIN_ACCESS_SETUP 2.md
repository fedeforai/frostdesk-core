# Accesso admin e conferma instructor

L’admin non usa una password separata: è un **utente Supabase** che in DB ha il ruolo `admin` nella tabella `user_roles`. L’API controlla il JWT Supabase e verifica che l’utente abbia quel ruolo.

## 1. Rendere admin un utente esistente

1. **Trova l’UUID dell’utente**  
   Supabase Dashboard → **Authentication** → **Users** → apri l’utente che deve essere admin → copia **User UID**.

2. **Assegna il ruolo admin in DB**  
   Supabase Dashboard → **SQL Editor** → esegui (sostituisci `TUO_USER_UID`):

   ```sql
   INSERT INTO public.user_roles (user_id, role)
   VALUES ('TUO_USER_UID', 'admin')
   ON CONFLICT DO NOTHING;
   ```

   Se la tabella non ha un vincolo UNIQUE su `(user_id)` e ti dà errore su `ON CONFLICT`, usa solo:

   ```sql
   INSERT INTO public.user_roles (user_id, role)
   VALUES ('TUO_USER_UID', 'admin');
   ```

3. Se quell’utente aveva già un altro ruolo (es. `employer`) e vuoi **sostituirlo** con admin:

   ```sql
   UPDATE public.user_roles
   SET role = 'admin'
   WHERE user_id = 'TUO_USER_UID';
   ```

## 2. Accedere all’app admin

- **Opzione A – Incolla token**  
  Nell’app admin (es. Human Inbox) c’è il campo per incollare il token. Ottieni il token da terminale:

  ```bash
  TEST_EMAIL=tua@email.com TEST_PASSWORD=tua_password node scripts/supa_login.mjs
  ```

  Copia l’output (l’`access_token`) e incollalo nell’app admin. L’app lo salva in `localStorage` come `fd_admin_token` e lo invia a `GET /admin/check`.

- **Opzione B – Login Supabase**  
  Se l’app admin ha una pagina di login con Supabase, fai login con le **stesse** email e password dell’utente che hai reso admin. L’app dovrà usare `session.access_token` e inviarlo a `/admin/check` (o salvarlo come sopra).

Dopo aver inserito/aggiornato `user_roles` e usato il token di quell’utente, l’accesso admin e la possibilità di confermare gli instructor dovrebbero funzionare.

## Nota tecnica

L’API usa `packages/db/src/admin_access.ts`: `isAdmin(userId)` legge da `user_roles` (non da `profiles.is_admin` o tabella `users`). Il ruolo DB `admin` viene mappato a `system_admin` per l’UI e per `assertRoleAllowed`.
