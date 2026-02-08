# Event Link Activation Workflow

## Overview
This document describes the workflow for vendors to request event link activation and for admins to approve/reject those requests.

## Vendor Workflow

### On `/vendor/services` Page:
1. Vendor sees their list of events/activities
2. For each activity (when `scan_enabled` is false):
   - Vendor sees "Event link inactive" status
   - Button "Request activation" is available
3. Vendor clicks "Request activation"
4. System creates an activation request record
5. Admin receives notification about the request

### Expected States:
- **Event link inactive** → Button: "Request activation" (blue button)
- **Event link enabled** → Shows: "Event scan link" (clickable blue link to `/scan/{service_id}`)

## Admin Workflow

### On `/admin/services/activities` Page:
1. Admin sees a new section: "Pending Event Link Activation Requests"
2. This section shows all pending requests with:
   - Event title
   - Vendor name
   - Request date
   - Two action buttons: "Approve" and "Reject"

3. Admin clicks "Approve":
   - System sets `scan_enabled = true` for the service
   - Button text becomes "Disable Link" (red)
   - Vendor's page immediately shows the scan link enabled

4. Admin clicks "Reject":
   - System keeps `scan_enabled = false`
   - Request is marked as rejected
   - Vendor can request again

## Database Changes Required

### New Table: `activation_requests`
```sql
CREATE TABLE IF NOT EXISTS public.activation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  requester_id uuid REFERENCES public.profiles(id),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_id uuid REFERENCES public.profiles(id),
  admin_notes text,
  requested_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  UNIQUE(service_id, status) -- Prevent duplicate pending requests
);
```

### Updated Function: `update_service_atomic`
The function must include the `scan_enabled` field in the UPDATE statement:

```sql
scan_enabled = COALESCE((v_update_data->>'scan_enabled')::boolean, scan_enabled),
```

## Testing Checklist

- [ ] Vendor submits activation request on `/vendor/services`
- [ ] Alert shows: "Activation request submitted. An admin will review it."
- [ ] Admin sees the request on `/admin/services/activities`
- [ ] Admin clicks "Approve"
- [ ] Button text changes to "Disable Link" (red)
- [ ] Vendor refreshes page - link is now active
- [ ] Admin clicks "Disable Link"
- [ ] Button text changes to "Enable Link" (green)
- [ ] Scan page (`/scan/{service_id}`) shows error when link is disabled
- [ ] Scan page works correctly when link is enabled

## Important Notes

1. **Database Migration**: The `activation_requests` table must be created in Supabase
2. **SQL Function**: The `update_service_atomic` function must include `scan_enabled` in the UPDATE statement
3. **Permissions**: Only admins can approve/reject activation requests
4. **Notifications**: System sends messages to admin when request is created
