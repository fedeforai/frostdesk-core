# Conversation Intelligence Program (CIP)

**Documento ufficiale di prodotto — FrostDesk v1 Pilot**

## Status

**ACTIVE** — Pilot Program

## Version

**v1.0** — gennaio 2026

---

## 1. Scopo del Programma

Il Conversation Intelligence Program (CIP) è il framework ufficiale con cui FrostDesk:

- migliora nel tempo relevance, tolerance e decision quality
- senza introdurre apprendimento automatico
- senza modifiche autonome del sistema
- senza violare i principi RALPH

Il CIP trasforma conversazioni reali in conoscenza strutturata, non in training automatico.

---

## 2. Principi Fondanti

### 2.1 Human-in-the-loop permanente

- Nessuna conversazione viene usata senza revisione umana
- Nessuna regola cambia senza approvazione esplicita

### 2.2 Determinismo totale (v1)

Le conversazioni non addestrano modelli.

Servono solo a:

- testare
- misurare errori
- migliorare regole esplicite

### 2.3 Auditabilità

Ogni miglioramento deve essere:

- spiegabile
- versionato
- reversibile

---

## 3. Ambito (v1 Pilot)

### Incluso

- Raccolta conversazioni reali autorizzate
- Anonimizzazione e minimizzazione
- Labeling manuale (relevance, intent)
- Dataset versionati (JSONL)
- Test harness deterministico
- Aggiornamento regole e soglie

### Escluso

- Training
- Fine-tuning
- Learning automatico
- Self-adjusting thresholds
- Feedback loop live

---

## 4. Data Intake Pipeline (Pilot-safe)

### Step 1 — Source

Conversazioni provenienti da:

- maestri
- operatori
- canali di supporto

**Requisito**: diritto esplicito di utilizzo per miglioramento prodotto.

### Step 2 — Privacy & Compliance

Obbligatorio prima di ogni utilizzo:

- rimozione nomi
- rimozione numeri di telefono
- rimozione indirizzi
- rimozione riferimenti temporali specifici

👉 **Zero PII**.

### Step 3 — Dataset Format (JSONL)

```json
{
  "id": "conv-042",
  "channel": "whatsapp",
  "language": "it",
  "text": "Vorrei sapere se domani c'è disponibilità per una lezione privata",
  "expected": {
    "relevant": true,
    "intent": "INFO_REQUEST"
  },
  "notes": "Primo contatto, cliente potenziale",
  "created_at": "2026-01-18"
}
```

---

## 5. Evaluation Process

Per ogni dataset:

1. Run `relevanceClassifier`
2. Run `intentClassifier`
3. Run `confidenceDecisionEngine`
4. Confronto `expected` vs `actual`

### Metriche osservate

- False positives
- False negatives
- Over-escalation
- Under-escalation

---

## 6. Change Protocol

Ogni miglioramento richiede:

1. Dataset aggiornato
2. Test che dimostra miglioramento
3. PR con:
   - modifica regole
   - modifica soglie
   - spiegazione umana

👉 Nessun "magic improvement".

---

## 7. Timeline & Ownership

### Timeline

- **Avvio**: parallelo a F2.x
- **Iterazione**: settimanale / quindicinale
- **Output continuo, mai bloccante**

### Ownership

- Product + Engineering
- Nessuna automazione decisionale

---

## 8. Roadmap (post-v1)

- **v2**: assisted rule suggestion (offline)
- **v3**: supervised learning (governance-first)

---

## Statement finale

> **"FrostDesk does not learn silently.**
> 
> **It improves openly, deliberately, and under human control."**
