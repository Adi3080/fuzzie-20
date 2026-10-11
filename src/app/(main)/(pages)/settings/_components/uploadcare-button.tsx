'use client'

import React, { useEffect, useRef } from 'react'
import * as LR from '@uploadcare/blocks'
import { useRouter } from 'next/navigation'

type Props = {
  onUpload: (url: string) => any
}

LR.registerBlocks(LR)

const UploadCareButton = ({ onUpload }: Props) => {
  const router = useRouter()

  const ctxProviderRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const provider = ctxProviderRef.current

    if (!provider) {
      return
    }

    const handleUpload = async (event: Event) => {
      const customEvent = event as CustomEvent<{
        cdnUrl: string
      }>

      const cdnUrl = customEvent.detail?.cdnUrl

      if (!cdnUrl) {
        return
      }

      const file = await onUpload(cdnUrl)

      if (file) {
        router.refresh()
      }
    }

    provider.addEventListener('file-upload-success', handleUpload)

    return () => {
      provider.removeEventListener('file-upload-success', handleUpload)
    }
  }, [onUpload, router])

  return (
    <div>
      {React.createElement('lr-config', {
        'ctx-name': 'my-uploader',
        pubkey: 'a9428ff5ff90ae7a64eb',
      })}

      {React.createElement('lr-file-uploader-regular', {
        'ctx-name': 'my-uploader',
        'css-src':
          'https://cdn.jsdelivr.net/npm/@uploadcare/blocks@0.35.2/web/lr-file-uploader-regular.min.css',
      })}

      {React.createElement('lr-upload-ctx-provider', {
        'ctx-name': 'my-uploader',
        ref: ctxProviderRef,
      })}
    </div>
  )
}

export default UploadCareButton