'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  InstructorBookingRule,
  BookingRuleType,
  BookingRuleConfig,
  CreateBookingRuleParams,
  UpdateBookingRuleParams,
} from '@/lib/instructorApi';
import {
  fetchBookingRules,
  fetchBookingRuleDefaults,
  createBookingRule,
  updateBookingRule,
  toggleBookingRule,
  deleteBookingRule,
} from '@/lib/instructorApi';

const RULE_TYPE_LABELS: Record<BookingRuleType, { label: string; description: string }> = {
  min_duration: {
    label: 'Durata Minima',
    description: 'Imposta la durata minima per una prenotazione',
  },
  advance_booking: {
    label: 'Preavviso Minimo',
    description: 'Richiedi un minimo di ore di anticipo per prenotare',
  },
  max_advance: {
    label: 'Anticipo Massimo',
    description: 'Limita quanto in anticipo si può prenotare',
  },
  travel_buffer: {
    label: 'Buffer Spostamento',
    description: 'Tempo minimo tra prenotazioni per spostarsi',
  },
  gap_protection: {
    label: 'Protezione Buchi',
    description: 'Avvisa quando si creano buchi non utilizzabili',
  },
  daily_limit: {
    label: 'Limite Giornaliero',
    description: 'Limita le ore o prenotazioni per giorno',
  },
  weekly_limit: {
    label: 'Limite Settimanale',
    description: 'Limita le ore totali per settimana',
  },
  full_week_preference: {
    label: 'Preferenza Settimana Intera',
    description: 'Incentiva prenotazioni di più giorni consecutivi',
  },
};

const ALL_RULE_TYPES: BookingRuleType[] = [
  'min_duration',
  'advance_booking',
  'max_advance',
  'travel_buffer',
  'gap_protection',
  'daily_limit',
  'weekly_limit',
  'full_week_preference',
];

const sectionStyle: React.CSSProperties = {
  backgroundColor: '#f9fafb',
  borderRadius: '0.5rem',
  padding: '1rem',
  marginBottom: '1rem',
  border: '1px solid #e5e7eb',
};

const titleStyle: React.CSSProperties = {
  fontSize: '1rem',
  fontWeight: '600',
  marginBottom: '0.75rem',
  color: '#111827',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '0.5rem',
  fontSize: '0.875rem',
  fontWeight: '500',
  color: '#374151',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem',
  border: '1px solid #d1d5db',
  borderRadius: '0.375rem',
  fontSize: '1rem',
  backgroundColor: '#ffffff',
  color: '#111827',
};

const buttonStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  borderRadius: '0.375rem',
  fontWeight: '500',
  cursor: 'pointer',
  border: 'none',
  transition: 'all 0.2s',
};

interface RuleEditorProps {
  rule: InstructorBookingRule;
  onUpdate: (id: string, params: UpdateBookingRuleParams) => Promise<void>;
  onToggle: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  loading: boolean;
}

