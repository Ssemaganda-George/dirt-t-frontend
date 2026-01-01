# Dirt Trails - Supabase Setup Guide

This guide will help you set up Supabase database integration for your Dirt Trails application.

## Prerequisites

1. A Supabase account (sign up at [supabase.com](https://supabase.com))
2. A new Supabase project

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in your project details:
   - Name: `dirt-trails` (or your preferred name)
   - Database Password: Choose a strong password
   - Region: Select the closest region to your users
4. Click "Create new project"

## Step 2: Get Your Project Credentials

1. In your Supabase dashboard, go to Settings → API
2. Copy the following values:
   - **Project URL**: `https://your-project-id.supabase.co`
   - **anon/public key**: Your anonymous key (starts with `eyJ...`)

## Step 3: Configure Environment Variables

1. Open the `.env` file in your project root
2. Replace the placeholder values:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## Step 4: Set Up Database Schema

1. In your Supabase dashboard, go to the SQL Editor
2. Copy the entire contents of `database-schema.sql`
3. Paste it into the SQL Editor
4. Click "Run" to execute the schema

This will create all necessary tables, policies, and seed data.

## Step 5: Configure Authentication

1. In your Supabase dashboard, go to Authentication → Settings
2. Configure the following:
   - **Site URL**: `http://localhost:5173` (for development)
   - **Redirect URLs**: Add `http://localhost:5173` and your production URL

## Step 6: Test the Setup

1. Start your development server:
```bash
npm run dev
```

2. Try registering a new user or logging in
3. Check your Supabase dashboard to see if data is being stored correctly

## Database Tables Created

- `profiles` - User profiles (extends auth.users)
- `vendors` - Vendor business information
- `service_categories` - Categories for services
- `services` - Tour/service listings
- `bookings` - Customer bookings
- `wallets` - Vendor payment wallets
- `transactions` - Payment transactions

## Security Features

- Row Level Security (RLS) enabled on all tables
- Policies ensure users can only access their own data
- Admins have elevated access to manage the platform
- Automatic profile creation on user registration

## Next Steps

After setting up Supabase:

1. Update your stores (`adminStore.ts`, `vendorStore.ts`) to use the database services
2. Test all CRUD operations
3. Implement real-time subscriptions for live updates (optional)
4. Set up file storage for images (optional)

## Troubleshooting

### Common Issues:

1. **Environment variables not loading**: Make sure your `.env` file is in the project root and restart your dev server.

2. **Database connection fails**: Check your Supabase URL and anon key are correct.

3. **Authentication not working**: Ensure your site URL is configured in Supabase Auth settings.

4. **Policies blocking access**: Check the RLS policies in your database allow the operations you're trying to perform.

### Getting Help:

- Check the Supabase documentation: [supabase.com/docs](https://supabase.com/docs)
- View your database logs in the Supabase dashboard
- Check browser console for detailed error messages

## Production Deployment

When deploying to production:

1. Update your environment variables with production values
2. Add your production domain to Supabase Auth redirect URLs
3. Consider setting up additional security measures (IP restrictions, etc.)
4. Monitor your database usage and scale as needed