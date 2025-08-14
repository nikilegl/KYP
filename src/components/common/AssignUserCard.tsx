import React from 'react'
import { Users } from 'lucide-react'
import type { WorkspaceUser } from '../../lib/supabase'

interface AssignUserCardProps {
  availableUsers: WorkspaceUser[]
  selectedUser: WorkspaceUser | null
  onAssignUser: (user: WorkspaceUser) => void
  onRemoveUser: () => void
  inline?: boolean
  className?: string
}

export function AssignUserCard({
  availableUsers = [],
  selectedUser,
  onAssignUser,
  onRemoveUser,
  inline = false,
  className = ''
}: AssignUserCardProps) {
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedUserId = e.target.value
    
    if (selectedUserId === '') {
      onRemoveUser()
    } else {
      const user = availableUsers.find(u => u.user_id === selectedUserId)
      if (user) {
        onAssignUser(user)
      }
    }
  }

  if (inline) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Users size={16} className="text-blue-600" />
        <select
          value={selectedUser?.user_id || ''}
          onChange={handleSelectChange}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        >
          <option value="">Unassigned</option>
          {availableUsers
            .filter(user => user.status === 'active')
            .map((user) => (
              <option key={user.user_id} value={user.user_id}>
                {user.user_email}
              </option>
            ))}
        </select>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Assigned User
        </h3>
      </div>

      <div>
        <select
          value={selectedUser?.user_id || ''}
          onChange={handleSelectChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Unassigned</option>
          {availableUsers
            .filter(user => user.status === 'active')
            .map((user) => (
              <option key={user.user_id} value={user.user_id}>
                {user.user_email} ({user.role})
              </option>
            ))}
        </select>
      </div>

      {selectedUser && (
        <p className="text-sm text-gray-600 mt-2">
          Assigned to: <span className="font-medium">{selectedUser.user_email}</span>
        </p>
      )}
    </div>
  )
}