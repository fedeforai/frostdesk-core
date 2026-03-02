/**
 * A/B test: Hero variant. RALPH-safe: deterministic assignment, explicit persistence.
 * Variant is assigned once and stored in localStorage; no hidden automation.
 */

export type HeroVariant = "A" | "B";

const STORAGE_KEY = "frostdesk_hero_variant";

export function getStoredVariant(): HeroVariant | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "A" || v === "B") return v;
    return null;
  } catch {
    return null;
  }
}

/**
 * Assign variant: use stored if present, else random 50/50 and persist.
 * Call from client once; then use getStoredVariant() for render.
 */
export function assignAndPersistVariant(onAssigned: (variant: HeroVariant) => void): HeroVariant {
  const stored = getStoredVariant();
  if (stored) {
    onAssigned(stored);
    return stored;
  }
  const variant: HeroVariant = Math.random() < 0.5 ? "A" : "B";
  try {
    localStorage.setItem(STORAGE_KEY, variant);
  } catch {
    // ignore
  }
  onAssigned(variant);
  return variant;
}

export function getHeroVariantForRender(): HeroVariant {
  if (typeof window === "undefined") return "A";
  const stored = getStoredVariant();
  if (stored) return stored;
  return "A";
}
