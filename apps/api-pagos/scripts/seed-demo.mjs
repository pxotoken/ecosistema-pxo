import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY in env');
  process.exit(1);
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v || !v.trim()) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return v.trim();
}

const MERCHANT_ID = requireEnv('SEED_MERCHANT_ID');
const POS_ID = requireEnv('SEED_POS_ID');
const MERCHANT_WALLET = requireEnv('SEED_MERCHANT_WALLET');
const MERCHANT_NAME = requireEnv('SEED_MERCHANT_NAME');
// Optional — leave empty to disable outbound webhook (POS polls /status).
const MERCHANT_CALLBACK_URL = process.env.SEED_MERCHANT_CALLBACK_URL?.trim() || null;
// Optional — id of a previous merchant row to delete before upserting the new one.
const PRUNE_ID = process.env.SEED_PRUNE_ID?.trim() || null;

if (!/^0x[a-fA-F0-9]{40}$/.test(MERCHANT_WALLET)) {
  console.error(`SEED_MERCHANT_WALLET is not a valid EVM address: ${MERCHANT_WALLET}`);
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function sha256(s) {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}

async function tableExists(name) {
  const { error } = await supabase.from(name).select('*', { count: 'exact', head: true }).limit(1);
  if (!error) return true;
  return !String(error.message || '').toLowerCase().includes('not exist');
}

const [mOk, pOk, pmOk] = await Promise.all([
  tableExists('merchants'),
  tableExists('pos_devices'),
  tableExists('payments'),
]);
console.log(`tables present → merchants=${mOk} pos_devices=${pOk} payments=${pmOk}`);
if (!mOk || !pOk || !pmOk) {
  console.error(
    '\nOne or more tables missing. Apply db/migrations/000_initial_schema.sql or\n' +
      'apps/api-pagos/database/{merchants,payments}.sql in the Supabase SQL editor.\n',
  );
  process.exit(2);
}

const API_KEY = process.env.SEED_API_KEY || crypto.randomUUID();
const API_KEY_HASH = sha256(API_KEY);
const KYB_STATUS = process.env.SEED_KYB_STATUS || 'VERIFIED';
const POS_LABEL = process.env.SEED_POS_LABEL || `POS ${POS_ID}`;

if (PRUNE_ID && PRUNE_ID !== MERCHANT_ID) {
  // Manual cascade: payments → pos_devices → merchants. Without this the
  // `merchants_wallet_address_key` UNIQUE and the `payments_merchant_id_fkey`
  // FK would reject both the delete and the re-upsert.
  const { error: prunePay } = await supabase.from('payments').delete().eq('merchant_id', PRUNE_ID);
  if (prunePay) console.warn(`prune payments for ${PRUNE_ID} warning: ${prunePay.message}`);
  const { error: prunePos } = await supabase
    .from('pos_devices')
    .delete()
    .eq('merchant_id', PRUNE_ID);
  if (prunePos) console.warn(`prune pos_devices for ${PRUNE_ID} warning: ${prunePos.message}`);
  const { error: pruneM } = await supabase.from('merchants').delete().eq('id', PRUNE_ID);
  if (pruneM) console.warn(`prune merchant ${PRUNE_ID} warning: ${pruneM.message}`);
  else console.log(`pruned merchant ${PRUNE_ID} (and its pos_devices + payments)`);
}

const { error: mErr } = await supabase
  .from('merchants')
  .upsert(
    {
      id: MERCHANT_ID,
      name: MERCHANT_NAME,
      wallet_address: MERCHANT_WALLET,
      kyb_status: KYB_STATUS,
      callback_url: MERCHANT_CALLBACK_URL,
      api_key_hash: API_KEY_HASH,
      is_active: true,
    },
    { onConflict: 'id' },
  )
  .select()
  .single();

if (mErr) {
  console.error('Merchant upsert failed:', mErr.message);
  process.exit(3);
}

const { error: pErr } = await supabase
  .from('pos_devices')
  .upsert(
    { id: POS_ID, merchant_id: MERCHANT_ID, label: POS_LABEL, is_active: true },
    { onConflict: 'id' },
  )
  .select()
  .single();

if (pErr) {
  console.error('POS upsert failed:', pErr.message);
  process.exit(4);
}

console.log('\n✅ Seed complete');
console.log('----------------------------------------');
console.log(`Merchant ID   : ${MERCHANT_ID}`);
console.log(`POS ID        : ${POS_ID}`);
console.log(`Wallet        : ${MERCHANT_WALLET}`);
console.log(`Callback URL  : ${MERCHANT_CALLBACK_URL ?? '(none — POS polls /status)'}`);
console.log(`KYB status    : ${KYB_STATUS}`);
console.log(`API key       : ${API_KEY}`);
console.log(`API key hash  : ${API_KEY_HASH}`);
console.log('----------------------------------------');
console.log('Pass the API key as `Authorization: Bearer <apiKey>`.');
console.log('Reuse the same key on re-run by setting SEED_API_KEY=<uuid>.');
