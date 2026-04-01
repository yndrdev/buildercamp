import { Resend } from 'resend'

let _resend: Resend | null = null
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

export async function notifyInterviewComplete(data: {
  respondentName: string | null
  respondentEmail: string | null
  respondentRole: string | null
  clientName: string
  sessionName: string | null
  messageCount: number
  analysis: { summary?: string; themes?: string[]; tasks?: { title: string; priority: string }[] } | null
}) {
  const to = process.env.NOTIFICATION_EMAIL
  if (!to) return

  const name = data.respondentName || 'Unknown'
  const role = data.respondentRole || 'Not specified'
  const themesHtml = data.analysis?.themes?.length
    ? data.analysis.themes.map((t) => `<li>${t}</li>`).join('')
    : '<li>Analysis pending</li>'
  const tasksHtml = data.analysis?.tasks?.length
    ? data.analysis.tasks.map((t) => `<li><strong>[${t.priority}]</strong> ${t.title}</li>`).join('')
    : '<li>None identified yet</li>'

  try {
    await getResend().emails.send({
      from: 'BuilderCamp <onboarding@resend.dev>',
      to,
      subject: `Interview Complete: ${name} (${data.clientName})`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <div style="background: #1a1a1a; color: #fff; padding: 20px 24px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 18px; font-weight: 600;">BuilderCamp Interview Complete</h1>
          </div>
          <div style="border: 1px solid #e5e5e5; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <tr><td style="padding: 6px 0; color: #666; width: 120px;">Name</td><td style="padding: 6px 0; font-weight: 600;">${name}</td></tr>
              <tr><td style="padding: 6px 0; color: #666;">Email</td><td style="padding: 6px 0;">${data.respondentEmail || 'Not provided'}</td></tr>
              <tr><td style="padding: 6px 0; color: #666;">Role</td><td style="padding: 6px 0;">${role}</td></tr>
              <tr><td style="padding: 6px 0; color: #666;">Client</td><td style="padding: 6px 0;">${data.clientName}</td></tr>
              <tr><td style="padding: 6px 0; color: #666;">Session</td><td style="padding: 6px 0;">${data.sessionName || 'Not selected'}</td></tr>
              <tr><td style="padding: 6px 0; color: #666;">Messages</td><td style="padding: 6px 0;">${data.messageCount}</td></tr>
            </table>

            ${data.analysis?.summary ? `<div style="background: #f9f9f9; padding: 16px; border-radius: 6px; margin-bottom: 16px;"><strong>Summary:</strong><br/>${data.analysis.summary}</div>` : ''}

            <h3 style="margin: 16px 0 8px; font-size: 14px; color: #333;">Key Themes</h3>
            <ul style="margin: 0; padding-left: 20px; color: #555;">${themesHtml}</ul>

            <h3 style="margin: 16px 0 8px; font-size: 14px; color: #333;">Action Items</h3>
            <ul style="margin: 0; padding-left: 20px; color: #555;">${tasksHtml}</ul>

            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #999; margin: 0;">Sent by BuilderCamp Intake System</p>
          </div>
        </div>
      `,
    })
  } catch (err) {
    console.error('[Resend notification failed]', err)
  }
}
