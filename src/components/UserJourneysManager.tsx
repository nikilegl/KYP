import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Route, Edit, Trash2, Eye } from 'lucide-react'
import { Button } from './DesignSystem/components/Button'
import { DataTable, Column } from './DesignSystem/components/DataTable'

// Mock data for now - this will be replaced with real data later
interface WorkspaceUserJourney {
  id: string
  name: string
  description: string
  status: 'draft' | 'active' | 'archived'
  created_at: string
  updated_at: string
  created_by: string
}

// Mock data
const mockUserJourneys: WorkspaceUserJourney[] = [
  {
    id: '1',
    name: 'Customer Onboarding Journey',
    description: 'Complete customer onboarding process from signup to first value',
    status: 'active',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-20T14:30:00Z',
    created_by: 'user-1'
  },
  {
    id: '2',
    name: 'Support Ticket Resolution',
    description: 'End-to-end support ticket resolution workflow',
    status: 'draft',
    created_at: '2024-01-18T09:15:00Z',
    updated_at: '2024-01-19T16:45:00Z',
    created_by: 'user-2'
  },
  {
    id: '3',
    name: 'Product Purchase Flow',
    description: 'Customer journey from product discovery to purchase completion',
    status: 'active',
    created_at: '2024-01-10T11:30:00Z',
    updated_at: '2024-01-22T08:20:00Z',
    created_by: 'user-1'
  }
]

interface UserJourneysManagerProps {
  // Props will be added as needed
}

export function UserJourneysManager({}: UserJourneysManagerProps) {
  const navigate = useNavigate()
  const [userJourneys, setUserJourneys] = useState<WorkspaceUserJourney[]>(mockUserJourneys)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Filter user journeys based on search term and status
  const filteredUserJourneys = userJourneys.filter(journey => {
    const matchesSearch = journey.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         journey.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || journey.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Helper function to get status colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return { bg: '#D1FAE5', text: '#059669' }
      case 'draft':
        return { bg: '#FEF3C7', text: '#D97706' }
      case 'archived':
        return { bg: '#F3F4F6', text: '#6B7280' }
      default:
        return { bg: '#F3F4F6', text: '#6B7280' }
    }
  }

  // Navigate to user journey creator
  const handleCreateUserJourney = () => {
    navigate('/user-journey-creator')
  }

  // Table columns configuration
  const columns: Column<WorkspaceUserJourney>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      width: '300px',
      render: (journey) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <Route size={16} className="text-blue-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{journey.name}</div>
            <div className="text-sm text-gray-500 truncate max-w-xs">
              {journey.description}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      width: '120px',
      render: (journey) => {
        const statusColors = getStatusColor(journey.status)
        return (
          <span 
            className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full"
            style={{
              backgroundColor: statusColors.bg,
              color: statusColors.text
            }}
          >
            {journey.status.charAt(0).toUpperCase() + journey.status.slice(1)}
          </span>
        )
      }
    },
    {
      key: 'created_at',
      header: 'Created',
      sortable: true,
      width: '120px',
      render: (journey) => (
        <div className="text-sm text-gray-600">
          {new Date(journey.created_at).toLocaleDateString()}
        </div>
      )
    },
    {
      key: 'updated_at',
      header: 'Last Updated',
      sortable: true,
      width: '120px',
      render: (journey) => (
        <div className="text-sm text-gray-600">
          {new Date(journey.updated_at).toLocaleDateString()}
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      width: '120px',
      render: (journey) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => console.log('View journey:', journey.id)}
            className="p-2"
          >
            <Eye size={16} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => console.log('Edit journey:', journey.id)}
            className="p-2"
          >
            <Edit size={16} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => console.log('Delete journey:', journey.id)}
            className="p-2 text-red-600 hover:text-red-700"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      )
    }
  ]

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">User Journeys</h2>
          <p className="text-gray-600">Manage workspace-level user journeys and customer experience flows</p>
        </div>
        <Button
          onClick={handleCreateUserJourney}
          className="flex items-center gap-2"
        >
          <Plus size={20} />
          Create User Journey
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search user journeys..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* User Journeys Table */}
      <div className="bg-white rounded-lg border">
        <DataTable
          data={filteredUserJourneys}
          getItemId={(journey) => journey.id}
          columns={columns}
          className="min-w-0"
        />
      </div>

      {/* Empty State */}
      {filteredUserJourneys.length === 0 && (
        <div className="text-center py-12">
          <Route size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm || statusFilter !== 'all' ? 'No matching user journeys' : 'No user journeys yet'}
          </h3>
          <p className="text-gray-500 mb-6">
            {searchTerm || statusFilter !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : 'Get started by creating your first workspace user journey'
            }
          </p>
          {(!searchTerm && statusFilter === 'all') && (
            <Button
              onClick={handleCreateUserJourney}
              className="flex items-center gap-2 mx-auto"
            >
              <Plus size={20} />
              Create User Journey
            </Button>
          )}
        </div>
      )}

    </div>
  )
}
