import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = 'Bizzn <noreply@bizzn.de>'
const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL ?? 'admin@bizzn.de'
const APP_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://app.bizzn.de'

// ─── Superadmin: Neues Restaurant zur Prüfung ────────────────────────────────

export async function sendNewReviewNotification({
  restaurantName,
  ownerEmail,
  projectId,
  city,
}: {
  restaurantName: string
  ownerEmail: string
  projectId: string
  city?: string | null
}) {
  await resend.emails.send({
    from: FROM,
    to: SUPERADMIN_EMAIL,
    subject: `📋 Neues Restaurant zur Prüfung: ${restaurantName}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f0f0f;color:#fff;border-radius:12px;overflow:hidden;">
        <div style="background:#E8B86D;padding:24px 32px;">
          <h1 style="margin:0;font-size:20px;color:#000;">📋 Neues Restaurant zur Prüfung</h1>
        </div>
        <div style="padding:32px;">
          <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
            <tr><td style="padding:8px 0;color:#888;font-size:14px;">Restaurant</td><td style="padding:8px 0;font-weight:bold;font-size:14px;">${restaurantName}</td></tr>
            <tr><td style="padding:8px 0;color:#888;font-size:14px;">Inhaber</td><td style="padding:8px 0;font-size:14px;">${ownerEmail}</td></tr>
            ${city ? `<tr><td style="padding:8px 0;color:#888;font-size:14px;">Stadt</td><td style="padding:8px 0;font-size:14px;">${city}</td></tr>` : ''}
          </table>
          <a href="${APP_URL}/superadmin" style="display:inline-block;background:#E8B86D;color:#000;font-weight:bold;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;">
            Zum Superadmin-Panel →
          </a>
        </div>
      </div>
    `,
  })
}

// ─── Gastronom: Freigabe-Benachrichtigung ────────────────────────────────────

export async function sendApprovalEmail({
  to,
  restaurantName,
  customPriceCents,
  trialEndsAt,
}: {
  to: string
  restaurantName: string
  customPriceCents: number | null
  trialEndsAt: string | null
}) {
  const isFree = customPriceCents === 0
  const isTrial = trialEndsAt && new Date(trialEndsAt) > new Date()
  const trialDate = trialEndsAt ? new Date(trialEndsAt).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' }) : null
  const price = customPriceCents != null ? (customPriceCents / 100).toLocaleString('de-DE', { minimumFractionDigits: 2 }) + ' €' : '99,00 €'

  let priceInfo = ''
  if (isFree) {
    priceInfo = '🎉 <strong>Kostenlos!</strong> Dein Restaurant wurde dauerhaft kostenfrei freigeschaltet.'
  } else if (isTrial) {
    priceInfo = `⏱️ <strong>Kostenlose Testphase bis ${trialDate}</strong> — danach ${price}/Monat.`
  } else {
    priceInfo = `💳 Dein monatlicher Beitrag: <strong>${price}</strong>`
  }

  await resend.emails.send({
    from: FROM,
    to,
    subject: `🎉 ${restaurantName} wurde freigegeben — du kannst jetzt live gehen!`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f0f0f;color:#fff;border-radius:12px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#E8B86D,#d4a55a);padding:32px;text-align:center;">
          <div style="font-size:48px;margin-bottom:8px;">🎉</div>
          <h1 style="margin:0;font-size:24px;color:#000;">Herzlichen Glückwunsch!</h1>
          <p style="margin:8px 0 0;color:#00000099;font-size:14px;">${restaurantName} wurde freigegeben</p>
        </div>
        <div style="padding:32px;">
          <p style="color:#ccc;font-size:15px;line-height:1.6;">
            Dein Restaurant <strong style="color:#fff;">${restaurantName}</strong> wurde von uns geprüft und freigegeben. 🎊
          </p>
          <div style="background:#1a1a1a;border:1px solid #333;border-radius:8px;padding:16px;margin:20px 0;font-size:14px;color:#ccc;">
            ${priceInfo}
          </div>
          <p style="color:#888;font-size:14px;">
            Geh in dein Dashboard und entscheide selbst, wann du online gehen möchtest.
          </p>
          <div style="text-align:center;margin-top:28px;">
            <a href="${APP_URL}/dashboard" style="display:inline-block;background:#E8B86D;color:#000;font-weight:bold;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;">
              Zum Dashboard → Online gehen 🚀
            </a>
          </div>
        </div>
        <div style="padding:20px 32px;border-top:1px solid #222;text-align:center;">
          <p style="color:#555;font-size:12px;margin:0;">
            Bizzn.de · 0 % Provision · 100 % für dein Restaurant
          </p>
        </div>
      </div>
    `,
  })
}

// ─── Gastronom: Ablehnung ────────────────────────────────────────────────────

export async function sendRejectionEmail({
  to,
  restaurantName,
  reason,
}: {
  to: string
  restaurantName: string
  reason?: string
}) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Dein Restaurant ${restaurantName} — Rückfrage zur Registrierung`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f0f0f;color:#fff;border-radius:12px;overflow:hidden;">
        <div style="background:#1a1a1a;border-bottom:1px solid #333;padding:24px 32px;">
          <h1 style="margin:0;font-size:20px;">Rückfrage zu ${restaurantName}</h1>
        </div>
        <div style="padding:32px;">
          <p style="color:#ccc;font-size:15px;line-height:1.6;">
            Vielen Dank für deine Registrierung. Wir haben dein Restaurant geprüft und haben noch eine Rückfrage.
          </p>
          ${reason ? `<div style="background:#1a1a1a;border-left:3px solid #E8B86D;padding:16px;margin:20px 0;color:#ccc;font-size:14px;">${reason}</div>` : ''}
          <p style="color:#888;font-size:14px;">
            Bitte antworte auf diese E-Mail oder schreib uns direkt an <a href="mailto:${SUPERADMIN_EMAIL}" style="color:#E8B86D;">${SUPERADMIN_EMAIL}</a>.
          </p>
        </div>
      </div>
    `,
  })
}
