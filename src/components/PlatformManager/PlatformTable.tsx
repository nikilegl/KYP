import React, { useState } from 'react'
import { Edit, Trash2, Server, Database, Zap, User, Globe, ExternalLink, Cloud, Cpu, HardDrive, Monitor } from 'lucide-react'
import type { Platform } from '../../lib/supabase'

interface PlatformTableProps {
  platforms: Platform[]
  onEdit: (platform: Platform) => void
  onDelete: (platformId: string) => Promise<void>
}

export function PlatformTable({ platforms, onEdit, onDelete }: PlatformTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (platformId: string, platformName: string) => {
    if (!window.confirm(`Are you sure you want to delete the platform "${platformName}"? This action cannot be undone.`)) {
      return
    }

    setDeletingId(platformId)
    try {
      await onDelete(platformId)
    } catch (error) {
      console.error('Error deleting platform:', error)
    } finally {
      setDeletingId(null)
    }
  }

  const getIcon = (iconName?: string) => {
    const iconMap: Record<string, typeof Server> = {
      'Server': Server,
      'Database': Database,
      'Zap': Zap,
      'User': User,
      'Globe': Globe,
      'ExternalLink': ExternalLink,
      'Cloud': Cloud,
      'Cpu': Cpu,
      'HardDrive': HardDrive,
      'Monitor': Monitor
    }
    
    const IconComponent = iconMap[iconName || 'Server'] || Server
    return <IconComponent size={20} />
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Platform
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Description
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Colour
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Icon
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {platforms.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                <div className="flex flex-col items-center">
                  <Server size={48} className="text-gray-300 mb-3" />
                  <p className="text-lg font-medium">No platforms yet</p>
                  <p className="text-sm mt-1">Click "Add Platform" to create your first platform</p>
                </div>
              </td>
            </tr>
          ) : (
            platforms.map((platform) => (
              <tr key={platform.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div 
                      className="flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: platform.colour }}
                    >
                      <span className="text-white">
                        {getIcon(platform.icon)}
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {platform.name}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-500">
                    {platform.description || '-'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-6 h-6 rounded border border-gray-300"
                      style={{ backgroundColor: platform.colour }}
                    />
                    <span className="text-sm text-gray-500 font-mono">
                      {platform.colour}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {platform.icon || 'Server'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => onEdit(platform)}
                    className="text-blue-600 hover:text-blue-900 mr-4 transition-colors"
                    title="Edit platform"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(platform.id, platform.name)}
                    disabled={deletingId === platform.id}
                    className="text-red-600 hover:text-red-900 disabled:opacity-50 transition-colors"
                    title="Delete platform"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

