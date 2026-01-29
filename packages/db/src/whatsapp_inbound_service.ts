import { listWhatsappInboundRaw } from './whatsapp_inbound_repository.js';

export async function getWhatsappInboundRawService(): Promise<any[]> {
  return listWhatsappInboundRaw();
}
