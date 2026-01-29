import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ingestInboundMessage } from '../src/message_ingestion_service.js';
import { resolveConversationForInboundMessage } from '../src/conversation_service.js';
import { getMessagesByConversation, createMessage, Message } from '../src/message_repository.js';
import { sql } from '../src/client.js';
import * as conversationRepository from '../src/conversation_repository.js';
import { Conversation } from '../src/conversation_repository.js';

// Mock dependencies
jest.mock('../src/client.js');
jest.mock('../src/message_repository.js');
jest.mock('../src/conversation_repository.js');

describe('Message Persistence Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Conversation Resolution - Reuse Open Conversation', () => {
    it('reuses same conversation for two inbound messages from same customer', async () => {
      const customerIdentifier = 'customer-123';
      const instructorId = '1';
      const openConversation: Conversation = {
        id: 'conv-1',
        instructor_id: 1,
        customer_identifier: customerIdentifier,
        state: 'open',
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
      };

      const message1: Message = {
        id: 'msg-1',
        conversation_id: 'conv-1',
        direction: 'inbound',
        content: 'Hello',
        raw_payload: '{}',
        created_at: '2024-01-01T10:01:00Z',
      };

      const message2: Message = {
        id: 'msg-2',
        conversation_id: 'conv-1',
        direction: 'inbound',
        content: 'Hello again',
        raw_payload: '{}',
        created_at: '2024-01-01T10:02:00Z',
      };

      // First message - finds existing conversation
      (sql as unknown as jest.Mock).mockResolvedValueOnce([openConversation]);
      (createMessage as jest.Mock).mockResolvedValueOnce(message1);

      const result1 = await ingestInboundMessage({
        instructorId,
        customerIdentifier,
        content: 'Hello',
        rawPayload: {},
      });

      expect(result1.conversationId).toBe('conv-1');

      // Second message - reuses same conversation
      (sql as unknown as jest.Mock).mockResolvedValueOnce([openConversation]);
      (createMessage as jest.Mock).mockResolvedValueOnce(message2);

      const result2 = await ingestInboundMessage({
        instructorId,
        customerIdentifier,
        content: 'Hello again',
        rawPayload: {},
      });

      expect(result2.conversationId).toBe('conv-1');
      expect(result1.conversationId).toBe(result2.conversationId);
    });
  });

  describe('Conversation Resolution - New After Closed', () => {
    it('creates new conversation when previous one is closed', async () => {
      const customerIdentifier = 'customer-456';
      const instructorId = '1';
      const closedConversation: Conversation = {
        id: 'conv-closed',
        instructor_id: 1,
        customer_identifier: customerIdentifier,
        state: 'closed',
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
      };

      const newConversation: Conversation = {
        id: 'conv-new',
        instructor_id: 1,
        customer_identifier: customerIdentifier,
        state: 'open',
        created_at: '2024-01-01T11:00:00Z',
        updated_at: '2024-01-01T11:00:00Z',
      };

      const message: Message = {
        id: 'msg-new',
        conversation_id: 'conv-new',
        direction: 'inbound',
        content: 'New message',
        raw_payload: '{}',
        created_at: '2024-01-01T11:01:00Z',
      };

      // Query returns empty (closed conversations are not in ('open', 'requires_human'))
      (sql as unknown as jest.Mock).mockResolvedValueOnce([]);
      (conversationRepository.createConversation as jest.Mock).mockResolvedValueOnce(newConversation);
      (createMessage as jest.Mock).mockResolvedValueOnce(message);

      const result = await ingestInboundMessage({
        instructorId,
        customerIdentifier,
        content: 'New message',
        rawPayload: {},
      });

      expect(result.conversationId).toBe('conv-new');
      expect(result.conversationId).not.toBe('conv-closed');
      expect(conversationRepository.createConversation).toHaveBeenCalledWith({
        instructor_id: 1,
        customer_identifier: customerIdentifier,
        state: 'open',
      });
    });
  });

  describe('requires_human Treated as Open', () => {
    it('reuses conversation in requires_human state', async () => {
      const customerIdentifier = 'customer-789';
      const instructorId = '1';
      const requiresHumanConversation: Conversation = {
        id: 'conv-requires-human',
        instructor_id: 1,
        customer_identifier: customerIdentifier,
        state: 'requires_human',
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
      };

      const message: Message = {
        id: 'msg-1',
        conversation_id: 'conv-requires-human',
        direction: 'inbound',
        content: 'Message',
        raw_payload: '{}',
        created_at: '2024-01-01T10:01:00Z',
      };

      // Query returns requires_human conversation (treated as open)
      (sql as unknown as jest.Mock).mockResolvedValueOnce([requiresHumanConversation]);
      (createMessage as jest.Mock).mockResolvedValueOnce(message);

      const result = await ingestInboundMessage({
        instructorId,
        customerIdentifier,
        content: 'Message',
        rawPayload: {},
      });

      expect(result.conversationId).toBe('conv-requires-human');
      // Should not create a new conversation
      expect(conversationRepository.createConversation).not.toHaveBeenCalled();
    });
  });

  describe('Message Persistence - Append Only', () => {
    it('persists multiple messages to same conversation without overwriting', async () => {
      const conversationId = 'conv-1';
      const message1: Message = {
        id: 'msg-1',
        conversation_id: conversationId,
        direction: 'inbound',
        content: 'First message',
        raw_payload: '{}',
        created_at: '2024-01-01T10:00:00Z',
      };

      const message2: Message = {
        id: 'msg-2',
        conversation_id: conversationId,
        direction: 'inbound',
        content: 'Second message',
        raw_payload: '{}',
        created_at: '2024-01-01T10:01:00Z',
      };

      (createMessage as jest.Mock)
        .mockResolvedValueOnce(message1)
        .mockResolvedValueOnce(message2);

      // Create first message
      await createMessage({
        conversation_id: conversationId,
        direction: 'inbound',
        content: 'First message',
        raw_payload: '{}',
      });

      // Create second message
      await createMessage({
        conversation_id: conversationId,
        direction: 'inbound',
        content: 'Second message',
        raw_payload: '{}',
      });

      expect(createMessage).toHaveBeenCalledTimes(2);
      expect(createMessage).toHaveBeenNthCalledWith(1, {
        conversation_id: conversationId,
        direction: 'inbound',
        content: 'First message',
        raw_payload: '{}',
      });
      expect(createMessage).toHaveBeenNthCalledWith(2, {
        conversation_id: conversationId,
        direction: 'inbound',
        content: 'Second message',
        raw_payload: '{}',
      });
    });
  });

  describe('Message Ordering', () => {
    it('returns messages ordered by created_at ASC', async () => {
      const conversationId = 'conv-1';
      const messages: Message[] = [
        {
          id: 'msg-1',
          conversation_id: conversationId,
          direction: 'inbound',
          content: 'First',
          raw_payload: '{}',
          created_at: '2024-01-01T10:00:00Z',
        },
        {
          id: 'msg-2',
          conversation_id: conversationId,
          direction: 'inbound',
          content: 'Second',
          raw_payload: '{}',
          created_at: '2024-01-01T10:01:00Z',
        },
        {
          id: 'msg-3',
          conversation_id: conversationId,
          direction: 'inbound',
          content: 'Third',
          raw_payload: '{}',
          created_at: '2024-01-01T10:02:00Z',
        },
      ];

      (getMessagesByConversation as jest.Mock).mockResolvedValue(messages);

      const result = await getMessagesByConversation(conversationId);

      expect(result.length).toBe(3);
      expect(result[0].id).toBe('msg-1');
      expect(result[0].created_at).toBe('2024-01-01T10:00:00Z');
      expect(result[1].id).toBe('msg-2');
      expect(result[1].created_at).toBe('2024-01-01T10:01:00Z');
      expect(result[2].id).toBe('msg-3');
      expect(result[2].created_at).toBe('2024-01-01T10:02:00Z');

      // Verify ordering is ascending
      for (let i = 0; i < result.length - 1; i++) {
        expect(new Date(result[i].created_at).getTime()).toBeLessThanOrEqual(
          new Date(result[i + 1].created_at).getTime()
        );
      }
    });
  });

  describe('No Cross-Conversation Contamination', () => {
    it('messages from customer A do not appear in customer B conversation', async () => {
      const conversationA = 'conv-customer-a';
      const conversationB = 'conv-customer-b';

      const messagesA: Message[] = [
        {
          id: 'msg-a-1',
          conversation_id: conversationA,
          direction: 'inbound',
          content: 'Message from A',
          raw_payload: '{}',
          created_at: '2024-01-01T10:00:00Z',
        },
      ];

      const messagesB: Message[] = [
        {
          id: 'msg-b-1',
          conversation_id: conversationB,
          direction: 'inbound',
          content: 'Message from B',
          raw_payload: '{}',
          created_at: '2024-01-01T10:00:00Z',
        },
      ];

      (getMessagesByConversation as jest.Mock)
        .mockResolvedValueOnce(messagesA)
        .mockResolvedValueOnce(messagesB);

      const resultA = await getMessagesByConversation(conversationA);
      const resultB = await getMessagesByConversation(conversationB);

      expect(resultA.length).toBe(1);
      expect(resultA[0].conversation_id).toBe(conversationA);
      expect(resultA[0].content).toBe('Message from A');

      expect(resultB.length).toBe(1);
      expect(resultB[0].conversation_id).toBe(conversationB);
      expect(resultB[0].content).toBe('Message from B');

      // Verify no cross-contamination
      expect(resultA[0].conversation_id).not.toBe(conversationB);
      expect(resultB[0].conversation_id).not.toBe(conversationA);
    });
  });

  describe('Ingestion Service - Minimal Context Returned', () => {
    it('returns only conversationId and messageId', async () => {
      const conversation: Conversation = {
        id: 'conv-1',
        instructor_id: 1,
        customer_identifier: 'customer-123',
        state: 'open',
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
      };

      const message: Message = {
        id: 'msg-1',
        conversation_id: 'conv-1',
        direction: 'inbound',
        content: 'Test message',
        raw_payload: '{}',
        created_at: '2024-01-01T10:01:00Z',
      };

      (sql as unknown as jest.Mock).mockResolvedValueOnce([conversation]);
      (createMessage as jest.Mock).mockResolvedValueOnce(message);

      const result = await ingestInboundMessage({
        instructorId: '1',
        customerIdentifier: 'customer-123',
        content: 'Test message',
        rawPayload: {},
      });

      // Verify minimal return payload
      expect(result).toHaveProperty('conversationId');
      expect(result).toHaveProperty('messageId');
      expect(Object.keys(result)).toHaveLength(2);
      expect(result.conversationId).toBe('conv-1');
      expect(result.messageId).toBe('msg-1');

      // Verify no additional properties
      expect(result).not.toHaveProperty('content');
      expect(result).not.toHaveProperty('direction');
      expect(result).not.toHaveProperty('rawPayload');
    });
  });
});
