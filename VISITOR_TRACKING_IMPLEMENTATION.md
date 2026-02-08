# Visitor Activity Tracking - Implementation Summary

## What Was Implemented

You now have a complete visitor activity tracking system for **bookings.dirt-trails.com** that allows tourists to like and review services while tracking their activity.

## Components Created/Updated

### 1. Database Migration
**File:** `db/006_visitor_activity_tracking.sql`

Creates 5 tables with full RLS security:
- `visitor_sessions` - Tracks unique visitors by IP address
- `service_likes` - Records service likes
- `service_reviews` - Stores reviews with moderation status
- `visitor_activity` - Aggregated analytics per service
- `service_view_logs` - Detailed view logs for analytics

### 2. Frontend Hook
**File:** `src/hooks/useVisitorTracking.ts`

Enhanced with new functions:
```typescript
const {
  visitorSession,        // Current visitor info
  trackServiceView,      // Track when user views a service
  likeService,          // Like a service
  unlikeService,        // Unlike a service
  isServiceLiked,       // Check if service is liked
  submitReview,         // Submit a review
  fetchServiceReviews,  // Get approved reviews
  fetchLikesCount       // Get likes count
} = useVisitorTracking()
```

### 3. React Component
**File:** `src/components/ServiceReviewsWidget.tsx`

Complete UI component for:
- Displaying likes count with heart button
- Showing average rating and review count
- Listing approved reviews with ratings
- Form to submit new reviews
- Star rating picker
- User name and email input

## How It Works

### Visitor Tracking Flow
1. User visits `bookings.dirt-trails.com`
2. Hook fetches visitor's IP address
3. Creates/retrieves visitor session
4. Tracks device type and browser
5. Session ID stored in sessionStorage

### Like System
1. User clicks heart icon on a service
2. `recordServiceLike()` RPC adds like to database
3. `visitor_activity` table updates like count automatically
4. UI shows updated like count

### Review System
1. User clicks "Write Review" button
2. Form appears for name, email, rating (1-5 stars), and comment
3. Review submitted with status='pending' (awaiting moderation)
4. Admin can approve/reject reviews from vendor dashboard
5. Only approved reviews show to public

### Analytics
Vendors can see in their dashboard:
- Total views of each service
- Unique visitor count
- Total likes and likes this month
- Average rating
- Total reviews (pending + approved)
- Monthly engagement metrics

## Key Features

✅ **IP-Based Tracking** - Tracks visitors even without account
✅ **Like/Review System** - Simple engagement mechanism
✅ **Moderation** - Reviews require admin approval before public display
✅ **Security** - Row-level security policies protect data
✅ **Analytics** - Automatic aggregation of metrics via triggers
✅ **Privacy** - Users' data only accessible to themselves
✅ **Geolocation** - Tracks visitor countries and cities
✅ **Device Tracking** - Knows device type (mobile/tablet/desktop)

## Usage Examples

### Track Service View
```typescript
const { trackServiceView } = useVisitorTracking()

useEffect(() => {
  trackServiceView(serviceId, document.referrer)
}, [serviceId])
```

### Like a Service
```typescript
const { likeService, unlikeService, isServiceLiked } = useVisitorTracking()

async function handleLike() {
  if (await isServiceLiked(serviceId)) {
    await unlikeService(serviceId)
  } else {
    await likeService(serviceId)
  }
}
```

### Show Reviews Widget
```typescript
import { ServiceReviewsWidget } from '../components/ServiceReviewsWidget'

<ServiceReviewsWidget 
  serviceId={serviceId}
  onReviewSubmit={(review) => console.log('New review:', review)}
/>
```

### Get Reviews Programmatically
```typescript
const { fetchServiceReviews, fetchLikesCount } = useVisitorTracking()

const reviews = await fetchServiceReviews(serviceId, 10)
const likesCount = await fetchLikesCount(serviceId)
```

## Database RPC Functions

All available in the SQL migration:

