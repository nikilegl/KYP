import React, { useState, useCallback } from 'react'
import { Upload, Image as ImageIcon, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { Modal } from './DesignSystem/components/Modal'
import { Button } from './DesignSystem/components/Button'
import { analyzeJourneyImage, type AnalyzedJourney } from '../lib/services/aiImageAnalysisService'

interface ImportJourneyImageModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (journey: AnalyzedJourney) => void
}

// Get API key from environment variables
const DEFAULT_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || ''

export function ImportJourneyImageModal({ isOpen, onClose, onImport }: ImportJourneyImageModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [apiKey] = useState(DEFAULT_API_KEY)

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

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

  const handleAnalyze = useCallback(async () => {
    if (!selectedFile) return

    setAnalyzing(true)
    setError(null)

    try {
      const result = await analyzeJourneyImage(selectedFile, apiKey)
      
      // Pass the result to parent component
      onImport(result)
      
      // Reset and close
      handleClose()
    } catch (err) {
      console.error('Analysis error:', err)
      setError(err instanceof Error ? err.message : 'Failed to analyze image')
    } finally {
      setAnalyzing(false)
    }
  }, [selectedFile, apiKey, onImport])

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
                Analyzing...
              </>
            ) : (
              'Import Journey'
            )}
          </Button>
        </div>
      }
    >
      <div className="p-6 space-y-4">
        {/* File Upload Area */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Journey Diagram
          </label>
          <div
            className={`
              border-2 border-dashed rounded-lg p-6 text-center
              ${selectedFile ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-gray-400'}
              transition-colors cursor-pointer
            `}
            onClick={() => document.getElementById('image-upload')?.click()}
          >
            <input
              id="image-upload"
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {selectedFile ? (
              <div className="space-y-2">
                <CheckCircle size={48} className="mx-auto text-green-600" />
                <p className="text-sm font-medium text-green-900">{selectedFile.name}</p>
                <p className="text-xs text-green-600">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedFile(null)
                    setPreviewUrl(null)
                  }}
                  className="text-sm text-green-700 hover:text-green-900 underline"
                >
                  Change file
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload size={48} className="mx-auto text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    PNG or JPEG (MAX. 20MB)
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

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

        {/* Instructions */}
        {!selectedFile && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
              <ImageIcon size={16} />
              Tips for best results
            </h4>
            <ul className="text-sm text-gray-600 space-y-1 ml-6 list-disc">
              <li>Use a clear, high-resolution image</li>
              <li>Ensure text in nodes is readable</li>
              <li>Arrows/connections should be clearly visible</li>
              <li>Include any role or platform labels</li>
              <li>PNG or JPEG format works best</li>
            </ul>
          </div>
        )}
      </div>
    </Modal>
  )
}

