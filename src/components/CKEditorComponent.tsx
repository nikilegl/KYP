import React from 'react'
import { CKEditor } from '@ckeditor/ckeditor5-react'
import ClassicEditor from '@ckeditor/ckeditor5-build-classic'

interface CKEditorComponentProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export function CKEditorComponent({ 
  value, 
  onChange, 
  placeholder = "Start typing...",
  disabled = false 
}: CKEditorComponentProps) {
  return (
    <div className="ckeditor-wrapper">
      <CKEditor
        editor={ClassicEditor}
        data={value || ''}
        disabled={disabled}
        config={{
          placeholder,
          toolbar: [
            'heading', '|',
            'bold', 'italic', '|',
            'blockQuote', '|',
            'bulletedList', 'numberedList', '|',
            'link', 'uploadImage', 'insertTable', '|',
            'undo', 'redo'
          ],
          link: {
            addTargetToExternalLinks: true
          }
        }}
        onChange={(event, editor) => {
          const data = editor.getData()
          onChange(data)
        }}
      />
    </div>
  )
}