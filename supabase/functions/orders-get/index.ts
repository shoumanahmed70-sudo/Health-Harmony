// Supabase Edge Function: orders-get
// Guest-safe order lookup. The storefront RLS only lets an order owner or an
// admin read a row; a cash paying / bank transfer guest (no account) cannot,
// so this function returns that order when BOTH the order number and the
// checkout phone match. Signed-in users don't need it (RLS covers them).
// Deploy: supabase functions deploy orders-get
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method not allowed', code: 'INVALID_INPUT' }, 405)

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  let body: { number?: string; phone?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json', code: 'INVALID_INPUT' }, 400)
  }

  const number = String(body.number ?? '').trim().toUpperCase()
  const phone = String(body.phone ?? '').replace(/[\s-]/g, '')
  if (!/^HH[A-Z0-9]{3,20}$/.test(number) || !/^(\+9665\d{8}|05\d{8}|9665\d{8})$/.test(phone)) {
    return json({ error: 'order number and checkout phone required', code: 'MISSING_FIELDS' }, 400)
  }
  // the SQL function compares the last 9 digits, so +9665…, 9665… and 05… all match

  const { data, error } = await admin.rpc('get_guest_order', {
    p_number: number,
    p_phone: phone,
  })
  if (error) return json({ error: 'lookup failed', code: 'DB_ERROR' }, 502)
  // the RPC returns a single json row or null
  const row = Array.isArray(data) ? (data[0] ?? null) : (data ?? null)
  if (!row) return json({ error: 'not found', code: 'NOT_FOUND' }, 404)
  return json({ order: row })
})
