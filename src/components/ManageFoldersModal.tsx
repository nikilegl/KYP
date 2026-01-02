import { useState, useEffect } from 'react'
import { Modal } from './DesignSystem/components/Modal'
import { Button } from './DesignSystem/components/Button'
import { Plus, Edit, Trash2, X } from 'lucide-react'
import { LoadingState } from './DesignSystem/components/LoadingSpinner'
import { supabase } from '../lib/supabase'
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


export function ManageFoldersModal({ isOpen, onClose, onFoldersChanged }: ManageFoldersModalProps) {
  const [folders, setFolders] = useState<UserJourneyFolder[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingFolder, setEditingFolder] = useState<UserJourneyFolder | null>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [folderStatus, setFolderStatus] = useState<'personal' | 'shared'>('personal')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [folderToDelete, setFolderToDelete] = useState<UserJourneyFolder | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadFolders()
    }
  }, [isOpen])

  // Get current user ID on mount
  useEffect(() => {
    const getCurrentUser = async () => {
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setCurrentUserId(user.id)
        }
      }
    }
    getCurrentUser()
  }, [])

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
      // Color is determined by status: blue for shared, yellow for personal
      const defaultColor = folderStatus === 'shared' ? '#3B82F6' : '#F59E0B'
      await createUserJourneyFolder(newFolderName.trim(), defaultColor)
      await loadFolders()
      onFoldersChanged()
      setNewFolderName('')
      setFolderStatus('personal')
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
      // Color is determined by status: blue for shared, yellow for personal
      const folderColor = folderStatus === 'shared' ? '#3B82F6' : '#F59E0B'
      await updateUserJourneyFolder(editingFolder.id, {
        name: newFolderName.trim(),
        color: folderColor,
        status: folderStatus
      })
      await loadFolders()
      onFoldersChanged()
      setEditingFolder(null)
      setNewFolderName('')
      setFolderStatus('personal')
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
    setFolderStatus(folder.status || 'personal')
    setShowAddForm(false)
  }

  const cancelEdit = () => {
    setEditingFolder(null)
    setNewFolderName('')
    setFolderStatus('personal')
  }

  const startAdd = () => {
    setShowAddForm(true)
    setEditingFolder(null)
    setNewFolderName('')
    setFolderStatus('personal')
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Manage Folders"
        size="md"
        closeOnOverlayClick={false}
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

                  {/* Status Toggle - Only show when editing (not creating) and user is the creator */}
                  {editingFolder && currentUserId && editingFolder.created_by === currentUserId && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <p className="text-sm text-gray-500 mb-3">
                        Share to make this folder accessible to everyone in the workspace
                      </p>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={folderStatus === 'shared'}
                            onChange={(e) => setFolderStatus(e.target.checked ? 'shared' : 'personal')}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          {folderStatus === 'shared' ? 'Shared' : 'Personal'}
                        </span>
                      </label>
                      {folderStatus === 'shared' && (
                        <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                          <p className="text-sm text-yellow-800">
                            All user journeys and folders inside this folder will also be shared, and therefore available to all users in this workspace.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

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
        closeOnOverlayClick={false}
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

