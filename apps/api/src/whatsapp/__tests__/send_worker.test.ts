import { describe, it, expect, beforeEach, vi } from 'vitest';
import { processOneOutboundJob } from '../send_worker.js';

const mockLog = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn(() => mockLog),
} as any;

vi.mock('@frostdesk/db', () => ({
  claimNextPendingJob: vi.fn(),
  markOutboundJobSent: vi.fn(),
  markOutboundJobFailed: vi.fn(),
  getConversationById: vi.fn(),
  getInstructorWhatsappAccount: vi.fn(),
}));

vi.mock('../../integrations/whatsapp_cloud_api.js', () => ({
  sendWhatsAppText: vi.fn(),
}));

describe('processOneOutboundJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns false when no pending job', async () => {
    const { claimNextPendingJob } = await import('@frostdesk/db');
    vi.mocked(claimNextPendingJob).mockResolvedValue(null);

    const result = await processOneOutboundJob(mockLog);
    expect(result).toBe(false);
  });

  it('calls sendWhatsAppText with phoneNumberId when instructor account has phone_number_id', async () => {
    const {
      claimNextPendingJob,
      getConversationById,
      getInstructorWhatsappAccount,
      markOutboundJobSent,
    } = await import('@frostdesk/db');
    const { sendWhatsAppText } = await import('../../integrations/whatsapp_cloud_api.js');

    const job = {
      id: 'job-1',
      message_id: 'msg-1',
      conversation_id: 'conv-1',
      destination_phone: '393331234567',
      message_text: 'Hello',
      status: 'pending',
      attempts: 0,
      max_attempts: 5,
    };
    const conversation = {
      id: 'conv-1',
      instructor_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      customer_identifier: '393331234567',
      created_at: '',
      updated_at: '',
    };
    const account = {
      instructor_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      phone_number: '+393331234567',
      provider: 'whatsapp_business',
      status: 'verified',
      connected_at: null,
      created_at: '',
      updated_at: '',
      phone_number_id: 'meta-phone-123',
      waba_id: null,
    };

    vi.mocked(claimNextPendingJob).mockResolvedValue(job as any);
    vi.mocked(getConversationById).mockResolvedValue(conversation as any);
    vi.mocked(getInstructorWhatsappAccount).mockResolvedValue(account as any);
    vi.mocked(sendWhatsAppText).mockResolvedValue({ ok: true, externalMessageId: 'ext-1' });
    vi.mocked(markOutboundJobSent).mockResolvedValue(undefined);

    const result = await processOneOutboundJob(mockLog);

    expect(result).toBe(true);
    expect(sendWhatsAppText).toHaveBeenCalledWith({
      to: '393331234567',
      text: 'Hello',
      phoneNumberId: 'meta-phone-123',
      token: undefined,
      context: { conversationId: 'conv-1', messageId: 'msg-1' },
    });
  });

  it('calls sendWhatsAppText without phoneNumberId when instructor has no account or no phone_number_id', async () => {
    const {
      claimNextPendingJob,
      getConversationById,
      getInstructorWhatsappAccount,
      markOutboundJobSent,
    } = await import('@frostdesk/db');
    const { sendWhatsAppText } = await import('../../integrations/whatsapp_cloud_api.js');

    const job = {
      id: 'job-2',
      message_id: 'msg-2',
      conversation_id: 'conv-2',
      destination_phone: '393339999999',
      message_text: 'Hi',
      status: 'pending',
      attempts: 0,
      max_attempts: 5,
    };
    const conversation = {
      id: 'conv-2',
      instructor_id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
      customer_identifier: '393339999999',
      created_at: '',
      updated_at: '',
    };

    vi.mocked(claimNextPendingJob).mockResolvedValue(job as any);
    vi.mocked(getConversationById).mockResolvedValue(conversation as any);
    vi.mocked(getInstructorWhatsappAccount).mockResolvedValue(null);
    vi.mocked(sendWhatsAppText).mockResolvedValue({ ok: true });
    vi.mocked(markOutboundJobSent).mockResolvedValue(undefined);

    const result = await processOneOutboundJob(mockLog);

    expect(result).toBe(true);
    expect(sendWhatsAppText).toHaveBeenCalledWith({
      to: '393339999999',
      text: 'Hi',
      phoneNumberId: undefined,
      token: undefined,
      context: { conversationId: 'conv-2', messageId: 'msg-2' },
    });
  });

  it('calls sendWhatsAppText without phoneNumberId when account exists but phone_number_id is null', async () => {
    const {
      claimNextPendingJob,
      getConversationById,
      getInstructorWhatsappAccount,
      markOutboundJobSent,
    } = await import('@frostdesk/db');
    const { sendWhatsAppText } = await import('../../integrations/whatsapp_cloud_api.js');

    const job = {
      id: 'job-3',
      message_id: 'msg-3',
      conversation_id: 'conv-3',
      destination_phone: '393338888888',
      message_text: 'Test',
      status: 'pending',
      attempts: 0,
      max_attempts: 5,
    };
    const conversation = {
      id: 'conv-3',
      instructor_id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
      customer_identifier: '393338888888',
      created_at: '',
      updated_at: '',
    };
    const account = {
      instructor_id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
      phone_number: '+393338888888',
      provider: 'whatsapp_business',
      status: 'pending',
      connected_at: null,
      created_at: '',
      updated_at: '',
      phone_number_id: null,
      waba_id: null,
    };

    vi.mocked(claimNextPendingJob).mockResolvedValue(job as any);
    vi.mocked(getConversationById).mockResolvedValue(conversation as any);
    vi.mocked(getInstructorWhatsappAccount).mockResolvedValue(account as any);
    vi.mocked(sendWhatsAppText).mockResolvedValue({ ok: true });
    vi.mocked(markOutboundJobSent).mockResolvedValue(undefined);

    const result = await processOneOutboundJob(mockLog);

    expect(result).toBe(true);
    expect(sendWhatsAppText).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '393338888888',
        text: 'Test',
        phoneNumberId: undefined,
        context: { conversationId: 'conv-3', messageId: 'msg-3' },
      })
    );
  });
});
