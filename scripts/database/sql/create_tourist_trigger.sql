-- Create trigger to automatically create tourist record when profile with role='tourist' is created
-- This ensures tourist records are always created when a tourist profile is created

-- First, create a function that will be called by the trigger
CREATE OR REPLACE FUNCTION create_tourist_on_profile_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create tourist record if role is 'tourist'
  IF NEW.role = 'tourist' THEN
    INSERT INTO tourists (user_id, first_name, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.full_name,
      COALESCE(NEW.created_at, NOW()),
      COALESCE(NEW.updated_at, NOW())
    )
    ON CONFLICT (user_id) DO NOTHING; -- Don't error if tourist already exists
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS trigger_create_tourist_on_profile_insert ON profiles;

-- Create the trigger
CREATE TRIGGER trigger_create_tourist_on_profile_insert
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_tourist_on_profile_insert();

-- Also handle updates in case role changes to 'tourist'
CREATE OR REPLACE FUNCTION create_tourist_on_profile_update()
RETURNS TRIGGER AS $$
BEGIN
  -- If role changed to 'tourist', create tourist record if it doesn't exist
  IF NEW.role = 'tourist' AND (OLD.role IS NULL OR OLD.role != 'tourist') THEN
    INSERT INTO tourists (user_id, first_name, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.full_name,
      COALESCE(NEW.created_at, NOW()),
      COALESCE(NEW.updated_at, NOW())
    )
    ON CONFLICT (user_id) DO NOTHING; -- Don't error if tourist already exists
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS trigger_create_tourist_on_profile_update ON profiles;

-- Create the update trigger
CREATE TRIGGER trigger_create_tourist_on_profile_update
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_tourist_on_profile_update();

