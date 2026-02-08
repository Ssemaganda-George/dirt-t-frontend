# Quick Start: Visitor Activity Tracking Integration

## 📋 5-Minute Setup Guide

### Step 1: Deploy Database Migration

1. Open your Supabase dashboard
2. Go to SQL Editor
3. Copy the entire contents of `db/006_visitor_activity_tracking.sql`
4. Paste into a new query in SQL Editor
5. Click "Run"

The migration will create all tables, functions, and RLS policies.

---

### Step 2: Add Visitor Tracking to App

**In `src/App.tsx` or your root component:**

```tsx
import { useVisitorTracking } from './hooks/useVisitorTracking'

export default function App() {
  const { visitorSession, loading } = useVisitorTracking()
  
  // Pass visitorSession to your routes/context
  return (
    // Your app JSX
  )
}
```

---

### Step 3: Add Like Button to Service Components

**In any service card or detail component:**

```tsx
import ServiceLikeButton from './components/ServiceLikeButton'

function ServiceCard({ service, visitorSession }) {
  return (
    <div>
      {/* Service content */}
      
      <ServiceLikeButton
        serviceId={service.id}
        visitorSessionId={visitorSession?.id}
        initialLikeCount={service.total_likes || 0}
      />
    </div>
  )
}
```

---

### Step 4: Add Reviews Section

**In your service detail page:**

```tsx
import ServiceReviews from './components/ServiceReviews'

function ServiceDetail({ service, visitorSession }) {
  return (
    <div>
      {/* Service content */}
      
      <ServiceReviews
        serviceId={service.id}
        vendorName={service.vendors.business_name}
        visitorSessionId={visitorSession?.id}
      />
    </div>
  )
}
```

---

### Step 5: Track Service Views (Optional)

**When a service is viewed:**

```tsx
import { useVisitorTracking } from './hooks/useVisitorTracking'

function ServiceDetail() {
  const { visitorSession, trackServiceView } = useVisitorTracking()
  const { id: serviceId } = useParams()

  useEffect(() => {
    if (visitorSession && serviceId) {
      trackServiceView(serviceId, document.referrer)
    }
  }, [visitorSession, serviceId])

  // ... rest of component
}
```

---

## 🎯 Common Integration Patterns

### Pattern 1: Service List with Likes

```tsx
import { useVisitorTracking } from './hooks/useVisitorTracking'
import ServiceLikeButton from './components/ServiceLikeButton'

export function ServiceList({ services }) {
  const { visitorSession } = useVisitorTracking()

  return (
    <div className="grid gap-4">
      {services.map(service => (
        <div key={service.id} className="p-4 border rounded">
          <h3>{service.title}</h3>
          <p>{service.description}</p>
          
          <ServiceLikeButton
            serviceId={service.id}
            visitorSessionId={visitorSession?.id}
            initialLikeCount={service.total_likes || 0}
          />
        </div>
      ))}
    </div>
  )
}
```

### Pattern 2: Service Detail with Full Review Section

```tsx
import { useVisitorTracking } from './hooks/useVisitorTracking'
import ServiceReviews from './components/ServiceReviews'
import ServiceLikeButton from './components/ServiceLikeButton'

export function ServiceDetailPage() {
  const { slug } = useParams()
  const { visitorSession, trackServiceView } = useVisitorTracking()
  const [service, setService] = useState(null)

  useEffect(() => {
    loadService(slug).then(setService)
  }, [slug])

  useEffect(() => {
    if (visitorSession && service) {
      trackServiceView(service.id)
    }
  }, [visitorSession, service])

  if (!service) return <LoadingSpinner />

  return (
    <div className="max-w-4xl mx-auto">
      <img src={service.images[0]} alt={service.title} />
      <h1>{service.title}</h1>
      <p>{service.description}</p>

      {/* Like Button */}
      <ServiceLikeButton
        serviceId={service.id}
        visitorSessionId={visitorSession?.id}
        initialLikeCount={service.activity?.total_likes || 0}
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Views" value={service.activity?.total_views} />
        <StatCard label="Likes" value={service.activity?.total_likes} />
        <StatCard label="Avg Rating" value={service.activity?.average_rating} />
      </div>

      {/* Reviews Section */}
      <ServiceReviews
        serviceId={service.id}
        vendorName={service.vendors.business_name}
        visitorSessionId={visitorSession?.id}
      />
    </div>
  )
}
```

### Pattern 3: Vendor Activity Dashboard

