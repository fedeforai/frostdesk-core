# Meeting point e What3Words

What3Words divide il mondo in quadrati di 3×3 m e assegna a ciascuno **tre parole** (es. `tavolo.lampada.sedia`). Serve per indicare il punto d’incontro in modo univoco e facile da comunicare a maestro e cliente.

## API key

- Ottieni una chiave su [developer.what3words.com](https://developer.what3words.com/).
- Aggiungila in **.env** (root) o **.env.local** o **apps/api/.env** se l’API usa What3Words lato server:

```bash
WHAT3WORDS_API_KEY=9HZFS9GV
```

*(Per pilot è possibile usare la chiave sopra in .env.local; in produzione usa una chiave dedicata e non committare chiavi in .env.example.)*

- Per uso solo lato client (app instructor), puoi usare una variabile pubblica nell’app instructor:

```bash
# apps/instructor/.env.local
NEXT_PUBLIC_WHAT3WORDS_API_KEY=9HZFS9GV
```

La chiave va usata solo per convertire indirizzo ↔ tre parole; non esporre chiavi con permessi sensibili nel frontend.

---

## Uso: punto fisso vs punto per prenotazione

### 1. Punto fisso (in base alla location del meeting point)

- Il **maestro** in **Instructor → Meeting points** crea/modifica un punto d’incontro (nome, indirizzo, opzionale lat/lon).
- Nel campo **What3Words** può:
  - Inserire manualmente le tre parole (es. `tavolo.lampada.sedia`) trovate su [what3words.com](https://what3words.com) o sull’app.
  - Oppure, se è attiva l’integrazione con l’API, digitare l’indirizzo e far suggerire/compilare automaticamente il codice a tre parole.
- Una volta salvato, quel meeting point ha un **punto fisso**: stesso indirizzo e stesso codice What3Words per tutte le lezioni che usano quel punto.
- **Al cliente** si può comunicare:
  - L’indirizzo normale (via, civico, città) **e/o**
  - Le tre parole: “Cercami su what3words con: **tavolo.lampada.sedia**”.

### 2. Punto per singola prenotazione (booking)

- Se il punto d’incontro **cambia per ogni lezione** (es. “ci vediamo al bar sotto casa tua”), il maestro può:
  - Creare un meeting point generico (es. “Punto da definire”) e poi, **per ogni booking**, aggiornare/indicare le tre parole nella nota o in un campo dedicato al booking, **oppure**
  - Comunicare le tre parole al cliente in chat/WhatsApp una volta confermata la lezione.
- In entrambi i casi: **una volta individuata la location del booking**, si usa quel codice What3Words “volta per volta” solo per quella prenotazione.

---

## Come spiegarlo al **maestro** (instructor)

1. **Dove si configura**  
   Sidebar → **Meeting points** → Aggiungi/Modifica punto d’incontro.

2. **Cosa sono le tre parole**  
   Un codice univoco per un quadrato di 3×3 m (es. `tavolo.lampada.sedia`). Lo trovi su [what3words.com](https://what3words.com) o nell’app What3Words: cerchi il posto sulla mappa e copi le tre parole.

3. **Punto fisso**  
   Se incontri sempre i clienti nello stesso posto (studio, campo, piazzale), inserisci indirizzo e What3Words nel meeting point e usalo per tutte le lezioni in quel posto. Il cliente vedrà sempre lo stesso punto.

4. **Punto che cambia**  
   Se il luogo cambia a seconda della lezione, puoi:
   - Scrivere le tre parole nella nota della prenotazione, oppure
   - Inviarle in chat al cliente dopo aver concordato il posto.

5. **Suggerimento**  
   Nel form meeting point c’è il campo “What3Words”: puoi incollare lì le tre parole copiate da what3words.com. Così restano salvate e puoi riutilizzarle o comunicarle al cliente.

---

## Come spiegarlo al **cliente**

1. **Cosa sono le tre parole**  
   Un modo preciso per trovare il punto d’incontro: tre parole (es. `tavolo.lampada.sedia`) che indicano un punto unico sulla mappa.

2. **Come usarle**  
   - Apri l’app **What3Words** (o il sito [what3words.com](https://what3words.com)).  
   - Inserisci le tre parole che ti ha indicato il maestro (senza spazi, separate da un punto).  
   - L’app ti mostrerà il punto esatto sulla mappa e potrai aprire navigazione (Maps, Google Maps, ecc.).

3. **Quando le ricevi**  
   - Se il maestro ha un **punto fisso** (stesso luogo per le lezioni), può dartele una volta (es. in messaggio o nella conferma della prenotazione).  
   - Se il punto **cambia** (es. lezione in un posto diverso), il maestro te le invierà volta per volta (es. in chat dopo aver scelto il luogo per quella lezione).

4. **Perché usarle**  
   Evitano equivoci su “dove esattamente”: stesso codice = stesso quadrato di 3×3 m, utile soprattutto in piazze, parchi o luoghi senza un civico chiaro.

---

## Riepilogo tecnico

| Cosa | Dove |
|------|------|
| API key | `.env` → `WHAT3WORDS_API_KEY` (o `NEXT_PUBLIC_WHAT3WORDS_API_KEY` in instructor se serve in frontend) |
| Meeting point fisso | Instructor → Meeting points → campo What3Words (e indirizzo) |
| Meeting point per booking | Location individuata nel booking → tre parole in nota/chat o in un campo dedicato al booking |
| Comunicazione al cliente | Messaggio/email con indirizzo e/o le tre parole; cliente usa app/sito What3Words per arrivare al punto |
