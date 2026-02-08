# Visitor Activity Tracking System

This document describes the database schema and functionality for tracking visitor activity, likes, and reviews on services in the Dirt Trails platform.

## Overview

The visitor activity tracking system allows:
1. **Visitor Tracking**: Track unique visitors by IP address with optional user association
2. **Service Likes**: Visitors can like services they're interested in
3. **Service Reviews**: Visitors can submit ratings and reviews for services
4. **Activity Analytics**: Aggregate metrics for vendors to understand engagement

## Database Tables

### 1. `visitor_sessions`
Tracks unique visitors by IP address. Each session can have multiple service interactions.

**Columns:**
- `id` (UUID): Primary key
- `ip_address` (inet): Visitor's IP address (unique identifier)
- `user_id` (UUID): Optional authenticated user ID
- `country` (text): Visitor's country (from geolocation)
- `city` (text): Visitor's city (from geolocation)
- `device_type` (text): 'mobile', 'tablet', or 'desktop'
- `browser_info` (text): Browser name (Chrome, Safari, Firefox, etc.)
- `user_agent` (text): Full user agent string
- `first_visit_at` (timestamp): When the visitor first arrived
- `last_visit_at` (timestamp): Last activity timestamp
- `visit_count` (integer): Total number of visits
- `created_at` (timestamp): Record creation time
- `updated_at` (timestamp): Last update time

**Indices:**
- `idx_visitor_sessions_ip_user`: (ip_address, user_id) - Quick session lookup
- `idx_visitor_sessions_user_id`: For authenticated user lookups
- `idx_visitor_sessions_ip_address`: For IP-based tracking
- `idx_visitor_sessions_country`: For geographic analytics
- `idx_visitor_sessions_last_visit`: For active visitor tracking

### 2. `service_likes`
Records which services visitors have liked.

**Columns:**
- `id` (UUID): Primary key
- `service_id` (UUID): The service being liked
- `visitor_session_id` (UUID): The visitor who liked it
- `user_id` (UUID): Optional authenticated user ID
- `ip_address` (inet): Visitor's IP (for verification)
- `liked_at` (timestamp): When the like was recorded
- `created_at` (timestamp): Record creation time

**Constraints:**
- Unique constraint on (service_id, visitor_session_id) - Each visitor can like a service only once

**Indices:**
- `idx_service_likes_unique`: Prevents duplicate likes
- `idx_service_likes_service_id`: Find all likes for a service
- `idx_service_likes_visitor_session_id`: Find likes by visitor
- `idx_service_likes_user_id`: Find likes by authenticated user
- `idx_service_likes_created_at`: For recent activity

### 3. `service_reviews`
Stores reviews and ratings for services.

**Columns:**
- `id` (UUID): Primary key
- `service_id` (UUID): The service being reviewed
- `visitor_session_id` (UUID): The visitor (optional for non-authenticated reviews)
- `user_id` (UUID): Authenticated user (optional)
- `ip_address` (inet): Visitor's IP
- `visitor_name` (text): Name of reviewer
- `visitor_email` (text): Email (optional)
- `rating` (integer): 1-5 star rating
- `comment` (text): Review text
- `helpful_count` (integer): Number of users who found helpful
- `unhelpful_count` (integer): Number of users who found unhelpful
- `is_verified_booking` (boolean): Whether this is from a verified booking
- `status` (text): 'pending', 'approved', or 'rejected'
- `approved_by` (UUID): Admin who approved the review
- `rejection_reason` (text): Why review was rejected
- `created_at` (timestamp): Submission time
- `updated_at` (timestamp): Last update time
- `approved_at` (timestamp): When approved

**Indices:**
- `idx_service_reviews_service_id`: Find reviews for a service
- `idx_service_reviews_visitor_session_id`: Find reviews by visitor
- `idx_service_reviews_user_id`: Find reviews by authenticated user
- `idx_service_reviews_status`: Filter by approval status
- `idx_service_reviews_created_at`: Recent reviews
- `idx_service_reviews_rating`: Find by rating

### 4. `visitor_activity`
Aggregated analytics per service for quick vendor dashboard access.

**Columns:**
- `id` (UUID): Primary key
- `service_id` (UUID): The service (unique)
- `vendor_id` (UUID): The service's vendor
- `total_views` (integer): Total page views
- `unique_visitors` (integer): Count of unique visitor sessions
- `total_likes` (integer): Total likes received
- `total_reviews` (integer): Total reviews (pending + approved)
- `approved_reviews` (integer): Only approved reviews
- `average_rating` (numeric): Average of all approved reviews
- `total_helpful_count` (integer): Sum of helpful votes
- `views_this_month` (integer): Monthly view count
- `likes_this_month` (integer): Monthly like count
- `reviews_this_month` (integer): Monthly review count
- `last_activity_at` (timestamp): Most recent interaction
- `created_at` (timestamp): Record creation time
- `updated_at` (timestamp): Last update time

**Indices:**
- `idx_visitor_activity_service_id`: Lookup by service
- `idx_visitor_activity_vendor_id`: Find all activities for vendor
- `idx_visitor_activity_total_views`: Sort by popularity
- `idx_visitor_activity_average_rating`: Sort by rating

### 5. `service_view_logs`
Detailed logs of every service view for in-depth analytics.

**Columns:**
- `id` (UUID): Primary key
- `service_id` (UUID): The service viewed
- `visitor_session_id` (UUID): The visitor
- `user_id` (UUID): Optional authenticated user
- `ip_address` (inet): Visitor's IP
- `referrer` (text): HTTP referrer (where they came from)
- `viewed_at` (timestamp): When viewed

