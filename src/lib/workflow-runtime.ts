import 'server-only'

type WorkflowNode = {
  id: string
  title: string
  type: 'trigger' | 'action' | 'ai'
  enabled: boolean
  config: Record<string, string>
}
type EmailAttachment = { name: string; type: string; size: number; data: string }

export type WorkflowLog = { time: string; level: 'info' | 'success' | 'error'; message: string }
export type WorkflowResult = { output: Record<string, unknown>; logs: WorkflowLog[] }

const interpolate = (value: string, data: Record<string, unknown>) => value.replace(/{{\s*([\w.]+)\s*}}/g, (_, key) => String(data[key] ?? ''))
const log = (logs: WorkflowLog[], level: WorkflowLog['level'], message: string) => logs.push({ time: new Date().toLocaleTimeString(), level, message })
const safeHeader = (value: string, label: string) => {
  if (/\r|\n/.test(value)) throw new Error(`${label} contains an invalid line break.`)
  return value
}

function workflowField(data: Record<string, unknown>, field: string) {
  return field.split('.').reduce<unknown>((value, key) => value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined, data)
}

async function googleAccessToken() {
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!refreshToken || !clientId || !clientSecret) throw new Error('Google is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN.')
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }), cache: 'no-store' })
  const body = await response.json() as { access_token?: string; error_description?: string }
  if (!response.ok || !body.access_token) throw new Error(body.error_description || 'Google could not refresh the Calendar access token.')
  return body.access_token
}

async function sendResend(recipients: string[], subject: string, body: string, attachments: EmailAttachment[]) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  if (!apiKey || !from) throw new Error('Resend is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.')
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: safeHeader(from, 'Sender'),
      to: recipients,
      subject: safeHeader(subject, 'Subject'),
      text: body,
      ...(attachments.length ? {
        attachments: attachments.map(({ name, data }) => ({
          filename: name,
          content: data,
        })),
      } : {}),
    }),
    cache: 'no-store',
  })
  const responseBody = await response.text()
  let result: { id?: string; message?: string; name?: string }
  try {
    result = JSON.parse(responseBody) as typeof result
  } catch {
    throw new Error(`Resend returned a non-JSON response (HTTP ${response.status}).`)
  }
  if (!response.ok || !result.id) throw new Error(result.message || result.name || `Resend could not accept the email (HTTP ${response.status}).`)
  return result.id
}

function taskStartTime(value: string, timezone: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value)
  if (!match) throw new Error('Choose a valid task date and time.')
  const [, year, month, day, hour, minute] = match
  const desired = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute))
  const check = new Date(desired)
  if (check.getUTCFullYear() !== Number(year) || check.getUTCMonth() !== Number(month) - 1 || check.getUTCDate() !== Number(day) || Number(hour) > 23 || Number(minute) > 59) throw new Error('Choose a valid task date and time.')
  let instant = desired
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(instant)).map(({ type, value: partValue }) => [type, partValue]))
    const represented = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute))
    const difference = desired - represented
    if (!difference) break
    instant += difference
  }
  const resolved = new Date(instant)
  const finalParts = Object.fromEntries(formatter.formatToParts(resolved).map(({ type, value: partValue }) => [type, partValue]))
  if (Number(finalParts.year) !== Number(year) || Number(finalParts.month) !== Number(month) || Number(finalParts.day) !== Number(day) || Number(finalParts.hour) !== Number(hour) || Number(finalParts.minute) !== Number(minute)) throw new Error('That local time does not exist in the selected timezone.')
  if (resolved.getTime() <= Date.now()) throw new Error('Task date and time must be in the future.')
  return resolved
}