- `get_or_create_visitor_session()` - Create/retrieve visitor session
- `record_service_like()` - Add a like
- `remove_service_like()` - Remove a like
- `log_service_view()` - Track a view
- `update_service_average_rating()` - Recalculate rating

## Type Definitions

```typescript
// Visitor session
interface VisitorSession {
  id: string
  ip_address: string
  user_id?: string
  country?: string
  city?: string
  device_type?: string
  browser_info?: string
  first_visit_at: string
  last_visit_at: string
  visit_count: number
}

// Service like
interface ServiceLike {
  id: string
  service_id: string
  visitor_session_id: string
  liked_at: string
}

// Service review
interface ServiceReview {
  id: string
  service_id: string
  visitor_name: string
  visitor_email?: string
  rating: number  // 1-5
  comment?: string
  status: 'pending' | 'approved' | 'rejected'
  helpful_count: number
  created_at: string
}

// Activity stats
interface VisitorActivity {
  id: string
  service_id: string
  vendor_id: string
  total_views: number
  unique_visitors: number
  total_likes: number
  total_reviews: number
  approved_reviews: number
  average_rating: number
  views_this_month: number
  likes_this_month: number
}
```

## Integration Points

To integrate into your app:

1. **Service Detail Page** - Add `ServiceReviewsWidget` component
2. **Service Cards** - Track views when cards are clicked
3. **Search Results** - Track what users search for
4. **Vendor Dashboard** - Display `visitor_activity` stats
5. **Admin Dashboard** - Show moderation queue for reviews

## Security & Privacy

✅ **Row-Level Security** - Database policies enforce access control
✅ **No Direct Access** - View logs hidden from users
✅ **Review Moderation** - Only approved reviews visible
✅ **IP Privacy** - Geolocation only, not sharing IPs externally
✅ **Data Retention** - Can archive old view logs

## Database Indexes

Optimized for performance:
- Quick session lookups by IP
- Fast service-specific queries
- Efficient sorting by popularity/rating
- Time-based queries for monthly stats

## Triggers & Automation

Automatic updates via triggers:
- `updated_at` timestamp on record modifications
- Like counts update visitor_activity automatically
- Review approvals recalculate average ratings
- Monthly counts reset (would need scheduled job)

## Next Steps

1. ✅ Database migration applied
2. ✅ Frontend hook updated with new functions
3. ✅ React component created
4. ⚠️ Add `ServiceReviewsWidget` to service pages
5. ⚠️ Add review moderation UI to admin dashboard
6. ⚠️ Display visitor analytics on vendor dashboard
7. ⚠️ Add rate limiting if needed
8. ⚠️ Set up scheduled job to reset monthly counts

## Testing

Test the system by:

1. Open service detail page in incognito (new session)
2. Click heart icon to like service
3. Click "Write Review" and submit a review
4. Check Supabase tables for new records
5. Verify visitor_activity was updated
6. Check admin dashboard for pending reviews
7. Approve review and verify it appears

## Troubleshooting

**Views not tracking?**
- Ensure `trackServiceView()` is called
- Check sessionStorage for visitor_session_id
- Verify IP geolocation service is working

**Likes not saving?**
- Check unique constraint (service + session)
- Verify visitor session exists
- Check RLS policies

**Reviews not appearing?**
- Check review status in database (must be 'approved')
- Verify RLS allows reading approved reviews
- Check if review ID is correct

**Performance issues?**
- Check if indexes are being used (EXPLAIN plan)
- Consider archiving old view logs
- Monitor visitor_activity aggregation triggers

## Files Modified

- `db/006_visitor_activity_tracking.sql` - Fixed NULL handling in indexes
- `src/hooks/useVisitorTracking.ts` - Added like and review functions
- `src/components/ServiceReviewsWidget.tsx` - New UI component
- `src/lib/database.ts` - Added RPC function wrappers
- `src/App.tsx` - Added vendor visitor-activity route

## Support Documentation

See `VISITOR_ACTIVITY_TRACKING.md` for detailed API documentation.
