# Service Images Storage Setup

This guide explains how to set up proper image storage for services in your Dirt Trails application.

## Files Created

1. **`setup_service_images.sql`** - Comprehensive SQL script with advanced features
2. **`setup_service_images_simple.sql`** - Basic SQL script for essential setup
3. **`test_service_images_setup.sql`** - Test queries to verify setup
4. **`src/lib/imageUpload.ts`** - TypeScript utilities for image upload/management

## Re-running the Scripts

**SAFE TO RUN MULTIPLE TIMES**: Both SQL scripts now handle existing policies, functions, and triggers gracefully. If you need to update the setup:

1. Simply re-run the same script
2. Existing policies will be dropped and recreated
3. Functions and triggers will be updated
4. No data loss will occur

## Quick Setup (Recommended)

### Step 1: Run the SQL Script

Execute the simple setup script in your Supabase SQL editor:

```sql
-- Copy and paste the contents of setup_service_images_simple.sql
```

### Step 2: Test the Setup

Run the test queries to verify everything worked:

```sql
-- Copy and paste the contents of test_service_images_setup.sql
```

Import and use the image upload functions in your components:

```typescript
import { uploadServiceImage, addServiceImage, removeServiceImage } from '../lib/imageUpload'

// Upload an image
const result = await uploadServiceImage(file, serviceId, vendorId)
if (result.success) {
  // Add to service
  await addServiceImage(serviceId, result.url!)
}
```

## Database Changes

The setup adds:
- **Storage bucket**: `service-images` (public access)
- **Storage policies**: Upload, view, update, delete permissions
- **Database fields**: `primary_image_url`, `image_count`, `last_image_upload`
- **Utility functions**: For image management (comprehensive version)
- **Triggers**: Automatic image count updates

## File Organization

Images are stored in Supabase Storage with this structure:
```
service-images/
├── vendor-id-1/
│   ├── service-id-1/
│   │   ├── 1640995200000.jpg
│   │   └── 1640995300000.png
│   └── service-id-2/
│       └── 1640995400000.jpg
└── vendor-id-2/
    └── service-id-3/
        └── 1640995500000.jpg
```

## Usage Examples

### Upload Multiple Images

```typescript
const handleImageUpload = async (files: FileList) => {
  const uploadedUrls: string[] = []

  for (const file of Array.from(files)) {
    const result = await uploadServiceImage(file, serviceId, vendorId)
    if (result.success && result.url) {
      uploadedUrls.push(result.url)
    }
  }

  // Update service with all images
  await updateServiceImages(serviceId, uploadedUrls)
}
```

### React Component Example

```tsx
import React, { useState } from 'react'
import { uploadServiceImage, addServiceImage } from '../lib/imageUpload'

export default function ImageUploader({ serviceId, vendorId }: { serviceId: string, vendorId: string }) {
  const [uploading, setUploading] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const result = await uploadServiceImage(file, serviceId, vendorId)
      if (result.success && result.url) {
        await addServiceImage(serviceId, result.url)
        alert('Image uploaded successfully!')
      } else {
        alert(result.error || 'Upload failed')
      }
    } catch (error) {
      alert('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <input
      type="file"
      accept="image/*"
      onChange={handleFileChange}
      disabled={uploading}
    />
  )
}
```

## Security Notes

- Images are publicly accessible (required for web display)
- Upload requires authentication
- File size limited to 5MB
- Only image files accepted
- Organized by vendor/service for access control

## Troubleshooting

### "Failed to update service. Please try again."

This error occurs when the image upload succeeds but updating the service record fails. Common causes:

#### 1. **Permission Issues**
- User is not authenticated
- User doesn't own the service (not a vendor or wrong vendor)
- RLS policies blocking the update

#### 2. **Debug Steps**
1. Run the debug SQL queries in `debug_image_upload.sql`
2. Check the browser console for detailed error messages
3. Use the debug component `DebugImageUpload.tsx` for testing

#### 3. **Quick Fixes**
```sql
-- Check if you can access your services
SELECT s.id, s.title
FROM services s
WHERE s.vendor_id IN (
  SELECT id FROM vendors WHERE user_id = auth.uid()
);
```

#### 4. **Common Solutions**
- Ensure you're logged in as a vendor
- Verify the service ID belongs to your vendor account
- Check that RLS policies are correctly set up
- Make sure the service exists and isn't deleted

### Debug Tools

1. **`debug_image_upload.sql`** - SQL queries to check permissions and setup
2. **`DebugImageUpload.tsx`** - React component for testing uploads
3. **Browser Console** - Check for detailed error messages from the improved logging

### Test Upload

Use the debug component to test image uploads:

```tsx
import DebugImageUpload from '../components/DebugImageUpload'

// Add to any test route
<DebugImageUpload />
```

This will help identify exactly where the upload process is failing.</content>
<parameter name="filePath">/Users/sgeorge/Desktop/DirtTrailsGit/platfom okay/dirt trails viane/dirt-t-frontend/SERVICE_IMAGES_README.md