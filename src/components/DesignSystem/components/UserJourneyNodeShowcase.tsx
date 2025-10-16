import React, { useState, useEffect } from 'react'
import { Settings, Database } from 'lucide-react'
import { UserJourneyNode, UserJourneyNodeData, UserJourneyNodeType } from './UserJourneyNode'
import { Button } from './Button'
import { Modal } from './Modal'
import { UserRoleTag } from '../../common/UserRoleTag'
import type { UserRole } from '../../../lib/supabase'

interface UserJourneyNodeShowcaseProps {
  userRoles?: UserRole[]
}

export function UserJourneyNodeShowcase({ userRoles = [] }: UserJourneyNodeShowcaseProps) {
  const [sampleNodes, setSampleNodes] = useState<UserJourneyNodeData[]>([
    {
      label: 'User Login',
      description: 'User authenticates',
      type: 'start',
      customProperties: { priority: 'high', complexity: 'medium' },
      variant: 'default'
    },
    {
      label: 'Process Data',
      description: 'System processes user input',
      type: 'process',
      customProperties: { apiCalls: 3, estimatedTime: '2s' },
      variant: 'outlined'
    },
    {
      label: 'Make Decision',
      description: 'System evaluates conditions',
      type: 'decision',
      customProperties: { conditions: 4, fallback: 'default' },
      variant: 'filled'
    },
    {
      label: 'Journey Complete',
      description: 'All processes finished',
      type: 'end',
      variant: 'default'
    }
  ])

  // Update sample nodes with user roles when available
  useEffect(() => {
    if (userRoles.length > 0) {
      setSampleNodes([
        {
          label: 'User Login',
          description: 'User authenticates',
          type: 'start',
          userRole: userRoles[0],
          customProperties: { priority: 'high', complexity: 'medium' },
          variant: 'default'
        },
        {
          label: 'Process Data',
          description: 'System processes user input',
          type: 'process',
          userRole: userRoles[1] || userRoles[0],
          customProperties: { apiCalls: 3, estimatedTime: '2s' },
          variant: 'outlined'
        },
        {
          label: 'Make Decision',
          description: 'System evaluates conditions',
          type: 'decision',
          userRole: userRoles[2] || userRoles[0],
          customProperties: { conditions: 4, fallback: 'default' },
          variant: 'filled'
        },
        {
          label: 'Journey Complete',
          description: 'All processes finished',
          type: 'end',
          variant: 'default'
        }
      ])
    }
  }, [userRoles])
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [configForm, setConfigForm] = useState<UserJourneyNodeData>({
    label: 'New Node',
    description: 'Node description',
    type: 'process',
    variant: 'default',
    customProperties: {}
  })

  const handleSaveConfig = () => {
    setShowConfigModal(false)
    // In a real implementation, this would update the node
  }

  const handleConfigChange = (field: keyof UserJourneyNodeData, value: unknown) => {
    setConfigForm(prev => ({ ...prev, [field]: value }))
  }

  const addCustomProperty = () => {
    const key = prompt('Property name:')
    const value = prompt('Property value:')
    if (key && value) {
      setConfigForm(prev => ({
        ...prev,
        customProperties: { ...prev.customProperties, [key]: value }
      }))
    }
  }

  const removeCustomProperty = (key: string) => {
    setConfigForm(prev => {
      const { [key]: _, ...rest } = prev.customProperties || {}
      return { ...prev, customProperties: rest }
    })
  }

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="text-left">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-4">
          User Journey Node Component Library
        </h2>
        <p className="text-gray-600">
          Configurable nodes for building interactive user journey diagrams with support for user roles and custom properties.
        </p>
      </div>

      {/* Node Types */}
      <div className="space-y-8">
        <h3 className="text-2xl font-semibold text-gray-900">Node Types</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {(['start', 'process', 'decision', 'end'] as UserJourneyNodeType[]).map((type) => (
            <div key={type} className="space-y-2">
              <h4 className="text-lg font-medium text-gray-700 capitalize">{type} Node</h4>
              <div className="bg-gray-50 p-4 rounded-lg flex justify-center">
                <UserJourneyNode
                  data={{
                    label: `${type.charAt(0).toUpperCase() + type.slice(1)} Node`,
                    description: `A ${type} node example`,
                    type,
                    variant: 'default'
                  }}
                  showHandles={false}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

     

      {/* User Roles Integration */}
      <div className="space-y-8">
        <h3 className="text-2xl font-semibold text-gray-900">User Roles Integration</h3>
        <div className="space-y-6">
          <div>
            <h4 className="text-lg font-medium text-gray-700 mb-3">Available User Roles</h4>
            <div className="flex gap-3 flex-wrap mb-4">
              {userRoles.length > 0 ? (
                userRoles.map((role) => (
                  <UserRoleTag key={role.id} userRole={role} />
                ))
              ) : (
                <p className="text-sm text-gray-500">No user roles defined yet. Create user roles to assign them to nodes.</p>
              )}
            </div>
          </div>
          <div>
            <h4 className="text-lg font-medium text-gray-700 mb-3">Nodes with User Roles</h4>
            <div className="flex items-center gap-6 flex-wrap">
              {sampleNodes.map((nodeData, index) => (
                <div key={index} className="relative">
                  <UserJourneyNode data={nodeData} showHandles={false} />
                  <Button
                    variant="ghost"
                    size="small"
                    className="absolute -top-2 -right-2 w-6 h-6 p-0"
                    onClick={() => handleEditNode(nodeData)}
                  >
                    <Settings size={12} />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Custom Properties */}
      <div className="space-y-8">
        <h3 className="text-2xl font-semibold text-gray-900">Custom Properties</h3>
        <div className="space-y-6">
          <div>
            <h4 className="text-lg font-medium text-gray-700 mb-3">Nodes with Custom Properties</h4>
            <div className="flex items-center gap-6 flex-wrap">
              {sampleNodes.slice(0, 2).map((nodeData, index) => (
                <div key={`custom-${index}`} className="relative">
                  <UserJourneyNode data={nodeData} showHandles={false} />
                  <Button
                    variant="ghost"
                    size="small"
                    className="absolute -top-2 -right-2 w-6 h-6 p-0"
                    onClick={() => handleEditNode(nodeData)}
                  >
                    <Settings size={12} />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Demo */}
      <div className="space-y-8">
        <h3 className="text-2xl font-semibold text-gray-900">Interactive Demo</h3>
        <div className="bg-gray-50 p-6 rounded-lg">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="primary"
              onClick={() => setShowConfigModal(true)}
            >
              Configure Node
            </Button>
            <Button
              variant="outline"
              onClick={addCustomProperty}
            >
              <Database size={16} className="mr-2" />
              Add Property
            </Button>
          </div>
          <div className="bg-white p-4 rounded border">
            <UserJourneyNode data={configForm} showHandles={false} />
          </div>
        </div>
      </div>

      {/* Configuration Modal */}
      {showConfigModal && (
        <Modal
          isOpen={showConfigModal}
          onClose={() => setShowConfigModal(false)}
          title="Configure Node"
        >
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Node Label
              </label>
              <input
                type="text"
                value={configForm.label}
                onChange={(e) => handleConfigChange('label', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <input
                type="text"
                value={configForm.description || ''}
                onChange={(e) => handleConfigChange('description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Node Type
                </label>
                <select
                  value={configForm.type}
                  onChange={(e) => handleConfigChange('type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="start">Start</option>
                  <option value="process">Process</option>
                  <option value="decision">Decision</option>
                  <option value="end">End</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Variant
                </label>
                <select
                  value={configForm.variant}
                  onChange={(e) => handleConfigChange('variant', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="default">Default</option>
                  <option value="outlined">Outlined</option>
                  <option value="filled">Filled</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User Role
              </label>
              <select
                value={configForm.userRole?.id || ''}
                onChange={(e) => {
                  const role = userRoles.find(r => r.id === e.target.value)
                  handleConfigChange('userRole', role || undefined)
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">None</option>
                {userRoles.map((role) => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Properties
              </label>
              <div className="space-y-2">
                {Object.entries(configForm.customProperties || {}).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-sm font-medium">{key}:</span>
                    <span className="text-sm">{String(value)}</span>
                    <Button
                      variant="ghost"
                      size="small"
                      onClick={() => removeCustomProperty(key)}
                    >
                      ×
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="small"
                  onClick={addCustomProperty}
                >
                  <Database size={16} className="mr-2" />
                  Add Property
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4">
              <Button
                variant="ghost"
                onClick={() => setShowConfigModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveConfig}
              >
                Save Configuration
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
