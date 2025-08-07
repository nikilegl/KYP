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
            'bold', 'italic', 'underline', '|',
            'blockQuote', '|',
            'bulletedList', 'numberedList', '|',
            'link', 'uploadImage', 'insertTable', '|',
            'highlight', '|',
            'undo', 'redo'
          ],
          link: {
            addTargetToExternalLinks: true
          },
          highlight: {
            options: [
              {
                model: 'yellowMarker',
                class: 'marker-yellow',
                title: 'Yellow marker',
                color: 'var(--ck-highlight-marker-yellow)',
                type: 'marker'
              }
            ]
          }
        }}
        onChange={(event, editor) => {
          const data = editor.getData()
          onChange(data)
        }}
      />
      <style jsx global>{`
        .ckeditor-wrapper .ck-editor {
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          overflow: hidden;
        }
        
        .ckeditor-wrapper .ck-editor__top {
          border-bottom: 1px solid #e5e7eb;
        }
        
        .ckeditor-wrapper .ck-toolbar {
          background: #f9fafb;
          border: none;
          padding: 0.5rem;
        }
        
        .ckeditor-wrapper .ck-content {
          min-height: 200px;
          padding: 1rem;
          border: none;
          font-family: inherit;
          font-size: 0.875rem;
          line-height: 1.5;
        }
        
        .ckeditor-wrapper .ck-content:focus {
          outline: none;
          box-shadow: none;
        }
        
        .ckeditor-wrapper .ck-content ul,
        .ckeditor-wrapper .ck-content ol {
          margin: 1em 0;
          padding-left: 2em;
        }
        
        .ckeditor-wrapper .ck-content li {
          margin: 0.25em 0;
        }
        
        .ckeditor-wrapper .ck-content a {
          color: #3b82f6;
          text-decoration: underline;
        }
        
        .ckeditor-wrapper .ck-content h1,
        .ckeditor-wrapper .ck-content h2,
        .ckeditor-wrapper .ck-content h3 {
          font-weight: bold;
          margin: 1em 0 0.5em 0;
        }
        
        .ckeditor-wrapper .ck-content h1 {
          font-size: 24px;
        }
        
        .ckeditor-wrapper .ck-content h2 {
          font-size: 20px;
        }
        
        .ckeditor-wrapper .ck-content h3 {
          font-size: 16px;
        }
        
        .ckeditor-wrapper .ck-content .marker-yellow {
          background-color: #fef08a;
        }
        
        .ckeditor-wrapper .ck-button {
          border-radius: 0.25rem;
        }
        
        .ckeditor-wrapper .ck-button:hover {
          background-color: #e5e7eb;
        }
        
        .ckeditor-wrapper .ck-button.ck-on {
          background-color: #dbeafe;
          color: #1d4ed8;
        }
      `}</style>
    </div>
  )
}