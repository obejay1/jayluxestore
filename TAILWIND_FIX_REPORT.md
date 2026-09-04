# Tailwind build fix

Root cause: Tailwind was referenced in app/globals.css but PostCSS had no Tailwind plugin and package.json did not include tailwindcss/autoprefixer.

Fixed:
- Added Tailwind CSS v3.4.17
- Added Autoprefixer
- Configured PostCSS to load Tailwind
- Preserved existing globals.css and JayLuxe styles

No application/payment files changed.
