import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  transitionBookingState,
  InvalidBookingTransitionError,
  canTransition,
  isTerminal,
  isActive,
  type BookingState,
} from '../src/booking_state_machine.js';
import {
  applyExpireCheckOnRead,
  isPendingBookingExpired,
} from '../src/booking_expiry.js';

describe('Booking state machine', () => {
  describe('Allowed transitions', () => {
    it('draft → pending', () => {
      expect(transitionBookingState('draft', 'pending')).toBe('pending');
    });
    it('pending → confirmed', () => {
      expect(transitionBookingState('pending', 'confirmed')).toBe('confirmed');
    });
    it('pending → declined', () => {
      expect(transitionBookingState('pending', 'declined')).toBe('declined');
    });
    it('confirmed → modified', () => {
      expect(transitionBookingState('confirmed', 'modified')).toBe('modified');
    });
    it('confirmed → cancelled', () => {
      expect(transitionBookingState('confirmed', 'cancelled')).toBe('cancelled');
    });
    it('modified → modified', () => {
      expect(transitionBookingState('modified', 'modified')).toBe('modified');
    });
    it('modified → cancelled', () => {
      expect(transitionBookingState('modified', 'cancelled')).toBe('cancelled');
    });
  });

  describe('Forbidden transitions', () => {
    it('throws for draft → confirmed', () => {
      expect(() => transitionBookingState('draft', 'confirmed')).toThrow(
        InvalidBookingTransitionError
      );
    });
    it('throws for draft → cancelled', () => {
      expect(() => transitionBookingState('draft', 'cancelled')).toThrow(
        InvalidBookingTransitionError
      );
    });
    it('throws for pending → draft', () => {
      expect(() => transitionBookingState('pending', 'draft')).toThrow(
        InvalidBookingTransitionError
      );
    });
    it('throws for confirmed → pending', () => {
      expect(() => transitionBookingState('confirmed', 'pending')).toThrow(
        InvalidBookingTransitionError
      );
    });
    it('throws for declined → confirmed', () => {
      expect(() => transitionBookingState('declined', 'confirmed')).toThrow(
        InvalidBookingTransitionError
      );
    });
    it('throws for cancelled → pending', () => {
      expect(() => transitionBookingState('cancelled', 'pending')).toThrow(
        InvalidBookingTransitionError
      );
    });
  });

  describe('canTransition', () => {
    it('returns true for allowed transitions', () => {
      expect(canTransition('draft', 'pending')).toBe(true);
      expect(canTransition('pending', 'declined')).toBe(true);
      expect(canTransition('modified', 'modified')).toBe(true);
    });
    it('returns false for forbidden transitions', () => {
      expect(canTransition('draft', 'confirmed')).toBe(false);
      expect(canTransition('cancelled', 'pending')).toBe(false);
    });
  });

  describe('isTerminal / isActive', () => {
    it('declined and cancelled are terminal', () => {
      expect(isTerminal('declined')).toBe(true);
      expect(isTerminal('cancelled')).toBe(true);
      expect(isActive('declined')).toBe(false);
      expect(isActive('cancelled')).toBe(false);
    });
    it('draft, pending, confirmed, modified are active', () => {
      (['draft', 'pending', 'confirmed', 'modified'] as BookingState[]).forEach(
        (s) => {
          expect(isTerminal(s)).toBe(false);
          expect(isActive(s)).toBe(true);
        }
      );
    });
  });
});

describe('Expire check on read', () => {
  describe('isPendingBookingExpired', () => {
    it('returns true when created_at is older than 24h', () => {
      const old = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      expect(isPendingBookingExpired(old)).toBe(true);
    });
    it('returns false when created_at is within 24h', () => {
      const recent = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
      expect(isPendingBookingExpired(recent)).toBe(false);
    });
  });

  describe('applyExpireCheckOnRead', () => {
    it('returns same booking when not pending', async () => {
      const booking = {
        id: 'b1',
        status: 'confirmed',
        created_at: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
      };
      const updateBookingState = jest.fn();
      const recordBookingAudit = jest.fn();
      const transitionBookingState = jest.fn();
      const result = await applyExpireCheckOnRead(
        booking,
        'instructor-1',
        {
          updateBookingState,
          recordBookingAudit,
          transitionBookingState,
        }
      );
      expect(result).toBe(booking);
      expect(result.status).toBe('confirmed');
      expect(updateBookingState).not.toHaveBeenCalled();
      expect(recordBookingAudit).not.toHaveBeenCalled();
    });

    it('returns same booking when pending but created_at within 24h', async () => {
      const booking = {
        id: 'b2',
        status: 'pending',
        created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      };
      const updateBookingState = jest.fn();
      const recordBookingAudit = jest.fn();
      const transitionBookingState = jest.fn();
      const result = await applyExpireCheckOnRead(booking, 'instructor-1', {
        updateBookingState,
        recordBookingAudit,
        transitionBookingState,
      });
      expect(result).toBe(booking);
      expect(updateBookingState).not.toHaveBeenCalled();
      expect(recordBookingAudit).not.toHaveBeenCalled();
    });

    it('transitions to declined and persists when pending and older than 24h', async () => {
      const booking = {
        id: 'b3',
        status: 'pending',
        created_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      };
      const updatedRow = { ...booking, status: 'declined' };
      const updateBookingState = jest.fn().mockResolvedValue(updatedRow);
      const recordBookingAudit = jest.fn().mockResolvedValue(undefined);
      const transitionBookingState = jest.fn().mockReturnValue('declined');
      const result = await applyExpireCheckOnRead(booking, 'instructor-1', {
        updateBookingState,
        recordBookingAudit,
        transitionBookingState,
      });
      expect(result.status).toBe('declined');
      expect(transitionBookingState).toHaveBeenCalledWith('pending', 'declined');
      expect(recordBookingAudit).toHaveBeenCalledWith({
        bookingId: 'b3',
        previousState: 'pending',
        newState: 'declined',
        actor: 'system',
      });
      expect(updateBookingState).toHaveBeenCalledWith('b3', 'declined');
    });
  });
});
