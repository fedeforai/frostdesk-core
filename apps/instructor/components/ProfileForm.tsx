'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  InstructorProfile,
  UpdateInstructorProfileParams,
  MarketingFields,
  OperationalFields,
  TargetAudience,
  LanguageCode,
} from '@/lib/instructorApi';
import { updateInstructorProfile } from '@/lib/instructorApi';

const LANGUAGE_OPTIONS: LanguageCode[] = [
  'en', 'it', 'fr', 'de', 'es', 'pt', 'nl', 'sv', 'no', 'da', 'pl', 'ru', 'ar', 'zh',
];

const TARGET_AUDIENCE_OPTIONS: TargetAudience[] = [
  'families', 'kids', 'beginners', 'advanced', 'off_piste', 'vip',
];

const USP_TAG_SUGGESTIONS = [
  'beginner-friendly', 'kids', 'families', 'carving', 'off-piste', 'freestyle',
  'racing', 'confidence', 'technique', 'luxury-vip', 'english-speaking',
  'italian-speaking', 'patient', 'high-performance', 'first-timers',
];

const TIMEZONE_SHORTLIST = [
  'Europe/Rome',
  'Europe/Paris',
  'Europe/London',
  'Europe/Zurich',
  'Europe/Vienna',
  'America/New_York',
  'America/Los_Angeles',
  'UTC',
];

const SHORT_BIO_MAX = 500;

function safeNum(value: string): number | undefined {
  if (value === '') return undefined;
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? undefined : n;
}

const labelStyle = {
  display: 'block' as const,
  marginBottom: '0.5rem',
  fontSize: '0.875rem',
  fontWeight: 500,
  color: 'rgba(226, 232, 240, 0.95)',
};
const inputStyle = {
  width: '100%' as const,
  padding: '0.5rem',
  border: '1px solid #d1d5db',
  borderRadius: '0.375rem',
  fontSize: '1rem',
  outline: 'none' as const,
};
const focusOutline = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  e.currentTarget.style.outline = '2px solid #3b82f6';
  e.currentTarget.style.outlineOffset = '2px';
};
const blurOutline = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  e.currentTarget.style.outline = 'none';
};

interface ProfileFormProps {
  profile: InstructorProfile | null;
  onSaved?: (profile: InstructorProfile) => void;
}

type TabId = 'identity' | 'marketing' | 'operations';

