'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { saveOnboardingDraft, submitOnboardingComplete } from '@/lib/instructorApi';

function isValidWhatsAppPhone(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'it', label: 'Italiano' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
] as const;

export interface OnboardingDraft {
  full_name?: string | null;
  base_resort?: string | null;
  working_language?: string | null;
  whatsapp_phone?: string | null;
  onboarding_payload?: Record<string, unknown> | null;
}

export interface InstructorOnboardingFormProps {
  /** Email from auth (read-only, not sent in body; API uses token). */
  userEmail?: string | null;
  /** Pre-fill from saved draft (e.g. when user returns to the form). */
  initialDraft?: OnboardingDraft | null;
}

export default function InstructorOnboardingForm({ userEmail, initialDraft }: InstructorOnboardingFormProps) {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [full_name, setFullName] = useState('');
  const [base_resort, setBaseResort] = useState('');
  const [working_language, setWorkingLanguage] = useState<'en' | 'it' | 'fr' | 'de'>('it');
  const [whatsapp_phone, setWhatsappPhone] = useState('');
  const [years_experience, setYearsExperience] = useState<number | ''>('');
  const [short_bio, setShortBio] = useState('');
  const [ui_language, setUiLanguage] = useState<'en' | 'it'>('en');

  const [saving, setSaving] = useState(false);
  const [savingStep, setSavingStep] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState({ full_name: false, base_resort: false, working_language: false, whatsapp_phone: false });

  const hydratedOnce = useRef(false);
  useEffect(() => {
    if (hydratedOnce.current) return;
    hydratedOnce.current = true;
    if (!initialDraft) return;

    setFullName((initialDraft.full_name?.trim() ?? '') || '');
    setBaseResort((initialDraft.base_resort?.trim() ?? '') || '');

    const wl = (initialDraft.working_language?.trim() ?? '') as string;
    if (wl === 'en' || wl === 'it' || wl === 'fr' || wl === 'de') setWorkingLanguage(wl);
    else setWorkingLanguage('it');

    setWhatsappPhone((initialDraft.whatsapp_phone?.trim() ?? '') || '');

    const p = initialDraft.onboarding_payload;
    if (p && typeof p === 'object') {
      const y = (p as { years_experience?: number }).years_experience;
      if (typeof y === 'number') setYearsExperience(y);
      const b = (p as { short_bio?: string }).short_bio;
      if (typeof b === 'string') setShortBio(b);
    }

    const last = p && typeof p === 'object' && 'lastStep' in p ? (p as { lastStep?: unknown }).lastStep : undefined;
    if (last === 1 || last === 2 || last === 3) setStep(last as 1 | 2 | 3);
  }, [initialDraft]);

  const trim = (s: string) => s.trim();
  const step1Valid =
    trim(full_name).length > 0 &&
    trim(base_resort).length > 0 &&
    trim(working_language).length > 0;
  const step2Valid = trim(whatsapp_phone).length > 0 && isValidWhatsAppPhone(whatsapp_phone);

  const err = {
    full_name: touched.full_name && !trim(full_name) ? (ui_language === 'it' ? 'Obbligatorio' : 'Required') : null,
    base_resort: touched.base_resort && !trim(base_resort) ? (ui_language === 'it' ? 'Obbligatorio' : 'Required') : null,
    working_language: touched.working_language && !trim(working_language) ? (ui_language === 'it' ? 'Obbligatorio' : 'Required') : null,
    whatsapp_phone:
      touched.whatsapp_phone && (!trim(whatsapp_phone) || !isValidWhatsAppPhone(whatsapp_phone))
        ? (ui_language === 'it' ? 'Inserisci un numero valido (es. +39...)' : 'Enter a valid number (e.g. +39...)')
        : null,
  };

  const canGoStep2 = step1Valid && !savingStep;
  const canGoStep3 = step2Valid && !savingStep;
  const canSubmit = step1Valid && step2Valid && !saving;

  const draftPayloadBase: Record<string, unknown> = {
    ui_language,
    years_experience: years_experience === '' ? undefined : Number(years_experience),
    short_bio: trim(short_bio) || undefined,
  };

  const draftPayloadStep1: Record<string, unknown> = {
    ...draftPayloadBase,
    step1: { full_name: trim(full_name), base_resort: trim(base_resort), working_language: trim(working_language) },
  };

  const draftPayloadStep2: Record<string, unknown> = {
    ...draftPayloadStep1,
    step2: {
      whatsapp_phone: trim(whatsapp_phone),
      years_experience: years_experience === '' ? undefined : Number(years_experience),
      short_bio: trim(short_bio),
      ui_language,
    },
  };

  async function handleStep1Next() {
    setError(null);
    if (!step1Valid) {
      setTouched((t) => ({ ...t, full_name: true, base_resort: true, working_language: true }));
      return;
    }
    setSavingStep(true);
    try {
      await saveOnboardingDraft({
        full_name: trim(full_name),
        base_resort: trim(base_resort),
        working_language: trim(working_language),
        onboarding_payload: { ...draftPayloadStep1, lastStep: 1 },
        ui_language,
      });
      setStep(2);
    } catch (err: unknown) {
      let msg = err instanceof Error ? err.message : (ui_language === 'it' ? 'Errore di salvataggio. Riprova.' : 'Save failed. Try again.');
      if (msg === 'Failed to fetch' || msg === 'No session found') {
        msg = ui_language === 'it'
          ? 'Impossibile contattare l\'API o sessione scaduta. Verifica che l\'API sia avviata (es. porta 3001) e di essere loggato.'
          : 'Cannot reach API or session expired. Ensure the API is running (e.g. port 3001) and you are logged in.';
      }
      setError(msg);
    } finally {
      setSavingStep(false);
    }
  }

  async function handleStep2Next() {
    setError(null);
    if (!step2Valid) {
      setTouched((t) => ({ ...t, whatsapp_phone: true }));
      return;
    }
    setSavingStep(true);
    try {
      await saveOnboardingDraft({
        whatsapp_phone: trim(whatsapp_phone),
        onboarding_payload: { ...draftPayloadStep2, lastStep: 2 },
        ui_language,
      });
      setStep(3);
    } catch (err: unknown) {
      let msg = err instanceof Error ? err.message : (ui_language === 'it' ? 'Errore di salvataggio. Riprova.' : 'Save failed. Try again.');
      if (msg === 'Failed to fetch' || msg === 'No session found') {
        msg = ui_language === 'it'
          ? 'Impossibile contattare l\'API o sessione scaduta. Verifica che l\'API sia avviata (es. porta 3001) e di essere loggato.'
          : 'Cannot reach API or session expired. Ensure the API is running (e.g. port 3001) and you are logged in.';
      }
      setError(msg);
    } finally {
      setSavingStep(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!canSubmit) return;
    setSaving(true);
    try {
      await submitOnboardingComplete({
        full_name: trim(full_name),
        base_resort: trim(base_resort),
        working_language: trim(working_language),
        whatsapp_phone: trim(whatsapp_phone),
        onboarding_payload: { ...draftPayloadStep2, lastStep: 3 },
      });
      router.refresh();
      router.push('/instructor/dashboard');
    } catch (err: unknown) {
      let msg = err instanceof Error ? err.message : (ui_language === 'it' ? 'Errore di salvataggio. Riprova.' : 'Save failed. Try again.');
      if (msg === 'Failed to fetch' || msg === 'No session found') {
        msg = ui_language === 'it'
          ? 'Impossibile contattare l\'API o sessione scaduta. Verifica che l\'API sia avviata (es. porta 3001) e di essere loggato.'
          : 'Cannot reach API or session expired. Ensure the API is running (e.g. port 3001) and you are logged in.';
      }
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  const inputBase = {
    width: '100%',
    padding: '0.625rem 0.875rem',
    fontSize: '0.9375rem',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    boxSizing: 'border-box' as const,
    outline: 'none',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  };
  const labelStyle = { display: 'block' as const, marginBottom: '0.375rem', fontSize: '0.875rem', fontWeight: 600, color: '#334155' };
  const sectionStyle = {
    marginBottom: 0,
    padding: '1.5rem 1.75rem',
    backgroundColor: '#fff',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.06), 0 2px 4px -2px rgba(0,0,0,0.04)',
    position: 'relative' as const,
    zIndex: 1,
  };
  const sectionTitle = { fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '1.25rem', letterSpacing: '-0.01em' };
  const errStyle = { fontSize: '0.8125rem', color: '#dc2626', marginTop: '0.375rem', display: 'block' as const };

  const stepIndicator = (
    <div
      style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1.5rem',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      {[1, 2, 3].map((s) => (
        <div
          key={s}
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            backgroundColor: step === s ? '#2563eb' : step > s ? '#94a3b8' : '#e2e8f0',
            transition: 'background-color 0.2s ease',
            pointerEvents: 'none',
          }}
          aria-hidden
        />
      ))}
    </div>
  );

  const copy = ui_language === 'it' ? {
    step1Title: 'Profilo',
    step2Title: 'Profilo professionale',
    step3Title: 'Riepilogo',
    fullName: 'Nome completo',
    baseResort: 'Località / comprensorio',
    workingLanguage: 'Lingua di lavoro',
    emailReadOnly: 'Email (dal tuo account)',
    whatsappPhone: 'Telefono WhatsApp',
    whatsappHint: 'Numero con prefisso internazionale (es. +39...)',
    yearsExperience: 'Anni di esperienza',
    shortBio: 'Breve presentazione',
    uiLanguage: 'Lingua interfaccia FrostDesk',
    back: 'Indietro',
    next: 'Avanti',
    complete: 'Completa onboarding',
    saving: 'Salvataggio in corso…',
    retry: 'Riprova',
  } : {
    step1Title: 'Profile',
    step2Title: 'Professional profile',
    step3Title: 'Review',
    fullName: 'Full name',
    baseResort: 'Location / resort',
    workingLanguage: 'Working language',
    emailReadOnly: 'Email (from your account)',
    whatsappPhone: 'WhatsApp phone',
    whatsappHint: 'Number with country code (e.g. +39...)',
    yearsExperience: 'Years of experience',
    shortBio: 'Short bio',
    uiLanguage: 'FrostDesk UI language',
    back: 'Back',
    next: 'Next',
    complete: 'Complete onboarding',
    saving: 'Saving…',
    retry: 'Retry',
  };

  const primaryBtn = {
    padding: '0.625rem 1.25rem',
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '0.9375rem',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  };
  const primaryBtnDisabled = { ...primaryBtn, backgroundColor: '#94a3b8', cursor: 'not-allowed', boxShadow: 'none' };
  const secondaryBtn = {
    padding: '0.625rem 1.25rem',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '0.9375rem',
    fontWeight: 500,
    backgroundColor: '#fff',
    color: '#475569',
    cursor: 'pointer',
  };

  return (
    <div style={{ position: 'relative', zIndex: 10 }}>
      {stepIndicator}
      {error && (
        <div
          role="alert"
          style={{
            marginBottom: '1.25rem',
            padding: '0.75rem 1rem',
            backgroundColor: '#fef2f2',
            color: '#991b1b',
            borderRadius: '0.5rem',
            border: '1px solid #fecaca',
            fontSize: '0.875rem',
          }}
        >
          <div>{error}</div>
          <button
            type="button"
            onClick={() => { setError(null); setSaving(false); }}
            style={{ marginTop: '0.5rem', padding: '0.25rem 0.5rem', fontSize: '0.8125rem', cursor: 'pointer' }}
          >
            {copy.retry}
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {step === 1 && (
          <section style={sectionStyle} aria-labelledby="step1-title">
            <h2 id="step1-title" style={sectionTitle}>{copy.step1Title}</h2>
            {userEmail != null && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>{copy.emailReadOnly}</label>
                <input
                  type="text"
                  value={userEmail}
                  readOnly
                  style={{ ...inputBase, backgroundColor: '#f8fafc', color: '#64748b', cursor: 'not-allowed' }}
                />
              </div>
            )}
            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="onboarding_full_name" style={labelStyle}>{copy.fullName} *</label>
              <input
                id="onboarding_full_name"
                type="text"
                value={full_name}
                onChange={(e) => setFullName(e.target.value)}
                onInput={(e) => setFullName((e.target as HTMLInputElement).value)}
                onBlur={() => setTouched((t) => ({ ...t, full_name: true }))}
                style={{ ...inputBase, ...(err.full_name ? { borderColor: '#dc2626' } : {}) }}
                placeholder={ui_language === 'it' ? 'Mario Rossi' : 'John Doe'}
              />
              {err.full_name && <span style={errStyle}>{err.full_name}</span>}
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="onboarding_base_resort" style={labelStyle}>{copy.baseResort} *</label>
              <input
                id="onboarding_base_resort"
                type="text"
                value={base_resort}
                onChange={(e) => setBaseResort(e.target.value)}
                onInput={(e) => setBaseResort((e.target as HTMLInputElement).value)}
                onBlur={() => setTouched((t) => ({ ...t, base_resort: true }))}
                style={{ ...inputBase, ...(err.base_resort ? { borderColor: '#dc2626' } : {}) }}
                placeholder={ui_language === 'it' ? "Cortina d'Ampezzo" : 'Cortina'}
              />
              {err.base_resort && <span style={errStyle}>{err.base_resort}</span>}
            </div>
            <div>
              <label htmlFor="onboarding_working_language" style={labelStyle}>{copy.workingLanguage} *</label>
              <select
                id="onboarding_working_language"
                value={working_language}
                onChange={(e) => setWorkingLanguage(e.target.value as 'en' | 'it' | 'fr' | 'de')}
                onBlur={() => setTouched((t) => ({ ...t, working_language: true }))}
                style={{ ...inputBase, ...(err.working_language ? { borderColor: '#dc2626' } : {}) }}
              >
                {LANGUAGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {err.working_language && <span style={errStyle}>{err.working_language}</span>}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
              step1Valid={String(step1Valid)} savingStep={String(savingStep)} canGoStep2={String(canGoStep2)}
              {' | '}full_name=&quot;{full_name}&quot; base_resort=&quot;{base_resort}&quot; working_language=&quot;{working_language}&quot;
            </div>
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
              <button
                type="button"
                onClick={() => handleStep1Next()}
                disabled={!canGoStep2}
                style={canGoStep2 ? primaryBtn : primaryBtnDisabled}
              >
                {savingStep ? (ui_language === 'it' ? 'Salvataggio…' : 'Saving…') : copy.next}
              </button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section style={sectionStyle} aria-labelledby="step2-title">
            <h2 id="step2-title" style={sectionTitle}>{copy.step2Title}</h2>
            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="onboarding_whatsapp_phone" style={labelStyle}>{copy.whatsappPhone} *</label>
              <input
                id="onboarding_whatsapp_phone"
                type="tel"
                value={whatsapp_phone}
                onChange={(e) => setWhatsappPhone(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, whatsapp_phone: true }))}
                style={{ ...inputBase, ...(err.whatsapp_phone ? { borderColor: '#dc2626' } : {}) }}
                placeholder="+39 333 1234567"
              />
              <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>{copy.whatsappHint}</p>
              {err.whatsapp_phone && <span style={errStyle}>{err.whatsapp_phone}</span>}
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="onboarding_ui_language" style={labelStyle}>{copy.uiLanguage}</label>
              <select
                id="onboarding_ui_language"
                value={ui_language}
                onChange={(e) => setUiLanguage(e.target.value as 'en' | 'it')}
                style={inputBase}
              >
                <option value="en">English</option>
                <option value="it">Italiano</option>
              </select>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="onboarding_years_experience" style={labelStyle}>{copy.yearsExperience}</label>
              <input
                id="onboarding_years_experience"
                type="number"
                min={0}
                max={60}
                value={years_experience === '' ? '' : years_experience}
                onChange={(e) => setYearsExperience(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                style={inputBase}
              />
            </div>
            <div>
              <label htmlFor="onboarding_short_bio" style={labelStyle}>{copy.shortBio}</label>
              <textarea
                id="onboarding_short_bio"
                value={short_bio}
                onChange={(e) => setShortBio(e.target.value)}
                rows={3}
                style={{ ...inputBase, resize: 'vertical' }}
              />
            </div>
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '0.75rem' }}>
              <button type="button" onClick={() => setStep(1)} style={secondaryBtn} disabled={savingStep}>
                {copy.back}
              </button>
              <button
                type="button"
                onClick={handleStep2Next}
                disabled={!canGoStep3}
                style={canGoStep3 ? primaryBtn : primaryBtnDisabled}
              >
                {savingStep ? (ui_language === 'it' ? 'Salvataggio…' : 'Saving…') : copy.next}
              </button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section style={sectionStyle} aria-labelledby="step3-title">
            <h2 id="step3-title" style={sectionTitle}>{copy.step3Title}</h2>
            <dl style={{ fontSize: '0.9375rem', marginBottom: '1rem' }}>
              {[
                [copy.fullName, trim(full_name)],
                [copy.baseResort, trim(base_resort)],
                [copy.workingLanguage, trim(working_language)],
                [copy.whatsappPhone, trim(whatsapp_phone)],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  style={{
                    display: 'flex',
                    gap: '0.75rem',
                    padding: '0.5rem 0',
                    borderBottom: '1px solid #f1f5f9',
                  }}
                >
                  <dt style={{ color: '#64748b', minWidth: '160px', fontWeight: 500 }}>{label}</dt>
                  <dd style={{ margin: 0, color: '#0f172a', fontWeight: 500 }}>{value || '–'}</dd>
                </div>
              ))}
            </dl>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
              <button type="button" onClick={() => setStep(2)} style={secondaryBtn}>
                {copy.back}
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                style={canSubmit ? primaryBtn : primaryBtnDisabled}
              >
                {saving ? copy.saving : copy.complete}
              </button>
            </div>
          </section>
        )}
      </form>
    </div>
  );
}
