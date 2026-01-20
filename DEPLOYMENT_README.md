# Dirt Trails Frontend - Static Site Deployment

## Build Output
The built static files are in the `dist/` directory and include:
- `index.html` - Main HTML file
- `assets/` - CSS, JS, and other static assets

## Environment Variables
Make sure to set these in Render:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

## Deployment Checklist
- ✅ Build script configured (`npm run build`)
- ✅ Output directory set to `dist`
- ✅ Environment variables configured
- ✅ Static site hosting enabled
- ✅ Build command: `npm ci && npm run build`
- ✅ Publish directory: `dist`