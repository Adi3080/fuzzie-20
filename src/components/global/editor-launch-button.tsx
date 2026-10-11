'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Workflow, X } from 'lucide-react'

export default function EditorLaunchButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [projectName, setProjectName] = useState('')

  const openEditor = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = projectName.trim()
    if (!name) return
    router.push(`/workflows?name=${encodeURIComponent(name)}`)
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="rounded-full border border-white/15 px-4 py-2 text-sm text-white transition hover:bg-white/10">Open editor</button>
      {open && <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"><form onSubmit={openEditor} className="w-full max-w-md rounded-2xl border border-white/15 bg-[#202020] p-6 text-white shadow-2xl"><div className="flex items-start justify-between"><div><span className="flex size-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300"><Workflow className="size-5" /></span><h2 className="mt-4 text-2xl font-semibold">Name your workflow</h2><p className="mt-2 text-sm text-white/55">Start with a clear name. You can change it later in the editor.</p></div><button type="button" onClick={() => setOpen(false)} aria-label="Close project name form" className="text-white/50 hover:text-white"><X className="size-5" /></button></div><label className="mt-6 block text-sm font-medium text-white/75" htmlFor="project-name">Project name</label><input id="project-name" autoFocus value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="e.g. Lead follow-up" className="mt-2 h-11 w-full rounded-xl border border-white/15 bg-black/20 px-3 text-sm outline-none transition focus:border-violet-400" /><button type="submit" disabled={!projectName.trim()} className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white font-semibold text-black transition hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-40">Open workflow <ArrowRight className="size-4" /></button></form></div>}
    </>
  )
}