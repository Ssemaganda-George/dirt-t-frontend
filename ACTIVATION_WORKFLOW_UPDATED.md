# Event Link Activation Workflow - UPDATED

## Overview
Vendors request event link activation on `/vendor/services`, and admins approve/reject on `/admin/services/activities`.

---

## VENDOR WORKFLOW

### On `/vendor/services` Page:

**When Event Link is INACTIVE:**
```
Event Link Status: "Event link inactive"
Button: "Request activation" (blue)
```

**When Event Link is ACTIVE:**
```
Event Link Status: Shows blue link "Event scan link" → `/scan/{service_id}`
Button: "Disable Link" (red)
```

---

## ADMIN WORKFLOW

### On `/admin/services/activities` Page:

The **"Event Link" column** in the Activities table now shows:

#### 1. **When Link is ENABLED:**
```
✓ View scan link  (clickable blue link)
```

#### 2. **When Link is DISABLED and NO pending request:**
```
Scan link inactive
No pending request
```

#### 3. **When Link is DISABLED and PENDING request:**
```
Scan link inactive
[Approve] [Reject]  (green and red buttons side-by-side)
```

### Admin Actions:

**Click "Approve":**
- ✅ Sets `scan_enabled = true`
- ✅ Button text changes to "Disable Link" (red)
- ✅ Removes request from pending list
- ✅ Shows green checkmark: "✓ View scan link"

**Click "Reject":**
- ❌ Keeps `scan_enabled = false`
- ❌ Removes request from pending list
- ❌ Shows "Scan link inactive" again

---

## TABLE LAYOUT

| Activity | Vendor | Price | Status | Availability | **Event Link** | Actions |
|----------|--------|-------|--------|--------------|---|---------|
| Event A  | Vendor 1 | $50  | Approved | Available | ✓ View scan link | Edit \| Disable Link |
| Event B  | Vendor 2 | $75  | Approved | Available | Scan link inactive [Approve] [Reject] | Edit |
| Event C  | Vendor 3 | $100 | Pending  | Unavailable | Scan link inactive (No pending request) | Edit |

---

## KEY CHANGES FROM PREVIOUS VERSION

✅ **Removed:** Top-level "Pending Event Link Activation Requests" section
✅ **Added:** Inline activation buttons in the "Event Link" table column
✅ **Benefit:** Admins can see and manage activation requests without scrolling
✅ **UX:** Keep approvals/rejections in context with the service they're managing

---

## DATABASE REQUIREMENTS

1. **SQL Function Update Required:** `update_service_atomic()` must include:
   ```sql
   scan_enabled = COALESCE((v_update_data->>'scan_enabled')::boolean, scan_enabled),
   ```

2. **Table Required:** `activation_requests` table with:
   - `id` (uuid, primary key)
   - `service_id` (uuid, FK to services)
   - `vendor_id` (uuid, FK to vendors)
   - `status` ('pending', 'approved', 'rejected')
   - `requested_at` (timestamp)
   - `updated_at` (timestamp)
   - `admin_id` (uuid, FK to profiles)

---

## TESTING CHECKLIST

- [ ] Vendor clicks "Request activation" on `/vendor/services`
- [ ] Alert shows: "Activation request submitted"
- [ ] Admin refreshes `/admin/services/activities`
- [ ] Activation request appears as [Approve] [Reject] buttons in Event Link column
- [ ] Admin clicks "Approve"
- [ ] Row updates: Button changes to "Disable Link" (red)
- [ ] Link shows: "✓ View scan link"
- [ ] Vendor refreshes - link is enabled
- [ ] Admin clicks "Disable Link"
- [ ] Button changes to "Enable Link" (green)
- [ ] Link shows: "Scan link inactive"
- [ ] Vendor can request activation again

