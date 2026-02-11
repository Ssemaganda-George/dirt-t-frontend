# Send Booking Emails Edge Function

This Supabase Edge Function sends booking confirmation emails to tourists, vendors, and admins when a booking is created.

## Overview

When a booking is created, this function:
1. Fetches the booking details with related service information
2. Retrieves tourist, vendor, and admin email addresses
3. Sends personalized HTML emails to:
   - **Tourist**: Booking confirmation with all details
   - **Vendor**: Notification of new booking with customer details
   - **Admin**: Alert about new booking for monitoring

## Prerequisites

The following secrets must be configured in your Supabase project:

- `RESEND_API_KEY` - Your Resend API key
- `FROM_EMAIL` - The email address to send from (must be verified in Resend)
- `FRONTEND_URL` - Your frontend application URL
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for admin access)
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `SUPABASE_DB_URL` - Your Supabase database URL (if needed)

## Deployment

### Using Supabase CLI

1. Install the Supabase CLI if you haven't already:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```

4. Set the secrets:
   ```bash
   supabase secrets set RESEND_API_KEY=your_resend_api_key
   supabase secrets set FROM_EMAIL=noreply@yourdomain.com
   supabase secrets set FRONTEND_URL=https://your-frontend-url.com
   supabase secrets set SUPABASE_URL=https://your-project.supabase.co
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   supabase secrets set SUPABASE_ANON_KEY=your_anon_key
   ```

5. Deploy the function:
   ```bash
   supabase functions deploy send-booking-emails
   ```

### Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Edge Functions** in the sidebar
3. Click **Create a new function**
4. Name it `send-booking-emails`
5. Copy the contents of `index.ts` into the editor
6. Go to **Settings** > **Edge Functions** > **Secrets**
7. Add all the required secrets listed above
8. Deploy the function

## Usage

The function is automatically called when a booking is created via the `createBooking` function in `src/lib/database.ts`. 

### Manual Invocation

You can also call it manually via HTTP:

```bash
curl -X POST \
  'https://your-project.supabase.co/functions/v1/send-booking-emails' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"booking_id": "booking-uuid-here"}'
```

## Email Templates

The function sends three different email templates:

1. **Tourist Email**: Green-themed confirmation email with booking details and link to view booking
2. **Vendor Email**: Blue-themed notification with booking and customer details
3. **Admin Email**: Orange-themed alert with complete booking information

All emails include:
- Booking ID
- Service name and category
- Booking and service dates
- Number of guests
- Total amount
- Status information
- Special requests (if any)
- Transport-specific details (if applicable)

## Error Handling

- The function handles missing data gracefully
- If tourist email is missing (guest booking without email), the tourist email is skipped
- If no admins are found, a warning is logged but the function continues
- Email sending failures are logged but don't break the booking creation process

## Testing

To test the function:

1. Create a test booking in your application
2. Check the console logs for email sending status
3. Verify emails are received by:
   - Tourist (or guest email)
   - Vendor
   - All admin users

## Troubleshooting

### Emails not being sent

1. Check that all secrets are properly set in Supabase
2. Verify your Resend API key is valid
3. Ensure the FROM_EMAIL is verified in your Resend account
4. Check the Edge Function logs in Supabase dashboard for errors

### Missing recipient emails

1. Verify the booking has a valid `tourist_id` or `guest_email`
2. Check that vendor profile exists and has an email
3. Ensure at least one admin profile exists with `role = 'admin'`

### CORS errors

The function includes CORS headers. If you encounter CORS issues:
- Verify the function is deployed correctly
- Check that the Authorization header is being sent
- Ensure the request is coming from an allowed origin

