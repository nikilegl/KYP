import React from 'react'
import { CKEditor } from '@ckeditor/ckeditor5-react'
import ClassicEditor from '@ckeditor/ckeditor5-build-classic'

// Custom upload adapter for base64 image handling
class Base64UploadAdapter {
  constructor(loader: any) {
    this.loader = loader
  }

  upload() {
    return this.loader.file.then((file: File) => new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = () => {
        resolve({
          default: reader.result
        })
      }
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'))
      }
      
      reader.readAsDataURL(file)
    }))
  }

  abort() {
    // Handle abort if needed
  }
}

// Plugin to register the upload adapter
function Base64UploadAdapterPlugin(editor: any) {
  editor.plugins.get('FileRepository').createUploadAdapter = (loader: any) => {
    return new Base64UploadAdapter(loader)
  }
}

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
          },
          extraPlugins: [Base64UploadAdapterPlugin],
          image: {
            toolbar: [
              'imageStyle:inline',
              'imageStyle:block',
              'imageStyle:side',
              '|',
              'toggleImageCaption',
              'imageTextAlternative'
            ],
            styles: [
              'full',
              'side',
              'alignLeft',
              'alignCenter',
              'alignRight'
            ]
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