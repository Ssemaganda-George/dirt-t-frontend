# Custom Fields Feature

## Overview
The custom fields feature allows vendors to add their own fields to services without requiring database schema migrations. This is powered by PostgreSQL's JSONB column type.

## How It Works

### Database
Services have a `custom_fields` JSONB column that stores user-defined fields as key-value pairs.

```sql
-- Example service with custom fields
{
  "title": "Mountain Hiking Tour",
  "price": 50000,
  "custom_fields": {
    "difficulty_level": "moderate",
    "min_age": 18,
    "equipment_provided": true
  }
}
```

### Benefits
- ✅ No schema migrations needed
- ✅ Each service type can have different fields
- ✅ Fast queries with GIN index
- ✅ Type-safe in TypeScript

---

## Usage

### For Vendors (UI)

Use the `CustomFieldsEditor` component in service forms:

```typescript
import { CustomFieldsEditor } from '../components/CustomFieldsEditor'

function ServiceForm() {
  const [customFields, setCustomFields] = useState({})
  
  return (
    <div>
      {/* Other form fields */}
      
      <CustomFieldsEditor 
        customFields={customFields}
        onChange={setCustomFields}
      />
    </div>
  )
}
```

### For Developers (Zustand Store)

Update custom fields programmatically:

```typescript
import { useVendorStore } from '../store/vendorStore'

function MyComponent() {
  const updateCustomFields = useVendorStore(state => state.updateServiceCustomFields)
  
  // Update custom fields
  updateCustomFields(vendorId, serviceId, {
    difficulty_level: 'moderate',
    min_age: 18,
    max_group_size: 12,
    equipment_provided: true
  })
}
```

---

## Database Queries

### Find services by custom field value
```sql
SELECT * FROM services 
WHERE custom_fields->>'difficulty_level' = 'moderate';
```

### Find services with numeric condition
```sql
SELECT * FROM services 
WHERE (custom_fields->>'min_age')::int >= 18;
```

### Check if field exists
```sql
SELECT * FROM services 
WHERE custom_fields ? 'equipment_provided';
```

### Query multiple fields
```sql
SELECT title, custom_fields 
FROM services 
WHERE custom_fields->>'difficulty_level' = 'moderate'
  AND (custom_fields->>'min_age')::int <= 25;
```

### Get all services with their custom fields
```sql
SELECT 
  id,
  title,
  custom_fields
FROM services
WHERE custom_fields IS NOT NULL 
  AND custom_fields != '{}'::jsonb;
```

---

## Common Use Cases

### Tour Services
```typescript
{
  difficulty_level: "moderate",
  min_age: 18,
  max_group_size: 12,
  equipment_provided: true,
  trail_type: "mountain",
  fitness_level_required: "intermediate",
  guide_language: "English"
}
```

### Hotel Services
```typescript
{
  check_in_flexibility: true,
  late_checkout_fee: 20000,
  airport_shuttle: true,
  pet_deposit: 50000,
  loyalty_program: "gold",
  room_service_hours: "24/7"
}
```

### Restaurant Services
```typescript
{
  dress_code: "smart casual",
  corkage_fee: 15000,
  private_room_available: true,
  vegan_menu: true,
  halal_certified: true,
  reservation_deposit: 10000
}
```

### Transport Services
```typescript
{
  vehicle_year: 2022,
  bluetooth_audio: true,
  dashcam: true,
  child_seats_available: 2,
  wheelchair_accessible: false,
  luggage_capacity: "4 large bags"
}
```

---

## TypeScript Types

```typescript
// Service interface includes custom_fields
interface Service {
  // ... other fields
  custom_fields?: Record<string, any>
}

// Custom field definition for UI
interface CustomFieldDefinition {
  key: string
  label: string
  type: 'text' | 'number' | 'date' | 'boolean' | 'select'
  options?: string[]
  required?: boolean
  value?: any
}
```

---

## Migrations

### Add custom_fields column
```sql
-- db/027_add_custom_fields_to_services.sql
ALTER TABLE services ADD COLUMN custom_fields JSONB DEFAULT '{}'::jsonb;
CREATE INDEX idx_services_custom_fields ON services USING GIN (custom_fields);
```

### Update atomic functions
```sql
-- db/028_update_atomic_functions_for_custom_fields.sql
-- Updates create_service_atomic() and update_service_atomic()
-- to support custom_fields parameter
```

---

## Best Practices

### 1. Use Consistent Naming
Use snake_case for field keys:
- ✅ `difficulty_level`
- ❌ `difficultyLevel` or `Difficulty Level`

### 2. Choose Appropriate Types
- Text: descriptions, names, categories
- Number: ages, prices, capacities
- Boolean: yes/no flags
- Date: deadlines, availability dates

### 3. Validate Data
Always validate custom field values at the application level before saving.

### 4. Document Fields
Keep a list of commonly used custom fields for each service category to maintain consistency.

### 5. Index Frequently Queried Fields
If you frequently query a specific custom field, consider adding it as a regular column for better performance.

---

## Limitations

1. **No Database-Level Validation**: JSONB accepts any valid JSON, so validation must happen in the application.
2. **Type Casting Required**: Numeric and boolean queries require explicit type casting.
3. **No Foreign Keys**: Custom fields can't reference other tables directly.

---

## Related Files

- [`src/components/CustomFieldsEditor.tsx`](file:///home/dev-kiran/Projects/dirt-t-frontend/src/components/CustomFieldsEditor.tsx) - UI component
- [`src/store/vendorStore.ts`](file:///home/dev-kiran/Projects/dirt-t-frontend/src/store/vendorStore.ts) - Zustand store actions
- [`src/types/index.ts`](file:///home/dev-kiran/Projects/dirt-t-frontend/src/types/index.ts) - TypeScript types
- [`db/027_add_custom_fields_to_services.sql`](file:///home/dev-kiran/Projects/dirt-t-frontend/db/027_add_custom_fields_to_services.sql) - Migration
- [`db/028_update_atomic_functions_for_custom_fields.sql`](file:///home/dev-kiran/Projects/dirt-t-frontend/db/028_update_atomic_functions_for_custom_fields.sql) - Function updates
