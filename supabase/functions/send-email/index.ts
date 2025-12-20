import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')!
const SENDGRID_FROM_EMAIL = Deno.env.get('SENDGRID_FROM_EMAIL') || 'hello@hum-social.com'
const SENDGRID_FROM_NAME = Deno.env.get('SENDGRID_FROM_NAME') || 'hüm'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Brand assets - hosted logo for email clients
const LOGO_URL = 'https://hum-social.com/assets/logos/hum-logo-dark.svg'
const SITE_URL = 'https://hum-social.com'

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

// ============================================
// SHARED EMAIL STYLES - Premium Brand Design
// ============================================
const emailStyles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');

  body {
    font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: #1a1a1a;
    background: linear-gradient(180deg, #0a0a0a 0%, #1a1a1a 100%);
    margin: 0;
    padding: 40px 20px;
  }
  .container {
    max-width: 520px;
    margin: 0 auto;
    background: linear-gradient(165deg, #1a1a1a 0%, #242424 50%, #1a1a1a 100%);
    border-radius: 24px;
    overflow: hidden;
    box-shadow: 0 25px 80px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
  }
  .header {
    padding: 48px 40px 32px;
    text-align: center;
    background: linear-gradient(180deg, rgba(210, 145, 111, 0.08) 0%, transparent 100%);
  }
  .logo-img {
    height: 48px;
    width: auto;
  }
  .logo-text {
    font-size: 42px;
    font-weight: 300;
    background: linear-gradient(135deg, #fff 0%, #f5f0e8 50%, #d2916f 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: 4px;
    margin: 0;
  }
  .tagline {
    font-size: 11px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: rgba(210, 145, 111, 0.7);
    margin-top: 8px;
  }
  .content {
    padding: 40px 40px 48px;
  }
  .greeting {
    font-size: 18px;
    color: #ffffff;
    margin: 0 0 24px 0;
    font-weight: 500;
  }
  p {
    margin: 0 0 16px 0;
    font-size: 15px;
    line-height: 1.7;
    color: rgba(255, 255, 255, 0.7);
  }
  .highlight-box {
    background: linear-gradient(135deg, rgba(210, 145, 111, 0.15) 0%, rgba(210, 145, 111, 0.05) 100%);
    border: 1px solid rgba(210, 145, 111, 0.3);
    border-radius: 12px;
    padding: 20px 24px;
    margin: 28px 0;
  }
  .highlight-box p {
    margin: 0;
    color: #fff;
    font-size: 15px;
  }
  .highlight-box strong {
    color: #d2916f;
  }
  .rank-card {
    background: linear-gradient(145deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 28px;
    margin: 28px 0;
    text-align: center;
  }
  .rank-label {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: rgba(255, 255, 255, 0.5);
    margin: 0 0 8px 0;
  }
  .rank-number {
    font-size: 56px;
    font-weight: 700;
    background: linear-gradient(135deg, #fff 0%, #d2916f 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 0;
    line-height: 1;
  }
  .rank-sublabel {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.5);
    margin: 8px 0 0 0;
  }
  .rank-card.success {
    background: linear-gradient(145deg, rgba(76, 175, 80, 0.15) 0%, rgba(76, 175, 80, 0.05) 100%);
    border-color: rgba(76, 175, 80, 0.3);
  }
  .referral-section {
    margin: 32px 0;
  }
  .referral-label {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: rgba(255, 255, 255, 0.5);
    margin: 0 0 12px 0;
  }
  .referral-box {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 16px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .referral-link {
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
    font-size: 13px;
    color: #d2916f;
    word-break: break-all;
    flex: 1;
  }
  .cta-button {
    display: inline-block;
    background: linear-gradient(135deg, #d2916f 0%, #c17f5d 100%);
    color: #fff !important;
    text-decoration: none;
    padding: 16px 32px;
    border-radius: 50px;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.5px;
    margin: 24px 0;
    text-align: center;
    box-shadow: 0 8px 24px rgba(210, 145, 111, 0.3);
  }
  .cta-button:hover {
    background: linear-gradient(135deg, #c17f5d 0%, #b06e4c 100%);
  }
  .divider {
    height: 1px;
    background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%);
    margin: 32px 0;
  }
  .signature {
    margin-top: 32px;
    color: rgba(255, 255, 255, 0.5);
    font-size: 14px;
  }
  .footer {
    background: rgba(0, 0, 0, 0.3);
    text-align: center;
    padding: 24px 40px;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
  }
  .footer p {
    margin: 0;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.4);
    letter-spacing: 0.5px;
  }
  .footer a {
    color: #d2916f;
    text-decoration: none;
  }
`

// Email header with logo
const emailHeader = `
  <div class="header">
    <h1 class="logo-text">hüm</h1>
    <p class="tagline">voice-first social</p>
  </div>
`

// Email footer
const emailFooter = `
  <div class="footer">
    <p>hüm — social media that makes you better, not bitter</p>
  </div>
`

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
  const referralLink = `${SITE_URL}?ref=${referral_code}`

  const subject = "You're in. Welcome to the movement."

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${emailStyles}</style>
</head>
<body>
  <div class="container">
    ${emailHeader}
    <div class="content">
      <p class="greeting">Hey ${name},</p>
      <p>You're on the list. Welcome to the movement.</p>

      <div class="highlight-box">
        <p><strong>Top 100 referrers get Day 1 access.</strong><br>Everyone else waits in line.</p>
      </div>

      <p>Every friend who joins using your link moves you up the leaderboard. The more you share, the earlier you're in.</p>

      <div class="referral-section">
        <p class="referral-label">Your unique referral link</p>
        <div class="referral-box">
          <span class="referral-link">${referralLink}</span>
        </div>
      </div>

      <a href="${referralLink}" class="cta-button" style="display: block; text-align: center;">Share & Climb the Leaderboard</a>

      <div class="divider"></div>

      <p style="font-size: 14px; color: rgba(255, 255, 255, 0.5);">No algorithms. No doomscrolling. No bullshit.<br>Just real people building real habits together.</p>

      <p class="signature">See you on the other side,<br><strong style="color: #d2916f;">the hüm team</strong></p>
    </div>
    ${emailFooter}
  </div>
</body>
</html>`

  const plainTextContent = `Hey ${name},

You're on the list. Welcome to the movement.

TOP 100 REFERRERS GET DAY 1 ACCESS. Everyone else waits in line.

Every friend who joins using your link moves you up the leaderboard. The more you share, the earlier you're in.

Your unique referral link:
${referralLink}

No algorithms. No doomscrolling. No bullshit.
Just real people building real habits together.

See you on the other side,
the hüm team

---
hüm — social media that makes you better, not bitter`

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
  const referralLink = `${SITE_URL}?ref=${referral_code}`

  const subject = `${referrer_name} just joined because of you.`

  const inTop100 = rank <= 100
  const spotsAway = rank - 100

  const rankMessage = inTop100
    ? `<p style="color: #4CAF50; font-weight: 500;">You're in the top 100! Keep your spot by sharing more.</p>`
    : `<p>You're <strong style="color: #d2916f;">${spotsAway} spots</strong> away from Day 1 access. Keep sharing!</p>`

  const rankMessagePlain = inTop100
    ? `You're in the top 100! Keep your spot by sharing more.`
    : `You're ${spotsAway} spots away from Day 1 access. Keep sharing!`

  const rankCardClass = inTop100 ? 'rank-card success' : 'rank-card'

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${emailStyles}</style>
</head>
<body>
  <div class="container">
    ${emailHeader}
    <div class="content">
      <p class="greeting">Hey ${name},</p>
      <p>Your referral just landed! <strong style="color: #fff;">${referrer_name}</strong> is now on the waitlist because of you.</p>

      <div class="${rankCardClass}">
        <p class="rank-label">Your position</p>
        <p class="rank-number">#${rank}</p>
        <p class="rank-sublabel">on the leaderboard</p>
      </div>

      ${rankMessage}

      <div class="referral-section">
        <p class="referral-label">Keep sharing your link</p>
        <div class="referral-box">
          <span class="referral-link">${referralLink}</span>
        </div>
      </div>

      <a href="${SITE_URL}#leaderboard" class="cta-button" style="display: block; text-align: center;">View Leaderboard</a>

      <p class="signature">Keep climbing,<br><strong style="color: #d2916f;">the hüm team</strong></p>
    </div>
    ${emailFooter}
  </div>
</body>
</html>`

  const plainTextContent = `Hey ${name},

Your referral just landed! ${referrer_name} is now on the waitlist because of you.

You're #${rank} on the leaderboard.

${rankMessagePlain}

Your link (keep sharing):
${referralLink}

Keep climbing,
the hüm team

---
hüm — social media that makes you better, not bitter`

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
  const referralLink = `${SITE_URL}?ref=${entry.referral_code}`

  // Calculate referrals needed to get back to #100
  const referralsNeeded = Math.ceil((currentRank - 100) / 10) || 1

  const subject = `You slipped to #${currentRank} — here's how to get back in`

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${emailStyles}</style>
</head>
<body>
  <div class="container">
    ${emailHeader}
    <div class="content">
      <p class="greeting">Hey ${entry.name},</p>
      <p>Others are climbing the leaderboard. Your position has changed.</p>

      <div class="rank-card">
        <p class="rank-label">Current position</p>
        <p class="rank-number">#${currentRank}</p>
        <p class="rank-sublabel">outside the top 100</p>
      </div>

      <div class="highlight-box">
        <p>You need <strong>${referralsNeeded} more referral${referralsNeeded > 1 ? 's' : ''}</strong> to get back into the top 100 and secure Day 1 access.</p>
      </div>

      <div class="referral-section">
        <p class="referral-label">Share your link</p>
        <div class="referral-box">
          <span class="referral-link">${referralLink}</span>
        </div>
      </div>

      <a href="${referralLink}" class="cta-button" style="display: block; text-align: center;">Share & Get Back In</a>

      <p class="signature">Don't give up,<br><strong style="color: #d2916f;">the hüm team</strong></p>
    </div>
    ${emailFooter}
  </div>
</body>
</html>`

  const plainTextContent = `Hey ${entry.name},

Others are climbing the leaderboard. Your position has changed.

You're currently #${currentRank} — outside the top 100.

You need ${referralsNeeded} more referral${referralsNeeded > 1 ? 's' : ''} to get back into the top 100 and secure Day 1 access.

Your link:
${referralLink}

Don't give up,
the hüm team

---
hüm — social media that makes you better, not bitter`

  await sendEmail(entry.email, subject, htmlContent, plainTextContent)
}

// ============================================
// BACK IN TOP 100 EMAIL
// ============================================
async function sendBackInEmail(entry: WaitlistEntry, currentRank: number) {
  const referralLink = `${SITE_URL}?ref=${entry.referral_code}`

  const subject = `You're back in the top 100!`

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${emailStyles}</style>
</head>
<body>
  <div class="container">
    ${emailHeader}
    <div class="content">
      <p class="greeting">Hey ${entry.name},</p>
      <p>Great news — you've climbed back into the top 100!</p>

      <div class="rank-card success">
        <p class="rank-label">Your position</p>
        <p class="rank-number">#${currentRank}</p>
        <p class="rank-sublabel">Day 1 access secured</p>
      </div>

      <p>You're locked in for early access when we launch. Keep sharing to climb even higher and secure your spot.</p>

      <div class="referral-section">
        <p class="referral-label">Your link</p>
        <div class="referral-box">
          <span class="referral-link">${referralLink}</span>
        </div>
      </div>

      <a href="${SITE_URL}#leaderboard" class="cta-button" style="display: block; text-align: center;">View Your Position</a>

      <p class="signature">Keep climbing,<br><strong style="color: #d2916f;">the hüm team</strong></p>
    </div>
    ${emailFooter}
  </div>
</body>
</html>`

  const plainTextContent = `Hey ${entry.name},

Great news — you've climbed back into the top 100!

You're #${currentRank} on the waitlist — Day 1 access secured.

Keep sharing to climb even higher and secure your spot.

Your link:
${referralLink}

Keep climbing,
the hüm team

---
hüm — social media that makes you better, not bitter`

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
