# Visitor Activity Tracking - Quick Reference Card

## 🚀 Quick Start

### 1. Add to Service Page (1 minute)
```typescript
import { ServiceReviewsWidget } from '../components/ServiceReviewsWidget'

<ServiceReviewsWidget serviceId={serviceId} />
```

### 2. Apply Migration (2 minutes)
```sql
-- Run SQL from: db/006_visitor_activity_tracking.sql
```

### 3. Deploy & Test (2 minutes)
```bash
npm run build  # Should compile successfully
git push       # Deploy
# Test: Like a service, submit a review
```

---

## 📊 What Gets Tracked

| What | Where | Why |
|------|-------|-----|
| IP Address | `visitor_sessions` | Identify unique visitors |
| Device Type | `visitor_sessions` | Mobile/tablet/desktop |
| Browser | `visitor_sessions` | Analytics insights |
| Country/City | `visitor_sessions` | Geographic data |
| Service Views | `service_view_logs` | Engagement metrics |
| Service Likes | `service_likes` | Popularity indicator |
| Service Reviews | `service_reviews` | Social proof & ratings |
| Analytics | `visitor_activity` | Vendor dashboard data |

---

## 🎯 Key Components

### Hook: useVisitorTracking
```typescript
const {
  visitorSession,         // Current visitor info
  trackServiceView,       // Log a view
  likeService,           // Like a service
  unlikeService,         // Unlike a service
  isServiceLiked,        // Check if liked
  submitReview,          // Submit review
  fetchServiceReviews,   // Get reviews
  fetchLikesCount        // Get like count
} = useVisitorTracking()
```

### Component: ServiceReviewsWidget
```typescript
<ServiceReviewsWidget 
  serviceId="service-id"
  onReviewSubmit={(review) => console.log(review)}
/>
```

---

## 💾 Database Schema (5 Tables)

```
visitor_sessions        service_likes           service_reviews
├─ id (PK)             ├─ id (PK)              ├─ id (PK)
├─ ip_address          ├─ service_id (FK)      ├─ service_id (FK)
├─ user_id             ├─ visitor_session_id   ├─ visitor_name
├─ country             ├─ liked_at              ├─ rating (1-5)
├─ device_type         └─ created_at            ├─ comment
└─ visit_count                                   ├─ status (pending/approved)
                                                └─ helpful_count

visitor_activity                service_view_logs
├─ id (PK)                      ├─ id (PK)
├─ service_id (UNIQUE)          ├─ service_id (FK)
├─ total_views                  ├─ visitor_session_id
├─ total_likes                  ├─ viewed_at
├─ average_rating               └─ referrer
├─ total_reviews
└─ views_this_month
```

---

## 🔐 Security

- ✅ Row-Level Security (RLS) on all tables
- ✅ Only approved reviews are public
- ✅ IP addresses never exposed
- ✅ Session data isolated per user
- ✅ Admin-only moderation features

---

## 📈 Analytics Available

### Per Service
- Total views
- Unique visitors
- Total likes
- Average rating (1-5 stars)
- Total reviews (pending + approved)
- Monthly metrics

### Per Vendor
- All service metrics above
- Sorted by engagement
- Trending data
- Recent activity

---

## 🔧 Common Operations

### Track a View
```typescript
const { trackServiceView } = useVisitorTracking()
trackServiceView(serviceId)
```

### Like a Service
```typescript
const { likeService } = useVisitorTracking()
const success = await likeService(serviceId)
```

### Get Reviews
```typescript
const { fetchServiceReviews } = useVisitorTracking()
const reviews = await fetchServiceReviews(serviceId, 10)
```

### Submit Review
```typescript
const { submitReview } = useVisitorTracking()
const result = await submitReview(serviceId, {
  visitorName: 'John',
  rating: 5,
  comment: 'Great service!'
})
```

### Get Vendor Stats
```typescript
import { getVendorActivityStats } from '../lib/database'
const stats = await getVendorActivityStats(vendorId)
// stats[0].total_views, .total_likes, .average_rating
```

---

## ✅ Testing Checklist

- [ ] Database migration applied
- [ ] Component renders on page
- [ ] Can click like button
- [ ] Like count increments
- [ ] Can submit review
- [ ] Review shows as pending
- [ ] Admin can approve review
- [ ] Approved review appears
- [ ] Vendor sees stats updated
- [ ] IP/geolocation data collected

---

## 🚨 Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Widget not showing | Missing serviceId | Pass serviceId prop |
| Likes not saving | Session not created | Check sessionStorage |
| Reviews not appearing | Not approved yet | Admin must approve |
| Slow performance | Large view_logs | Archive old logs |
| Data not tracking | Migration not applied | Run SQL migration |

---

## 📁 Important Files

