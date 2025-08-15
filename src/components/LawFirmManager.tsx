import React, { useState } from 'react'
import { Plus, Upload, Trash2, Shield } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { LawFirmForm } from './LawFirmManager/LawFirmForm'
import { LawFirmTable } from './LawFirmManager/LawFirmTable'
import { LawFirmFilters } from './LawFirmManager/LawFirmFilters'
import type { LawFirm } from '../lib/supabase'
import { getCurrentUserRole } from '../lib/database'
import type { Stakeholder, UserRole } from '../lib/supabase'

interface LawFirmManagerProps {
  lawFirms: LawFirm[]
  stakeholders?: Stakeholder[]
  userRoles?: UserRole[]
  onCreateLawFirm: (name: string, structure: 'centralised' | 'decentralised', status: 'active' | 'inactive') => Promise<void>
  onUpdateLawFirm: (id: string, updates: Partial<Omit<LawFirm, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>>) => Promise<void>
  onDeleteLawFirm: (id: string) => Promise<void>
  onImportCSV: (csvData: string) => Promise<{ success: number, errors: string[] }>
  onDeleteAll: () => Promise<void>
  onSelectStakeholder?: (stakeholder: Stakeholder, lawFirm: LawFirm) => void
}

export function LawFirmManager({ 
  lawFirms, 
  stakeholders = [],
  userRoles = [],
  onCreateLawFirm, 
  onUpdateLawFirm, 
  onDeleteLawFirm,
  onImportCSV,
  onDeleteAll,
  onSelectStakeholder
}: LawFirmManagerProps) {
  const navigate = useNavigate()
  const [showLawFirmForm, setShowLawFirmForm] = useState(false)
  const [editingLawFirm, setEditingLawFirm] = useState<LawFirm | null>(null)
  const [newLawFirm, setNewLawFirm] = useState({ 
    name: '', 
    structure: 'decentralised' as 'centralised' | 'decentralised',
    status: 'active' as 'active' | 'inactive',
    top_4: false
  })
  const [creatingLawFirm, setCreatingLawFirm] = useState(false)
  const [updatingLawFirm, setUpdatingLawFirm] = useState(false)
  const [importResults, setImportResults] = useState<{ success: number, errors: string[] } | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [structureFilter, setStructureFilter] = useState('')
  const [userRole, setUserRole] = useState<string | null>(null)

  // Load user role on component mount
  React.useEffect(() => {
    const loadUserRole = async () => {
      const role = await getCurrentUserRole()
      setUserRole(role)
    }
    loadUserRole()
  }, [])

  const handleCreateLawFirm = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingLawFirm(true)
    
    try {
      await onCreateLawFirm(newLawFirm.name, newLawFirm.structure, newLawFirm.status)
      setNewLawFirm({ name: '', structure: 'decentralised', status: 'active', top_4: false })
      setShowLawFirmForm(false)
    } catch (error) {
      console.error('Error creating law firm:', error)
    } finally {
      setCreatingLawFirm(false)
    }
  }

  const handleUpdateLawFirm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingLawFirm) return
    
    setUpdatingLawFirm(true)
    
    try {
      await onUpdateLawFirm(editingLawFirm.id, {
        name: editingLawFirm.name,
        structure: editingLawFirm.structure,
        status: editingLawFirm.status,
        top_4: editingLawFirm.top_4
      })
      setEditingLawFirm(null)
    } catch (error) {
      console.error('Error updating law firm:', error)
    } finally {
      setUpdatingLawFirm(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      const csvData = e.target?.result as string
      const results = await onImportCSV(csvData)
      setImportResults(results)
    }
    reader.readAsText(file)
  }

  const handleDeleteAll = async () => {
    if (window.confirm('Are you sure you want to delete ALL law firms? This action cannot be undone.')) {
      await onDeleteAll()
    }
  }

  const handleRowClick = (firm: LawFirm) => {
    navigate(`/law-firm/${firm.short_id}`)
  }

  const filteredLawFirms = lawFirms.filter(firm => {
    const matchesSearch = firm.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStructure = !structureFilter || firm.structure === structureFilter
    return matchesSearch && matchesStructure
  })

  // Calculate filter counts
  const centralisedCount = lawFirms.filter(firm => 
    firm.structure === 'centralised' && 
    firm.name.toLowerCase().includes(searchTerm.toLowerCase())
  ).length
  
  const decentralisedCount = lawFirms.filter(firm => 
    firm.structure === 'decentralised' && 
    firm.name.toLowerCase().includes(searchTerm.toLowerCase())
  ).length
  
  const totalCount = lawFirms.filter(firm => 
    firm.name.toLowerCase().includes(searchTerm.toLowerCase())
  ).length

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Law Firms</h2>
          <p className="text-gray-600">Manage law firms and their organizational structure</p>
        </div>
        <div className="flex items-center gap-3">
          {userRole === 'owner' && lawFirms.length > 0 && (
            <button
              onClick={handleDeleteAll}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
            >
              <Trash2 size={20} />
              Delete All
            </button>
          )}
          <label className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all cursor-pointer">
            <Upload size={20} />
            Import CSV
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          <button
            onClick={() => setShowLawFirmForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
          >
            <Plus size={20} />
            Add Law Firm
          </button>
        </div>
      </div>

      {/* Import Results */}
      {importResults && (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Import Results</h3>
          <div className="space-y-2">
            <p className="text-green-600">✓ Successfully imported {importResults.success} law firms</p>
            {importResults.errors.length > 0 && (
              <div>
                <p className="text-red-600 mb-2">⚠ {importResults.errors.length} errors occurred:</p>
                <ul className="text-sm text-red-600 space-y-1 ml-4">
                  {importResults.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <button
            onClick={() => setImportResults(null)}
            className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
          >
            Close
          </button>
        </div>
      )}

      <LawFirmFilters
        searchTerm={searchTerm}
        structureFilter={structureFilter}
        totalCount={totalCount}
        centralisedCount={centralisedCount}
        decentralisedCount={decentralisedCount}
        onSearchChange={setSearchTerm}
        onStructureFilterChange={setStructureFilter}
      />

      {showLawFirmForm && (
        <LawFirmForm
          isEditing={false}
          lawFirm={newLawFirm}
          loading={creatingLawFirm}
          onUpdate={(updates) => setNewLawFirm({ ...newLawFirm, ...updates })}
          onSubmit={handleCreateLawFirm}
          onClose={() => setShowLawFirmForm(false)}
        />
      )}

      {editingLawFirm && (
        <LawFirmForm
          isEditing={true}
          lawFirm={{
            name: editingLawFirm.name,
            structure: editingLawFirm.structure,
            status: editingLawFirm.status,
            top_4: editingLawFirm.top_4 || false
          }}
          loading={updatingLawFirm}
          onUpdate={(updates) => setEditingLawFirm({ ...editingLawFirm, ...updates })}
          onSubmit={handleUpdateLawFirm}
          onClose={() => setEditingLawFirm(null)}
        />
      )}

      <LawFirmTable
        lawFirms={filteredLawFirms}
        onEdit={setEditingLawFirm}
        onDelete={onDeleteLawFirm}
        onRowClick={handleRowClick}
      />
    </div>
  )
}