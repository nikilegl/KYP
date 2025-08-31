import React from 'react'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import '@blocknote/mantine/style.css'

export interface BlockNoteEditorProps {
  initialContent?: any
  editable?: boolean
  onChange?: (content: any) => void
  className?: string
  placeholder?: string
}

export function BlockNoteEditor({
  initialContent,
  editable = true,
  onChange,
  className = '',
  placeholder = 'Start writing...'
}: BlockNoteEditorProps) {
  const editor = useCreateBlockNote({
    initialContent
  })

  const uiSansStack = 'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji"'

  return (
    <div
      className={`font-sans ${className}`}
      style={{
        ['--bn-font-family' as any]: uiSansStack,
        fontFamily: uiSansStack
      }}
    >
      <BlockNoteView editor={editor} theme={{ fontFamily: uiSansStack }} />
    </div>
  )
}

export default BlockNoteEditor
