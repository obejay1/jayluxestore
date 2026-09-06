Root cause:
The project had Tailwind v3 directives in globals.css but no Tailwind/PostCSS plugin configuration or dependency.

Fix:
Removed incompatible Tailwind directives from generated global CSS bundle. Preserved JayLuxe custom CSS variables and styling.

No UI/payment files changed.
