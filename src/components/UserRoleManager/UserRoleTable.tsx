import React from 'react'
import { Users, Edit, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { UserRoleIconDisplay } from './UserRoleIconDisplay'
import type { UserRole, Stakeholder } from '../../lib/supabase'

interface UserRoleTableProps {
  userRoles: UserRole[]
  stakeholders: Stakeholder[]
  onEdit: (role: UserRole) => void
  onDelete: (roleId: string) => void
  onNavigateToStakeholders?: (userRoleId: string) => void
}

export function UserRoleTable({
  userRoles,
  stakeholders,
  onEdit,
  onDelete,
  onNavigateToStakeholders
}: UserRoleTableProps) {
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

  const getStakeholderCount = (roleId: string) => {
    return stakeholders.filter(stakeholder => stakeholder.user_role_id === roleId).length
  }

  const handleStakeholderCountClick = (roleId: string) => {
    if (onNavigateToStakeholders) {
      onNavigateToStakeholders(roleId)
    }
  }

  const handleDeleteUserRole = async (roleId: string) => {
    if (window.confirm('Are you sure you want to delete this user role?')) {
      onDelete(roleId)
    }
  }

  // Sort user roles
  const sortedUserRoles = [...userRoles].sort((a, b) => {
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Icon
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-1">
                  User Role Name
                  {getSortIcon('name')}
                </div>
              </th>
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
            {sortedUserRoles.map((role) => (
              <tr key={role.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <UserRoleIconDisplay userRole={role} size="md" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleStakeholderCountClick(role.id)}
                    className="text-sm font-medium text-gray-900 hover:text-blue-600 hover:underline transition-colors text-left"
                  >
                    {role.name}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleStakeholderCountClick(role.id)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline transition-colors"
                  >
                    {getStakeholderCount(role.id)} stakeholders
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEdit(role)}
                      className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                    >
                      <Edit size={14} />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteUserRole(role.id)}
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
        
        {sortedUserRoles.length === 0 && (
          <div className="text-center py-12">
            <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center">
              <Users size={48} className="text-gray-300" />
            </div>
            <p className="text-gray-500">No user roles yet. Add roles to organize your team!</p>
          </div>
        )}
      </div>
    </div>
  )
}