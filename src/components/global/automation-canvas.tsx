'use client'

import { startTransition, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import { Bell, Bot, CalendarClock, CalendarDays, CheckCircle2, ChevronRight, Clock3, Code2, Copy, Crosshair, FileText, Globe, MessageCircle, MousePointer2, Play, Plus, Power, Save, Search, Sparkles, Trash2, Webhook, X, ZoomIn, ZoomOut } from 'lucide-react'

type NodeType = 'trigger' | 'action' | 'ai'
type Config = Record<string, string>
type Node = { id: string; title: string; description: string; type: NodeType; icon: LucideIcon; x: number; y: number; enabled: boolean; config: Config }
type StoredNode = Omit<Node, 'icon'>
type Option = Omit<Node, 'id' | 'x' | 'y' | 'enabled'> & { key: string }
type Log = { id: string; time: string; level: 'info' | 'success' | 'error'; message: string }
type EmailAttachment = { name: string; type: string; size: number; data: string }
const MAX_EMAIL_ATTACHMENT_BYTES = 1.5 * 1024 * 1024

const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read selected file.'))
  reader.onerror = () => reject(new Error('Could not read selected file.'))
  reader.readAsDataURL(file)
})

const parseAttachments = (value: string): EmailAttachment[] => {
  try { return JSON.parse(value || '[]') as EmailAttachment[] } catch { return [] }
}

const restoreNode = (node: StoredNode): Node => {
  if (node.title === 'Send an SMS') {
    const { smsTo, smsBody, ...config } = node.config || {}
    return { ...node, title: 'Send a WhatsApp message', description: 'Send a WhatsApp message using Meta Cloud API', icon: MessageCircle, config: { waRecipientType: 'individual', waTo: smsTo || '', waMessageType: 'text', waBody: smsBody || 'Message: {{message}}', waTemplateName: '', waLanguageCode: 'en_US', waTemplateParams: '[]', ...config } }
  }
  return { ...node, icon: iconFor(node.title), config: node.config || {} }
}

const options: Option[] = [
  { key: 'manual', title: 'Trigger manually', description: 'Runs when you click Execute workflow', icon: MousePointer2, type: 'trigger', config: { sample: 'Hello from a manual run' } },
  { key: 'event', title: 'On app event', description: 'Test an incoming event locally', icon: Bell, type: 'trigger', config: { event: 'contact.created', sample: 'New contact: Ada Lovelace' } },
  { key: 'schedule', title: 'On a schedule', description: 'Run from a protected scheduler URL', icon: Clock3, type: 'trigger', config: { schedule: '0 9 * * *', timezone: 'Asia/Kolkata', sample: 'Daily check-in', scheduleUrl: '' } },
  { key: 'webhook', title: 'On webhook call', description: 'Generate a safe test webhook payload', icon: Webhook, type: 'trigger', config: { path: '/webhook/my-flow', sample: '{"source":"test","message":"Webhook received"}' } },
  { key: 'website-form', title: 'On website form submission', description: 'Start the workflow when a website visitor submits an enquiry form', icon: Webhook, type: 'trigger', config: { sample: '{"name":"Ada Lovelace","email":"ada@example.com","phone":"+919082364107","message":"I would like to learn more"}', webhookUrl: '' } },
  { key: 'open-website', title: 'Open website', description: 'Open a product or website URL in a new browser tab', icon: Globe, type: 'action', config: { websiteUrl: 'https://example.com' } },
  { key: 'email', title: 'Send an email', description: 'Preview an email without sending it', icon: FileText, type: 'action', config: { to: 'team@example.com', subject: 'Workflow update', body: 'Message: {{message}}', attachments: '[]' } },
  { key: 'whatsapp', title: 'Send a WhatsApp message', description: 'Send WhatsApp text or approved templates to a person or eligible group', icon: MessageCircle, type: 'action', config: { waRecipientType: 'individual', waTo: '', waMessageType: 'text', waBody: 'Message: {{message}}', waTemplateName: '', waLanguageCode: 'en_US', waTemplateParams: '[]' } },
  { key: 'condition', title: 'Continue only if', description: 'Stop later steps unless a field matches your condition', icon: CheckCircle2, type: 'action', config: { conditionField: 'message', conditionOperator: 'contains', conditionValue: 'urgent' } },
  { key: 'calendar-event', title: 'Create Calendar event', description: 'Add an event to Google Calendar without sending notifications', icon: CalendarDays, type: 'action', config: { eventTitle: 'Follow up', eventAt: '', eventDurationMinutes: '30', eventTimezone: 'Asia/Kolkata', eventDescription: '' } },
  { key: 'calendar-task', title: 'Schedule task + notify', description: 'Add a task to Google Calendar and notify by email and WhatsApp', icon: CalendarClock, type: 'action', config: { taskTitle: 'Follow up', taskAt: '', durationMinutes: '30', timezone: 'Asia/Kolkata', notifyEmail: '', notifyPhone: '', taskDescription: '', whatsappTemplateName: '', whatsappLanguageCode: 'en_US' } },
  { key: 'javascript', title: 'Run JavaScript', description: 'Safely add or update a data field', icon: Code2, type: 'action', config: { field: 'status', value: 'processed' } },
  { key: 'ai', title: 'AI transform', description: 'Create a local AI-style summary', icon: Bot, type: 'ai', config: { instruction: 'Summarize this in one helpful sentence' } },
]
const colors: Record<NodeType, string> = { trigger: 'border-orange-400/70 bg-orange-500/10 text-orange-100', action: 'border-blue-400/70 bg-blue-500/10 text-blue-100', ai: 'border-violet-400/70 bg-violet-500/10 text-violet-100' }
const id = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
const iconFor = (title: string) => options.find((item) => item.title === title)?.icon ?? Sparkles
const restoreNodes = (storedNodes: StoredNode[]) => {
  const seen = new Set<string>()
  return storedNodes.map((storedNode) => {
    const node = restoreNode(storedNode)
    let nodeId = node.id
    while (!nodeId || seen.has(nodeId)) nodeId = id()
    seen.add(nodeId)
    return { ...node, id: nodeId }
  })
}
const fill = (text: string, data: Record<string, unknown>) => text.replace(/{{\s*([\w.]+)\s*}}/g, (_, key) => String(data[key] ?? ''))
const websiteFormExample = (webhookUrl: string) => `<form id="lead-form">
  <label>Name <input name="name" required></label>
  <label>Email <input name="email" type="email" required></label>
  <label>Phone <input name="phone" type="tel"></label>
  <label>Message <textarea name="message" required></textarea></label>
  <button type="submit">Send enquiry</button>
  <p id="lead-form-status" aria-live="polite"></p>
</form>
<script>
document.getElementById('lead-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const status = document.getElementById('lead-form-status');
  status.textContent = 'Sending...';
  try {
    const response = await fetch(${JSON.stringify(webhookUrl)}, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(form)))
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not submit the form.');
    status.textContent = 'Thanks, your enquiry was sent.';
    form.reset();
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : 'Could not submit the form.';
  }
});
</script>`