**Indices:**
- `idx_service_view_logs_service_id`: Find all views for service
- `idx_service_view_logs_visitor_session_id`: Find all views by visitor
- `idx_service_view_logs_viewed_at`: Time-based queries

## Key Functions

### Session Management

#### `get_or_create_visitor_session()`
```sql
SELECT get_or_create_visitor_session(
  p_ip_address,
  p_user_id,
  p_country,
  p_city,
  p_device_type,
  p_browser_info,
  p_user_agent
) RETURNS uuid
```
Gets an existing session or creates a new one. Returns the session ID.

### Like Operations

#### `record_service_like()`
```sql
SELECT record_service_like(
  p_service_id,
  p_visitor_session_id,
  p_user_id,
  p_ip_address
) RETURNS uuid
```
Records a like and updates visitor activity. Returns the like ID.

#### `remove_service_like()`
```sql
SELECT remove_service_like(
  p_service_id,
  p_visitor_session_id
) RETURNS boolean
```
Removes a like and decrements the like count.

### Analytics Functions

#### `update_service_average_rating()`
Recalculates the average rating for a service based on approved reviews.

#### `log_service_view()`
Records a service view in both the view_logs and visitor_activity tables.

## Row-Level Security (RLS)

### Policies

1. **visitor_sessions**: Users can only view their own sessions
2. **service_likes**: Public read, anyone can insert
3. **service_reviews**: 
   - Approved reviews are public
   - Users can see their own reviews
   - Admins can see all reviews
4. **visitor_activity**: Public read, vendors can update their own
5. **service_view_logs**: Not directly accessible (admin only)

## TypeScript Interfaces

```typescript
interface VisitorSession {
  id: string
  ip_address: string
  user_id?: string
  country?: string
  city?: string
  device_type?: string
  browser_info?: string
  user_agent?: string
  first_visit_at: string
  last_visit_at: string
  visit_count: number
  created_at: string
  updated_at: string
}

interface ServiceLike {
  id: string
  service_id: string
  visitor_session_id: string
  user_id?: string
  ip_address: string
  liked_at: string
  created_at: string
}

interface ServiceReview {
  id: string
  service_id: string
  visitor_session_id?: string
  user_id?: string
  ip_address?: string
  visitor_name: string
  visitor_email?: string
  rating: number
  comment?: string
  helpful_count: number
  unhelpful_count: number
  is_verified_booking: boolean
  status: 'pending' | 'approved' | 'rejected'
  approved_by?: string
  rejection_reason?: string
  created_at: string
  updated_at: string
  approved_at?: string
}

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
  total_helpful_count: number
  views_this_month: number
  likes_this_month: number
  reviews_this_month: number
  last_activity_at?: string
  created_at: string
  updated_at: string
}
```

## Frontend Integration

### Using the Visitor Tracking Hook

```typescript
import { useVisitorTracking } from '../hooks/useVisitorTracking'

function MyComponent() {
  const { visitorSession, loading, error, trackServiceView } = useVisitorTracking()

  useEffect(() => {
    if (visitorSession) {
      trackServiceView('service-id-123')
    }
  }, [visitorSession])

  // ...
}
```

### Using the Like Button Component

```typescript
import ServiceLikeButton from '../components/ServiceLikeButton'

function ServiceCard({ service, visitorSessionId }) {
  const [likeCount, setLikeCount] = useState(service.total_likes)

  return (
    <>
      <ServiceLikeButton
        serviceId={service.id}
        visitorSessionId={visitorSessionId}
        initialLikeCount={likeCount}
        onLikeChange={(isLiked, count) => setLikeCount(count)}
      />
    </>
  )
}
```

### Using the Reviews Component

```typescript
import ServiceReviews from '../components/ServiceReviews'

function ServiceDetail({ service, visitorSessionId }) {
  return (
    <ServiceReviews
      serviceId={service.id}
      vendorName={service.vendors.business_name}
      visitorSessionId={visitorSessionId}
    />
  )
}
```

## Database Migration

The migration file `db/006_visitor_activity_tracking.sql` contains all the necessary SQL to set up this system.

To apply the migration:

```bash
# Via Supabase CLI
supabase db push

# Or directly in your Supabase dashboard
# Copy the contents of db/006_visitor_activity_tracking.sql into the SQL editor
```

## API Functions

All functions are exported from `src/lib/database.ts`:

### Session Management
- `getOrCreateVisitorSession(ipAddress, options?)`

### Likes
- `likeService(serviceId, visitorSessionId, options?)`
- `unlikeService(serviceId, visitorSessionId)`
- `hasVisitorLikedService(serviceId, visitorSessionId)`
- `getServiceLikes(serviceId)`

### Reviews
- `createServiceReview(serviceId, review)`
- `getServiceReviews(serviceId, options?)`
- `markReviewHelpful(reviewId)`
- `markReviewUnhelpful(reviewId)`

### Analytics
- `getServiceVisitorActivity(serviceId)`
- `getVendorVisitorActivity(vendorId)`
- `getServiceActivityStats(serviceId)`
- `logServiceView(serviceId, visitorSessionId, options?)`

## Future Enhancements

1. **Photo Reviews**: Allow users to upload photos with reviews
2. **Review Moderation**: Admin dashboard for approving/rejecting reviews
3. **Verified Purchases**: Automatically mark reviews from actual bookings as verified
4. **Review Replies**: Allow vendors to respond to reviews
5. **Review Filtering**: Sort by helpful, recent, rating, etc.
6. **Review Sentiment**: Analyze review sentiment automatically
7. **Duplicate Prevention**: Prevent multiple reviews from same user
8. **Review Incentives**: Reward helpful reviews
9. **Analytics Export**: Export visitor activity data for vendors
10. **Visitor Segmentation**: Group visitors by behavior patterns
