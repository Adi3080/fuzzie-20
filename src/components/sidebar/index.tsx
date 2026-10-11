'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import clsx from 'clsx'
import { menuOptions } from '@/lib/constant'
import { Separator } from '@/components/ui/separator'
import { ModeToggle } from '../global/mode-toggle'
import { Database, GitBranch, LucideMousePointerClick } from 'lucide-react'

type Props = {}

const Sidebar = (props: Props) => {
  const pathName = usePathname()

  return (
    <nav 
      className="h-screen overflow-scroll justify-between flex items-center flex-col gap-10 py-6 px-2 bg-white dark:bg-black"
    >
      <div className="flex items-center justify-center flex-col gap-8">
        <Link
          className="flex font-bold flex-row dark:text-white"
          href="/"
        >
          fuzzie.
        </Link>
        <TooltipProvider>
          {menuOptions.map((menuItem) => (
            <ul key={menuItem.name}>
              <Tooltip delayDuration={0}>
                <li>
                  <TooltipTrigger asChild>
                    <Link
                      href={menuItem.href}
                      className={clsx(
                        'group h-8 w-8 flex items-center justify-center  scale-[1.5] rounded-lg p-[3px]  cursor-pointer',
                        {
                          'dark:bg-[#2F006B] bg-[#EEE0FF] ':
                            pathName === menuItem.href,
                        }
                      )}
                    >
                      <menuItem.Component
                        selected={pathName === menuItem.href}
                      />
                    </Link>
                  </TooltipTrigger>
                </li>
                <TooltipContent
                  side="right"
                  className="bg-black/10 backdrop-blur-xl"
                >
                  <p>{menuItem.name}</p>
                </TooltipContent>
              </Tooltip>
            </ul>
          ))}
        </TooltipProvider>
        <Separator />
        <div className="flex items-center flex-col gap-9 bg-gray-100 dark:bg-[#353346]/30 py-4 px-2 rounded-full h-56 overflow-scroll border-[1px] border-gray-300 dark:border-[#353346]">
          <div className="relative bg-gray-200 dark:bg-[#353346]/70 p-2 rounded-full border-t-[2px] dark:border-t-[2px] border-[1px] border-gray-400 dark:border-t-[#353346]">
            <LucideMousePointerClick
              className="text-gray-700 dark:text-white"
              size={18}
            />
            <div className="border-l-2 border-gray-400 dark:border-muted-foreground/50 h-6 absolute left-1/2 transform translate-x-[-50%] -bottom-[30px]" />
          </div>
          <div className="relative bg-gray-200 dark:bg-[#353346]/70 p-2 rounded-full border-t-[2px] dark:border-t-[2px] border-[1px] border-gray-400 dark:border-t-[#353346]">
            <GitBranch
              className="text-gray-600 dark:text-muted-foreground"
              size={18}
            />
            <div className="border-l-2 border-gray-400 dark:border-muted-foreground/50 h-6 absolute left-1/2 transform translate-x-[-50%] -bottom-[30px]"></div>
          </div>
          <div className="relative bg-gray-200 dark:bg-[#353346]/70 p-2 rounded-full border-t-[2px] dark:border-t-[2px] border-[1px] border-gray-400 dark:border-t-[#353346]">
            <Database
              className="text-gray-600 dark:text-muted-foreground"
              size={18}
            />
            <div className="border-l-2 border-gray-400 dark:border-muted-foreground/50 h-6 absolute left-1/2 transform translate-x-[-50%] -bottom-[30px]"></div>
          </div>
          <div className="relative bg-gray-200 dark:bg-[#353346]/70 p-2 rounded-full border-t-[2px] dark:border-t-[2px] border-[1px] border-gray-400 dark:border-t-[#353346]">
            <GitBranch
              className="text-gray-600 dark:text-muted-foreground"
              size={18}
            />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center flex-col gap-8">
        <ModeToggle />
      </div>
    </nav>
  )
}

export default Sidebar