function RuleEditor({ rule, onUpdate, onToggle, onDelete, loading }: RuleEditorProps) {
  const [editing, setEditing] = useState(false);
  const [config, setConfig] = useState<BookingRuleConfig>(rule.config);

  const handleSave = async () => {
    await onUpdate(rule.id, { config });
    setEditing(false);
  };

  const renderConfigEditor = () => {
    switch (rule.rule_type) {
      case 'min_duration':
        return (
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Durata minima (ore)</label>
            <input
              type="number"
              min="0.5"
              step="0.5"
              value={(config as { min_hours?: number }).min_hours ?? 1}
              onChange={(e) => setConfig({ ...config, min_hours: parseFloat(e.target.value) })}
              style={inputStyle}
              disabled={loading}
            />
          </div>
        );
      case 'advance_booking':
        return (
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Ore minime di anticipo</label>
            <input
              type="number"
              min="1"
              value={(config as { min_hours_advance?: number }).min_hours_advance ?? 24}
              onChange={(e) => setConfig({ ...config, min_hours_advance: parseInt(e.target.value) })}
              style={inputStyle}
              disabled={loading}
            />
          </div>
        );
      case 'max_advance':
        return (
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Giorni massimi di anticipo</label>
            <input
              type="number"
              min="1"
              value={(config as { max_days_advance?: number }).max_days_advance ?? 60}
              onChange={(e) => setConfig({ ...config, max_days_advance: parseInt(e.target.value) })}
              style={inputStyle}
              disabled={loading}
            />
          </div>
        );
      case 'travel_buffer':
        return (
          <>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Buffer di default (minuti)</label>
              <input
                type="number"
                min="0"
                value={(config as { default_minutes?: number }).default_minutes ?? 15}
                onChange={(e) => setConfig({ ...config, default_minutes: parseInt(e.target.value) })}
                style={inputStyle}
                disabled={loading}
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Buffer stesso luogo (minuti)</label>
              <input
                type="number"
                min="0"
                value={(config as { same_location_minutes?: number }).same_location_minutes ?? 5}
                onChange={(e) => setConfig({ ...config, same_location_minutes: parseInt(e.target.value) })}
                style={inputStyle}
                disabled={loading}
              />
            </div>
          </>
        );
      case 'gap_protection':
        return (
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Buco minimo utile (ore)</label>
            <input
              type="number"
              min="0.5"
              step="0.5"
              value={(config as { min_useful_gap_hours?: number }).min_useful_gap_hours ?? 2}
              onChange={(e) => setConfig({ ...config, min_useful_gap_hours: parseFloat(e.target.value) })}
              style={inputStyle}
              disabled={loading}
            />
          </div>
        );
      case 'daily_limit':
        return (
          <>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Ore massime al giorno</label>
              <input
                type="number"
                min="1"
                value={(config as { max_hours_per_day?: number }).max_hours_per_day ?? 8}
                onChange={(e) => setConfig({ ...config, max_hours_per_day: parseInt(e.target.value) })}
                style={inputStyle}
                disabled={loading}
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Prenotazioni massime al giorno (opzionale)</label>
              <input
                type="number"
                min="1"
                value={(config as { max_bookings_per_day?: number }).max_bookings_per_day ?? ''}
                onChange={(e) => {
                  const val = e.target.value ? parseInt(e.target.value) : undefined;
                  setConfig({ ...config, max_bookings_per_day: val });
                }}
                style={inputStyle}
                disabled={loading}
                placeholder="Nessun limite"
              />
            </div>
          </>
        );
      case 'weekly_limit':
        return (
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Ore massime a settimana</label>
            <input
              type="number"
              min="1"
              value={(config as { max_hours_per_week?: number }).max_hours_per_week ?? 40}
              onChange={(e) => setConfig({ ...config, max_hours_per_week: parseInt(e.target.value) })}
              style={inputStyle}
              disabled={loading}
            />
          </div>
        );
      case 'full_week_preference':
        return (
          <>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Giorni minimi consecutivi</label>
              <input
                type="number"
                min="2"
                max="7"
                value={(config as { min_consecutive_days?: number }).min_consecutive_days ?? 5}
                onChange={(e) => setConfig({ ...config, min_consecutive_days: parseInt(e.target.value) })}
                style={inputStyle}
                disabled={loading}
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Sconto percentuale</label>
              <input
                type="number"
                min="0"
                max="50"
                value={(config as { discount_percent?: number }).discount_percent ?? 10}
                onChange={(e) => setConfig({ ...config, discount_percent: parseInt(e.target.value) })}
                style={inputStyle}
                disabled={loading}
              />
            </div>
          </>
        );
      default:
        return <p style={{ color: '#6b7280' }}>Configurazione non disponibile</p>;
    }
  };

  const info = RULE_TYPE_LABELS[rule.rule_type];

  return (
    <div
      style={{
        ...sectionStyle,
        opacity: rule.is_active ? 1 : 0.6,
        backgroundColor: rule.is_active ? '#f9fafb' : '#f3f4f6',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ ...titleStyle, marginBottom: '0.25rem' }}>{info.label}</h3>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>{info.description}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => onToggle(rule.id)}
            disabled={loading}
            style={{
              ...buttonStyle,
              backgroundColor: rule.is_active ? '#dcfce7' : '#f3f4f6',
              color: rule.is_active ? '#166534' : '#6b7280',
            }}
          >
            {rule.is_active ? 'Attivo' : 'Disattivato'}
          </button>
          <button
            type="button"
            onClick={() => onDelete(rule.id)}
            disabled={loading}
            style={{
              ...buttonStyle,
              backgroundColor: '#fee2e2',
              color: '#991b1b',
            }}
          >
            Elimina
          </button>
        </div>
      </div>

      {editing ? (
        <>
          {renderConfigEditor()}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              style={{
                ...buttonStyle,
                backgroundColor: '#3b82f6',
                color: 'white',
              }}
            >
              Salva
            </button>
            <button
              type="button"
              onClick={() => {
                setConfig(rule.config);
                setEditing(false);
              }}
              disabled={loading}
              style={{
                ...buttonStyle,
                backgroundColor: '#e5e7eb',
                color: '#374151',
              }}
            >
              Annulla
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          disabled={loading}
          style={{
            ...buttonStyle,
            backgroundColor: '#dbeafe',
            color: '#1d4ed8',
          }}
        >
          Modifica
        </button>
      )}
    </div>
  );
}

