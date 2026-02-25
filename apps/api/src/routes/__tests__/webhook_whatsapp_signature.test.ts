import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createHmac } from 'crypto';
import Fastify from 'fastify';
import { webhookWhatsAppRoutes } from '../webhook_whatsapp.js';

const TEST_SECRET = 'test-app-secret';

function signPayload(payload: string, secret: string): string {
  const hmac = createHmac('sha256', secret).update(payload).digest('hex');
  return `sha256=${hmac}`;
}

/** Minimal valid WhatsApp webhook payload (inbound text) that passes structural validation. */
function minimalValidPayload() {
  return {
    entry: [
      {
        changes: [
          {
            value: {
              metadata: { display_phone_number: '15550000000', phone_number_id: '123' },
              messages: [
                {
                  id: 'wamid.test123',
                  from: '393331234567',
                  to: '15550000000',
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: 'text',
                  text: { body: 'Hello' },
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

vi.mock('@frostdesk/db', () => ({
  resolveConversationByChannel: vi.fn(),
  persistInboundMessageWithInboxBridge: vi.fn(),
  persistOutboundMessageFromEcho: vi.fn(),
  orchestrateInboundDraft: vi.fn(),
  insertAuditEvent: vi.fn(),
  upsertCustomer: vi.fn(),
  linkConversationToCustomer: vi.fn(),
  normalizePhoneE164: vi.fn((x: string) => x),
  getInstructorIdByPhoneNumberId: vi.fn(),
  connectInstructorWhatsappAccount: vi.fn(),
}));

describe('POST /webhook/whatsapp — signature verification', () => {
  let app: ReturnType<typeof Fastify>;
  let savedSecret: string | undefined;

  beforeEach(async () => {
    savedSecret = process.env.META_WHATSAPP_APP_SECRET;
    process.env.META_WHATSAPP_APP_SECRET = TEST_SECRET;
    app = Fastify();
    await app.register(webhookWhatsAppRoutes);
  });

  afterEach(async () => {
    if (savedSecret !== undefined) process.env.META_WHATSAPP_APP_SECRET = savedSecret;
    else delete (process.env as any).META_WHATSAPP_APP_SECRET;
    await app.close();
  });

  it('returns 400 when X-Hub-Signature-256 header is missing', async () => {
    const payload = minimalValidPayload();
    const rawBody = JSON.stringify(payload);
    const res = await app.inject({
      method: 'POST',
      url: '/webhook/whatsapp',
      payload: Buffer.from(rawBody, 'utf8'),
      headers: { 'content-type': 'application/json' },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('Missing X-Hub-Signature-256 header');
  });

  it('returns 401 when signature is invalid', async () => {
    const payload = minimalValidPayload();
    const rawBody = JSON.stringify(payload);
    const wrongSignature = 'sha256=' + '0'.repeat(64);

    const res = await app.inject({
      method: 'POST',
      url: '/webhook/whatsapp',
      payload: Buffer.from(rawBody, 'utf8'),
      headers: {
        'content-type': 'application/json',
        'x-hub-signature-256': wrongSignature,
      },
    });

    expect(res.statusCode).toBe(401);
    const body = res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('Invalid signature');
  });

  it('returns 500 when META_WHATSAPP_APP_SECRET is not set', async () => {
    const env = process.env.META_WHATSAPP_APP_SECRET;
    delete (process.env as any).META_WHATSAPP_APP_SECRET;

    const payload = minimalValidPayload();
    const rawBody = JSON.stringify(payload);
    const signature = signPayload(rawBody, TEST_SECRET);

    const res = await app.inject({
      method: 'POST',
      url: '/webhook/whatsapp',
      payload: Buffer.from(rawBody, 'utf8'),
      headers: {
        'content-type': 'application/json',
        'x-hub-signature-256': signature,
      },
    });

    if (env !== undefined) process.env.META_WHATSAPP_APP_SECRET = env;

    expect(res.statusCode).toBe(500);
    const body = res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('Webhook secret not configured');
  });

  it('accepts request when signature is valid and proceeds to handler', async () => {
    const {
      resolveConversationByChannel,
      persistInboundMessageWithInboxBridge,
      orchestrateInboundDraft,
      getInstructorIdByPhoneNumberId,
      connectInstructorWhatsappAccount,
    } = await import('@frostdesk/db');

    vi.mocked(getInstructorIdByPhoneNumberId).mockResolvedValue(null);
    vi.mocked(connectInstructorWhatsappAccount).mockResolvedValue({} as any);
    vi.mocked(resolveConversationByChannel).mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440000',
    } as any);
    vi.mocked(persistInboundMessageWithInboxBridge).mockResolvedValue('msg-id');
    vi.mocked(orchestrateInboundDraft).mockResolvedValue({} as any);

    const payload = minimalValidPayload();
    const rawBody = JSON.stringify(payload);
    const signature = signPayload(rawBody, TEST_SECRET);

    const res = await app.inject({
      method: 'POST',
      url: '/webhook/whatsapp',
      payload: Buffer.from(rawBody, 'utf8'),
      headers: {
        'content-type': 'application/json',
        'x-hub-signature-256': signature,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(persistInboundMessageWithInboxBridge).toHaveBeenCalled();
  });
});

describe('POST /webhook/whatsapp — instructor resolution and auto-link', () => {
  let app: ReturnType<typeof Fastify>;
  let savedSecret: string | undefined;

  beforeEach(async () => {
    vi.clearAllMocks();
    savedSecret = process.env.META_WHATSAPP_APP_SECRET;
    process.env.META_WHATSAPP_APP_SECRET = TEST_SECRET;
    app = Fastify();
    await app.register(webhookWhatsAppRoutes);
  });

  afterEach(async () => {
    if (savedSecret !== undefined) process.env.META_WHATSAPP_APP_SECRET = savedSecret;
    else delete (process.env as any).META_WHATSAPP_APP_SECRET;
    await app.close();
  });

  function injectValidSigned(payload: object) {
    const rawBody = JSON.stringify(payload);
    const signature = signPayload(rawBody, TEST_SECRET);
    return app.inject({
      method: 'POST',
      url: '/webhook/whatsapp',
      payload: Buffer.from(rawBody, 'utf8'),
      headers: {
        'content-type': 'application/json',
        'x-hub-signature-256': signature,
      },
    });
  }

  it('uses resolved instructor when getInstructorIdByPhoneNumberId returns an id', async () => {
    const resolvedInstructorId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const {
      getInstructorIdByPhoneNumberId,
      resolveConversationByChannel,
      persistInboundMessageWithInboxBridge,
      orchestrateInboundDraft,
      connectInstructorWhatsappAccount,
      upsertCustomer,
      linkConversationToCustomer,
    } = await import('@frostdesk/db');

    vi.mocked(getInstructorIdByPhoneNumberId).mockResolvedValue(resolvedInstructorId);
    vi.mocked(upsertCustomer).mockResolvedValue({ id: 'cust-1' } as any);
    vi.mocked(linkConversationToCustomer).mockResolvedValue(true);
    vi.mocked(resolveConversationByChannel).mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440000',
    } as any);
    vi.mocked(persistInboundMessageWithInboxBridge).mockResolvedValue('msg-id');
    vi.mocked(orchestrateInboundDraft).mockResolvedValue({} as any);

    const payload = minimalValidPayload();
    const res = await injectValidSigned(payload);

    expect(res.statusCode).toBe(200);
    expect(getInstructorIdByPhoneNumberId).toHaveBeenCalledWith('123');
    expect(connectInstructorWhatsappAccount).not.toHaveBeenCalled();
    expect(resolveConversationByChannel).toHaveBeenCalledWith(
      'whatsapp',
      expect.any(String),
      resolvedInstructorId
    );
  });

  it('auto-links unknown phone_number_id to default instructor and uses it', async () => {
    const defaultId = '00000000-0000-0000-0000-000000000001';
    const {
      getInstructorIdByPhoneNumberId,
      connectInstructorWhatsappAccount,
      resolveConversationByChannel,
      persistInboundMessageWithInboxBridge,
      orchestrateInboundDraft,
    } = await import('@frostdesk/db');

    vi.mocked(getInstructorIdByPhoneNumberId).mockResolvedValue(null);
    vi.mocked(connectInstructorWhatsappAccount).mockResolvedValue({} as any);
    vi.mocked(resolveConversationByChannel).mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440000',
    } as any);
    vi.mocked(persistInboundMessageWithInboxBridge).mockResolvedValue('msg-id');
    vi.mocked(orchestrateInboundDraft).mockResolvedValue({} as any);

    const payload = minimalValidPayload();
    const res = await injectValidSigned(payload);

    expect(res.statusCode).toBe(200);
    expect(connectInstructorWhatsappAccount).toHaveBeenCalledWith({
      instructorId: defaultId,
      phoneNumber: '15550000000',
      phoneNumberId: '123',
    });
    expect(resolveConversationByChannel).toHaveBeenCalledWith(
      'whatsapp',
      expect.any(String),
      defaultId
    );
  });

  it('uses default instructor when payload has no phone_number_id and does not call connect', async () => {
    const payloadNoPhoneNumberId = {
      entry: [
        {
          changes: [
            {
              value: {
                metadata: { display_phone_number: '15550000000' },
                messages: [
                  {
                    id: 'wamid.test456',
                    from: '393331234567',
                    to: '15550000000',
                    timestamp: String(Math.floor(Date.now() / 1000)),
                    type: 'text',
                    text: { body: 'Hi' },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const {
      getInstructorIdByPhoneNumberId,
      connectInstructorWhatsappAccount,
      resolveConversationByChannel,
      persistInboundMessageWithInboxBridge,
      orchestrateInboundDraft,
      upsertCustomer,
      linkConversationToCustomer,
    } = await import('@frostdesk/db');

    vi.mocked(resolveConversationByChannel).mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440000',
    } as any);
    vi.mocked(persistInboundMessageWithInboxBridge).mockResolvedValue('msg-id');
    vi.mocked(orchestrateInboundDraft).mockResolvedValue({} as any);
    vi.mocked(upsertCustomer).mockResolvedValue({ id: 'cust-1' } as any);
    vi.mocked(linkConversationToCustomer).mockResolvedValue(true);

    const res = await injectValidSigned(payloadNoPhoneNumberId);

    expect(res.statusCode).toBe(200);
    expect(getInstructorIdByPhoneNumberId).not.toHaveBeenCalled();
    expect(connectInstructorWhatsappAccount).not.toHaveBeenCalled();
    expect(resolveConversationByChannel).toHaveBeenCalledWith(
      'whatsapp',
      expect.any(String),
      '00000000-0000-0000-0000-000000000001'
    );
  });
});

describe('GET /webhook/whatsapp — Meta verification', () => {
  const VERIFY_TOKEN = 'frostdesk_verify_2026';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    delete (process.env as any).META_WHATSAPP_VERIFY_TOKEN;
    delete (process.env as any).META_VERIFY_TOKEN;
  });

  it('returns challenge in plain text when hub.mode=subscribe and token matches', async () => {
    process.env.META_VERIFY_TOKEN = VERIFY_TOKEN;
    const app = Fastify();
    await app.register(webhookWhatsAppRoutes);

    const res = await app.inject({
      method: 'GET',
      url: '/webhook/whatsapp',
      query: {
        'hub.mode': 'subscribe',
        'hub.verify_token': VERIFY_TOKEN,
        'hub.challenge': 'test123',
      },
    });

    await app.close();
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
    expect(res.payload).toBe('test123');
  });

  it('returns 403 when verify token does not match', async () => {
    process.env.META_VERIFY_TOKEN = VERIFY_TOKEN;
    const app = Fastify();
    await app.register(webhookWhatsAppRoutes);

    const res = await app.inject({
      method: 'GET',
      url: '/webhook/whatsapp',
      query: {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'wrong_token',
        'hub.challenge': 'test123',
      },
    });

    await app.close();
    expect(res.statusCode).toBe(403);
  });

  it('returns 400 when hub.mode or challenge is missing', async () => {
    process.env.META_VERIFY_TOKEN = VERIFY_TOKEN;
    const app = Fastify();
    await app.register(webhookWhatsAppRoutes);

    const res = await app.inject({
      method: 'GET',
      url: '/webhook/whatsapp',
      query: { 'hub.verify_token': VERIFY_TOKEN },
    });

    await app.close();
    expect(res.statusCode).toBe(400);
  });
});
