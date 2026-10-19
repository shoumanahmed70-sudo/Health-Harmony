// Verify a promo code with the service key (the promos table is admin-only by RLS,
// so the anon client cannot read it — this function is the storefront's validator).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

// deno-lint-ignore no-explicit-any
const inferStatus = (s: any) => (s === 400 ? 400 : s === 401 ? 401 : 502)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const url = Deno.env.get('SUPABASE_URL')
  if (!key || !url) return json({ error: 'not configured' }, inferStatus(500))

  let code = ''
  try {
    const body = await req.json()
    code = String(body?.code ?? '').trim().toUpperCase()
  } catch {
    return json({ error: 'bad payload' }, 400)
  }
  if (!code) return json({ error: 'missing code' }, 400)

  const admin = createClient(url, key)
  const { data, error } = await admin
    .from('promos')
    .select('code,kind,value,active')
    .eq('code', code)
    .maybeSingle()
  if (error) return json({ error: 'lookup failed' }, inferStatus(502))
  if (!data || data.active === false) return json({ valid: false })

  return json({ valid: true, promo: { code: data.code, kind: data.kind, value: Number(data.value) } })
})
