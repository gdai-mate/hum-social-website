import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')!
const SENDGRID_FROM_EMAIL = Deno.env.get('SENDGRID_FROM_EMAIL') || 'hello@hum-social.com'
const SENDGRID_FROM_NAME = Deno.env.get('SENDGRID_FROM_NAME') || 'the hüm team'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WaitlistEntry {
  id: string
  email: string
  name: string
  referral_code: string
  referral_count: number
  previous_rank?: number
  rank_notifications?: boolean
  last_rank_email_at?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, data } = await req.json()

    switch (action) {
      case 'welcome':
        return await sendWelcomeEmail(data)

      case 'first-referral':
        return await sendFirstReferralEmail(data)

      case 'daily-rank-check':
        return await dailyRankCheck()

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// ============================================
// WELCOME EMAIL
// ============================================
async function sendWelcomeEmail(data: { email: string, name: string, referral_code: string }) {
  const { email, name, referral_code } = data
  const referralLink = `https://hum-social.com?ref=${referral_code}`

  const subject = "You're on the list."

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #2C2418; background: #F8F8F8; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #FFFFFF; }
    .header { padding: 48px 40px 32px; text-align: center; border-bottom: 1px solid #F0F0F0; }
    .logo { font-size: 48px; font-weight: 300; color: #2C2418; margin: 0; letter-spacing: 2px; }
    .content { padding: 40px; }
    .greeting { font-size: 20px; color: #2C2418; margin: 0 0 20px 0; }
    p { margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #4A4A4A; }
    .highlight { background: #FFFBF7; border-left: 3px solid #D2916F; padding: 16px 20px; margin: 24px 0; }
    .highlight p { margin: 0; color: #2C2418; }
    .referral-box { background: #F5F5F5; border-radius: 8px; padding: 16px; margin: 24px 0; text-align: center; }
    .referral-link { font-family: monospace; font-size: 14px; background: #FFFFFF; padding: 12px; border-radius: 4px; word-break: break-all; display: block; margin-top: 8px; color: #2C2418; }
    .footer { background: #FAFAFA; text-align: center; padding: 24px 40px; font-size: 13px; color: #999999; border-top: 1px solid #F0F0F0; }
    .signature { margin-top: 32px; color: #2C2418; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo">hüm</h1>
    </div>
    <div class="content">
      <p class="greeting">Hey ${name},</p>
      <p>You're in. Welcome to the movement.</p>

      <div class="highlight">
        <p><strong>Top 100 referrers get first access when we launch.</strong> Everyone else waits.</p>
      </div>

      <p>Your link:</p>
      <div class="referral-box">
        <span class="referral-link">${referralLink}</span>
      </div>

      <p>Every friend who joins using your link moves you up the leaderboard. Simple.</p>
      <p>No algorithms. No doomscrolling. No bullshit. Just real people building real habits together.</p>
      <p>Share your link. Climb the board. See you on the other side.</p>

      <p class="signature">– ${SENDGRID_FROM_NAME}</p>
    </div>
    <div class="footer">
      <p>hüm – social media that makes you better, not bitter</p>
    </div>
  </div>
</body>
</html>`

  const plainTextContent = `Hey ${name},

You're in. Welcome to the movement.

TOP 100 REFERRERS GET FIRST ACCESS WHEN WE LAUNCH. Everyone else waits.

Your link:
${referralLink}

Every friend who joins using your link moves you up the leaderboard. Simple.

No algorithms. No doomscrolling. No bullshit. Just real people building real habits together.

Share your link. Climb the board. See you on the other side.

– ${SENDGRID_FROM_NAME}

---
hüm – social media that makes you better, not bitter`

  await sendEmail(email, subject, htmlContent, plainTextContent)

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// ============================================
// FIRST REFERRAL EMAIL
// ============================================
async function sendFirstReferralEmail(data: { email: string, name: string, referral_code: string, referrer_name: string, rank: number }) {
  const { email, name, referral_code, referrer_name, rank } = data
  const referralLink = `https://hum-social.com?ref=${referral_code}`

  const subject = "Someone joined because of you."

  const inTop100 = rank <= 100
  const spotsAway = rank - 100

  const rankMessage = inTop100
    ? `<p>You're in the top 100. Keep your spot.</p>`
    : `<p>Keep going. Top 100 get early access – you're <strong>${spotsAway} spots</strong> away.</p>`

  const rankMessagePlain = inTop100
    ? `You're in the top 100. Keep your spot.`
    : `Keep going. Top 100 get early access – you're ${spotsAway} spots away.`

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #2C2418; background: #F8F8F8; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #FFFFFF; }
    .header { padding: 48px 40px 32px; text-align: center; border-bottom: 1px solid #F0F0F0; }
    .logo { font-size: 48px; font-weight: 300; color: #2C2418; margin: 0; letter-spacing: 2px; }
    .content { padding: 40px; }
    .greeting { font-size: 20px; color: #2C2418; margin: 0 0 20px 0; }
    p { margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #4A4A4A; }
    .rank-box { background: #F5F5F5; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center; }
    .rank-number { font-size: 32px; font-weight: 700; color: #2C2418; }
    .referral-box { background: #FFFBF7; border-radius: 8px; padding: 16px; margin: 24px 0; text-align: center; }
    .referral-link { font-family: monospace; font-size: 14px; word-break: break-all; color: #2C2418; }
    .footer { background: #FAFAFA; text-align: center; padding: 24px 40px; font-size: 13px; color: #999999; border-top: 1px solid #F0F0F0; }
    .signature { margin-top: 32px; color: #2C2418; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo">hüm</h1>
    </div>
    <div class="content">
      <p class="greeting">Hey ${name},</p>
      <p>Your first referral just landed. <strong>${referrer_name}</strong> is now on the waitlist because of you.</p>

      <div class="rank-box">
        <p style="margin: 0; color: #666;">You're</p>
        <p class="rank-number">#${rank}</p>
        <p style="margin: 0; color: #666;">on the leaderboard</p>
      </div>

      ${rankMessage}

      <p>Your link (keep sharing):</p>
      <div class="referral-box">
        <span class="referral-link">${referralLink}</span>
      </div>

      <p class="signature">– ${SENDGRID_FROM_NAME}</p>
    </div>
    <div class="footer">
      <p>hüm – social media that makes you better, not bitter</p>
    </div>
  </div>
</body>
</html>`

  const plainTextContent = `Hey ${name},

Your first referral just landed. ${referrer_name} is now on the waitlist because of you.

You're #${rank} on the leaderboard.

${rankMessagePlain}

Your link (keep sharing):
${referralLink}

– ${SENDGRID_FROM_NAME}

---
hüm – social media that makes you better, not bitter`

  await sendEmail(email, subject, htmlContent, plainTextContent)

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// ============================================
// DAILY RANK CHECK (Dropped Out & Back In)
// ============================================
async function dailyRankCheck() {
  // Get all users with rank notifications enabled
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/waitlist?select=id,email,name,referral_code,referral_count,previous_rank,rank_notifications,last_rank_email_at&order=referral_count.desc`,
    {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      }
    }
  )

  const entries: WaitlistEntry[] = await response.json()

  const emailsSent: string[] = []
  const errors: string[] = []

  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    const currentRank = i + 1
    const previousRank = entry.previous_rank

    // Skip if notifications not enabled
    if (!entry.rank_notifications) continue

    // Check cooldown (7 days since last rank email)
    if (entry.last_rank_email_at) {
      const lastEmailDate = new Date(entry.last_rank_email_at)
      if (lastEmailDate > sevenDaysAgo) continue
    }

    // DROPPED OUT: Was in top 100, now isn't
    if (previousRank && previousRank <= 100 && currentRank > 100) {
      try {
        await sendDroppedOutEmail(entry, currentRank)
        await updateLastRankEmail(entry.id)
        emailsSent.push(`${entry.email} (dropped)`)
      } catch (err) {
        errors.push(`${entry.email}: ${err.message}`)
      }
    }

    // BACK IN: Was outside top 100, now is in
    if (previousRank && previousRank > 100 && currentRank <= 100) {
      try {
        await sendBackInEmail(entry, currentRank)
        await updateLastRankEmail(entry.id)
        emailsSent.push(`${entry.email} (back in)`)
      } catch (err) {
        errors.push(`${entry.email}: ${err.message}`)
      }
    }
  }

  // Update all previous_rank values for tomorrow
  await fetch(`${SUPABASE_URL}/rest/v1/rpc/snapshot_waitlist_ranks`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    }
  })

  return new Response(
    JSON.stringify({
      success: true,
      emailsSent: emailsSent.length,
      emails: emailsSent,
      errors
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// Update last_rank_email_at timestamp
async function updateLastRankEmail(userId: string) {
  await fetch(`${SUPABASE_URL}/rest/v1/waitlist?id=eq.${userId}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ last_rank_email_at: new Date().toISOString() })
  })
}

// ============================================
// DROPPED OUT EMAIL
// ============================================
async function sendDroppedOutEmail(entry: WaitlistEntry, currentRank: number) {
  const referralLink = `https://hum-social.com?ref=${entry.referral_code}`

  // Calculate referrals needed to get back to #100
  const referralsNeeded = Math.ceil((currentRank - 100) / 10) || 1

  const subject = `Rank update: You're now #${currentRank}`

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #2C2418; background: #F8F8F8; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #FFFFFF; }
    .header { padding: 48px 40px 32px; text-align: center; border-bottom: 1px solid #F0F0F0; }
    .logo { font-size: 48px; font-weight: 300; color: #2C2418; margin: 0; letter-spacing: 2px; }
    .content { padding: 40px; }
    .greeting { font-size: 20px; color: #2C2418; margin: 0 0 20px 0; }
    p { margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #4A4A4A; }
    .rank-box { background: #F5F5F5; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center; }
    .rank-number { font-size: 32px; font-weight: 700; color: #2C2418; }
    .referral-box { background: #FFFBF7; border-radius: 8px; padding: 16px; margin: 24px 0; text-align: center; }
    .referral-link { font-family: monospace; font-size: 14px; word-break: break-all; color: #2C2418; }
    .footer { background: #FAFAFA; text-align: center; padding: 24px 40px; font-size: 13px; color: #999999; border-top: 1px solid #F0F0F0; }
    .signature { margin-top: 32px; color: #2C2418; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo">hüm</h1>
    </div>
    <div class="content">
      <p class="greeting">Hey ${entry.name},</p>

      <div class="rank-box">
        <p style="margin: 0; color: #666;">You're currently</p>
        <p class="rank-number">#${currentRank}</p>
        <p style="margin: 0; color: #666;">on the waitlist</p>
      </div>

      <p>To get back into the top 100, you need <strong>${referralsNeeded} more referral${referralsNeeded > 1 ? 's' : ''}</strong>.</p>

      <p>Your link:</p>
      <div class="referral-box">
        <span class="referral-link">${referralLink}</span>
      </div>

      <p class="signature">– ${SENDGRID_FROM_NAME}</p>
    </div>
    <div class="footer">
      <p>hüm – social media that makes you better, not bitter</p>
    </div>
  </div>
</body>
</html>`

  const plainTextContent = `Hey ${entry.name},

You're currently #${currentRank} on the waitlist.

To get back into the top 100, you need ${referralsNeeded} more referral${referralsNeeded > 1 ? 's' : ''}.

Your link:
${referralLink}

– ${SENDGRID_FROM_NAME}

---
hüm – social media that makes you better, not bitter`

  await sendEmail(entry.email, subject, htmlContent, plainTextContent)
}

// ============================================
// BACK IN TOP 100 EMAIL
// ============================================
async function sendBackInEmail(entry: WaitlistEntry, currentRank: number) {
  const referralLink = `https://hum-social.com?ref=${entry.referral_code}`

  const subject = `Rank update: You're back in the top 100`

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #2C2418; background: #F8F8F8; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #FFFFFF; }
    .header { padding: 48px 40px 32px; text-align: center; border-bottom: 1px solid #F0F0F0; }
    .logo { font-size: 48px; font-weight: 300; color: #2C2418; margin: 0; letter-spacing: 2px; }
    .content { padding: 40px; }
    .greeting { font-size: 20px; color: #2C2418; margin: 0 0 20px 0; }
    p { margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #4A4A4A; }
    .rank-box { background: #E8F5E9; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center; }
    .rank-number { font-size: 32px; font-weight: 700; color: #2C2418; }
    .referral-box { background: #FFFBF7; border-radius: 8px; padding: 16px; margin: 24px 0; text-align: center; }
    .referral-link { font-family: monospace; font-size: 14px; word-break: break-all; color: #2C2418; }
    .footer { background: #FAFAFA; text-align: center; padding: 24px 40px; font-size: 13px; color: #999999; border-top: 1px solid #F0F0F0; }
    .signature { margin-top: 32px; color: #2C2418; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo">hüm</h1>
    </div>
    <div class="content">
      <p class="greeting">Hey ${entry.name},</p>

      <div class="rank-box">
        <p style="margin: 0; color: #666;">You're back in the top 100</p>
        <p class="rank-number">#${currentRank}</p>
      </div>

      <p>Your link:</p>
      <div class="referral-box">
        <span class="referral-link">${referralLink}</span>
      </div>

      <p class="signature">– ${SENDGRID_FROM_NAME}</p>
    </div>
    <div class="footer">
      <p>hüm – social media that makes you better, not bitter</p>
    </div>
  </div>
</body>
</html>`

  const plainTextContent = `Hey ${entry.name},

You're back in the top 100 – #${currentRank} on the waitlist.

Your link:
${referralLink}

– ${SENDGRID_FROM_NAME}

---
hüm – social media that makes you better, not bitter`

  await sendEmail(entry.email, subject, htmlContent, plainTextContent)
}

// ============================================
// SEND EMAIL VIA SENDGRID
// ============================================
async function sendEmail(to: string, subject: string, htmlContent: string, plainTextContent: string) {
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: SENDGRID_FROM_EMAIL, name: SENDGRID_FROM_NAME },
      subject,
      content: [
        { type: 'text/plain', value: plainTextContent },
        { type: 'text/html', value: htmlContent },
      ],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`SendGrid error: ${response.status} - ${error}`)
  }
}
