import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowUpRight,
  CircleUserRound,
  Mail,
  Plus,
  Sparkles,
} from 'lucide-react'
import { currentUser } from '@clerk/nextjs/server'
import { Button } from '@/components/ui/button'
import DashboardWorkspace from '@/components/global/dashboard-workspace'

const DashboardPage = async () => {
  const user = await currentUser()
  const displayName = user?.firstName || user?.username || 'there'
  const nameSeed = user?.id
    ? [...user.id].reduce((total, character) => total + character.charCodeAt(0), 0)
    : 1
  const workflowName = `Inbox Rescue ${1000 + (nameSeed % 9000)}`
  const email = user?.emailAddresses[0]?.emailAddress
  const joinedDate = user?.createdAt
    ? new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(
        user.createdAt
      )
    : 'Not available'

  return (
    <div className="relative flex min-h-full flex-col gap-8 p-6 md:p-8">
      <div className="flex flex-col justify-between gap-5 border-b pb-8 md:flex-row md:items-end">
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-medium text-violet-500">
            <Sparkles className="size-4" /> Your workspace
          </p>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Good to see you, {displayName}.
          </h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            This is your real account overview. Your automation stats will appear here once you create a workflow.
          </p>
        </div>
        <Button asChild size="lg" className="gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20 hover:from-violet-500 hover:to-indigo-500">
          <Link href={`/workflows?name=${encodeURIComponent(workflowName)}`}>
            <Plus className="size-4" /> New workflow
          </Link>
        </Button>
      </div>

      <section className="grid gap-4 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-4">
            {user?.imageUrl ? (
              <Image
                src={user.imageUrl}
                alt=""
                width={52}
                height={52}
                className="rounded-full"
              />
            ) : (
              <div className="rounded-full bg-violet-500/10 p-3 text-violet-500">
                <CircleUserRound className="size-7" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold">{user?.fullName || displayName}</p>
              <p className="truncate text-sm text-muted-foreground">{email || 'No email available'}</p>
            </div>
          </div>
          <Link href="/settings" className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-violet-500 hover:underline">
            Manage profile <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <Mail className="mb-6 size-5 text-sky-500" />
          <p className="text-sm text-muted-foreground">Account email</p>
          <p className="mt-1 truncate font-medium">{email || 'Not available'}</p>
        </div>
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <Sparkles className="mb-6 size-5 text-amber-500" />
          <p className="text-sm text-muted-foreground">Member since</p>
          <p className="mt-1 font-medium">{joinedDate}</p>
        </div>
      </section>

      <DashboardWorkspace />
    </div>
  )
}

export default DashboardPage