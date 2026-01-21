# DirtTrails MVP - Tourism Marketplace Admin Dashboard

A comprehensive multi-vendor tourism marketplace for Uganda, connecting tourists with local service providers.

## 🌟 Features

### Admin Dashboard
- **Vendor Management** - Review and approve vendor applications
- **Service Management** - Approve/reject service listings
- **Booking Management** - Monitor all bookings and transactions
- **Transaction Monitoring** - Track payments and financial activity
- **Real-time Analytics** - Dashboard with key metrics and insights

### Core Functionality
- **Multi-vendor Support** - Hotels, guides, restaurants, transport providers
- **Service Categories** - Organized by tourism service types
- **Booking System** - Complete booking workflow with status tracking
- **Wallet System** - Vendor payment management
- **Role-based Access** - Tourist, Vendor, Admin user types
- **Vendor Onboarding Emails** - Automated email flow for vendor signup, verification, and approval

## 📧 Vendor Email Onboarding

Vendors receive automated emails during their onboarding process:

1. **Signup Email**: Sent immediately after vendor registration, instructing them to verify their email and explaining the 48-hour review process.
2. **Post-Verification Email**: Sent after email verification, confirming account is under review.
3. **Approval Email**: Sent when admin approves the vendor account, including a login link to access the dashboard.

### Configuration
- Set `VITE_VENDOR_EMAIL_ENDPOINT` to your server endpoint URL (e.g., Supabase Edge Function).
- Deploy the email server (see `server/sendVendorEmails/index.ts` for example implementation using SendGrid).
- Set environment variables: `SENDGRID_API_KEY`, `FROM_EMAIL`, `FRONTEND_URL`.

## 🚀 Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: PostgreSQL + Auth + Storage
- **State Management**: React Context + Custom Hooks
- **UI Components**: Heroicons + Lucide React
- **Routing**: React Router v6 with protected routes

## 📦 Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   

4. Run the development server:
   ```bash
   npm run dev
   ```

## 🧪 Testing Vendor Emails

To test the vendor email flow locally:

1. **Start the dev server**: `npm run dev` (runs on http://localhost:5173)
2. **Start the test server**: `node test-email-server.js` (runs on port 3001)
3. **Set environment variables** in your `.env` file:
   ```
   VITE_VENDOR_EMAIL_ENDPOINT=http://localhost:3001/api/send-vendor-email
   ```
4. **Sign up as a vendor** in the app - Check the test server console for the initial email request
5. **Verify the vendor's email** - Click the verification link in the email (keep both servers running)
6. **Check for post-verification email** - The test server will log the request
7. **Approve the vendor** in your admin dashboard (ensure it calls the approval email endpoint)

**Important**: Keep both the dev server and test server running during testing. The email verification link redirects back to your app, so the dev server must be active to handle the callback.

For production, deploy the Supabase Edge Function and update the endpoint URL.

## 🗄️ Database Schema

The system includes comprehensive database schema with:
- User profiles and authentication
- Vendor management with approval workflow
- Service listings with categories
- Booking system with status tracking
- Wallet and transaction management
- Row Level Security (RLS) policies

## 🔐 Authentication

- Email/password authentication 
- Role-based access control (Tourist, Vendor, Admin)
- Protected routes and secure API access

## 📱 Future Development

The MVP is designed to scale with:
- Flutter mobile app for tourists and vendors
- Payment integration (Flutterwave)
- AI recommendations engine
- Multi-language support
- Advanced analytics and reporting

## 🎯 MVP Roadmap

- ✅ **Phase 1**: Database setup, authentication, admin dashboard
- ✅ **Phase 2**: Vendor and service management
- ✅ **Phase 3**: Booking and transaction monitoring


## 🤝 Contributing

This is an MVP for Uganda's tourism industry. Future contributions welcome for:
- Mobile app development
- Payment gateway integration
- AI/ML features
- Localization

## 📄 License

Private project for DirtTrails tourism marketplace.

## ALTER TABLE profiles DISABLE ROW LEVEL SECURITY; disable profiles RLS if users cant login