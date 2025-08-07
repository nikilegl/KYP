import React from 'react'
import { Building2, Edit, Trash2, ChevronUp, ChevronDown, Star } from 'lucide-react'
import { getStructureTagStyles } from '../../utils/structureTagStyles'
import type { LawFirm } from '../../lib/supabase'

interface LawFirmTableProps {
  lawFirms: LawFirm[]
  onEdit: (firm: LawFirm) => void
  onDelete: (id: string) => void
  onRowClick: (firm: LawFirm) => void
}

export function LawFirmTable({ lawFirms, onEdit, onDelete, onRowClick }: LawFirmTableProps) {
  const [sortField, setSortField] = React.useState<'name' | 'structure' | null>(null)
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc')

  const handleSort = (field: 'name' | 'structure') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortIcon = (field: 'name' | 'structure') => {
    if (sortField !== field) {
      return <ChevronUp size={14} className="text-gray-300" />
    }
    return sortDirection === 'asc' 
      ? <ChevronUp size={14} className="text-gray-600" />
      : <ChevronDown size={14} className="text-gray-600" />
  }

  const handleDeleteLawFirm = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this law firm?')) {
      onDelete(id)
    }
  }

  const filteredLawFirms = lawFirms.sort((a, b) => {
    if (!sortField) return 0
    
    let aValue = a[sortField]
    let bValue = b[sortField]
    
    if (typeof aValue === 'string') aValue = aValue.toLowerCase()
    if (typeof bValue === 'string') bValue = bValue.toLowerCase()
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-1">
                  Law Firm Name
                  {getSortIcon('name')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('structure')}
              >
                <div className="flex items-center gap-1">
                  Structure
                  {getSortIcon('structure')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredLawFirms.map((firm) => (
              <tr 
                key={firm.id} 
                className="hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => onRowClick(firm)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{firm.name}</span>
                    {firm.top_4 && (
                      <Star size={16} className="text-yellow-500 fill-current" />
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span 
                    className={getStructureTagStyles(firm.structure).className}
                    style={getStructureTagStyles(firm.structure).style}
                  >
                    {firm.structure === 'centralised' ? 'Centralised' : 'Decentralised'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onEdit(firm)
                      }}
                      className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                    >
                      <Edit size={14} />
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteLawFirm(firm.id)
                      }}
                      className="text-red-600 hover:text-red-900 flex items-center gap-1"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredLawFirms.length === 0 && (
          <div className="text-center py-12">
            <Building2 size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No law firms match your current filters.</p>
          </div>
        )}
      </div>
    </div>
  )
}