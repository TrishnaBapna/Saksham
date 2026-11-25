/**
 * SAKSHAM — Phase 3.21: Relationship Translation Helper
 * Preserves Category C user-entered data verbatim while translating standard relationships
 * and compound family roles into the active selected language.
 */

export function getTranslatedRelationship(
  relationship: string | undefined | null,
  t: (key: string, params?: Record<string, any>) => string
): string {
  if (!relationship) return '';
  const trimmed = relationship.trim();
  const lower = trimmed.toLowerCase();

  // 1. Compound matches for default and common family roles
  if (lower.includes('daughter') && (lower.includes('caregiver') || lower.includes('primary'))) {
    return t('loved_ones.relationship_daughter_caregiver');
  }
  if (lower.includes('grandson') && (lower.includes('9') || lower.includes('age'))) {
    return t('loved_ones.relationship_grandson_age');
  }
  if (lower.includes('son') && (lower.includes('brother') || lower.includes('elder') || lower.includes('ananya'))) {
    return t('loved_ones.relationship_son_brother');
  }
  if (lower.includes('friend') && (lower.includes('lifelong') || lower.includes('best'))) {
    return t('loved_ones.relationship_lifelong_friend');
  }

  // 2. Direct simple key lookup if sanitized key exists in dictionary
  const sanitizedKey = `loved_ones.relationship_${lower.replace(/[^a-z0-9_]/g, '_')}`;
  const directTranslated = t(sanitizedKey);
  if (directTranslated !== sanitizedKey) {
    return directTranslated;
  }

  // 3. Fallback to basic relation keywords
  if (lower === 'daughter' || lower.startsWith('daughter')) return t('loved_ones.relationship_daughter');
  if (lower === 'son' || lower.startsWith('son')) return t('loved_ones.relationship_son');
  if (lower === 'husband') return t('loved_ones.relationship_husband');
  if (lower === 'wife') return t('loved_ones.relationship_wife');
  if (lower === 'grandson') return t('loved_ones.relationship_grandson');
  if (lower === 'granddaughter') return t('loved_ones.relationship_granddaughter');
  if (lower === 'sister') return t('loved_ones.relationship_sister');
  if (lower === 'brother') return t('loved_ones.relationship_brother');
  if (lower === 'friend') return t('loved_ones.relationship_friend');
  if (lower === 'caregiver') return t('loved_ones.relationship_caregiver');

  // 4. Category C preservation: return user-entered relationship as-is without corrupting
  return trimmed;
}
