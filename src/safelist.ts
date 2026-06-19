// This file ensures that Tailwind CSS preserves these classes in the final bundle
// since they are loaded dynamically from the backend API (seed data).

export const tailwindSafelist = [
  'bg-error-container/50',
  'text-on-error-container',
  'text-secondary',
]
