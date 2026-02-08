# Quick Integration Guide - Visitor Activity Tracking

## Step 1: Apply Database Migration

Run the migration file against your Supabase database:

```bash
# Using Supabase CLI
supabase db push

# Or manually in Supabase SQL editor
# Copy contents of: db/006_visitor_activity_tracking.sql
# Run in SQL editor
```

## Step 2: Add ServiceReviewsWidget to Service Pages

Find your service detail page component and add the widget:

```typescript
import { ServiceReviewsWidget } from '../components/ServiceReviewsWidget'

function ServiceDetailPage({ serviceId }) {
  return (
    <div className="space-y-8">
      {/* ... other content ... */}
      
      {/* Add reviews and likes section */}
      <ServiceReviewsWidget 
        serviceId={serviceId}
        onReviewSubmit={(review) => {
          console.log('Review submitted:', review)
          // Optional: refresh page or update UI
        }}
      />
    </div>
  )
}
```

## Step 3: Track Service Views

Add view tracking to service detail pages:

```typescript
import { useVisitorTracking } from '../hooks/useVisitorTracking'

function ServiceDetailPage() {
  const { trackServiceView } = useVisitorTracking()

  useEffect(() => {
    // Track that user viewed this service
    trackServiceView(serviceId)
  }, [serviceId, trackServiceView])

  // ... rest of component
}
```

## Step 4: Display Stats on Vendor Dashboard

Show analytics on vendor pages:

```typescript
import { getVendorActivityStats } from '../lib/database'

function VendorDashboard() {
  const [stats, setStats] = useState([])

  useEffect(() => {
    const loadStats = async () => {
      const vendorId = getCurrentVendorId() // Your logic
      const activityStats = await getVendorActivityStats(vendorId)
      setStats(activityStats)
    }
    loadStats()
  }, [])

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {stats.map(stat => (
        <div key={stat.service_id} className="bg-white p-4 rounded-lg border">
          <h3 className="font-semibold">{stat.service_name}</h3>
          <p className="text-2xl font-bold text-blue-600">{stat.total_views}</p>
          <p className="text-sm text-gray-600">Total Views</p>
          
          <p className="mt-4 text-xl font-bold">{stat.total_likes}</p>
          <p className="text-sm text-gray-600">Likes</p>
          
          <p className="mt-4 text-xl font-bold text-yellow-500">
            ⭐ {stat.average_rating}
          </p>
          <p className="text-sm text-gray-600">
            {stat.approved_reviews} reviews
          </p>
        </div>
      ))}
    </div>
  )
}
```

## Step 5: Add Review Moderation UI

On admin dashboard, show pending reviews:

```typescript
function AdminReviewModeration() {
  const [pendingReviews, setPendingReviews] = useState([])

  useEffect(() => {
    const loadPending = async () => {
      const { data } = await supabase
        .from('service_reviews')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
      setPendingReviews(data || [])
    }
    loadPending()
  }, [])

  const approveReview = async (reviewId) => {
    const { error } = await supabase
      .from('service_reviews')
      .update({ 
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: userId
      })
      .eq('id', reviewId)

    if (!error) {
      setPendingReviews(prev => 
        prev.filter(r => r.id !== reviewId)
      )
    }
  }

  const rejectReview = async (reviewId, reason) => {
    const { error } = await supabase
      .from('service_reviews')
      .update({ 
        status: 'rejected',
        rejection_reason: reason,
        approved_by: userId
      })
      .eq('id', reviewId)

    if (!error) {
      setPendingReviews(prev => 
        prev.filter(r => r.id !== reviewId)
      )
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Pending Review Moderation</h2>
      <p className="text-gray-600">{pendingReviews.length} reviews pending approval</p>
      
      {pendingReviews.map(review => (
        <div key={review.id} className="bg-white p-4 rounded border">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-semibold">{review.visitor_name}</h4>
              <p className="text-sm text-gray-600">{review.visitor_email}</p>
              <div className="flex gap-1 mt-2">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className={i < review.rating ? '⭐' : '☆'} />
                ))}
              </div>
              <p className="mt-2">{review.comment}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => approveReview(review.id)}
                className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Approve
              </button>
              <button
                onClick={() => rejectReview(review.id, 'Inappropriate content')}
                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
```

## Step 6: Style the Components

The components use Tailwind CSS. Ensure your project has Tailwind configured:

```json
// tailwind.config.js should include proper colors
module.exports = {
  theme: {
    extend: {
      colors: {
        // Add any custom colors as needed
      }
    }
  }
}
```

## Available Database Functions

All functions are exported from `src/lib/database.ts`:

```typescript
// Visitor tracking
getOrCreateVisitorSession(ipAddress, options)
logServiceView(serviceId, visitorSessionId, options)

// Likes
recordServiceLike(serviceId, visitorSessionId, options)
removeServiceLike(serviceId, visitorSessionId)
checkServiceLiked(serviceId, visitorSessionId)
getServiceLikesCount(serviceId)

// Reviews
submitServiceReview(serviceId, visitorSessionId, review)
getServiceReviews(serviceId, limit)

// Analytics
getServiceVisitorActivity(serviceId)
getVendorActivityStats(vendorId)
```

## Environment Setup

Ensure these environment variables are set:

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Testing Checklist

- [ ] Database tables created successfully
- [ ] ServiceReviewsWidget displays on service page
- [ ] Can like/unlike services
- [ ] Like count updates immediately
- [ ] Can submit reviews (shows "pending" message)
- [ ] Vendor can see activity stats
- [ ] Admin can moderate pending reviews
- [ ] Approved reviews appear on service page
- [ ] Views are tracked in database
- [ ] Geolocation data is collected

## Common Issues

### Widget not showing
- Check if serviceId is passed correctly
- Verify database migration was applied
- Check browser console for errors

### Likes not persisting
- Ensure visitor session was created
- Check RLS policies in Supabase
- Verify unique constraint isn't violated

### Reviews disappearing after approval
- Check status='approved' in database
- Verify RLS policies allow reading
- Ensure approved_at timestamp is set

### Performance slow
- Check if database indexes are created
- Monitor view logs (can grow large)
- Consider archiving old logs

## API Reference

### useVisitorTracking Hook

```typescript
const {
  visitorSession: VisitorSession | null
  loading: boolean
  error: string | null
  trackServiceView: (serviceId: string, referrer?: string) => Promise<void>
  likeService: (serviceId: string) => Promise<boolean>
  unlikeService: (serviceId: string) => Promise<boolean>
  isServiceLiked: (serviceId: string) => Promise<boolean>
  submitReview: (serviceId: string, review: ReviewInput) => Promise<Result>
  fetchServiceReviews: (serviceId: string, limit?: number) => Promise<ServiceReview[]>
  fetchLikesCount: (serviceId: string) => Promise<number>
} = useVisitorTracking()
```

### ServiceReviewsWidget Props

```typescript
interface ServiceReviewsWidgetProps {
  serviceId: string
  onReviewSubmit?: (review: ServiceReview) => void
}
```

## Next Steps

1. Apply database migration
2. Add widget to service pages
3. Add view tracking
4. Display vendor stats
5. Create review moderation UI
6. Test all functionality
7. Monitor performance
8. Set up alerts for suspicious activity

## Support

For questions or issues:
1. Check SQL migration file for schema
2. Review TypeScript types in database.ts
3. Check component props and usage
4. Review hook functions
5. Check browser console and database logs

---

**Ready to deploy?**

Make sure to:
- Test in staging environment first
- Verify all RLS policies are set correctly
- Monitor database performance
- Set up backups for view logs
- Consider data retention policies
