import React, { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { Button } from './DesignSystem/components/Button'
import { Modal } from './DesignSystem/components/Modal'
import { AddThirdPartyModal } from './AddThirdPartyModal'
import type { ThirdParty } from '../lib/supabase'
import {
  getThirdParties,
  deleteThirdParty
} from '../lib/database/services/thirdPartyService'

interface ThirdPartyManagerProps {
  workspaceId: string
}

export function ThirdPartyManager({ workspaceId }: ThirdPartyManagerProps) {
  const [thirdParties, setThirdParties] = useState<ThirdParty[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedThirdParty, setSelectedThirdParty] = useState<ThirdParty | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadThirdParties()
  }, [workspaceId])

  const loadThirdParties = async () => {
    setLoading(true)
    try {
      const data = await getThirdParties(workspaceId)
      setThirdParties(data)
    } catch (error) {
      console.error('Error loading third parties:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleThirdPartySuccess = async (thirdParty: ThirdParty) => {
    await loadThirdParties()
    if (showEditModal) {
      setShowEditModal(false)
      setSelectedThirdParty(null)
    } else {
      setShowCreateModal(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedThirdParty) return

    setSaving(true)
    try {
      const success = await deleteThirdParty(selectedThirdParty.id)
      
      if (success) {
        await loadThirdParties()
        setShowDeleteModal(false)
        setSelectedThirdParty(null)
      } else {
        alert('Failed to delete third party')
      }
    } catch (error) {
      console.error('Error deleting third party:', error)
      alert('Failed to delete third party')
    } finally {
      setSaving(false)
    }
  }

  const openEditModal = (thirdParty: ThirdParty) => {
    setSelectedThirdParty(thirdParty)
    setShowEditModal(true)
  }

  const openDeleteModal = (thirdParty: ThirdParty) => {
    setSelectedThirdParty(thirdParty)
    setShowDeleteModal(true)
  }

  const renderLogo = (logo?: string) => {
    if (!logo) return <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">No logo</div>
    
    // If it's SVG content
    if (logo.includes('<svg')) {
      return <div className="w-12 h-12 flex items-center justify-center" dangerouslySetInnerHTML={{ __html: logo }} />
    }
    
    // If it's a base64 image
    return <img src={logo} alt="Logo" className="w-12 h-12 object-contain" />
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-gray-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-500">Loading third parties...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Third Parties</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage third-party integrations and services
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setShowCreateModal(true)
          }}
          className="flex items-center gap-2"
        >
          <Plus size={16} />
          Add Third Party
        </Button>
      </div>

      {thirdParties.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-500 mb-4">No third parties yet</p>
          <Button
            variant="primary"
            onClick={() => {
              setShowCreateModal(true)
            }}
            className="flex items-center gap-2"
          >
            <Plus size={16} />
            Add Your First Third Party
          </Button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Logo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {thirdParties.map((thirdParty) => (
                <tr key={thirdParty.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {renderLogo(thirdParty.logo)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{thirdParty.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(thirdParty)}
                        className="text-blue-600 hover:text-blue-900 p-1"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => openDeleteModal(thirdParty)}
                        className="text-red-600 hover:text-red-900 p-1"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      <AddThirdPartyModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
        }}
        onSuccess={handleThirdPartySuccess}
        workspaceId={workspaceId}
      />

      {/* Edit Modal */}
      <AddThirdPartyModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setSelectedThirdParty(null)
        }}
        onSuccess={handleThirdPartySuccess}
        workspaceId={workspaceId}
        editingThirdParty={selectedThirdParty}
      />

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setSelectedThirdParty(null)
        }}
        title="Delete Third Party"
        size="sm"
        footerContent={
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setShowDeleteModal(false)
                setSelectedThirdParty(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={saving}
            >
              {saving ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        }
      >
        <div className="p-6">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete <strong>{selectedThirdParty?.name}</strong>? This action cannot be undone.
          </p>
        </div>
      </Modal>
    </div>
  )
}

