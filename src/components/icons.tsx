import React from 'react'

/**
 * Custom palette icon — not available in Heroicons.
 * Follows the same outline shell pattern as @heroicons/react/24/outline.
 */
export function PaletteIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M12 2C6.48 2 2 6.48 2 12c0 3.17 2.12 5 4.5 5 .83 0 1.5.67 1.5 1.5S7.33 20 6.5 20C4.5 20 2 18 2 12 2 6.48 6.48 2 12 2z" />
      <path d="M22 12c0 5.52-4.48 10-10 10" />
      <circle cx="8.5"  cy="7"  r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12"   cy="5"  r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="7"  r="1.2" fill="currentColor" stroke="none" />
      <circle cx="17"   cy="11" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  )
}
