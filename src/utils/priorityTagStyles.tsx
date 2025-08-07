import React from 'react'

// Priority tag color schemes
export const getPriorityTagStyles = (priority: 'must' | 'should' | 'could' | 'would') => {
  switch (priority) {
    case 'must':
      return {
        backgroundColor: '#FDF2F8',
        borderColor: '#FCE7F3',
        textColor: '#BE185D',
        dotColor: '#BE185D'
      }
    case 'should':
      return {
        backgroundColor: '#FEF3C7',
        borderColor: '#FDE68A',
        textColor: '#D97706',
        dotColor: '#D97706'
      }
    case 'could':
      return {
        backgroundColor: '#DBEAFE',
        borderColor: '#BFDBFE',
        textColor: '#2563EB',
        dotColor: '#2563EB'
      }
    case 'would':
      return {
        backgroundColor: '#F3F4F6',
        borderColor: '#E5E7EB',
        textColor: '#6B7280',
        dotColor: '#9CA3AF'
      }
    default:
      return {
        backgroundColor: '#F3F4F6',
        borderColor: '#E5E7EB',
        textColor: '#6B7280',
        dotColor: '#9CA3AF'
      }
  }
}

// Reusable PriorityTag component
export const PriorityTag: React.FC<{ 
  priority: 'must' | 'should' | 'could' | 'would'
  className?: string 
}> = ({ priority, className = '' }) => {
  const styles = getPriorityTagStyles(priority)
  
  return (
    <span 
      className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-medium rounded-full border ${className}`}
      style={{ 
        backgroundColor: styles.backgroundColor,
        borderColor: styles.borderColor,
        color: styles.textColor
      }}
    >
      <div 
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: styles.dotColor }}
      />
      <span className="capitalize">{priority}</span>
    </span>
  )
}