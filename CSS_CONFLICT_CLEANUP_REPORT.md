# JayLuxe CSS conflict cleanup

## Applied fix
- Reordered global CSS imports in `app/layout.tsx`.
- Base styles now load before design/component refinement layers.
- Responsive and feature refinements remain after the base system.

## Why
The previous import order allowed foundational styles (`globals.css`, design system) to load after several refinement files, causing later broad selectors to unexpectedly override intended component changes.

## Preserved
- No component redesign.
- No feature removal.
- No payment, checkout, or backend changes.

## Remaining recommended cleanup
A full removal of duplicated selectors and unnecessary `!important` rules should be done incrementally per component with visual regression checks.