async function addCalendarTask(title: string, description: string, start: Date, end: Date, timezone: string) {
  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=none', {
    method: 'POST',
    headers: { Authorization: `Bearer ${await googleAccessToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ summary: title, description, start: { dateTime: start.toISOString(), timeZone: timezone }, end: { dateTime: end.toISOString(), timeZone: timezone } }),
    cache: 'no-store',
  })
  const result = await response.json() as { id?: string; htmlLink?: string; error?: { message?: string } }
  if (!response.ok || !result.id) throw new Error(result.error?.message || 'Google Calendar could not create the event.')
  return { id: result.id, link: result.htmlLink || '' }
}

type WhatsAppTemplateParameter = { type: 'text'; text: string; parameter_name?: string }

function normalizeWhatsAppLanguageCode(value: string) {
  return value.trim().replace(/-/g, '_')
}

function isValidWhatsAppTemplateName(value: string) {
  return /^[A-Za-z0-9_-]{1,512}$/.test(value)
}

function isValidWhatsAppLanguageCode(value: string) {
  const normalized = normalizeWhatsAppLanguageCode(value)
  return /^[A-Za-z]{2,3}(?:_[A-Za-z]{2,3})?$/.test(normalized)
}

function templateParameters(source: string, data: Record<string, unknown>): WhatsAppTemplateParameter[] {
  let parsed: unknown
  try { parsed = JSON.parse(source || '[]') } catch { throw new Error('WhatsApp template parameters must be a valid JSON array.') }
  if (!Array.isArray(parsed) || parsed.length > 20) throw new Error('WhatsApp template parameters must be a JSON array with no more than 20 values.')
  const parameters = parsed.map((value): WhatsAppTemplateParameter => {
    if (typeof value === 'string') return { type: 'text', text: interpolate(value, data) }
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Each WhatsApp template parameter must be text or an object with text and an optional parameter_name.')
    const parameter = value as Record<string, unknown>
    if (typeof parameter.text !== 'string' || (parameter.parameter_name !== undefined && (typeof parameter.parameter_name !== 'string' || !/^[a-z][a-z0-9_]*$/.test(parameter.parameter_name)))) throw new Error('WhatsApp template parameter names or text are invalid.')
    return { type: 'text', text: interpolate(parameter.text, data), ...(parameter.parameter_name ? { parameter_name: parameter.parameter_name } : {}) }
  })
  if (parameters.some((parameter) => parameter.parameter_name) && parameters.some((parameter) => !parameter.parameter_name)) throw new Error('Use parameter_name for every value in a named WhatsApp template, or omit it for positional templates.')
  return parameters
}

async function sendWhatsApp({ to, body, recipientType, templateName, languageCode, parameters = [] }: { to: string; body?: string; recipientType: 'individual' | 'group'; templateName?: string; languageCode?: string; parameters?: WhatsAppTemplateParameter[] }) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const apiVersion = process.env.WHATSAPP_API_VERSION || 'v25.0'
  if (!accessToken || !phoneNumberId) throw new Error('WhatsApp is not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID.')
  if (!/^v\d+\.\d+$/.test(apiVersion)) throw new Error('WHATSAPP_API_VERSION must look like v25.0.')
  const message = templateName
    ? { type: 'template', template: { name: templateName, language: { code: languageCode }, ...(parameters.length ? { components: [{ type: 'body', parameters }] } : {}) } }
    : { type: 'text', text: { preview_url: false, body } }
  const response = await fetch(`https://graph.facebook.com/${apiVersion}/${encodeURIComponent(phoneNumberId)}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: recipientType, to, ...message }),
    cache: 'no-store',
  })
  const result = await response.json() as { messages?: Array<{ id?: string }>; error?: { message?: string } }
  const messageId = result.messages?.[0]?.id
  if (!response.ok || !messageId) throw new Error(result.error?.message || 'WhatsApp could not accept the message.')
  return messageId
}

async function askGemini(instruction: string, input: Record<string, unknown>) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('Gemini is not configured. Set GEMINI_API_KEY.')
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash'
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }, body: JSON.stringify({ contents: [{ parts: [{ text: `${instruction}\n\nWorkflow data:\n${JSON.stringify(input)}` }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 800 } }), cache: 'no-store' })
  const result = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; error?: { message?: string } }
  const text = result.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim()
  if (!response.ok || !text) throw new Error(result.error?.message || 'Gemini returned no text.')
  return text
}

