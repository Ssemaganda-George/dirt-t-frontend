# Database Architecture Documentation

## Overview
This document provides a comprehensive overview of the DirtTrails database architecture, including core tables, atomic functions, RLS policies, and architectural patterns.

## Core Tables

### User Management
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `profiles` | User profiles for all roles | `id`, `email`, `full_name`, `role`, `status` |
| `vendors` | Vendor-specific data | `user_id`, `business_name`, `status`, `approved_by` |
| `tourists` | Tourist-specific data | `user_id`, `first_name`, `last_name` |
| `user_preferences` | User preferences (region, currency, language) | `user_id`, `region`, `currency`, `language` |

### Service Management
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `services` | Tours, activities, and events | `vendor_id`, `title`, `price`, `status`, `scan_enabled` |
| `service_delete_requests` | Pending service deletion requests | `service_id`, `vendor_id`, `status` |

### Ticketing & Events
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `ticket_types` | Event ticket configurations | `service_id`, `name`, `price`, `quantity`, `sold` |
| `orders` | Customer orders | `user_id`, `total_amount`, `status`, `payment_status` |
| `order_items` | Line items in orders | `order_id`, `ticket_type_id`, `quantity`, `price` |
| `tickets` | Individual tickets | `order_id`, `code`, `qr_data`, `status`, `used_at` |
| `scan_sessions` | Ticket scanning sessions | `service_id`, `vendor_id`, `started_at` |
| `activation_requests` | Scan feature activation requests | `service_id`, `status` |
| `event_otps` | One-time passwords for events | `service_id`, `otp`, `expires_at` |

### Visitor Tracking & Reviews
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `visitor_sessions` | Anonymous visitor tracking | `session_id`, `ip_address`, `user_agent` |
| `visitor_activity` | Visitor actions (views, clicks) | `session_id`, `activity_type`, `service_id` |
| `service_view_logs` | Service view tracking | `service_id`, `viewer_id`, `view_source` |
| `service_likes` | Service likes/favorites | `service_id`, `user_id` |
| `service_reviews` | Service reviews and ratings | `service_id`, `user_id`, `rating`, `comment` |
| `review_tokens` | Tokens for review submission | `booking_id`, `token`, `expires_at` |
| `app_visits` | App visit tracking | `user_id`, `visit_date` |

### Other
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `hero_videos` | Homepage hero videos | `title`, `video_url`, `is_active` |

---

## Atomic Functions (Concurrency Control)

The database uses **atomic functions** with row-level locking to prevent race conditions. These are defined in [`005_concurrency_controls.sql`](file:///home/dev-kiran/Projects/dirt-t-frontend/db/005_concurrency_controls.sql) (34KB).

### Ticketing Functions
| Function | Purpose | Locking Strategy |
|----------|---------|------------------|
| `book_tickets_atomic()` | Book tickets with capacity validation | `FOR UPDATE` on `ticket_types` |
| `verify_and_use_ticket_atomic()` | Verify and mark ticket as used | `FOR UPDATE` on `tickets` |
| `get_available_tickets()` | Get available ticket count | Read-only, no locking |

### User Management Functions
| Function | Purpose | Locking Strategy |
|----------|---------|------------------|
| `create_user_profile_atomic()` | Create/update user profile | `LOCK TABLE profiles` |
| `create_vendor_profile_atomic()` | Create/update vendor profile | `LOCK TABLE vendors` |
| `save_user_preferences_atomic()` | Save user preferences | `LOCK TABLE user_preferences` |
| `update_vendor_status_atomic()` | Update vendor approval status | `FOR UPDATE` on `vendors` |

### Service Management Functions
| Function | Purpose | Locking Strategy |
|----------|---------|------------------|
| `create_service_atomic()` | Create new service | `LOCK TABLE services` |
| `update_service_atomic()` | Update service with JSONB updates | `FOR UPDATE` on `services` |
| `delete_service_atomic()` | Delete service and related data | `FOR UPDATE` on `services` |

### Booking Functions
| Function | Purpose | Locking Strategy |
|----------|---------|------------------|
| `create_booking_atomic()` | Create booking with capacity check | `FOR UPDATE` on `services` |
| `update_booking_status_atomic()` | Update booking status | `FOR UPDATE` on `bookings` |
| `check_service_availability()` | Check service availability | Read-only |

---

## Architectural Issues Identified

### 1. **Race Condition Mitigation**
**Problem**: Multiple users booking the same service/tickets simultaneously could cause overselling.

**Solution**: Atomic functions with `FOR UPDATE` locking ensure only one transaction can modify a resource at a time.

**Evidence**: 34KB migration file dedicated to concurrency controls.

### 2. **RLS (Row Level Security) Complexity**
**Problem**: Multiple migrations fixing RLS policies suggest they were added incrementally without a clear security model.

**Files affected**:
- `009_fix_visitor_activity_rls.sql`
- `017_add_vendors_rls_policies.sql`
- `021_add_services_rls_policies.sql`
- Multiple `fix_*_rls.js` scripts in root

**Recommendation**: Consolidate and document RLS policies in a single source of truth.

### 3. **Schema Evolution Without Planning**
**Problem**: Multiple migrations for the same feature indicate ad-hoc schema changes.

**Examples**:
- Three different `019_` migrations for vendor profiles
- Two `021_` migrations (services RLS and delete requests)
- Two `025_` migrations (event datetime type changes)

**Recommendation**: Plan schema changes upfront and use proper migration versioning.

### 4. **JSONB Usage**
The `update_service_atomic()` function accepts JSONB updates, which is flexible but can lead to:
- Type safety issues
- Inconsistent data
- Difficult validation

**Current approach**:
```sql
UPDATE services SET
  title = COALESCE(v_update_data->>'title', title),
  price = COALESCE((v_update_data->>'price')::numeric, price)
```

---

## Recommendations

### Short-term
1. **Document all RLS policies** in a central location
2. **Create a schema diagram** showing table relationships
3. **Audit atomic functions** to ensure they're all necessary

### Long-term
1. **Implement JSONB custom fields** for user-defined columns (see next section)
2. **Consolidate RLS policies** into a clear security model
3. **Add database tests** for atomic functions
4. **Create migration guidelines** to prevent ad-hoc schema changes

---

## Next: Dynamic Fields with JSONB

See the implementation plan for adding user-defined custom fields using PostgreSQL's JSONB columns.