```tsx
import { getVendorVisitorActivity } from './lib/database'

export function VendorDashboard({ vendorId }) {
  const [activities, setActivities] = useState([])

  useEffect(() => {
    getVendorVisitorActivity(vendorId).then(setActivities)
  }, [vendorId])

  return (
    <table>
      <thead>
        <tr>
          <th>Service</th>
          <th>Views</th>
          <th>Likes</th>
          <th>Reviews</th>
          <th>Avg Rating</th>
        </tr>
      </thead>
      <tbody>
        {activities.map(activity => (
          <tr key={activity.service_id}>
            <td>{activity.services?.title}</td>
            <td>{activity.total_views}</td>
            <td>{activity.total_likes}</td>
            <td>{activity.approved_reviews}</td>
            <td>⭐ {activity.average_rating}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

---

## 🐛 Troubleshooting

### Problem: visitorSession is undefined

**Solution:** 
- Make sure `useVisitorTracking()` is called at a high level (App component)
- Check browser console for IP fetch errors
- Verify ipify API is accessible (sometimes blocked by CORS in dev)

### Problem: Likes not appearing

**Solution:**
- Ensure migration was run successfully
- Check RLS policies in Supabase dashboard
- Verify visitor_session_id is being passed to component
- Check browser DevTools Network tab for API errors

### Problem: Reviews not showing

**Solution:**
- Reviews default to 'pending' status (need admin approval)
- Check that reviews were inserted in database
- Verify `status = 'approved'` in your query
- Update review status in Supabase dashboard for testing

---

## 🔌 API Reference

### Likes API

```typescript
// Like a service
likeService(serviceId, visitorSessionId, {
  userId,
  ipAddress
})

// Unlike a service
unlikeService(serviceId, visitorSessionId)

// Check if liked
const isLiked = await hasVisitorLikedService(serviceId, visitorSessionId)

// Get all likes
const likes = await getServiceLikes(serviceId)
```

### Reviews API

```typescript
// Create review
createServiceReview(serviceId, {
  visitorSessionId,
  userId,
  ipAddress,
  visitorName,
  visitorEmail,
  rating,
  comment,
  isVerifiedBooking
})

// Get approved reviews
const reviews = await getServiceReviews(serviceId, {
  limit: 5,
  offset: 0
})

// Mark helpful
markReviewHelpful(reviewId)

// Mark unhelpful
markReviewUnhelpful(reviewId)
```

### Analytics API

```typescript
// Get service activity
const activity = await getServiceVisitorActivity(serviceId)

// Get vendor's all activities
const allActivities = await getVendorVisitorActivity(vendorId)

// Get complete stats
const stats = await getServiceActivityStats(serviceId)

// Log a view
logServiceView(serviceId, visitorSessionId, {
  userId,
  ipAddress,
  referrer
})
```

---

## 🎨 Styling

Both components use Tailwind CSS. Customize colors/styles by modifying the className values:

```tsx
// Like button - change from emerald to your brand color
<button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
  {/* content */}
</button>

// Review form - change accent colors
<input className="focus:ring-2 focus:ring-blue-500" />
```

---

## 📊 Monitoring

### Check Active Visitors

```sql
SELECT COUNT(DISTINCT ip_address) as active_visitors
FROM visitor_sessions
WHERE last_visit_at > NOW() - INTERVAL '1 hour'
```

### Top Services by Views

```sql
SELECT service_id, total_views
FROM visitor_activity
ORDER BY total_views DESC
LIMIT 10
```

### Recent Reviews

```sql
SELECT * FROM service_reviews
WHERE status = 'approved'
ORDER BY created_at DESC
LIMIT 20
```

---

## ✅ Testing Checklist

- [ ] Migration runs without errors
- [ ] Visitor session is created on page load
- [ ] Like button toggles on/off
- [ ] Like count increments/decrements
- [ ] Can submit a review
- [ ] Review appears as 'pending' (check DB)
- [ ] Approved review is visible
- [ ] Helpful/unhelpful buttons work
- [ ] View tracking records data
- [ ] Vendor dashboard shows activity
- [ ] All components render without errors

---

## 📚 Complete Documentation

See `VISITOR_ACTIVITY_TRACKING.md` for detailed information about:
- Database schema
- RLS policies
- All SQL functions
- Migration details
- Future enhancements

---

## 🚀 You're Ready!

Your visitor tracking system is now live. Start collecting valuable data about how visitors interact with your services!
