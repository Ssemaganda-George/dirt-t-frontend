# Booking Email Setup Guide

This guide explains how to set up and deploy the booking confirmation email system using Supabase Edge Functions and Resend.

## Overview

When a booking is created, the system automatically sends confirmation emails to:
- **Tourist/Guest**: Booking confirmation with all details
- **Vendor**: Notification of new booking with customer information
- **Admin**: Alert about new booking for monitoring

## Prerequisites

1. ✅ Resend account with SMTP configured in Supabase
2. ✅ All required secrets already added to Supabase:
   - `RESEND_API_KEY`
   - `FROM_EMAIL`
   - `FRONTEND_URL`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_DB_URL`

## Deployment Steps

### 1. Deploy the Edge Function

#### Option A: Using Supabase CLI (Recommended)

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link your project (get project ref from Supabase dashboard)
supabase link --project-ref your-project-ref

# Navigate to your project directory
cd "dirt-t-frontend"

# Deploy the function
supabase functions deploy send-booking-emails
```

#### Option B: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Edge Functions** in the sidebar
3. Click **Create a new function**
4. Name it `send-booking-emails`
5. Copy the contents of `supabase/functions/send-booking-emails/index.ts` into the editor
6. Click **Deploy**

### 2. Verify Secrets

Ensure all secrets are set in Supabase:

1. Go to **Settings** > **Edge Functions** > **Secrets**
2. Verify all required secrets are present:
   - `RESEND_API_KEY`
   - `FROM_EMAIL`
   - `FRONTEND_URL`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_DB_URL` (if needed)

### 3. Test the Function

1. Create a test booking in your application
2. Check the browser console for email sending status
3. Verify emails are received by:
   - Tourist/Guest email
   - Vendor email
   - Admin email(s)

## How It Works

1. **Booking Creation**: When `createBooking()` is called in `src/lib/database.ts`, it:
   - Creates the booking in the database
   - Automatically calls the `send-booking-emails` edge function
   - Returns the booking data (emails are sent asynchronously)

2. **Edge Function**: The `send-booking-emails` function:
   - Fetches booking details with service information
   - Retrieves tourist, vendor, and admin email addresses
   - Sends personalized HTML emails via Resend API
   - Returns success/error status

## Email Templates

### Tourist Email
- **Theme**: Green
- **Content**: Booking confirmation with all details
- **Includes**: Booking ID, service details, dates, amount, status
- **Link**: View booking page

### Vendor Email
- **Theme**: Blue
- **Content**: New booking notification
- **Includes**: Booking details + customer information
- **Link**: Vendor bookings page

### Admin Email
- **Theme**: Orange
- **Content**: New booking alert
- **Includes**: Complete booking information + customer + vendor details
- **Link**: Admin bookings page

## Troubleshooting

### Emails Not Being Sent

1. **Check Edge Function Logs**:
   - Go to Supabase Dashboard > Edge Functions > `send-booking-emails` > Logs
   - Look for error messages

2. **Verify Secrets**:
   - Ensure all secrets are correctly set
   - Check that `FROM_EMAIL` is verified in Resend

3. **Check Resend API**:
   - Verify `RESEND_API_KEY` is valid
   - Check Resend dashboard for delivery status

4. **Verify Email Addresses**:
   - Tourist: Check `tourist_id` or `guest_email` in booking
   - Vendor: Check vendor profile has email
   - Admin: Check at least one admin profile exists with `role = 'admin'`

### Function Not Being Called

1. **Check Browser Console**:
   - Look for errors when creating a booking
   - Verify the function is being invoked

2. **Check Network Tab**:
   - Look for request to `/functions/v1/send-booking-emails`
   - Check response status

3. **Verify Function Deployment**:
   - Ensure function is deployed and active
   - Check function URL is correct

### CORS Errors

The function includes CORS headers. If you encounter issues:
- Verify the function is deployed correctly
- Check that authentication headers are being sent
- Ensure the request origin is allowed

## Manual Testing

You can manually test the function using curl:

```bash
curl -X POST \
  'https://your-project.supabase.co/functions/v1/send-booking-emails' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"booking_id": "your-booking-id-here"}'
```

Or using the Supabase client in your code:

```typescript
const { data, error } = await supabase.functions.invoke('send-booking-emails', {
  body: { booking_id: 'your-booking-id' }
})
```

## Support

If you encounter issues:
1. Check the Edge Function logs in Supabase dashboard
2. Verify all secrets are correctly configured
3. Test the Resend API key independently
4. Check that email addresses are valid and accessible

