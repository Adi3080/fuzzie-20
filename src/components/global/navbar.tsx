import Image from 'next/image'
import Link from 'next/link'
import React from 'react'
import { LayoutDashboard, MenuIcon } from 'lucide-react'
import { currentUser } from '@clerk/nextjs/server'
import { UserButton } from '@clerk/nextjs'
import EditorLaunchButton from './editor-launch-button'

type Props = {}

const Navbar = async (props: Props) => {
  const user = await currentUser()
  return (
    <header className="fixed right-0 left-0 top-0 py-4 px-4 bg-black/40 backdrop-blur-lg z-[100] flex items-center border-b-[1px] border-neutral-900 justify-between">
      <aside className="flex items-center gap-3">
        <p className="text-3xl font-bold">Fu</p>
        <Image
          src="/fuzzieLogo.png"
          width={15}
          height={15}
          alt="fuzzie logo"
          className="shadow-sm"
        />
        <p className="text-3xl font-bold">zie</p>
        <Link
          href="/dashboard"
          aria-label="Open dashboard"
          className="ml-3 flex items-center gap-1.5 rounded-full border border-violet-300/30 bg-gradient-to-r from-violet-500/25 to-indigo-500/25 px-2 py-2 text-sm font-medium text-white shadow-lg shadow-violet-950/30 transition hover:-translate-y-0.5 hover:border-violet-200/60 hover:from-violet-500/40 hover:to-indigo-500/40 sm:px-3"
        >
          <LayoutDashboard className="size-4" />
          <span className="hidden sm:inline">Dashboard</span>
        </Link>
      </aside>
      <nav className="absolute left-[50%] top-[50%] transform translate-x-[-50%] translate-y-[-50%] hidden md:block">
        <ul className="flex items-center gap-4 list-none">
          <li>
            <Link href="#">Products</Link>
          </li>
          <li>
            <Link href="#">Pricing</Link>
          </li>
          <li>
            <Link href="#">Clients</Link>
          </li>
          <li>
            <Link href="#">Resources</Link>
          </li>
          <li>
            <Link href="#">Documentation</Link>
          </li>
          <li>
            <Link href="#">Enterprise</Link>
          </li>
        </ul>
      </nav>
      <aside className="flex items-center gap-4">
        {user ? (
          <>
            <EditorLaunchButton />
            <UserButton />
          </>
        ) : (
          <div className="flex items-center gap-2 text-sm">
            <Link href="/sign-in" className="rounded-full px-3 py-2 text-white/75 transition hover:bg-white/10 hover:text-white">Sign in</Link>
            <Link href="/sign-up" className="rounded-full bg-white px-4 py-2 font-medium text-black transition hover:bg-white/80">Sign up</Link>
          </div>
        )}
        {/* <UserButton/> */}
        <MenuIcon className="md:hidden" />
      </aside>
    </header>
  )
}

export default Navbar