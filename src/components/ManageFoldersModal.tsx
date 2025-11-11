import { useState, useEffect } from 'react'
import { Modal } from './DesignSystem/components/Modal'
import { Button } from './DesignSystem/components/Button'
import { Plus, Edit, Trash2, X } from 'lucide-react'
import { LoadingState } from './DesignSystem/components/LoadingSpinner'
import {
  getUserJourneyFolders,
  createUserJourneyFolder,
  updateUserJourneyFolder,
  deleteUserJourneyFolder,
  type UserJourneyFolder
} from '../lib/database/services/userJourneyFolderService'

interface ManageFoldersModalProps {
  isOpen: boolean
  onClose: () => void
  onFoldersChanged: () => void // Callback to refresh folders in parent
}

const DEFAULT_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
]

export function ManageFoldersModal({ isOpen, onClose, onFoldersChanged }: ManageFoldersModalProps) {
  const [folders, setFolders] = useState<UserJourneyFolder[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingFolder, setEditingFolder] = useState<UserJourneyFolder | null>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderColor, setNewFolderColor] = useState(DEFAULT_COLORS[0])
  const [saving, setSaving] = useState(false)
  const [folderToDelete, setFolderToDelete] = useState<UserJourneyFolder | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadFolders()
    }
  }, [isOpen])

  const loadFolders = async () => {
    setLoading(true)
    try {
      const data = await getUserJourneyFolders()
      setFolders(data)
    } catch (error) {
      console.error('Error loading folders:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddFolder = async () => {
    if (!newFolderName.trim()) return

    setSaving(true)
    try {
      await createUserJourneyFolder(newFolderName.trim(), newFolderColor)
      await loadFolders()
      onFoldersChanged()
      setNewFolderName('')
      setNewFolderColor(DEFAULT_COLORS[0])
      setShowAddForm(false)
    } catch (error) {
      console.error('Error creating folder:', error)
      alert('Failed to create folder. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleEditFolder = async () => {
    if (!editingFolder || !newFolderName.trim()) return

    setSaving(true)
    try {
      await updateUserJourneyFolder(editingFolder.id, {
        name: newFolderName.trim(),
        color: newFolderColor
      })
      await loadFolders()
      onFoldersChanged()
      setEditingFolder(null)
      setNewFolderName('')
      setNewFolderColor(DEFAULT_COLORS[0])
    } catch (error) {
      console.error('Error updating folder:', error)
      alert('Failed to update folder. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteClick = (folder: UserJourneyFolder) => {
    setFolderToDelete(folder)
    setShowDeleteConfirm(true)
  }

  const handleDeleteConfirm = async () => {
    if (!folderToDelete) return

    setSaving(true)
    try {
      await deleteUserJourneyFolder(folderToDelete.id)
      await loadFolders()
      onFoldersChanged()
      setShowDeleteConfirm(false)
      setFolderToDelete(null)
    } catch (error) {
      console.error('Error deleting folder:', error)
      alert('Failed to delete folder. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (folder: UserJourneyFolder) => {
    setEditingFolder(folder)
    setNewFolderName(folder.name)
    setNewFolderColor(folder.color)
    setShowAddForm(false)
  }

  const cancelEdit = () => {
    setEditingFolder(null)
    setNewFolderName('')
    setNewFolderColor(DEFAULT_COLORS[0])
  }

  const startAdd = () => {
    setShowAddForm(true)
    setEditingFolder(null)
    setNewFolderName('')
    setNewFolderColor(DEFAULT_COLORS[0])
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Manage Folders"
        size="md"
        footerContent={
          <div className="flex items-center justify-end">
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        }
      >
        <div className="p-6">
          {loading ? (
            <LoadingState message="Loading folders..." />
          ) : (
            <div className="space-y-4">
              {/* Add New Folder Button */}
              {!showAddForm && !editingFolder && (
                <Button
                  variant="outline"
                  onClick={startAdd}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Plus size={20} />
                  Add New Folder
                </Button>
              )}

              {/* Add/Edit Form */}
              {(showAddForm || editingFolder) && (
                <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">
                      {editingFolder ? 'Edit Folder' : 'New Folder'}
                    </h3>
                    <button
                      onClick={() => {
                        setShowAddForm(false)
                        cancelEdit()
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Folder Name
                    </label>
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="Enter folder name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Color
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {DEFAULT_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewFolderColor(color)}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${
                            newFolderColor === color
                              ? 'border-gray-900 scale-110'
                              : 'border-gray-200 hover:border-gray-400'
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="primary"
                      onClick={editingFolder ? handleEditFolder : handleAddFolder}
                      disabled={!newFolderName.trim() || saving}
                      loading={saving}
                      className="flex-1"
                    >
                      {editingFolder ? 'Save Changes' : 'Add Folder'}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setShowAddForm(false)
                        cancelEdit()
                      }}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Folders List */}
              {folders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No folders yet. Create your first folder to organize user journeys.
                </div>
              ) : (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Existing Folders</h3>
                  {folders.map((folder) => (
                    <div
                      key={folder.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: folder.color }}
                        />
                        <span className="text-gray-900">{folder.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEdit(folder)}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit folder"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(folder)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete folder"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Folder"
        size="sm"
        footerContent={
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteConfirm}
              loading={saving}
            >
              Delete
            </Button>
          </div>
        }
      >
        <div className="p-6">
          <p className="text-gray-700">
            Are you sure you want to delete the folder "<strong>{folderToDelete?.name}</strong>"?
          </p>
          <p className="text-sm text-gray-500 mt-2">
            User journeys in this folder will not be deleted, but they will be removed from the folder.
          </p>
        </div>
      </Modal>
    </>
  )
}