export default function BookingRulesForm() {
  const [rules, setRules] = useState<InstructorBookingRule[]>([]);
  const [defaults, setDefaults] = useState<Record<BookingRuleType, BookingRuleConfig> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingType, setAddingType] = useState<BookingRuleType | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rulesData, defaultsData] = await Promise.all([
        fetchBookingRules(),
        fetchBookingRuleDefaults(),
      ]);
      setRules(rulesData);
      setDefaults(defaultsData);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Errore nel caricamento';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const existingTypes = new Set(rules.map((r) => r.rule_type));
  const availableTypes = ALL_RULE_TYPES.filter((t) => !existingTypes.has(t));

  const handleAddRule = async (ruleType: BookingRuleType) => {
    setSaving(true);
    setError(null);
    try {
      const defaultConfig = defaults?.[ruleType] ?? {};
      const newRule = await createBookingRule({
        rule_type: ruleType,
        config: defaultConfig,
        is_active: true,
      });
      setRules((prev) => [...prev, newRule]);
      setAddingType(null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Errore nella creazione';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRule = async (id: string, params: UpdateBookingRuleParams) => {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateBookingRule(id, params);
      setRules((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Errore nel salvataggio';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleRule = async (id: string) => {
    setSaving(true);
    setError(null);
    try {
      const updated = await toggleBookingRule(id);
      setRules((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Errore nel toggle';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa regola?')) return;
    setSaving(true);
    setError(null);
    try {
      await deleteBookingRule(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Errore nella cancellazione';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', color: '#6b7280' }}>
        Caricamento regole prenotazione...
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ ...titleStyle, fontSize: '1.125rem', marginBottom: '1rem' }}>Regole di Prenotazione</h2>

      {error && (
        <div
          role="alert"
          style={{
            marginBottom: '1rem',
            padding: '0.75rem',
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            borderRadius: '0.375rem',
            border: '1px solid #fecaca',
          }}
        >
          {error}
        </div>
      )}

      {rules.length === 0 && (
        <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
          Non hai ancora configurato nessuna regola di prenotazione.
        </p>
      )}

      {rules.map((rule) => (
        <RuleEditor
          key={rule.id}
          rule={rule}
          onUpdate={handleUpdateRule}
          onToggle={handleToggleRule}
          onDelete={handleDeleteRule}
          loading={saving}
        />
      ))}

      {availableTypes.length > 0 && (
        <div style={sectionStyle}>
          <h3 style={{ ...titleStyle, fontSize: '0.875rem' }}>Aggiungi Nuova Regola</h3>
          {addingType === null ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {availableTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setAddingType(type)}
                  disabled={saving}
                  style={{
                    ...buttonStyle,
                    backgroundColor: '#dbeafe',
                    color: '#1d4ed8',
                  }}
                >
                  + {RULE_TYPE_LABELS[type].label}
                </button>
              ))}
            </div>
          ) : (
            <div>
              <p style={{ color: '#374151', marginBottom: '1rem' }}>
                Aggiungere la regola &quot;{RULE_TYPE_LABELS[addingType].label}&quot;?
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => handleAddRule(addingType)}
                  disabled={saving}
                  style={{
                    ...buttonStyle,
                    backgroundColor: '#3b82f6',
                    color: 'white',
                  }}
                >
                  Conferma
                </button>
                <button
                  type="button"
                  onClick={() => setAddingType(null)}
                  disabled={saving}
                  style={{
                    ...buttonStyle,
                    backgroundColor: '#e5e7eb',
                    color: '#374151',
                  }}
                >
                  Annulla
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
