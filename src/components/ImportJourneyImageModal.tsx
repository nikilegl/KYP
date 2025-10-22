import React, { useState, useCallback, useEffect } from 'react'
import { Upload, Loader2, AlertCircle, Image as ImageIcon } from 'lucide-react'
import { Modal } from './DesignSystem/components/Modal'
import { Button } from './DesignSystem/components/Button'
import { analyzeJourneyImageWithBackground, type AnalyzedJourney } from '../lib/services/aiImageAnalysisService'

interface ImportJourneyImageModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (journey: AnalyzedJourney) => void
  userRoles?: string[]
  currentJourneyLayout?: 'vertical' | 'horizontal'
  hasExistingNodes?: boolean
}

export function ImportJourneyImageModal({ 
  isOpen, 
  onClose, 
  onImport, 
  userRoles = [], 
  currentJourneyLayout = 'vertical',
  hasExistingNodes = false 
}: ImportJourneyImageModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progressMessage, setProgressMessage] = useState<string>('')

  const processFile = useCallback((file: File) => {
    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg']
    if (!validTypes.includes(file.type)) {
      setError('Please select a PNG or JPEG image')
      return
    }

    // Validate file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      setError('File size must be less than 20MB')
      return
    }

    setSelectedFile(file)
    setError(null)

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }, [])

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    processFile(file)
  }, [processFile])

  // Add paste event listener when modal is open and no file is selected
  useEffect(() => {
    if (!isOpen || selectedFile) return

    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items
      if (!items) return

      // Look for image in clipboard
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile()
          if (blob) {
            event.preventDefault()
            processFile(blob)
          }
          break
        }
      }
    }

    document.addEventListener('paste', handlePaste)
    return () => {
      document.removeEventListener('paste', handlePaste)
    }
  }, [isOpen, selectedFile, processFile])

  const handleAnalyze = useCallback(async () => {
    if (!selectedFile) return

    setAnalyzing(true)
    setError(null)
    setProgressMessage('Starting AI processing...')

    try {
      const result = await analyzeJourneyImageWithBackground(
        selectedFile, 
        '', // API key handled server-side
        userRoles,
        (message, elapsed) => {
          // Update progress message with elapsed time
          setProgressMessage(`${message} (${elapsed}s)`)
        }
      )
      
      // Pass the result to parent component
      onImport(result)
      
      // Reset and close
      handleClose()
    } catch (err) {
      console.error('Analysis error:', err)
      setError(err instanceof Error ? err.message : 'Failed to analyze image')
    } finally {
      setAnalyzing(false)
      setProgressMessage('')
    }
  }, [selectedFile, userRoles, onImport])

  const handleClose = useCallback(() => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setError(null)
    setAnalyzing(false)
    onClose()
  }, [onClose])

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import Journey from Image"
      size="lg"
      footerContent={
        <div className="flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={handleClose} disabled={analyzing}>
            Cancel
          </Button>
          <Button
            onClick={handleAnalyze}
            disabled={!selectedFile || analyzing}
          >
            {analyzing ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                {progressMessage || 'Analyzing...'}
              </>
            ) : (
              'Import Journey'
            )}
          </Button>
        </div>
      }
    >
      <div className="p-6 space-y-4">
        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-800">
            <strong>Processing time:</strong> Simple diagrams: 15-30s. Complex diagrams: 1-2 mins.
          </p>
          <p className="text-xs text-blue-700 mt-1">
            ⚡ Using background processing (up to 15 minutes for very complex diagrams). Keep this tab open.
          </p>
        </div>

        {/* Existing Journey Message */}
        {hasExistingNodes && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Adding to existing journey:</strong> New nodes will use the current <strong>{currentJourneyLayout}</strong> layout to match your existing diagram.
            </p>
          </div>
        )}

        {/* Paste Area */}
        {!selectedFile ? (
          <div>
            <div className="border-2 border-dashed border-blue-300 bg-blue-50 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
              <ImageIcon size={48} className="mx-auto text-blue-500 mb-3" />
              <p className="text-base font-medium text-gray-900 mb-2">
                Paste your diagram here
              </p>
              
              <input
                id="image-upload"
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="ghost"
                onClick={() => document.getElementById('image-upload')?.click()}
                icon={Upload}
                size="small"
              >
                Or upload image file
              </Button>
              <p className="text-xs text-gray-500 mt-3">
                PNG or JPEG
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-900">{selectedFile.name}</p>
              <p className="text-xs text-green-600 mt-1">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <Button
                variant="ghost"
                size="small"
                onClick={() => {
                  setSelectedFile(null)
                  setPreviewUrl(null)
                }}
                className="mt-2"
              >
                Change Image
              </Button>
            </div>
          </div>
        )}

        {/* Preview */}
        {previewUrl && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preview
            </label>
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <img
                src={previewUrl}
                alt="Journey diagram preview"
                className="max-w-full max-h-96 mx-auto rounded"
              />
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-2">
            <AlertCircle size={20} className="text-red-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-red-900 mb-1">Error</h4>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

       
      </div>
    </Modal>
  )
}