export default function ProfileForm({ profile, onSaved }: ProfileFormProps) {
  const [activeTab, setActiveTab] = useState<TabId>('identity');

  const [fullName, setFullName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [slug, setSlug] = useState('');
  const [baseResort, setBaseResort] = useState('');
  const [otherLocations, setOtherLocations] = useState<string[]>([]);
  const [workingLanguage, setWorkingLanguage] = useState<LanguageCode | string>('');
  const [languages, setLanguages] = useState<LanguageCode[]>([]);
  const [timezone, setTimezone] = useState('');
  const [timezoneOther, setTimezoneOther] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  const [shortBio, setShortBio] = useState('');
  const [extendedBio, setExtendedBio] = useState('');
  const [teachingPhilosophy, setTeachingPhilosophy] = useState('');
  const [targetAudience, setTargetAudience] = useState<TargetAudience[]>([]);
  const [uspTags, setUspTags] = useState<string[]>([]);
  const [uspInput, setUspInput] = useState('');

  const [maxStudentsPrivate, setMaxStudentsPrivate] = useState<string>('');
  const [maxStudentsGroup, setMaxStudentsGroup] = useState<string>('');
  const [minBookingDurationMinutes, setMinBookingDurationMinutes] = useState<string>('');
  const [sameDayBookingAllowed, setSameDayBookingAllowed] = useState(false);
  const [advanceBookingHours, setAdvanceBookingHours] = useState<string>('');
  const [travelBufferMinutes, setTravelBufferMinutes] = useState<string>('');

  const [savingTab, setSavingTab] = useState<TabId | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const mf = profile?.marketing_fields ?? {};
  const of = profile?.operational_fields ?? {};

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? '');
    setDisplayName(profile.display_name ?? '');
    setSlug(profile.slug ?? '');
    setBaseResort(profile.base_resort ?? '');
    const resorts = (mf as { resorts?: { operating?: string[] } }).resorts;
    setOtherLocations(Array.isArray(resorts?.operating) ? resorts.operating : []);
    const wl = profile.working_language ?? '';
    setWorkingLanguage(LANGUAGE_OPTIONS.includes(wl as LanguageCode) ? (wl as LanguageCode) : wl);
    setLanguages(Array.isArray(profile.languages) ? profile.languages.filter((x): x is LanguageCode => LANGUAGE_OPTIONS.includes(x as LanguageCode)) : []);
    const tz = profile.timezone ?? '';
    const inShortlist = TIMEZONE_SHORTLIST.includes(tz);
    setTimezone(inShortlist ? tz : (tz ? 'other' : ''));
    setTimezoneOther(inShortlist ? '' : tz);
    setContactEmail(profile.contact_email ?? '');
    setShortBio(mf.short_bio ?? '');
    setExtendedBio(mf.extended_bio ?? '');
    setTeachingPhilosophy(mf.teaching_philosophy ?? '');
    setTargetAudience(Array.isArray(mf.target_audience) ? mf.target_audience.filter((x): x is TargetAudience => TARGET_AUDIENCE_OPTIONS.includes(x)) : []);
    setUspTags(Array.isArray(mf.usp_tags) ? mf.usp_tags : []);
    setMaxStudentsPrivate(of.max_students_private != null ? String(of.max_students_private) : '');
    setMaxStudentsGroup(of.max_students_group != null ? String(of.max_students_group) : '');
    setMinBookingDurationMinutes(of.min_booking_duration_minutes != null ? String(of.min_booking_duration_minutes) : '');
    setSameDayBookingAllowed(of.same_day_booking_allowed ?? false);
    setAdvanceBookingHours(of.advance_booking_hours != null ? String(of.advance_booking_hours) : '');
    setTravelBufferMinutes(of.travel_buffer_minutes != null ? String(of.travel_buffer_minutes) : '');
  }, [profile]);

  useEffect(() => {
    if (banner?.type === 'success') {
      const t = setTimeout(() => setBanner(null), 2500);
      return () => clearTimeout(t);
    }
  }, [banner?.type, banner?.message]);

  const clearBanner = useCallback(() => setBanner(null), []);

  const handleSaveIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    const wl = workingLanguage || undefined;
    if (!fullName.trim() || !baseResort.trim() || !wl || !contactEmail.trim()) {
      setBanner({ type: 'error', message: 'All identity fields are required' });
      return;
    }
    setSavingTab('identity');
    setBanner(null);
    try {
      const tzValue = timezone === 'other' ? timezoneOther.trim() || undefined : (timezone || undefined);
      const operating = otherLocations.map((s) => s.trim()).filter(Boolean);
      const params: UpdateInstructorProfileParams = {
        full_name: fullName.trim(),
        base_resort: baseResort.trim(),
        working_language: wl,
        contact_email: contactEmail.trim(),
        languages,
        timezone: tzValue ?? null,
        display_name: displayName.trim() || undefined,
        marketing_fields: {
          resorts: { base: baseResort.trim(), operating: operating.length ? operating : undefined },
        },
      };
      const updated = await updateInstructorProfile(params);
      setBanner({ type: 'success', message: 'Saved' });
      onSaved?.(updated);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save identity';
      setBanner({ type: 'error', message });
    } finally {
      setSavingTab(null);
    }
  };

  const handleSaveMarketing = async (e: React.FormEvent) => {
    e.preventDefault();
    const bio = shortBio.trim().slice(0, SHORT_BIO_MAX);
    setSavingTab('marketing');
    setBanner(null);
    try {
      const payload: MarketingFields = {
        short_bio: bio || undefined,
        extended_bio: extendedBio.trim() || undefined,
        teaching_philosophy: teachingPhilosophy.trim() || undefined,
        target_audience: targetAudience.length ? targetAudience : undefined,
        usp_tags: uspTags.length ? uspTags : undefined,
      };
      const updated = await updateInstructorProfile({ marketing_fields: payload });
      setBanner({ type: 'success', message: 'Saved' });
      onSaved?.(updated);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save marketing';
      setBanner({ type: 'error', message });
    } finally {
      setSavingTab(null);
    }
  };

  const handleSaveOperations = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTab('operations');
    setBanner(null);
    try {
      const existingSameDay = profile?.operational_fields?.same_day_booking_allowed ?? false;
      const payload: Partial<OperationalFields> = {
        max_students_private: safeNum(maxStudentsPrivate) ?? undefined,
        max_students_group: safeNum(maxStudentsGroup) ?? undefined,
        min_booking_duration_minutes: safeNum(minBookingDurationMinutes) ?? undefined,
        advance_booking_hours: safeNum(advanceBookingHours) ?? undefined,
        travel_buffer_minutes: safeNum(travelBufferMinutes) ?? undefined,
      };
      if (sameDayBookingAllowed !== existingSameDay) {
        payload.same_day_booking_allowed = sameDayBookingAllowed;
      }
      const updated = await updateInstructorProfile({ operational_fields: payload });
      setBanner({ type: 'success', message: 'Saved' });
      onSaved?.(updated);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save operations';
      setBanner({ type: 'error', message });
    } finally {
      setSavingTab(null);
    }
  };

  const toggleTargetAudience = (value: TargetAudience) => {
    setTargetAudience((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const toggleLanguage = (code: LanguageCode) => {
    setLanguages((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const addUspTag = () => {
    const tag = uspInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (tag && !uspTags.includes(tag)) {
      setUspTags((prev) => [...prev, tag]);
      setUspInput('');
    }
  };

  const removeUspTag = (tag: string) => {
    setUspTags((prev) => prev.filter((t) => t !== tag));
  };

  const uspSuggestionsFiltered = USP_TAG_SUGGESTIONS.filter(
    (s) => !uspTags.includes(s) && (!uspInput.trim() || s.toLowerCase().includes(uspInput.trim().toLowerCase()))
  );

  const tabs: { id: TabId; label: string }[] = [
    { id: 'identity', label: 'Identity' },
    { id: 'marketing', label: 'Marketing' },
    { id: 'operations', label: 'Operations' },
  ];

  return (
    <div style={{ maxWidth: '600px' }}>
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => { setActiveTab(id); clearBanner(); }}
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              borderBottom: activeTab === id ? '2px solid #3b82f6' : '2px solid transparent',
              background: 'none',
              cursor: 'pointer',
              fontSize: '0.9375rem',
              fontWeight: activeTab === id ? 600 : 500,
              color: activeTab === id ? '#1d4ed8' : 'rgba(148, 163, 184, 0.9)',
            }}
            aria-selected={activeTab === id}
            role="tab"
          >
            {label}
          </button>
        ))}
      </div>

      {banner && (
        <div
          role="alert"
          aria-live="polite"
          style={{
            marginBottom: '1rem',
            padding: '0.75rem',
            backgroundColor: banner.type === 'success' ? '#d1fae5' : '#fee2e2',
            color: banner.type === 'success' ? '#065f46' : '#991b1b',
            borderRadius: '0.375rem',
            border: banner.type === 'success' ? '1px solid #a7f3d0' : '1px solid #fca5a5',
          }}
        >
          {banner.message}
        </div>
      )}

      {activeTab === 'identity' && (
        <form onSubmit={handleSaveIdentity}>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="full_name" style={labelStyle}>Full Name *</label>
            <input
              type="text"
              id="full_name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              disabled={savingTab === 'identity'}
              style={inputStyle}
              onFocus={focusOutline}
              onBlur={blurOutline}
              aria-required
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="display_name" style={labelStyle}>Display name</label>
            <input
              type="text"
              id="display_name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={savingTab === 'identity'}
              placeholder="Optional; defaults to full name"
              style={inputStyle}
              onFocus={focusOutline}
              onBlur={blurOutline}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="slug" style={labelStyle}>Slug</label>
            <input
              type="text"
              id="slug"
              value={slug}
              readOnly
              disabled
              aria-readonly
              title="Slug managed by the system, not editable"
              placeholder="—"
              style={{ ...inputStyle, cursor: 'not-allowed', backgroundColor: 'rgba(255, 255, 255, 0.04)', color: 'rgba(148, 163, 184, 0.9)' }}
            />
            <p style={{ fontSize: '0.75rem', color: 'rgba(148, 163, 184, 0.9)', marginTop: '0.25rem' }}>
              Read-only (managed by the system)
            </p>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="base_resort" style={labelStyle}>Base Resort *</label>
            <input
              type="text"
              id="base_resort"
              value={baseResort}
              onChange={(e) => setBaseResort(e.target.value)}
              required
              disabled={savingTab === 'identity'}
              style={inputStyle}
              onFocus={focusOutline}
              onBlur={blurOutline}
              aria-required
              placeholder="Es. Cervinia, Zermatt"
            />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <span style={labelStyle}>Other locations where you can give lessons</span>
            <p style={{ fontSize: '0.75rem', color: 'rgba(148, 163, 184, 0.9)', marginBottom: '0.5rem' }}>
              Add other locations (in addition to Base Resort) where you offer lessons.
            </p>
            {otherLocations.map((value, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => {
                    const next = [...otherLocations];
                    next[i] = e.target.value;
                    setOtherLocations(next);
                  }}
                  disabled={savingTab === 'identity'}
                  placeholder="Location name"
                  style={{ ...inputStyle, flex: 1 }}
                  onFocus={focusOutline}
                  onBlur={blurOutline}
                />
                <button
                  type="button"
                  onClick={() => setOtherLocations((prev) => prev.filter((_, j) => j !== i))}
                  disabled={savingTab === 'identity'}
                  style={{
                    padding: '0.5rem 0.75rem',
                    border: '1px solid #dc2626',
                    borderRadius: '0.375rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#dc2626',
                    cursor: savingTab === 'identity' ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                  }}
                  aria-label="Remove location"
                >
                  Rimuovi
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setOtherLocations((prev) => [...prev, ''])}
              disabled={savingTab === 'identity'}
              style={{
                marginTop: '0.25rem',
                padding: '0.5rem 0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                background: 'rgba(255, 255, 255, 0.04)',
                color: 'rgba(226, 232, 240, 0.95)',
                cursor: savingTab === 'identity' ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
              }}
            >
              + Add location
            </button>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="working_language" style={labelStyle}>Working Language *</label>
            <select
              id="working_language"
              value={workingLanguage}
              onChange={(e) => setWorkingLanguage((e.target.value || '') as LanguageCode | '')}
              required
              disabled={savingTab === 'identity'}
              style={inputStyle}
              onFocus={focusOutline}
              onBlur={blurOutline}
              aria-required
            >
              <option value="">Select language</option>
              {LANGUAGE_OPTIONS.map((code) => (
                <option key={code} value={code}>{code.toUpperCase()}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <span style={labelStyle}>Additional languages</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1rem', marginTop: '0.25rem' }}>
              {LANGUAGE_OPTIONS.map((code) => (
                <label key={code} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input
                    type="checkbox"
                    checked={languages.includes(code)}
                    onChange={() => toggleLanguage(code)}
                    disabled={savingTab === 'identity'}
                  />
                  {code.toUpperCase()}
                </label>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="timezone" style={labelStyle}>Timezone</label>
            <select
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value || '')}
              disabled={savingTab === 'identity'}
              style={inputStyle}
              onFocus={focusOutline}
              onBlur={blurOutline}
            >
              <option value="">Select timezone</option>
              {TIMEZONE_SHORTLIST.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
              <option value="other">Other (IANA)</option>
            </select>
            {timezone === 'other' && (
              <input
                type="text"
                value={timezoneOther}
                onChange={(e) => setTimezoneOther(e.target.value)}
                placeholder="e.g. Europe/Madrid"
                disabled={savingTab === 'identity'}
                style={{ ...inputStyle, marginTop: '0.5rem' }}
                onFocus={focusOutline}
                onBlur={blurOutline}
              />
            )}
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="contact_email" style={labelStyle}>Contact Email *</label>
            <input
              type="email"
              id="contact_email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              required
              disabled={savingTab === 'identity'}
              style={inputStyle}
              onFocus={focusOutline}
              onBlur={blurOutline}
              aria-required
            />
          </div>
          <button
            type="submit"
            disabled={savingTab === 'identity' || !fullName.trim() || !baseResort.trim() || !workingLanguage || !contactEmail.trim()}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: savingTab === 'identity' ? '#d1d5db' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: savingTab === 'identity' ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: 500,
              outline: 'none',
            }}
            aria-label="Save identity"
          >
            {savingTab === 'identity' ? 'Saving...' : 'Save Identity'}
          </button>
        </form>
      )}

      {activeTab === 'marketing' && (
        <form onSubmit={handleSaveMarketing}>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="short_bio" style={labelStyle}>
              Short bio (max {SHORT_BIO_MAX})
            </label>
            <textarea
              id="short_bio"
              value={shortBio}
              onChange={(e) => setShortBio(e.target.value.slice(0, SHORT_BIO_MAX))}
              maxLength={SHORT_BIO_MAX}
              rows={3}
              disabled={savingTab === 'marketing'}
              style={{ ...inputStyle, resize: 'vertical' }}
              onFocus={(e) => { e.currentTarget.style.outline = '2px solid #3b82f6'; e.currentTarget.style.outlineOffset = '2px'; }}
              onBlur={blurOutline}
            />
            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{shortBio.length}/{SHORT_BIO_MAX}</span>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="extended_bio" style={labelStyle}>Extended bio</label>
            <textarea
              id="extended_bio"
              value={extendedBio}
              onChange={(e) => setExtendedBio(e.target.value)}
              rows={4}
              disabled={savingTab === 'marketing'}
              style={{ ...inputStyle, resize: 'vertical' }}
              onFocus={(e) => { e.currentTarget.style.outline = '2px solid #3b82f6'; e.currentTarget.style.outlineOffset = '2px'; }}
              onBlur={blurOutline}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="teaching_philosophy" style={labelStyle}>Teaching philosophy</label>
            <textarea
              id="teaching_philosophy"
              value={teachingPhilosophy}
              onChange={(e) => setTeachingPhilosophy(e.target.value)}
              rows={3}
              disabled={savingTab === 'marketing'}
              style={{ ...inputStyle, resize: 'vertical' }}
              onFocus={(e) => { e.currentTarget.style.outline = '2px solid #3b82f6'; e.currentTarget.style.outlineOffset = '2px'; }}
              onBlur={blurOutline}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <span style={labelStyle}>Target audience</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1rem', marginTop: '0.25rem' }}>
              {TARGET_AUDIENCE_OPTIONS.map((opt) => (
                <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input
                    type="checkbox"
                    checked={targetAudience.includes(opt)}
                    onChange={() => toggleTargetAudience(opt)}
                    disabled={savingTab === 'marketing'}
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="usp_add" style={labelStyle}>USP tags</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input
                type="text"
                id="usp_add"
                value={uspInput}
                onChange={(e) => setUspInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUspTag(); } }}
                placeholder="Add tag"
                disabled={savingTab === 'marketing'}
                style={{ ...inputStyle, flex: 1 }}
                onFocus={focusOutline}
                onBlur={blurOutline}
              />
              <button
                type="button"
                onClick={addUspTag}
                disabled={savingTab === 'marketing'}
                style={{
                  padding: '0.5rem 0.75rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  color: 'rgba(226, 232, 240, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '0.375rem',
                  cursor: savingTab === 'marketing' ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                }}
              >
                Add
              </button>
            </div>
            {uspSuggestionsFiltered.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.5rem' }}>
                {uspSuggestionsFiltered.slice(0, 12).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => { setUspTags((prev) => prev.includes(s) ? prev : [...prev, s]); setUspInput(''); }}
                    disabled={savingTab === 'marketing'}
                    style={{
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '9999px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      cursor: savingTab === 'marketing' ? 'not-allowed' : 'pointer',
                      color: 'rgba(226, 232, 240, 0.95)',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {uspTags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    padding: '0.25rem 0.5rem',
                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                    color: 'rgba(147, 197, 253, 0.95)',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                  }}
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeUspTag(tag)}
                    disabled={savingTab === 'marketing'}
                    aria-label={`Remove ${tag}`}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: savingTab === 'marketing' ? 'not-allowed' : 'pointer',
                      padding: 0,
                      lineHeight: 1,
                      fontSize: '1rem',
                      color: '#1e40af',
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={savingTab === 'marketing'}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: savingTab === 'marketing' ? '#d1d5db' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: savingTab === 'marketing' ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: 500,
              outline: 'none',
            }}
            aria-label="Save marketing"
          >
            {savingTab === 'marketing' ? 'Saving...' : 'Save Marketing'}
          </button>
        </form>
      )}

      {activeTab === 'operations' && (
        <form onSubmit={handleSaveOperations}>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="max_students_private" style={labelStyle}>Max students (private)</label>
            <input
              type="number"
              id="max_students_private"
              min={0}
              value={maxStudentsPrivate}
              onChange={(e) => setMaxStudentsPrivate(e.target.value)}
              disabled={savingTab === 'operations'}
              style={inputStyle}
              onFocus={focusOutline}
              onBlur={blurOutline}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="max_students_group" style={labelStyle}>Max students (group)</label>
            <input
              type="number"
              id="max_students_group"
              min={0}
              value={maxStudentsGroup}
              onChange={(e) => setMaxStudentsGroup(e.target.value)}
              disabled={savingTab === 'operations'}
              style={inputStyle}
              onFocus={focusOutline}
              onBlur={blurOutline}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="min_booking_duration_minutes" style={labelStyle}>Min booking duration (minutes)</label>
            <input
              type="number"
              id="min_booking_duration_minutes"
              min={0}
              value={minBookingDurationMinutes}
              onChange={(e) => setMinBookingDurationMinutes(e.target.value)}
              disabled={savingTab === 'operations'}
              style={inputStyle}
              onFocus={focusOutline}
              onBlur={blurOutline}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={sameDayBookingAllowed}
                onChange={(e) => setSameDayBookingAllowed(e.target.checked)}
                disabled={savingTab === 'operations'}
              />
              Same-day booking allowed
            </label>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="advance_booking_hours" style={labelStyle}>Advance booking (hours)</label>
            <input
              type="number"
              id="advance_booking_hours"
              min={0}
              value={advanceBookingHours}
              onChange={(e) => setAdvanceBookingHours(e.target.value)}
              disabled={savingTab === 'operations'}
              style={inputStyle}
              onFocus={focusOutline}
              onBlur={blurOutline}
            />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="travel_buffer_minutes" style={labelStyle}>Travel buffer (minutes)</label>
            <input
              type="number"
              id="travel_buffer_minutes"
              min={0}
              value={travelBufferMinutes}
              onChange={(e) => setTravelBufferMinutes(e.target.value)}
              disabled={savingTab === 'operations'}
              style={inputStyle}
              onFocus={focusOutline}
              onBlur={blurOutline}
            />
          </div>
          <button
            type="submit"
            disabled={savingTab === 'operations'}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: savingTab === 'operations' ? '#d1d5db' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: savingTab === 'operations' ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: 500,
              outline: 'none',
            }}
            aria-label="Save operations"
          >
            {savingTab === 'operations' ? 'Saving...' : 'Save Operations'}
          </button>
        </form>
      )}
    </div>
  );
}
