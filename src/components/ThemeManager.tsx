import React, { useState } from 'react'
import { Tag, Plus, Edit, Trash2, ChevronUp, ChevronDown, BookOpen, FileText, GitBranch } from 'lucide-react'
import { ThemeForm } from './ThemeManager/ThemeForm'
import { ThemeTable } from './ThemeManager/ThemeTable'
import type { Theme } from '../lib/supabase'

interface ThemeManagerProps {
  themes: Array<Theme & { contentCounts: { userStories: number; userJourneys: number; researchNotes: number } }>
  onCreateTheme: (name: string, description?: string, color?: string) => Promise<void>
  onUpdateTheme: (themeId: string, updates: { name?: string; description?: string; color?: string }) => Promise<void>
  onDeleteTheme: (themeId: string) => Promise<void>
  onSelectTheme: (theme: Theme) => void
}

export function ThemeManager({ 
  themes, 
  onCreateTheme, 
  onUpdateTheme, 
  onDeleteTheme,
  onSelectTheme
}: ThemeManagerProps) {
  const [showThemeForm, setShowThemeForm] = useState(false)
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null)
  const [newTheme, setNewTheme] = useState({ name: '', description: '', color: '#3B82F6' })
  const [creatingTheme, setCreatingTheme] = useState(false)
  const [updatingTheme, setUpdatingTheme] = useState(false)

  const handleCreateTheme = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingTheme(true)
    
    try {
      await onCreateTheme(newTheme.name, newTheme.description || undefined, newTheme.color)
      setNewTheme({ name: '', description: '', color: '#3B82F6' })
      setShowThemeForm(false)
    } catch (error) {
      console.error('Error creating theme:', error)
    } finally {
      setCreatingTheme(false)
    }
  }

  const handleUpdateTheme = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTheme) return
    
    setUpdatingTheme(true)
    
    try {
      await onUpdateTheme(editingTheme.id, {
        name: editingTheme.name,
        description: editingTheme.description,
        color: editingTheme.color
      })
      setEditingTheme(null)
    } catch (error) {
      console.error('Error updating theme:', error)
    } finally {
      setUpdatingTheme(false)
    }
  }

  const handleDeleteTheme = async (themeId: string, themeName: string) => {
    if (window.confirm(`Are you sure you want to delete the theme "${themeName}"? This will remove it from all associated content.`)) {
      try {
        await onDeleteTheme(themeId)
      } catch (error) {
        console.error('Error deleting theme:', error)
      }
    }
  }

  const handleRowClick = (theme: Theme) => {
    onSelectTheme(theme)
  }

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Themes</h2>
          <p className="text-gray-600">Organize and categorize your content with themes</p>
        </div>
        <button
          onClick={() => setShowThemeForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
        >
          <Plus size={20} />
          Add Theme
        </button>
      </div>

      {/* Create Theme Form */}
      {showThemeForm && (
        <ThemeForm
          isEditing={false}
          theme={newTheme}
          loading={creatingTheme}
          onUpdate={(updates) => setNewTheme({ ...newTheme, ...updates })}
          onSubmit={handleCreateTheme}
          onClose={() => setShowThemeForm(false)}
        />
      )}

      {/* Edit Theme Form */}
      {editingTheme && (
        <ThemeForm
          isEditing={true}
          theme={{
            name: editingTheme.name,
            description: editingTheme.description || '',
            color: editingTheme.color || '#3B82F6'
          }}
          loading={updatingTheme}
          onUpdate={(updates) => setEditingTheme({ ...editingTheme, ...updates })}
          onSubmit={handleUpdateTheme}
          onClose={() => setEditingTheme(null)}
        />
      )}

      <ThemeTable
        themes={themes}
        onEdit={setEditingTheme}
        onDelete={handleDeleteTheme}
        onRowClick={handleRowClick}
      />
    </div>
  )
}