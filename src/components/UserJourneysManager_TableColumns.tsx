// This file contains the new table columns configuration for UserJourneysManager
// Replace the existing columns array with this code

import { FolderOpen } from 'lucide-react'
import { Column } from './DesignSystem/components/DataTable'
import { convertEmojis } from '../utils/emojiConverter'

// Define columns for TableItem type
const columns: Column<TableItem>[] = [
  {
    key: 'name',
    header: 'Name',
    sortable: true,
    width: '400px',
    render: (item) => {
      if (item.type === 'folder') {
        const folder = item.data
        return (
          <div 
            className="break-words whitespace-normal flex items-center gap-3 cursor-pointer"
            draggable
            onDragStart={() => handleDragStart('folder', folder.id)}
            onDragEnd={handleDragEnd}
          >
            <div
              className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: folder.color }}
            >
              <FolderOpen size={14} className="text-white" />
            </div>
            <div>
              <div className="font-medium text-gray-900">{convertEmojis(folder.name)}</div>
              <div className="text-xs text-gray-500">{folder.journey_count} item{folder.journey_count !== 1 ? 's' : ''}</div>
            </div>
          </div>
        )
      } else {
        const journey = item.data
        return (
          <div 
            className="break-words whitespace-normal"
            draggable
            onDragStart={() => handleDragStart('journey', journey.id)}
            onDragEnd={handleDragEnd}
          >
            <div className="font-medium text-gray-900">{convertEmojis(journey.name)}</div>
          </div>
        )
      }
    }
  },
  {
    key: 'status',
    header: 'Type / Status',
    sortable: true,
    width: '120px',
    render: (item) => {
      if (item.type === 'folder') {
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Folder
          </span>
        )
      } else {
        const status = item.data.status || 'draft'
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            status === 'published' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {status === 'published' ? 'Published' : 'Draft'}
          </span>
        )
      }
    }
  },
  {
    key: 'updated_at',
    header: 'Modified',
    sortable: true,
    width: '180px',
    render: (item) => {
      const data = item.data
      const updatedDate = new Date(data.updated_at)
      const formattedDate = updatedDate.toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      })
      
      return (
        <div className="text-sm text-gray-600">
          {formattedDate}
        </div>
      )
    }
  },
  {
    key: 'actions',
    header: 'Actions',
    sortable: false,
    width: '150px',
    render: (item) => {
      if (item.type === 'folder') {
        const folder = item.data
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDeleteFolderClick(folder)
              }}
              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Delete folder"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )
      } else {
        const journey = item.data
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleEditClick(journey)
              }}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
              title="Edit journey details"
            >
              <Edit size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDuplicateClick(journey)
              }}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
              title="Duplicate journey"
            >
              <Copy size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDeleteClick(journey)
              }}
              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Delete journey"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )
      }
    }
  }
]

// Instructions:
// 1. Import these at the top: import { FolderOpen, Edit, Copy, Trash2 } from 'lucide-react'
// 2. Replace the existing columns array with this one
// 3. Update the DataTable usage to work with TableItem instead of UserJourneyWithProject

