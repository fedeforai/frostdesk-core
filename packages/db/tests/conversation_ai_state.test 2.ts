/**
 * Loop 3: AI conversation state machine — minimal tests.
 * Default ai_state = ai_on; manual pause/reactivate; ai_suggestion_only blocks send, allows draft.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  getConversationAiState,
  setConversationAiState,
  canAISuggest,
  canSendAIDraft,
} from '../src/conversation_ai_state_repository.js';
jest.mock('../src/client.js');
jest.mock('../src/audit_log_repository.js');

const sql = jest.requireMock('../src/client.js').sql;

describe('Conversation AI state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('canAISuggest / canSendAIDraft', () => {
    it('ai_on: can suggest and can send', () => {
      expect(canAISuggest('ai_on')).toBe(true);
      expect(canSendAIDraft('ai_on')).toBe(true);
    });
    it('ai_paused_by_human: cannot suggest, cannot send', () => {
      expect(canAISuggest('ai_paused_by_human')).toBe(false);
      expect(canSendAIDraft('ai_paused_by_human')).toBe(false);
    });
    it('ai_suggestion_only: can suggest, cannot send', () => {
      expect(canAISuggest('ai_suggestion_only')).toBe(true);
      expect(canSendAIDraft('ai_suggestion_only')).toBe(false);
    });
  });

  describe('getConversationAiState', () => {
    it('returns ai_on when row has ai_on', async () => {
      sql.mockResolvedValueOnce([{ ai_state: 'ai_on' }]);
      const state = await getConversationAiState('conv-1');
      expect(state).toBe('ai_on');
    });
    it('returns ai_paused_by_human when row has ai_paused_by_human', async () => {
      sql.mockResolvedValueOnce([{ ai_state: 'ai_paused_by_human' }]);
      const state = await getConversationAiState('conv-1');
      expect(state).toBe('ai_paused_by_human');
    });
    it('returns ai_on when no row (default)', async () => {
      sql.mockResolvedValueOnce([]);
      const state = await getConversationAiState('conv-1');
      expect(state).toBe('ai_on');
    });
  });

  describe('setConversationAiState', () => {
    it('manual pause sets ai_paused_by_human', async () => {
      const insertAuditEvent = jest.requireMock('../src/audit_log_repository.js').insertAuditEvent;
      insertAuditEvent.mockResolvedValue(undefined);
      sql
        .mockResolvedValueOnce([{ ai_state: 'ai_on' }])
        .mockResolvedValueOnce(undefined);

      await setConversationAiState({
        conversationId: 'conv-1',
        nextState: 'ai_paused_by_human',
        actorType: 'human',
        reason: 'manual_pause_in_ui',
      });

      expect(sql).toHaveBeenCalledTimes(2);
      expect(insertAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ai_state_change',
          entity_id: 'conv-1',
          payload: expect.objectContaining({
            previous_state: 'ai_on',
            next_state: 'ai_paused_by_human',
            actor_type: 'human',
            reason: 'manual_pause_in_ui',
          }),
        })
      );
    });

    it('reactivate sets ai_on', async () => {
      const insertAuditEvent = jest.requireMock('../src/audit_log_repository.js').insertAuditEvent;
      insertAuditEvent.mockResolvedValue(undefined);
      sql
        .mockResolvedValueOnce([{ ai_state: 'ai_paused_by_human' }])
        .mockResolvedValueOnce(undefined);

      await setConversationAiState({
        conversationId: 'conv-1',
        nextState: 'ai_on',
        actorType: 'human',
        reason: 'manual_reactivate_in_ui',
      });

      expect(insertAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            previous_state: 'ai_paused_by_human',
            next_state: 'ai_on',
          }),
        })
      );
    });
  });
});

// ai_suggestion_only blocks send: enforced in ai_draft_send_repository via canSendAIDraft.
// canSendAIDraft('ai_suggestion_only') === false is tested above.
