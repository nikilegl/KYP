import React from 'react'
import type { Platform } from '../../lib/supabase'

interface PlatformFormProps {
  platform: Partial<Platform> & { name: string; colour: string; icon?: string; description?: string }
  setPlatform: (platform: any) => void
  isModal?: boolean
}

export function PlatformForm({
  platform,
  setPlatform,
  isModal = false
}: PlatformFormProps) {
  return (
    <div className={isModal ? 'space-y-4' : 'bg-white rounded-lg shadow p-6'}>

      <div className="grid grid-cols-2 gap-4">
        {/* Platform Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Platform Name *
          </label>
          <input
            type="text"
            value={platform.name}
            onChange={(e) => setPlatform({ ...platform, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., CMS, Legl, Third party"
            required
          />
        </div>

        {/* Icon */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Icon
          </label>
          <select
            value={platform.icon || 'Server'}
            onChange={(e) => setPlatform({ ...platform, icon: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Server">Server</option>
            <option value="Database">Database</option>
            <option value="Zap">Zap</option>
            <option value="User">User</option>
            <option value="Globe">Globe</option>
            <option value="ExternalLink">External Link</option>
            <option value="Cloud">Cloud</option>
            <option value="Cpu">CPU</option>
            <option value="HardDrive">Hard Drive</option>
            <option value="Monitor">Monitor</option>
          </select>
        </div>

        {/* Colour */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Colour
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={platform.colour}
              onChange={(e) => setPlatform({ ...platform, colour: e.target.value })}
              className="h-10 rounded border border-gray-300 cursor-pointer flex-shrink-0"
              style={{ width: '40px' }}
            />
            <input
              type="text"
              value={platform.colour}
              onChange={(e) => setPlatform({ ...platform, colour: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="#3B82F6"
            />
          </div>
        </div>

        {/* Description */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={platform.description || ''}
            onChange={(e) => setPlatform({ ...platform, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Brief description of this platform..."
            rows={2}
          />
        </div>
      </div>
    </div>
  )
}

