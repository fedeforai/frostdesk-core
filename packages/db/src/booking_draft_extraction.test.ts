/**
 * Tests for booking draft extraction logic used by the inbound orchestrator.
 * Tests extractBookingFields for various customer message patterns
 * and verifies the conditions under which a structured draft would be created.
 */

import { describe, it, expect } from 'vitest';
import { extractBookingFields } from './booking_field_extractor.js';

describe('extractBookingFields – booking draft creation conditions', () => {
  it('extracts complete booking from "vorrei prenotare domani alle 10 per 2 persone, 2 ore"', () => {
    const result = extractBookingFields(
      'Ciao, vorrei prenotare domani alle 10:00 per 2 persone, 2 ore di lezione di sci',
    );

    expect(result.complete).toBe(true);
    expect(result.missingFields).toEqual([]);
    expect(result.fields.date).toBeTruthy();
    expect(result.fields.startTime).toBe('10:00');
    expect(result.fields.durationMinutes).toBe(120);
    expect(result.fields.endTime).toBe('12:00');
    expect(result.fields.partySize).toBe(2);
    expect(result.fields.sport).toBe('ski');
  });

  it('extracts complete booking from English message with range', () => {
    const result = extractBookingFields(
      'Hi, I would like to book a lesson tomorrow from 10:00 to 12:00 for 3 people. My name is Sara. Beginner level.',
    );

    expect(result.complete).toBe(true);
    expect(result.fields.startTime).toBe('10:00');
    expect(result.fields.endTime).toBe('12:00');
    expect(result.fields.partySize).toBe(3);
    expect(result.fields.customerName).toBe('Sara');
    expect(result.fields.skillLevel).toBe('beginner');
  });

  it('marks as incomplete when date is missing', () => {
    const result = extractBookingFields(
      'I want a lesson at 10:00 for 2 hours for 2 adults',
    );

    expect(result.complete).toBe(false);
    expect(result.missingFields).toContain('date');
    expect(result.fields.startTime).toBe('10:00');
    expect(result.fields.partySize).toBe(2);
    expect(result.fields.durationMinutes).toBe(120);
  });

  it('marks as incomplete when party size is missing', () => {
    const result = extractBookingFields(
      'Vorrei prenotare domani alle 10:00, 2 ore',
    );

    expect(result.complete).toBe(false);
    expect(result.missingFields).toContain('partySize');
    expect(result.fields.date).toBeTruthy();
    expect(result.fields.startTime).toBe('10:00');
  });

  it('marks as incomplete when time range is missing', () => {
    const result = extractBookingFields(
      'Vorrei prenotare domani per 3 persone',
    );

    expect(result.complete).toBe(false);
    expect(result.missingFields).toContain('startTime');
    expect(result.fields.date).toBeTruthy();
    expect(result.fields.partySize).toBe(3);
  });

  it('extracts resort and meeting point when provided', () => {
    const result = extractBookingFields(
      'Lesson tomorrow at 09:00 to 11:00 for 2 people in Courmayeur. Meeting point: Chécrouit telecabina.',
    );

    expect(result.complete).toBe(true);
    expect(result.fields.resort?.toLowerCase()).toContain('courmayeur');
    expect(result.fields.meetingPointText).toBe('Chécrouit telecabina');
  });

  it('handles "dopodomani" (day after tomorrow)', () => {
    const result = extractBookingFields(
      'Vorrei prenotare dopodomani alle 14:00 per 1 persona, 1 ora',
    );

    const dayAfterTomorrow = new Date();
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    const expected = dayAfterTomorrow.toISOString().slice(0, 10);

    expect(result.fields.date).toBe(expected);
    expect(result.fields.startTime).toBe('14:00');
  });

  it('returns extractionConfidence > 0 even for incomplete messages', () => {
    const result = extractBookingFields('I want a ski lesson');

    expect(result.complete).toBe(false);
    expect(result.extractionConfidence).toBeGreaterThan(0);
    expect(result.fields.sport).toBe('ski');
  });

  it('handles European date format', () => {
    const result = extractBookingFields(
      'Vorrei prenotare il 15/03/2026 alle 10:00 per 2 persone, 2h',
    );

    expect(result.complete).toBe(true);
    expect(result.fields.date).toBe('2026-03-15');
    expect(result.fields.startTime).toBe('10:00');
    expect(result.fields.partySize).toBe(2);
    expect(result.fields.durationMinutes).toBe(120);
  });
});
