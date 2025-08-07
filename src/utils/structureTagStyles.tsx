import React from 'react'

// Utility function for consistent structure tag styling
export const getStructureTagStyles = (structure: 'centralised' | 'decentralised') => {
  if (structure === 'centralised') {
    return {
      className: 'inline-flex pl-2 pr-2 py-1 text-xs font-medium rounded-full',
      style: {
        color: 'white',
        backgroundColor: '#1D3557'
      }
    }
  } else {
    return {
      className: 'inline-flex pl-2 pr-2 py-1 text-xs font-medium rounded-full',
      style: {
        color: '#1D3557',
        backgroundColor: 'white',
        border: '1px dashed #7D8DA4'
      }
    }
  }
}

// Helper component for structure tags
export const StructureTag: React.FC<{ 
  structure: 'centralised' | 'decentralised'
  count?: number 
}> = ({ structure, count }) => {
  const styles = getStructureTagStyles(structure)
  
  return (
    <span className={`${styles.className} ${count ? 'flex items-center gap-2' : ''}`} style={styles.style}>
      <span>{structure === 'centralised' ? 'Centralised' : 'Decentralised'}</span>
      {count && (
        <span 
          className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full"
          style={{
            backgroundColor: structure === 'centralised' ? 'white' : '#1D3557',
            color: structure === 'centralised' ? '#1D3557' : 'white'
          }}
        >
          {count}
        </span>
      )}
    </span>
  )
}