'use client'

const sizeClasses = {
  small: 'w-full h-full',
  wide: 'w-full h-full',
  tall: 'w-full h-full',
  large: 'w-full h-full',
}

export default function Widget({ id, size = 'small', className = '', children }) {
  return (
    <div
      key={id}
      className={`
        ${sizeClasses[size]}
        bg-white dark:bg-gray-800 
        rounded-lg p-4 
        shadow-lg
        transition-colors
        cursor-move
        ${className}
      `}
    >
      {children}
    </div>
  )
} 