export async function runWorkflow({ workflowName, nodes, input = {}, live }: { workflowName: string; nodes: WorkflowNode[]; input?: Record<string, unknown>; live: boolean }): Promise<WorkflowResult> {
  if (live && process.env.LIVE_WORKFLOWS_ENABLED !== 'true') throw new Error('Live execution is disabled. Set LIVE_WORKFLOWS_ENABLED=true on the server.')
  if (!Array.isArray(nodes) || nodes.length > 50) throw new Error('Invalid workflow definition.')
  const active = nodes.filter((node) => node.enabled)
  const trigger = active.find((node) => node.type === 'trigger')
  if (!trigger) throw new Error('Add and enable one trigger before running.')
  const logs: WorkflowLog[] = []
  const webhookTrigger = trigger.title === 'On webhook call' || trigger.title === 'On website form submission'
  let data: Record<string, unknown> = { workflow: workflowName.slice(0, 120), triggeredAt: new Date().toISOString(), message: webhookTrigger ? '' : trigger.config.sample || 'Workflow started', ...input }
  log(logs, 'info', live ? 'Live server run started.' : 'Server preview run started.')
  for (const node of active) {
    if ((node.title === 'On webhook call' || node.title === 'On website form submission') && Object.keys(input).length === 0) { try { data = { ...data, ...JSON.parse(node.config.sample || '{}') } } catch { throw new Error('Webhook test data must be valid JSON.') } }
    if (node.type === 'trigger') log(logs, 'success', `Trigger received: ${String(data.message)}`)
    if (node.title === 'Continue only if') {
      const field = node.config.conditionField?.trim() || ''
      const operator = node.config.conditionOperator || 'equals'
      const value = interpolate(node.config.conditionValue || '', data)
      if (!/^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*$/.test(field)) throw new Error('Condition field must be a field name such as message or contact.email.')
      const actual = workflowField(data, field)
      const actualText = actual == null ? '' : typeof actual === 'object' ? JSON.stringify(actual) : String(actual)
      const numericActual = actual === null || actual === undefined || actual === '' ? Number.NaN : Number(actual)
      const numericExpected = Number(value)
      const matched = operator === 'equals' ? actualText === value
        : operator === 'does_not_equal' ? actualText !== value
          : operator === 'contains' ? actualText.includes(value)
            : operator === 'does_not_contain' ? !actualText.includes(value)
              : operator === 'is_empty' ? actualText.trim() === ''
                : operator === 'is_not_empty' ? actualText.trim() !== ''
                  : operator === 'greater_than' ? Number.isFinite(numericActual) && Number.isFinite(numericExpected) && numericActual > numericExpected
                    : operator === 'less_than' ? Number.isFinite(numericActual) && Number.isFinite(numericExpected) && numericActual < numericExpected
                      : (() => { throw new Error('Select a supported condition operator.') })()
      data = { ...data, conditionPassed: matched }
      if (matched) log(logs, 'success', `Condition matched: ${field} ${operator}.`)
      else { log(logs, 'info', `Condition did not match: ${field} ${operator}; remaining steps were skipped.`); break }
    }
    if (node.title === 'Run JavaScript') { const field = node.config.field?.trim(); if (!field || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(field)) throw new Error('JavaScript data field must be a valid identifier.'); data = { ...data, [field]: interpolate(node.config.value || '', data) }; log(logs, 'success', `Set ${field} in workflow data.`) }
    if (node.title === 'AI transform') { const instruction = node.config.instruction || 'Summarize the workflow data.'; const result = live ? await askGemini(instruction, data) : `${instruction}: ${String(data.message ?? JSON.stringify(data)).slice(0, 180)}`; data = { ...data, aiResult: result }; log(logs, 'success', live ? 'Gemini completed the AI transform.' : 'Created local AI preview.') }
    if (node.title === 'Open website') {
      const rawUrl = interpolate(node.config.websiteUrl || '', data).trim()
      let websiteUrl: URL
      try { websiteUrl = new URL(rawUrl) } catch { throw new Error('Enter a valid website URL beginning with http:// or https://.') }
      if (!['http:', 'https:'].includes(websiteUrl.protocol) || websiteUrl.username || websiteUrl.password) throw new Error('Only http:// and https:// website URLs are allowed.')
      data = { ...data, openedWebsite: websiteUrl.toString() }
      log(logs, 'success', `Ready to open ${websiteUrl.hostname}.`)
    }
    if (node.title === 'Send an email') {
      const recipients = interpolate(node.config.to || '', data).split(/[,;\n]+/).map((recipient) => recipient.trim()).filter(Boolean)
      if (!recipients.length || recipients.length > 50 || recipients.some((recipient) => !/^\S+@\S+\.\S+$/.test(recipient))) throw new Error('Enter between 1 and 50 valid recipient email addresses.')
      const subject = interpolate(node.config.subject || '', data).replace(/[\r\n]+/g, ' ').trim()
      const body = interpolate(node.config.body || '', data)
      let attachments: EmailAttachment[]
      try { attachments = JSON.parse(node.config.attachments || '[]') as EmailAttachment[] } catch { throw new Error('Email attachments are invalid.') }
      if (!Array.isArray(attachments) || attachments.length > 10) throw new Error('Email attachments are invalid or exceed the 10-file limit.')
      let attachmentBytes = 0
      for (const attachment of attachments) {
        if (!attachment || typeof attachment.name !== 'string' || attachment.name.length > 255 || typeof attachment.type !== 'string' || !/^[A-Za-z0-9.+-]+\/[A-Za-z0-9.+-]+$/.test(attachment.type) || typeof attachment.data !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(attachment.data)) throw new Error('Email attachment data is invalid.')
        attachmentBytes += Buffer.from(attachment.data, 'base64').byteLength
        if (attachmentBytes > 1.5 * 1024 * 1024) throw new Error('Email attachments must total 1.5 MB or less.')
      }
      if (live) {
        const messageId = await sendResend(recipients, subject, body, attachments)
        data = { ...data, email: { to: recipients, subject, messageId, attachments: attachments.map(({ name }) => name), accepted: true, deliveryStatus: 'unknown' } }
        log(logs, 'success', `Resend accepted the email for ${recipients.length} recipient(s) (ID ${messageId}); delivery is not confirmed. Check Resend Emails/Logs for its status. The resend.dev sender only allows delivery to your Resend account email.`)
      } else {
        data = { ...data, emailPreview: { to: recipients, subject, body, attachments: attachments.map(({ name, size, type }) => ({ name, size, type })), deliveryStatus: 'not_sent' } }
        log(logs, 'success', `Email preview prepared for ${recipients.length} recipient(s) with ${attachments.length} attachment(s); nothing was sent.`)
      }
    }
    if (node.title === 'Send a WhatsApp message' || node.title === 'Send an SMS') {
      const recipientType = node.config.waRecipientType === 'group' ? 'group' : 'individual'
      const enteredTo = interpolate(node.config.waTo || node.config.smsTo || '', data).trim()
      const to = recipientType === 'individual' ? enteredTo.replace(/[\s()-]/g, '') : enteredTo
      const messageType = node.config.waMessageType === 'template' ? 'template' : 'text'
      const body = interpolate(node.config.waBody || node.config.smsBody || '', data).trim()
      const templateName = interpolate(node.config.waTemplateName || '', data).trim()
      const languageCode = normalizeWhatsAppLanguageCode(node.config.waLanguageCode?.trim() || 'en_US')
      if (recipientType === 'individual' && !/^\+[1-9]\d{7,14}$/.test(to)) throw new Error('Enter the WhatsApp recipient in international format, such as +919082364107.')
      if (recipientType === 'group' && (to.length < 8 || to.length > 256 || /\s/.test(to))) throw new Error('Enter a valid WhatsApp Groups API group ID.')
      if (messageType === 'text' && (!body || body.length > 4096)) throw new Error('Enter a WhatsApp message between 1 and 4096 characters.')
      if (messageType === 'template' && (!isValidWhatsAppTemplateName(templateName) || !isValidWhatsAppLanguageCode(languageCode))) throw new Error('Enter an approved WhatsApp template name and a language code such as en_US.')
      const parameters = messageType === 'template' ? templateParameters(node.config.waTemplateParams || '[]', data) : []
      if (live) {
        const messageId = await sendWhatsApp({ to, recipientType, body: messageType === 'text' ? body : undefined, templateName: messageType === 'template' ? templateName : undefined, languageCode, parameters })
        data = { ...data, whatsapp: { to, recipientType, messageId, accepted: true } }
        log(logs, 'success', `Meta accepted the WhatsApp request for ${to} (message ID ${messageId}); delivery is not confirmed. Check Meta message status.`)
      } else {
        data = { ...data, whatsappPreview: { to, recipientType, messageType, body: messageType === 'text' ? body : undefined, templateName: messageType === 'template' ? templateName : undefined, delivered: false } }
        log(logs, 'success', `Prepared a WhatsApp ${messageType} preview for ${to}; nothing was sent.`)
      }
    }
    if (node.title === 'Create Calendar event') {
      const title = interpolate(node.config.eventTitle || '', data).trim()
      const description = interpolate(node.config.eventDescription || '', data)
      const timezone = node.config.eventTimezone?.trim() || 'UTC'
      const duration = Number(node.config.eventDurationMinutes)
      if (!title || title.length > 200) throw new Error('Enter an event title (up to 200 characters).')
      if (!Number.isInteger(duration) || duration < 1 || duration > 1440) throw new Error('Event duration must be from 1 to 1440 minutes.')
      let start: Date
      try { start = taskStartTime(node.config.eventAt || '', timezone) } catch (error) {
        if (error instanceof RangeError) throw new Error('Enter a valid IANA timezone, such as Asia/Kolkata.')
        throw error
      }
      const end = new Date(start.getTime() + duration * 60_000)
      if (live) {
        const event = await addCalendarTask(title, description, start, end, timezone)
        data = { ...data, calendarEvent: { title, startAt: start.toISOString(), timezone, eventId: event.id, eventLink: event.link } }
        log(logs, 'success', `Created "${title}" in Google Calendar.`)
      } else {
        data = { ...data, calendarEventPreview: { title, startAt: start.toISOString(), timezone, durationMinutes: duration, description } }
        log(logs, 'success', `Previewed Calendar event for ${title}; nothing was created.`)
      }
    }
    if (node.title === 'Schedule task + notify') {
      const title = interpolate(node.config.taskTitle || '', data).trim()
      const description = interpolate(node.config.taskDescription || '', data)
      const timezone = node.config.timezone?.trim() || 'UTC'
      const email = interpolate(node.config.notifyEmail || '', data).trim()
      const enteredPhone = interpolate(node.config.notifyPhone || '', data).replace(/[\s()-]/g, '')
      const phone = enteredPhone.startsWith('+91') ? enteredPhone : enteredPhone.length === 10 ? `+91${enteredPhone}` : enteredPhone
      const duration = Number(node.config.durationMinutes)
      if (!title || title.length > 200) throw new Error('Enter a task title (up to 200 characters).')
      if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Enter a valid confirmation email address.')
      if (!/^\+91[6-9]\d{9}$/.test(phone)) throw new Error('Enter a valid Indian mobile number, for example 98765 43210 or +91 98765 43210.')
      if (!Number.isInteger(duration) || duration < 1 || duration > 1440) throw new Error('Task duration must be from 1 to 1440 minutes.')
      let start: Date
      try { start = taskStartTime(node.config.taskAt || '', timezone) } catch (error) {
        if (error instanceof RangeError) throw new Error('Enter a valid IANA timezone, such as Asia/Kolkata.')
        throw error
      }
      const end = new Date(start.getTime() + duration * 60_000)
      const confirmation = `Your task "${title}" is scheduled for ${new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone }).format(start)} (${timezone}).`
      if (live) {
        const event = await addCalendarTask(title, description, start, end, timezone)
        const emailSubject = `Task scheduled: ${title}`
        await sendResend([email], emailSubject, `${confirmation}${event.link ? `\n\nGoogle Calendar: ${event.link}` : ''}`, [])
          const templateName = interpolate(node.config.whatsappTemplateName || process.env.WHATSAPP_TASK_TEMPLATE_NAME || '', data).trim()
          const languageCode = normalizeWhatsAppLanguageCode(node.config.whatsappLanguageCode?.trim() || process.env.WHATSAPP_TASK_TEMPLATE_LANGUAGE || 'en_US')
          if (!isValidWhatsAppTemplateName(templateName)) throw new Error('Set an approved WhatsApp task template name in the action or WHATSAPP_TASK_TEMPLATE_NAME.')
          if (!isValidWhatsAppLanguageCode(languageCode)) throw new Error('Set a valid WhatsApp task template language code such as en_US.')
          const taskTime = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone }).format(start)
          const whatsappMessageId = await sendWhatsApp({ to: phone, recipientType: 'individual', templateName, languageCode, parameters: [{ type: 'text', text: title }, { type: 'text', text: `${taskTime} (${timezone})` }] })
          data = { ...data, scheduledTask: { title, startAt: start.toISOString(), timezone, calendarEventId: event.id, calendarLink: event.link, email, phone, whatsappMessageId } }
          log(logs, 'success', `Added "${title}" to Google Calendar and sent email/WhatsApp confirmation.`)
      } else {
        data = { ...data, scheduledTaskPreview: { title, startAt: start.toISOString(), timezone, durationMinutes: duration, email, phone, confirmation } }
        log(logs, 'success', `Previewed Calendar task and email/WhatsApp confirmation for ${title}; nothing was sent.`)
      }
    }
  }
  log(logs, 'success', live ? 'Live workflow completed.' : 'Preview workflow completed.')
  return { output: data, logs }
}
