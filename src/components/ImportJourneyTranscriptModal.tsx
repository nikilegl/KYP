import React from 'react'
import { Sparkles } from 'lucide-react'
import { Modal } from './DesignSystem/components/Modal'
import { Button } from './DesignSystem/components/Button'

interface ImportJourneyTranscriptModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: () => void
  transcriptText: string
  onTranscriptTextChange: (text: string) => void
  error: string | null
  onErrorChange: (error: string | null) => void
  loading: boolean
  progressMessage: string
  layout: 'vertical' | 'horizontal'
  onLayoutChange: (layout: 'vertical' | 'horizontal') => void
  hasExistingNodes: boolean
  currentJourneyLayout?: 'vertical' | 'horizontal'
}

export function ImportJourneyTranscriptModal({
  isOpen,
  onClose,
  onImport,
  transcriptText,
  onTranscriptTextChange,
  error,
  onErrorChange,
  loading,
  progressMessage,
  layout,
  onLayoutChange,
  hasExistingNodes,
  currentJourneyLayout = 'vertical'
}: ImportJourneyTranscriptModalProps) {
  const handleClose = () => {
    onTranscriptTextChange('')
    onErrorChange(null)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import Journey from Transcript"
      size="lg"
      closeOnOverlayClick={false}
      footerContent={
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={onImport}
            disabled={!transcriptText.trim() || loading}
          >
            {loading ? (
              <>
                <Sparkles size={16} className="animate-pulse mr-2" />
                Converting...
              </>
            ) : (
              <>
                <Sparkles size={16} className="mr-2" />
                Import
              </>
            )}
          </Button>
        </div>
      }
    >
      <div className="p-6 space-y-4">
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800 font-medium mb-1">
            <Sparkles size={14} className="inline mr-1" />
            Paste a transcript or a description of a process
          </p>
        </div>

        {/* Layout Selector - only show when creating new journey */}
        {!hasExistingNodes ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Journey Layout
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onLayoutChange('vertical')}
                className={`
                  flex-1 px-4 py-2 rounded-lg border-2 transition-all
                  ${layout === 'vertical'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }
                `}
                disabled={loading}
              >
                <div className="text-center">
                  <div className="font-medium">Vertical</div>
                  <div className="text-xs mt-1">Top to bottom flow</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => onLayoutChange('horizontal')}
                className={`
                  flex-1 px-4 py-2 rounded-lg border-2 transition-all
                  ${layout === 'horizontal'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }
                `}
                disabled={loading}
              >
                <div className="text-center">
                  <div className="font-medium">Horizontal</div>
                  <div className="text-xs mt-1">Left to right flow</div>
                </div>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Adding to existing journey:</strong> New nodes will use the current <strong>{currentJourneyLayout}</strong> layout to match your existing diagram.
            </p>
          </div>
        )}
        
        <div>
          <textarea
            value={transcriptText}
            onChange={(e) => {
              onTranscriptTextChange(e.target.value)
              onErrorChange(null)
            }}
            placeholder='Paste your transcript here, e.g.:

"The client called to discuss their new property purchase. They mentioned they need to complete ID verification and provide proof of funds. The lawyer explained they would need to upload bank statements from the last 3 months..."'
            className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            disabled={loading}
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {loading && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700 flex items-center gap-2">
              <Sparkles size={14} className="animate-pulse mr-2" />
              {progressMessage || 'Starting AI processing...'}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Keep this tab open. Up to 15 minutes for complex transcripts.
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}

