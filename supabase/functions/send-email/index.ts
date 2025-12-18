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
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, data } = await req.json()

    switch (action) {
      case 'welcome':
        // Send welcome email to new waitlist signup
        return await sendWelcomeEmail(data)

      case 'daily-rank-check':
        // Run daily rank check and notify dropped users
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

async function sendWelcomeEmail(data: { email: string, name: string, referral_code: string }) {
  const { email, name, referral_code } = data
  const referralLink = `https://hum-social.com?ref=${referral_code}`

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
    .greeting { font-size: 24px; color: #2C2418; margin: 0 0 24px 0; font-weight: 400; }
    p { margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #4A4A4A; }
    .highlight { background: #FFFBF7; border-left: 3px solid #D2916F; padding: 20px 24px; margin: 24px 0; }
    .cta { display: inline-block; padding: 14px 32px; background: #2C2418; color: #FFFFFF !important; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 16px 0; }
    .referral-box { background: #F5F5F5; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center; }
    .referral-link { font-family: monospace; font-size: 14px; background: #FFFFFF; padding: 12px; border-radius: 4px; word-break: break-all; display: block; margin-top: 8px; }
    .footer { background: #FAFAFA; text-align: center; padding: 32px 40px; font-size: 13px; color: #999999; border-top: 1px solid #F0F0F0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo">hüm</h1>
    </div>
    <div class="content">
      <p class="greeting">Hey ${name}!</p>
      <p>You're on the waitlist. Welcome to the movement.</p>

      <div class="highlight">
        <p style="margin: 0; color: #2C2418;"><strong>Top 100 referrers get first access when we launch.</strong></p>
      </div>

      <p>Share your unique link with friends who are tired of doomscrolling and ready to build something real:</p>

      <div class="referral-box">
        <p style="margin: 0 0 8px 0; font-weight: 600; color: #2C2418;">Your referral link:</p>
        <span class="referral-link">${referralLink}</span>
      </div>

      <p>Every friend who joins using your link moves you up the leaderboard.</p>

      <div style="text-align: center;">
        <a href="${referralLink}" class="cta">Share Your Link</a>
      </div>

      <p style="margin-top: 32px;">See you on the other side.</p>
      <p style="color: #2C2418;"><strong>${SENDGRID_FROM_NAME}</strong></p>
    </div>
    <div class="footer">
      <p style="font-weight: 500; color: #2C2418; margin-bottom: 4px;">hüm</p>
      <p>Social media that makes you better, not bitter</p>
    </div>
  </div>
</body>
</html>`

  const plainTextContent = `Hey ${name}!

You're on the waitlist. Welcome to the movement.

TOP 100 REFERRERS GET FIRST ACCESS WHEN WE LAUNCH.

Share your unique link with friends who are tired of doomscrolling and ready to build something real:

Your referral link: ${referralLink}

Every friend who joins using your link moves you up the leaderboard.

See you on the other side.
${SENDGRID_FROM_NAME}

---
hüm - Social media that makes you better, not bitter`

  await sendEmail(email, "You're on the hüm waitlist!", htmlContent, plainTextContent)

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function dailyRankCheck() {
  // First, get current rankings
  const response = await fetch(`${SUPABASE_URL}/rest/v1/waitlist?select=id,email,name,referral_count,previous_rank&order=referral_count.desc`, {
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    }
  })

  const entries: WaitlistEntry[] = await response.json()

  const emailsSent: string[] = []
  const errors: string[] = []

  // Check each entry for rank changes
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    const currentRank = i + 1
    const previousRank = entry.previous_rank

    // If they were in top 100 and now they're not, send email
    if (previousRank && previousRank <= 100 && currentRank > 100) {
      try {
        await sendDroppedOutEmail(entry, previousRank, currentRank)
        emailsSent.push(entry.email)
      } catch (err) {
        errors.push(`${entry.email}: ${err.message}`)
      }
    }
  }

  // Update all previous_rank values
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

async function sendDroppedOutEmail(entry: WaitlistEntry, previousRank: number, currentRank: number) {
  const referralLink = `https://hum-social.com?ref=${entry.referral_code}`

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
    .greeting { font-size: 24px; color: #2C2418; margin: 0 0 24px 0; font-weight: 400; }
    p { margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #4A4A4A; }
    .alert-box { background: #FFF5F5; border-left: 3px solid #E74C3C; padding: 20px 24px; margin: 24px 0; }
    .cta { display: inline-block; padding: 14px 32px; background: #2C2418; color: #FFFFFF !important; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 16px 0; }
    .footer { background: #FAFAFA; text-align: center; padding: 32px 40px; font-size: 13px; color: #999999; border-top: 1px solid #F0F0F0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo">hüm</h1>
    </div>
    <div class="content">
      <p class="greeting">Hey ${entry.name},</p>

      <div class="alert-box">
        <p style="margin: 0; color: #2C2418;"><strong>You've dropped out of the top 100.</strong></p>
        <p style="margin: 8px 0 0 0; color: #4A4A4A;">You were #${previousRank}, now you're #${currentRank}.</p>
      </div>

      <p>The leaderboard is heating up! Other people are sharing their links and climbing past you.</p>

      <p>Want back in the top 100? Share your link with one more friend:</p>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${referralLink}" class="cta">Share & Climb Back Up</a>
      </div>

      <p>Remember: <strong>Top 100 get first access when we launch.</strong></p>

      <p style="margin-top: 32px;">Let's go,</p>
      <p style="color: #2C2418;"><strong>${SENDGRID_FROM_NAME}</strong></p>
    </div>
    <div class="footer">
      <p style="font-weight: 500; color: #2C2418; margin-bottom: 4px;">hüm</p>
      <p>Social media that makes you better, not bitter</p>
    </div>
  </div>
</body>
</html>`

  const plainTextContent = `Hey ${entry.name},

You've dropped out of the top 100.
You were #${previousRank}, now you're #${currentRank}.

The leaderboard is heating up! Other people are sharing their links and climbing past you.

Want back in the top 100? Share your link with one more friend:
${referralLink}

Remember: Top 100 get first access when we launch.

Let's go,
${SENDGRID_FROM_NAME}

---
hüm - Social media that makes you better, not bitter`

  await sendEmail(entry.email, "You've dropped out of the top 100", htmlContent, plainTextContent)
}

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