export function AutomationCanvas() {
  const router = useRouter(); const canvasRef = useRef<HTMLDivElement>(null)
  const [name, setName] = useState('My workflow'), [nodes, setNodes] = useState<Node[]>([])
  useEffect(() => {
    try {
      const workflowName = new URLSearchParams(window.location.search).get('name') || 'My workflow'
      const saved = JSON.parse(window.localStorage.getItem(`fuzzie-workflow:${workflowName}`) || 'null') as { nodes?: StoredNode[] } | null
      startTransition(() => {
        setName(workflowName)
        setNodes(saved?.nodes ? restoreNodes(saved.nodes) : [])
      })
    } catch {
      startTransition(() => {
        setName('My workflow')
        setNodes([])
      })
    }
  }, [])
  const [selected, setSelected] = useState<string | null>(null)
  const [panel, setPanel] = useState(false), [query, setQuery] = useState(''), [dragging, setDragging] = useState<string | null>(null), [dragged, setDragged] = useState<Option | null>(null)
  const [zoom, setZoom] = useState(1), [dirty, setDirty] = useState(false), [editing, setEditing] = useState(false), [running, setRunning] = useState(false), [ran, setRan] = useState<string[]>([])
  const [logs, setLogs] = useState<Log[]>([]), [output, setOutput] = useState<Record<string, unknown> | null>(null), [notice, setNotice] = useState(''), [exit, setExit] = useState(false)
  const liveMode = true
  const addLog = (level: Log['level'], message: string) => setLogs((current) => [{ id: id(), time: new Date().toLocaleTimeString(), level, message }, ...current].slice(0, 30))
  const current = nodes.find((node) => node.id === selected)
  const filtered = useMemo(() => options.filter((option) => `${option.title} ${option.description}`.toLowerCase().includes(query.toLowerCase())), [query])
  const update = (nodeId: string, patch: Partial<Node>) => { setNodes((current) => current.map((node) => node.id === nodeId ? { ...node, ...patch } : node)); setDirty(true) }
  const attachFiles = async (files: FileList | null) => {
    if (!current || !files?.length) return
    const attachments = parseAttachments(current.config.attachments || '[]')
    if (attachments.length + files.length > 10) {
      setNotice('A message can have up to 10 attachments.')
      window.setTimeout(() => setNotice(''), 3000)
      return
    }
    let totalSize = attachments.reduce((total, attachment) => total + attachment.size, 0)
    try {
      for (const file of Array.from(files)) {
        if (totalSize + file.size > MAX_EMAIL_ATTACHMENT_BYTES) throw new Error('Attachments must total 1.5 MB or less.')
        const dataUrl = await readFileAsDataUrl(file)
        attachments.push({ name: file.name, type: file.type || 'application/octet-stream', size: file.size, data: dataUrl.slice(dataUrl.indexOf(',') + 1) })
        totalSize += file.size
      }
      update(current.id, { config: { ...current.config, attachments: JSON.stringify(attachments) } })
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not add attachment.')
      window.setTimeout(() => setNotice(''), 3000)
    }
  }
  const removeAttachment = (index: number) => {
    if (!current) return
    const attachments = parseAttachments(current.config.attachments || '[]').filter((_, attachmentIndex) => attachmentIndex !== index)
    update(current.id, { config: { ...current.config, attachments: JSON.stringify(attachments) } })
  }
  const add = (option: Option, position?: { x: number; y: number }) => { const nodeId = id(); setNodes((current) => { const last = current.at(-1); return [...current, { ...option, id: nodeId, x: position?.x ?? (last ? Math.min(last.x + 23, 72) : 42), y: position?.y ?? (last?.y ?? 40), enabled: true, config: { ...option.config } }] }); setSelected(nodeId); setPanel(false); setQuery(''); setDirty(true) }
  const remove = (nodeId: string) => { setNodes((current) => current.filter((node) => node.id !== nodeId)); setSelected(null); setDirty(true) }
  const save = () => { const stored = JSON.parse(JSON.stringify(nodes)) as StoredNode[]; window.localStorage.setItem(`fuzzie-workflow:${name}`, JSON.stringify({ workflowName: name, nodes: stored, savedAt: new Date().toISOString() })); setDirty(false); setNotice('Saved locally'); window.setTimeout(() => setNotice(''), 2200) }
  const publishSchedule = async (node: Node) => { try { const response = await fetch('/api/workflows/publish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workflowName: name, nodes, live: true }) }); const result = await response.json() as { scheduleUrl?: string; localSchedulerActive?: boolean; error?: string }; if (!response.ok || !result.scheduleUrl) throw new Error(result.error || 'Unable to publish schedule.'); update(node.id, { config: { ...node.config, scheduleUrl: result.scheduleUrl } }); setNotice(result.localSchedulerActive ? 'Local scheduler active — save workflow' : 'Schedule URL published — save workflow'); } catch (error) { addLog('error', error instanceof Error ? error.message : 'Unable to publish schedule.') } }
  const publishWebsiteForm = async (node: Node) => { try { const response = await fetch('/api/workflows/publish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workflowName: name, nodes, live: true }) }); const result = await response.json() as { webhookUrl?: string; error?: string }; if (!response.ok || !result.webhookUrl) throw new Error(result.error || 'Unable to publish website form webhook.'); update(node.id, { config: { ...node.config, webhookUrl: result.webhookUrl } }); setNotice('Website form webhook published — save workflow'); } catch (error) { addLog('error', error instanceof Error ? error.message : 'Unable to publish website form webhook.') } }
  const copyWebsiteForm = async (webhookUrl: string) => { try { await navigator.clipboard.writeText(websiteFormExample(webhookUrl)); setNotice('Form example copied'); window.setTimeout(() => setNotice(''), 2200) } catch { setNotice('Clipboard access unavailable; select and copy the form example.') } }
  const move = (event: React.PointerEvent<HTMLDivElement>) => { if (!dragging || !canvasRef.current) return; const box = canvasRef.current.getBoundingClientRect(); update(dragging, { x: Math.max(3, Math.min(85, ((event.clientX - box.left) / box.width) * 100 - 8)), y: Math.max(8, Math.min(82, ((event.clientY - box.top) / box.height) * 100 - 7)) }) }
  const execute = async () => {
    const active = nodes.filter((node) => node.enabled)
    const trigger = active.find((node) => node.type === 'trigger')
    if (!trigger) { addLog('error', 'Add and enable one trigger before running.'); setPanel(true); return }
    if (running) return
    const websiteTab = active.some((node) => node.title === 'Open website') ? window.open('about:blank', '_blank') : null
    if (websiteTab) { websiteTab.opener = null; websiteTab.document.title = 'Opening website...' }
    setRunning(true)
    setRan([])
    setOutput(null)
    if (liveMode) {
      try {
        const response = await fetch('/api/workflows/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workflowName: name, nodes, live: true }) })
        const result = await response.json() as { output?: Record<string, unknown>; logs?: Log[]; error?: string }
        if (!response.ok || !result.output) throw new Error(result.error || 'Live run failed.')
        setRan(active.map((node) => node.id))
        setOutput(result.output)
        setLogs((result.logs ?? []).map((log) => ({ ...log, id: id() })))
        if (typeof result.output.openedWebsite === 'string') {
          if (websiteTab) websiteTab.location.replace(result.output.openedWebsite)
          else setNotice('Pop-up blocked. Open the website from the workflow output.')
        } else websiteTab?.close()
      } catch (error) {
        websiteTab?.close()
        addLog('error', error instanceof Error ? error.message : 'Live run failed.')
      } finally { setRunning(false) }
      return
    }
    addLog('info', 'Safe local test started — no external action will be performed.')
    let data: Record<string, unknown> = { workflow: name, triggeredAt: new Date().toISOString(), message: trigger.config.sample || 'Workflow started' }
    for (const node of active) {
      await new Promise((done) => window.setTimeout(done, 350))
      setRan((current) => [...current, node.id])
      if (node.title === 'On webhook call') {
        try { data = { ...data, ...JSON.parse(node.config.sample || '{}') } }
        catch { addLog('error', 'Webhook test data must be valid JSON.'); websiteTab?.close(); setRunning(false); return }
      }
      if (node.type === 'trigger') addLog('success', `Trigger received: ${String(data.message)}`)
      if (node.title === 'Run JavaScript') {
        if (!node.config.field.trim()) { addLog('error', 'Choose a field name for the data transform.'); websiteTab?.close(); setRunning(false); return }
        data = { ...data, [node.config.field]: fill(node.config.value, data) }
        addLog('success', `Set ${node.config.field} in workflow data.`)
      }
      if (node.title === 'AI transform') {
        const source = String(data.message ?? JSON.stringify(data))
        data = { ...data, aiResult: `${node.config.instruction || 'Summary'}: ${source.slice(0, 180)}${source.length > 180 ? '…' : ''}` }
        addLog('success', 'Created a local AI-style result.')
      }
      if (node.title === 'Send an email') {
        const to = fill(node.config.to, data)
        if (!to.includes('@')) { addLog('error', 'Enter a valid preview recipient email.'); websiteTab?.close(); setRunning(false); return }
        data = { ...data, emailPreview: { to, subject: fill(node.config.subject, data), body: fill(node.config.body, data), delivered: false } }
        addLog('success', `Email preview prepared for ${to}; nothing was sent.`)
      }
      if (node.title === 'Open website') {
        const websiteUrl = fill(node.config.websiteUrl || '', data)
        data = { ...data, openedWebsite: websiteUrl }
        if (websiteTab) websiteTab.location.replace(websiteUrl)
        else setNotice('Pop-up blocked. Open the website from the workflow output.')
      }
    }
    setOutput(data)
    addLog('success', 'Workflow completed safely.')
    setRunning(false)
  }
  const labels: Record<string, string> = { sample: 'Test data', event: 'Event name', schedule: 'Cron expression', timezone: 'Time zone', scheduleUrl: 'Published scheduler URL', webhookUrl: 'Published website form endpoint', path: 'Webhook path', websiteUrl: 'Product or website URL', to: 'Recipients (comma or newline separated)', subject: 'Subject', body: 'Body', field: 'Data field', value: 'Field value', instruction: 'Instruction', conditionField: 'Field to check', conditionOperator: 'Condition', conditionValue: 'Match value', waRecipientType: 'Recipient type', waTo: 'WhatsApp recipient or group ID', waMessageType: 'Message type', waBody: 'Text message', waTemplateName: 'Approved template name', waLanguageCode: 'Template language code', waTemplateParams: 'Template parameters (JSON array)', eventTitle: 'Event title', eventAt: 'Event date and time', eventDurationMinutes: 'Duration (minutes)', eventTimezone: 'Time zone', eventDescription: 'Event details', taskTitle: 'Task title', taskAt: 'Task date and time', durationMinutes: 'Duration (minutes)', notifyEmail: 'Confirmation email', notifyPhone: 'WhatsApp phone number', taskDescription: 'Task details', whatsappTemplateName: 'Approved WhatsApp task template', whatsappLanguageCode: 'Task template language code' }
  return <div ref={canvasRef} className="fixed inset-0 z-[200] flex min-h-screen overflow-hidden bg-[#101010] text-white" onPointerMove={move} onPointerUp={() => setDragging(null)} onPointerLeave={() => setDragging(null)}>
    <aside className="z-30 flex w-11 shrink-0 flex-col items-center gap-3 border-r border-white/[.08] bg-[#1b1b1b] py-3"><button type="button" onClick={() => setPanel(true)} aria-label="Add node" className="flex size-8 items-center justify-center rounded-md hover:bg-white/10"><Plus className="size-[18px]" /></button><button type="button" onClick={() => { setPanel(true); setSelected(null) }} aria-label="Search nodes" className="flex size-8 items-center justify-center rounded-md text-white/70 hover:bg-white/10"><Search className="size-[17px]" /></button></aside>
    <section className="relative flex min-w-0 flex-1 flex-col"><header className="z-20 flex h-[62px] shrink-0 items-center justify-between border-b border-white/[.08] bg-[#242424] px-6"><div className="flex min-w-0 items-center gap-4"><button type="button" onClick={() => dirty ? setExit(true) : router.push('/')} className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-black hover:bg-white/80">Home</button>{editing ? <input autoFocus value={name} onChange={(event) => { setName(event.target.value); setDirty(true) }} onBlur={() => setEditing(false)} onKeyDown={(event) => event.key === 'Enter' && setEditing(false)} className="w-48 rounded border border-violet-400 bg-[#1b1b1b] px-2 py-1 text-lg font-semibold outline-none" /> : <button type="button" onClick={() => setEditing(true)} className="max-w-56 truncate text-left text-2xl font-semibold hover:text-violet-300">{name}</button>}</div><span className="hidden rounded-full border border-red-400/60 bg-red-500/15 px-3 py-1 text-xs text-red-100 md:block">Live workflows</span><div className="flex items-center gap-3"><span className="text-xs text-emerald-300">{notice}</span><button type="button" onClick={save} className="flex items-center gap-2 rounded-lg bg-violet-500 px-4 py-2.5 text-sm font-semibold hover:bg-violet-400"><Save className="size-4" /> Save</button></div></header>
      <main className="relative flex-1 overflow-hidden bg-[#121212]" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (!dragged || !canvasRef.current) return; const box = canvasRef.current.getBoundingClientRect(); add(dragged, { x: ((event.clientX - box.left) / box.width) * 100 - 8, y: ((event.clientY - box.top) / box.height) * 100 - 7 }); setDragged(null) }} style={{ backgroundImage: 'radial-gradient(#303030 1px, transparent 1px)', backgroundSize: '16px 16px' }}>
        <div className="absolute right-4 top-4 z-20 flex flex-col gap-2"><button type="button" onClick={() => { setSelected(null); setPanel(true) }} className="flex size-9 items-center justify-center rounded-md border border-white/10 bg-[#292929]"><Plus className="size-5" /></button><button type="button" onClick={() => { setSelected(null); setPanel(true) }} className="flex size-9 items-center justify-center rounded-md border border-white/10 bg-[#292929]"><Search className="size-4" /></button></div>
        {!nodes.length && <div className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-start gap-8"><button type="button" onClick={() => { setSelected(null); setPanel(true) }} className="group flex w-28 flex-col items-center gap-3 text-center"><span className="flex size-28 items-center justify-center rounded-xl border-2 border-dashed border-white/60 bg-[#171717] group-hover:bg-[#202020]"><Plus className="size-8" /></span><span className="font-semibold">Add first step...</span></button><span className="pt-12 text-sm">or</span><button type="button" onClick={() => { add(options[0]); add(options[6]) }} className="group flex w-28 flex-col items-center gap-3 text-center"><span className="flex size-28 items-center justify-center rounded-xl border-2 border-dashed border-white/60 bg-[#171717] group-hover:bg-[#202020]"><Sparkles className="size-9" /></span><span className="font-semibold">Build with AI</span></button></div>}
        <div className="absolute inset-0 origin-center" style={{ transform: `scale(${zoom})` }}>{nodes.length > 1 && <svg className="pointer-events-none absolute inset-0 z-[5] size-full"><defs><marker id="flow-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0 L7 3 L0 6" fill="none" stroke="#aaa" /></marker></defs>{nodes.slice(1).map((node, index) => <line key={node.id} x1={`${nodes[index].x + 8}%`} y1={`${nodes[index].y + 7}%`} x2={`${node.x}%`} y2={`${node.y + 7}%`} stroke="#888" strokeWidth="2" markerEnd="url(#flow-arrow)" />)}</svg>}{nodes.map((node) => { const Icon = node.icon; return <div key={node.id} style={{ left: `${node.x}%`, top: `${node.y}%` }} onClick={() => { setSelected(node.id); setPanel(true) }} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setDragging(node.id) }} className={`group absolute z-10 w-52 cursor-grab rounded-lg border p-3 shadow-2xl active:cursor-grabbing ${colors[node.type]} ${!node.enabled ? 'opacity-45 grayscale' : ''} ${selected === node.id ? 'ring-2 ring-white/80' : ''}`}><div className="absolute -top-9 left-1/2 hidden -translate-x-1/2 gap-1 rounded-lg border border-white/10 bg-[#292929] p-1 group-hover:flex"><button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => update(node.id, { enabled: !node.enabled })} className="flex size-7 items-center justify-center rounded hover:bg-white/10">{node.enabled ? <Power className="size-3.5" /> : <Play className="size-3.5" />}</button><button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => { setNodes((current) => [...current, { ...node, id: id(), x: Math.min(node.x + 8, 82), y: Math.min(node.y + 8, 82), config: { ...node.config } }]); setDirty(true) }} className="flex size-7 items-center justify-center rounded hover:bg-white/10"><Copy className="size-3.5" /></button><button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => remove(node.id)} className="flex size-7 items-center justify-center rounded text-red-200 hover:bg-red-500/20"><Trash2 className="size-3.5" /></button></div><div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-md bg-black/25"><Icon className="size-4" /></span><span className="min-w-0"><span className="block truncate text-sm font-semibold">{node.title}</span><span className="block text-xs opacity-60">{ran.includes(node.id) ? 'Completed' : node.description}</span></span></div></div> })}</div>
        <div className="absolute bottom-12 left-4 z-20 flex items-center gap-2"><button type="button" onClick={() => setZoom(1)} className="flex size-9 items-center justify-center rounded border border-white/10 bg-[#292929]"><Crosshair className="size-4" /></button><button type="button" onClick={() => setZoom((value) => Math.min(1.5, value + .1))} className="flex size-9 items-center justify-center rounded border border-white/10 bg-[#292929]"><ZoomIn className="size-4" /></button><button type="button" onClick={() => setZoom((value) => Math.max(.7, value - .1))} className="flex size-9 items-center justify-center rounded border border-white/10 bg-[#292929]"><ZoomOut className="size-4" /></button><span className="rounded border border-white/10 bg-[#292929] px-3 py-2 text-xs text-white/60">{Math.round(zoom * 100)}%</span><button type="button" onClick={execute} disabled={!nodes.length || running} className="ml-2 flex h-9 items-center gap-2 rounded bg-orange-500 px-4 text-sm font-semibold disabled:opacity-40"><Play className="size-4" />{running ? 'Running...' : 'Execute workflow'}</button></div>
        <div className="absolute bottom-0 left-0 right-0 z-10 max-h-36 overflow-y-auto border-t border-white/[.08] bg-[#1b1b1b] px-4 py-2"><div className="flex justify-between text-xs text-white/70"><span>Execution log · live server mode</span>{output && <CheckCircle2 className="size-4 text-emerald-300" />}</div>{logs.slice(0, 3).map((log) => <p key={log.id} className={`mt-1 text-xs ${log.level === 'error' ? 'text-red-300' : log.level === 'success' ? 'text-emerald-300' : 'text-white/55'}`}>{log.time} · {log.message}</p>)}{output && <details className="mt-1 text-xs text-white/60"><summary>View final output</summary><pre className="mt-1 overflow-auto rounded bg-black/25 p-2 text-[10px]">{JSON.stringify(output, null, 2)}</pre></details>}</div>
      </main></section>
    {output && typeof output.openedWebsite === 'string' && <a href={output.openedWebsite} target="_blank" rel="noopener noreferrer" className="fixed bottom-40 left-16 z-40 rounded bg-white px-3 py-2 text-sm font-semibold text-black shadow-lg">Open website</a>}
    {exit && <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/70 p-4"><div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#242424] p-6"><h2 className="text-xl font-semibold">Save this workflow?</h2><p className="mt-2 text-sm text-white/60">You have unsaved changes in {name}.</p><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setExit(false)} className="rounded px-4 py-2">Cancel</button><button type="button" onClick={() => router.push('/')} className="rounded px-4 py-2 text-red-200">Exit without saving</button><button type="button" onClick={() => { save(); router.push('/') }} className="rounded bg-violet-500 px-4 py-2 font-semibold">Save and exit</button></div></div></div>}
    {panel && (
      <aside className="z-30 flex w-[365px] shrink-0 flex-col border-l border-white/10 bg-[#292929] shadow-2xl">
        <div className="flex items-start justify-between border-b border-white/10 px-4 py-5">
          <div>
            <h2 className="text-lg font-semibold">{current ? current.title : 'Add a workflow step'}</h2>
            <p className="mt-1 text-sm text-white/60">{current ? 'Configure this step, then run safely.' : 'A trigger starts your workflow.'}</p>
          </div>
          <button type="button" onClick={() => setPanel(false)} aria-label="Close panel"><X className="size-5" /></button>
        </div>
        {current ? (
          <div className="overflow-y-auto p-4">
            <p className="rounded border border-emerald-400/20 bg-emerald-400/10 p-3 text-xs leading-5 text-emerald-100">
              {current.title === 'Schedule task + notify' ? 'Running this step creates a Google Calendar event and sends a confirmation email and approved WhatsApp template.' : current.title === 'Send a WhatsApp message' ? 'Live execution sends via Meta WhatsApp Cloud API. Outside the 24-hour service window, use an approved template.' : current.title === 'Open website' ? 'Running this workflow opens the validated website in a new browser tab.' : 'Live execution is enabled. Email and connected service actions may make external changes.'}
            </p>
            <label className="mt-4 flex justify-between text-sm">Step enabled <input type="checkbox" checked={current.enabled} onChange={(event) => update(current.id, { enabled: event.target.checked })} /></label>
            {Object.entries(current.config).filter(([key]) => key !== 'attachments' && key !== 'webhookUrl' && (key !== 'conditionValue' || !['is_empty', 'is_not_empty'].includes(current.config.conditionOperator)) && (!key.startsWith('waTemplate') || current.config.waMessageType === 'template') && (key !== 'waBody' || current.config.waMessageType !== 'template')).map(([key, value]) => (
              <label key={key} className="mt-4 block text-xs font-medium text-white/65">
                {labels[key] ?? key}
                {key === 'conditionOperator' ? (
                  <select value={value} onChange={(event) => update(current.id, { config: { ...current.config, [key]: event.target.value } })} className="mt-1 w-full rounded border border-white/15 bg-[#1b1b1b] px-3 py-2 text-sm text-white outline-none focus:border-violet-400">
                    {[['equals', 'Equals'], ['does_not_equal', 'Does not equal'], ['contains', 'Contains'], ['does_not_contain', 'Does not contain'], ['is_empty', 'Is empty'], ['is_not_empty', 'Is not empty'], ['greater_than', 'Greater than'], ['less_than', 'Less than']].map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}
                  </select>
                ) : key === 'waRecipientType' || key === 'waMessageType' ? (
                  <select value={value} onChange={(event) => update(current.id, { config: { ...current.config, [key]: event.target.value } })} className="mt-1 w-full rounded border border-white/15 bg-[#1b1b1b] px-3 py-2 text-sm text-white outline-none focus:border-violet-400">
                    {(key === 'waRecipientType' ? [{ value: 'individual', label: 'Individual' }, { value: 'group', label: 'WhatsApp API group' }] : [{ value: 'text', label: 'Text message' }, { value: 'template', label: 'Approved template' }]).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                ) : key === 'taskAt' || key === 'eventAt' ? (
                  <input type="datetime-local" value={value} onChange={(event) => update(current.id, { config: { ...current.config, [key]: event.target.value } })} className="mt-1 w-full rounded border border-white/15 bg-[#1b1b1b] px-3 py-2 text-sm text-white outline-none focus:border-violet-400" />
                ) : key === 'notifyPhone' || key === 'waTo' ? (
                  <input type={key === 'waTo' && current.config.waRecipientType === 'group' ? 'text' : 'tel'} inputMode={key === 'waTo' && current.config.waRecipientType === 'group' ? undefined : 'tel'} autoComplete="tel" placeholder={key === 'waTo' ? current.config.waRecipientType === 'group' ? 'Groups API group ID' : '+919082364107' : '+91 98765 43210'} value={value} onChange={(event) => update(current.id, { config: { ...current.config, [key]: event.target.value } })} className="mt-1 w-full rounded border border-white/15 bg-[#1b1b1b] px-3 py-2 text-sm text-white outline-none focus:border-violet-400" />
                ) : (
                  <textarea value={value} rows={key === 'to' || key === 'waBody' || key === 'waTemplateParams' || key === 'eventDescription' || key === 'taskDescription' || key === 'body' || key === 'sample' || key === 'instruction' ? 3 : 1} onChange={(event) => update(current.id, { config: { ...current.config, [key]: event.target.value } })} className="mt-1 w-full resize-none rounded border border-white/15 bg-[#1b1b1b] px-3 py-2 text-sm outline-none focus:border-violet-400" />
                )}
              </label>
            ))}
            {current.title === 'Send a WhatsApp message' && <p className="mt-3 text-xs leading-5 text-white/45">Only message people who opted in. Free-form text requires an open 24-hour service window. Group messages require Official Business Account eligibility and a group created with the Groups API.</p>}
            {current.title === 'Continue only if' && <p className="mt-3 text-xs leading-5 text-white/45">If the condition matches, later steps run. If it does not, later actions are skipped. Greater than and less than require numeric values.</p>}
            {current.title === 'On website form submission' && <div className="mt-4 space-y-3"><p className="text-xs leading-5 text-white/55">Publish the endpoint, then paste the copied form code into your website. Each submission becomes workflow data such as {'{{name}}'}, {'{{email}}'}, {'{{phone}}'}, and {'{{message}}'}.</p>{current.config.webhookUrl ? <><input readOnly value={current.config.webhookUrl} aria-label="Published website form endpoint" className="w-full rounded border border-white/15 bg-[#1b1b1b] px-3 py-2 text-xs text-white/75" /><textarea readOnly value={websiteFormExample(current.config.webhookUrl)} aria-label="Website form example" rows={8} className="w-full rounded border border-white/15 bg-[#1b1b1b] px-3 py-2 font-mono text-[11px] text-white/75" /><button type="button" onClick={() => void copyWebsiteForm(current.config.webhookUrl)} className="w-full rounded bg-white/10 px-3 py-2 text-sm hover:bg-white/15">Copy form code</button><p className="text-[11px] leading-4 text-white/40">The endpoint contains a secret workflow token. Keep it private. Republish after changing workflow steps.</p></> : <p className="text-xs text-white/40">Publish this trigger to generate its endpoint and form code.</p>}</div>}
            {current.title === 'Schedule task + notify' && <p className="mt-3 text-xs leading-5 text-white/45">Create an approved utility template with body: Your task {'{{1}}'} is scheduled for {'{{2}}'}. The two values are the task title and local date/time.</p>}
            {current.title === 'Open website' && <p className="mt-3 text-xs text-white/45">Enter a full http:// or https:// URL, or use {'{{message}}'} from the trigger data.</p>}
            {current.title === 'Send an email' && (
              <div className="mt-4">
                <label className="block text-xs font-medium text-white/65">Attachments
                  <input type="file" multiple onChange={(event) => { void attachFiles(event.target.files); event.target.value = '' }} className="mt-2 block w-full text-xs text-white/65 file:mr-3 file:rounded file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-white hover:file:bg-white/15" />
                </label>
                <ul className="mt-2 space-y-2">
                  {parseAttachments(current.config.attachments || '[]').map((attachment, index) => (
                    <li key={`${attachment.name}-${index}`} className="flex items-center gap-2 text-xs text-white/75">
                      <span className="min-w-0 flex-1 truncate">{attachment.name}</span>
                      <span className="shrink-0 text-white/40">{(attachment.size / 1024).toFixed(0)} KB</span>
                      <button type="button" aria-label={`Remove ${attachment.name}`} onClick={() => removeAttachment(index)} className="flex size-6 shrink-0 items-center justify-center rounded hover:bg-white/10"><X className="size-3.5" /></button>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] text-white/40">Any file type, up to 1.5 MB total.</p>
              </div>
            )}
            {current.title === 'Run JavaScript' && <p className="mt-3 text-xs text-white/45">This safe step sets one data field. Use <code>{'{{message}}'}</code> to insert earlier data.</p>}
            <button type="button" onClick={() => remove(current.id)} className="mt-6 w-full rounded bg-red-500/15 px-3 py-2 text-sm text-red-200">Remove node</button>
          </div>
        ) : (
          <>
            <div className="p-4"><div className="flex gap-2 rounded border border-violet-500 bg-[#202020] px-3 py-2"><Search className="size-4 text-white/50" /><input value={query} onChange={(event) => setQuery(event.target.value)} autoFocus placeholder="Search nodes..." className="w-full bg-transparent text-sm outline-none" /></div></div>
            <div className="overflow-y-auto px-2 pb-4">{filtered.map((option) => { const Icon = option.icon; return <button key={option.key} type="button" draggable onDragStart={() => setDragged(option)} onDragEnd={() => setDragged(null)} onClick={() => add(option)} className="flex w-full items-start gap-4 rounded-lg border-l-2 border-transparent px-3 py-3 text-left hover:border-orange-400 hover:bg-white/[.06]"><Icon className="mt-1 size-5 text-white/70" /><span><span className="block text-sm font-semibold">{option.title}</span><span className="mt-1 block text-xs text-white/60">{option.description}</span></span><ChevronRight className="ml-auto mt-2 size-4 text-white/50" /></button> })}</div>
          </>
        )}
      </aside>
    )}
    {panel && current?.title === 'On a schedule' && <button type="button" onClick={() => publishSchedule(current)} className="fixed bottom-16 right-6 z-40 w-[330px] rounded-lg bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-xl hover:bg-violet-400">Publish schedule URL</button>}
    {panel && current?.title === 'On website form submission' && <button type="button" onClick={() => publishWebsiteForm(current)} className="fixed bottom-16 right-6 z-40 w-[330px] rounded-lg bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-xl hover:bg-violet-400">Publish website form</button>}
  </div>
}
