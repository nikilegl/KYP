import React from 'react'
import { Shield, Edit, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import type { UserPermission, Stakeholder } from '../../lib/supabase'

interface UserPermissionTableProps {
  userPermissions: UserPermission[]
  stakeholders: Stakeholder[]
  onEdit: (permission: UserPermission) => void
  onDelete: (permissionId: string) => void
  onNavigateToStakeholders?: (userPermissionId: string) => void
}

export function UserPermissionTable({
  userPermissions,
  stakeholders,
  onEdit,
  onDelete,
  onNavigateToStakeholders
}: UserPermissionTableProps) {
  const [sortField, setSortField] = React.useState<'name' | 'stakeholders' | null>(null)
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc')

  const handleSort = (field: 'name' | 'stakeholders') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortIcon = (field: 'name' | 'stakeholders') => {
    if (sortField !== field) {
      return <ChevronUp size={14} className="text-gray-300" />
    }
    return sortDirection === 'asc' 
      ? <ChevronUp size={14} className="text-gray-600" />
      : <ChevronDown size={14} className="text-gray-600" />
  }

  const getStakeholderCount = (permissionId: string) => {
    return stakeholders.filter(stakeholder => stakeholder.user_permission_id === permissionId).length
  }

  const handleStakeholderCountClick = (permissionId: string) => {
    if (onNavigateToStakeholders) {
      onNavigateToStakeholders(permissionId)
    }
  }

  const handleDeleteUserPermission = async (permissionId: string) => {
    if (window.confirm('Are you sure you want to delete this user permission?')) {
      onDelete(permissionId)
    }
  }

  // Sort user permissions
  const sortedUserPermissions = [...userPermissions].sort((a, b) => {
    if (!sortField) return 0
    
    let aValue: string | number
    let bValue: string | number
    
    switch (sortField) {
      case 'name':
        aValue = a.name.toLowerCase()
        bValue = b.name.toLowerCase()
        break
      case 'stakeholders':
        aValue = getStakeholderCount(a.id)
        bValue = getStakeholderCount(b.id)
        break
      default:
        return 0
    }
    
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
                  User Permission
                  {getSortIcon('name')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('stakeholders')}
              >
                <div className="flex items-center gap-1">
                  Stakeholders
                  {getSortIcon('stakeholders')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedUserPermissions.map((permission) => (
              <tr key={permission.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <Shield size={16} className="text-indigo-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{permission.name}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-600 max-w-xs">
                    {permission.description || '-'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleStakeholderCountClick(permission.id)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {getStakeholderCount(permission.id)} stakeholders
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEdit(permission)}
                      className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                    >
                      <Edit size={14} />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteUserPermission(permission.id)}
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
        
        {sortedUserPermissions.length === 0 && (
          <div className="text-center py-12">
            <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center">
              <Shield size={48} className="text-gray-300" />
            </div>
            <p className="text-gray-500">No user permissions yet. Add permissions to organize access levels!</p>
          </div>
        )}
      </div>
    </div>
  )
}