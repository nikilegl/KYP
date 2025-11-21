import React, { useState, useRef } from 'react'
import { Upload, Check } from 'lucide-react'
import { Button } from './DesignSystem/components/Button'
import { Modal } from './DesignSystem/components/Modal'
import { createThirdParty } from '../lib/database/services/thirdPartyService'
import type { ThirdParty } from '../lib/supabase'

interface AddThirdPartyModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (thirdParty: ThirdParty) => void
  workspaceId: string
  initialName?: string
}

export function AddThirdPartyModal({
  isOpen,
  onClose,
  onSuccess,
  workspaceId,
  initialName = ''
}: AddThirdPartyModalProps) {
  const [formData, setFormData] = useState({ name: initialName, logo: '' })
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reset form when modal opens/closes or initialName changes
  React.useEffect(() => {
    if (isOpen) {
      setFormData({ name: initialName, logo: '' })
    }
  }, [isOpen, initialName])

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type (SVG preferred, but allow images)
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      alert('File size must be less than 2MB')
      return
    }

    setUploadingLogo(true)

    try {
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        
        // If it's an SVG, store as text, otherwise as base64
        if (file.type === 'image/svg+xml') {
          // Read as text for SVG
          const textReader = new FileReader()
          textReader.onload = (evt) => {
            const svgText = evt.target?.result as string
            setFormData(prev => ({ ...prev, logo: svgText }))
            setUploadingLogo(false)
          }
          textReader.readAsText(file)
        } else {
          setFormData(prev => ({ ...prev, logo: result }))
          setUploadingLogo(false)
        }
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Error uploading logo:', error)
      setUploadingLogo(false)
      alert('Failed to upload logo')
    }
  }

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      alert('Please enter a name')
      return
    }

    setSaving(true)
    try {
      const result = await createThirdParty(workspaceId, {
        name: formData.name.trim(),
        logo: formData.logo || undefined
      })
      
      if (result) {
        onSuccess(result)
        setFormData({ name: '', logo: '' })
        onClose()
      } else {
        alert('Failed to create third party')
      }
    } catch (error) {
      console.error('Error creating third party:', error)
      alert('Failed to create third party')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setFormData({ name: '', logo: '' })
    onClose()
  }

  const renderLogo = (logo: string) => {
    if (!logo) {
      return (
        <div className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
          <span className="text-xs text-gray-400">No logo</span>
        </div>
      )
    }

    if (logo.startsWith('<svg') || logo.startsWith('<?xml')) {
      // SVG content
      return (
        <div 
          className="w-16 h-16 border border-gray-300 rounded-lg flex items-center justify-center bg-white p-2"
          dangerouslySetInnerHTML={{ __html: logo }}
        />
      )
    }

    // Base64 image
    return (
      <img 
        src={logo} 
        alt="Logo" 
        className="w-16 h-16 object-contain border border-gray-300 rounded-lg bg-white p-2"
      />
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title="Add Third Party"
      size="md"
      footerContent={
        <div className="flex items-center justify-end gap-3">
          <Button
            variant="ghost"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCreate}
            disabled={saving || !formData.name.trim()}
          >
            {saving ? 'Creating...' : 'Create'}
          </Button>
        </div>
      }
    >
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Stripe, Auth0, Mailchimp"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Logo
          </label>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              {renderLogo(formData.logo)}
            </div>
            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingLogo}
                className="flex items-center gap-2"
              >
                <Upload size={16} />
                {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
              </Button>
              <p className="mt-1 text-xs text-gray-500">
                SVG, PNG, or JPG. Max 2MB.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

