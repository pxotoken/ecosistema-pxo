import { getServerSupabase } from '../lib/supabase.js';
import { MerchantRepository } from '../models/Merchant.js';
import { PaymentRepository } from '../models/Payment.js';
import { MerchantService } from './MerchantService.js';
import { QRService } from './QRService.js';
import { BlockchainService } from './BlockchainService.js';
import { WebhookService } from './WebhookService.js';
import { PaymentService } from './PaymentService.js';
import { ReconciliationService } from './ReconciliationService.js';

export interface AppServices {
  merchants: MerchantService;
  payments: PaymentService;
  blockchain: BlockchainService;
  webhooks: WebhookService;
  reconciliation: ReconciliationService;
}

export function createServices(): AppServices {
  const supabase = getServerSupabase();
  const merchantRepo = new MerchantRepository(supabase);
  const paymentRepo = new PaymentRepository(supabase);

  const merchants = new MerchantService(merchantRepo);
  const qr = new QRService();
  const blockchain = new BlockchainService();
  const webhooks = new WebhookService();
  const payments = new PaymentService(paymentRepo, merchants, qr, blockchain, webhooks);
  const reconciliation = new ReconciliationService(payments, blockchain);

  return { merchants, payments, blockchain, webhooks, reconciliation };
}
