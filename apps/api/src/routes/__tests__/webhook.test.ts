import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import Fastify from 'fastify';
import { webhookRoutes } from '../webhook.js';
import { createConversation, createMessage } from '@frostdesk/db';

// Mock the database functions
jest.mock('@frostdesk/db', () => ({
  getOrCreateConversation: jest.fn(),
  findDuplicateMessage: jest.fn(),
  createMessage: jest.fn(),
  createConversation: jest.fn(),
  ensureValidUUID: jest.fn((id) => {
    // Simple UUID validation mock
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (id && uuidRegex.test(id)) {
      return id;
    }
    return '00000000-0000-4000-8000-000000000000'; // Generated UUID
  }),
}));

describe('POST /webhook', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(() => {
    app = Fastify();
    app.register(webhookRoutes);
  });

  afterEach(async () => {
    await app.close();
  });

  it('creates new conversation when invalid conversation_id provided', async () => {
    const { getOrCreateConversation, createMessage, ensureValidUUID } = await import('@frostdesk/db');
    
    (ensureValidUUID as jest.Mock).mockReturnValue('new-uuid-123');
    (getOrCreateConversation as jest.Mock).mockResolvedValue({ id: 'new-uuid-123' });
    (createMessage as jest.Mock).mockResolvedValue({ id: 'msg-123' });
    (findDuplicateMessage as jest.Mock).mockResolvedValue(null);

    const response = await app.inject({
      method: 'POST',
      url: '/webhook',
      payload: {
        conversation_id: 'invalid-id',
        text: 'Hello',
        channel: 'web',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.ok).toBe(true);
    expect(body.conversation_id).toBe('new-uuid-123');
    expect(body.message_id).toBe('msg-123');
  });

  it('reuses valid UUID conversation_id', async () => {
    const { getOrCreateConversation, createMessage, ensureValidUUID } = await import('@frostdesk/db');
    const validUUID = '550e8400-e29b-41d4-a716-446655440000';
    
    (ensureValidUUID as jest.Mock).mockReturnValue(validUUID);
    (getOrCreateConversation as jest.Mock).mockResolvedValue({ id: validUUID });
    (createMessage as jest.Mock).mockResolvedValue({ id: 'msg-456' });
    (findDuplicateMessage as jest.Mock).mockResolvedValue(null);

    const response = await app.inject({
      method: 'POST',
      url: '/webhook',
      payload: {
        conversation_id: validUUID,
        text: 'Hello',
        channel: 'web',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.ok).toBe(true);
    expect(body.conversation_id).toBe(validUUID);
    expect(ensureValidUUID).toHaveBeenCalledWith(validUUID);
  });

  it('detects duplicate messages', async () => {
    const { findDuplicateMessage, ensureValidUUID } = await import('@frostdesk/db');
    const validUUID = '550e8400-e29b-41d4-a716-446655440000';
    
    (ensureValidUUID as jest.Mock).mockReturnValue(validUUID);
    (findDuplicateMessage as jest.Mock).mockResolvedValue({ id: 'existing-msg-123' });

    const response = await app.inject({
      method: 'POST',
      url: '/webhook',
      payload: {
        conversation_id: validUUID,
        text: 'Duplicate message',
        channel: 'web',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.ok).toBe(true);
    expect(body.message_id).toBe('existing-msg-123');
    expect(createMessage).not.toHaveBeenCalled();
  });

  it('rejects invalid payload - missing text', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/webhook',
      payload: {
        conversation_id: '550e8400-e29b-41d4-a716-446655440000',
        channel: 'web',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.ok).toBe(false);
    expect(body.error).toBe('invalid_payload');
  });

  it('rejects invalid payload - invalid channel', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/webhook',
      payload: {
        conversation_id: '550e8400-e29b-41d4-a716-446655440000',
        text: 'Hello',
        channel: 'invalid',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.ok).toBe(false);
    expect(body.error).toBe('invalid_payload');
  });
});
