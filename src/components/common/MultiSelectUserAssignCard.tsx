import React, { useState, useRef, useEffect } from 'react'
import { Users, X, ChevronDown, ChevronUp } from 'lucide-react'
import type { WorkspaceUser } from '../../lib/supabase'

interface MultiSelectUserAssignCardProps {
  availableUsers: WorkspaceUser[]
  selectedUsers: WorkspaceUser[]
  onUsersChange: (users: WorkspaceUser[]) => void
  title?: string
  placeholder?: string
  className?: string
}

export function MultiSelectUserAssignCard({
  availableUsers = [],
  selectedUsers,
  onUsersChange,
  title = "Assign Users",
  placeholder = "Select users...",
  className = ''
}: MultiSelectUserAssignCardProps) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Filter users based on search term and exclude already selected users
  const filteredUsers = availableUsers.filter(user => 
    user.user_email.toLowerCase().includes(searchTerm.toLowerCase()) &&
    user.status === 'active' &&
    !selectedUsers.some(selected => selected.id === user.id)
  )

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false)
        setSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleUserSelect = (user: WorkspaceUser) => {
    onUsersChange([...selectedUsers, user])
    setSearchTerm('')
    inputRef.current?.focus()
  }

  const handleUserRemove = (userId: string) => {
    onUsersChange(selectedUsers.filter(user => user.id !== userId))
  }

  const handleInputChange = (value: string) => {
    setSearchTerm(value)
    setShowDropdown(value.length > 0 || selectedUsers.length === 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredUsers.length === 1) {
        handleUserSelect(filteredUsers[0])
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
      setSearchTerm('')
    }
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          {title} ({selectedUsers.length})
        </h3>
      </div>

      {/* Selected Users */}
      {selectedUsers.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {selectedUsers.map((user) => (
              <div
                key={user.id}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700 border border-blue-200"
              >
                <span>{user.user_email}</span>
                <button
                  onClick={() => handleUserRemove(user.id)}
                  className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                  title="Remove user"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowDropdown(true)}
            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={placeholder}
          />
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showDropdown ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        

        {/* Dropdown */}
        {showDropdown && (
          <div
            ref={dropdownRef}
            className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-y-auto"
          >
            {filteredUsers.length > 0 ? (
              <>
                {filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleUserSelect(user)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users size={16} className="text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{user.user_email}</div>
                        <div className="text-sm text-gray-600 capitalize">{user.role}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </>
            ) : searchTerm ? (
              <div className="px-4 py-3 text-gray-500 text-sm">
                No users found matching "{searchTerm}"
              </div>
            ) : (
              <div className="px-4 py-3 text-gray-500 text-sm">
                All users are already selected
              </div>
            )}
          </div>
        )}
      </div>

      {selectedUsers.length === 0 && !searchTerm && (
        <p className="text-sm text-gray-500 mt-2">
          No users selected. All items will be shown.
        </p>
      )}
    </div>
  )
}