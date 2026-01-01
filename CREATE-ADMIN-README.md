# Admin User Creation Instructions

## Prerequisites
1. **Supabase Project**: Make sure you have a Supabase project set up
2. **Database Schema**: The database tables must be created first

## Step 1: Set Up Database Schema

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to **SQL Editor**
3. Copy the entire contents of `database-schema.sql`
4. Paste it into the SQL Editor
5. Click **Run** to execute the schema

This will create all necessary tables, policies, and seed data.

## Step 2: Get Service Role Key (Optional but Recommended)

1. In your Supabase Dashboard, go to **Settings** → **API**
2. Copy the **service_role** key (not the anon key)
3. Add it to your `.env` file:

```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## Step 3: Create Admin User

Run the following command in your terminal:

```bash
npm run create-admin
```

This will create an admin user with:
- **Email**: safaris.dirttrails@gmail.com
- **Password**: DirtTrails@DirtTrails
- **Role**: admin

## Step 4: Verify

After running the script, you should see:
- ✅ User created successfully
- ✅ Profile created

## Troubleshooting

### "Could not find the table 'public.profiles'"
- You haven't run the database schema yet
- Go back to Step 1

### "Auth error: User already registered"
- The email is already registered
- Try logging in with the existing account or use a different email

### Permission errors
- Make sure your service role key is correct
- Or use the anon key (less secure for admin operations)

## Security Note

The service role key has admin privileges. Keep it secure and never commit it to version control. Consider using environment variables in production.