| File | Purpose | Size |
|------|---------|------|
| `db/006_visitor_activity_tracking.sql` | Database schema | ~400 lines |
| `src/hooks/useVisitorTracking.ts` | Main hook | ~250 lines |
| `src/components/ServiceReviewsWidget.tsx` | UI component | ~300 lines |
| `src/lib/database.ts` | Database functions | +200 lines |
| `src/App.tsx` | Routing | 1 line added |

---

## 🎓 Documentation

| Document | Read Time | Purpose |
|----------|-----------|---------|
| SETUP_COMPLETE.md | 5 min | Overview & checklist |
| INTEGRATION_GUIDE.md | 10 min | Step-by-step setup |
| VISITOR_ACTIVITY_TRACKING.md | 15 min | Full API reference |
| FINAL_CHECKLIST.md | 5 min | Deployment checklist |
| This file | 3 min | Quick reference |

---

## 🔄 Data Flow

```
User visits site
    ↓
Session created (IP-based)
    ↓
User interacts:
├─ Views service → log_service_view()
├─ Likes service → record_service_like()
└─ Reviews service → submitServiceReview()
    ↓
Triggers update visitor_activity (aggregated stats)
    ↓
Vendor sees updated metrics
Admin moderates reviews
```

---

## 🛠️ Type Definitions

```typescript
// Visitor session
{
  id: string
  ip_address: string
  device_type: 'mobile' | 'tablet' | 'desktop'
  browser_info: string
  country?: string
  city?: string
  visit_count: number
}

// Service like
{
  id: string
  service_id: string
  visitor_session_id: string
  liked_at: string
}

// Service review
{
  id: string
  rating: number  // 1-5
  visitor_name: string
  comment?: string
  status: 'pending' | 'approved' | 'rejected'
  helpful_count: number
}

// Analytics
{
  service_id: string
  total_views: number
  total_likes: number
  average_rating: number
  total_reviews: number
  approved_reviews: number
}
```

---

## 🚀 Deployment

```bash
# 1. Verify build
npm run build

# 2. Check types
npm run type-check

# 3. Apply migration
# Run SQL in Supabase console

# 4. Deploy
git push origin main

# 5. Test
# Open service page → test like → test review

# 6. Monitor
# Check Supabase logs for errors
```

---

## 📊 Database Functions

### Visitor Session
- `get_or_create_visitor_session()` - Create/get session
- `getOrCreateVisitorSession()` - TypeScript wrapper

### Views
- `log_service_view()` - Log a view
- `logServiceView()` - TypeScript wrapper

### Likes
- `record_service_like()` - Add like
- `remove_service_like()` - Remove like
- `checkServiceLiked()` - Check if liked
- `getServiceLikes()` - Get all likes
- `recordServiceLike()` - TypeScript wrapper
- `removeServiceLike()` - TypeScript wrapper
- `checkServiceLiked()` - TypeScript wrapper

### Reviews
- `getServiceReviews()` - Get approved reviews
- `submitServiceReview()` - Submit review
- `submitServiceReview()` - TypeScript wrapper

### Analytics
- `getServiceVisitorActivity()` - Get service stats
- `getVendorActivityStats()` - Get vendor stats
- `getVendorVisitorActivity()` - Get all vendor services

---

## 💡 Pro Tips

1. **Performance:** Reviews are cached in `visitor_activity` table
2. **Security:** Always use RLS policies, never expose tokens
3. **Analytics:** Monthly reset needed for trending (manual job)
4. **Mobile:** Component is fully responsive
5. **Testing:** Use incognito window for new visitor session
6. **Debugging:** Check Supabase logs + browser console
7. **Monitoring:** Watch for spike in service_view_logs size
8. **Scaling:** Consider archiving old view logs monthly

---

## 🎯 Success Metrics

After deployment, you should see:
- ✅ Like counts increasing
- ✅ New reviews appearing (pending)
- ✅ Admin reviewing queue
- ✅ Vendor stats updating
- ✅ Geolocation data in database
- ✅ Device type tracking
- ✅ No errors in console

---

## 📞 Need Help?

1. Check the error message (usually very clear)
2. Review the relevant documentation file
3. Look at the example code in components
4. Check Supabase dashboard for data
5. Monitor browser console for errors
6. Review database logs for SQL errors

---

## ✨ What's Next?

**Phase 2 Ideas:**
- [ ] Email notifications
- [ ] Vendor responses to reviews
- [ ] Review helpful/unhelpful voting
- [ ] Verified purchase badge
- [ ] Recommended services

**Phase 3 Ideas:**
- [ ] Heatmaps of popular services
- [ ] Visitor journey tracking
- [ ] Recommendation engine
- [ ] Conversion analysis

---

**Last Updated:** February 8, 2026
**Status:** Production Ready ✅
**Version:** 1.0
