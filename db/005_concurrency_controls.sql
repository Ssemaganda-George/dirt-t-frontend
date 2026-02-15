-- Migration: Add concurrency controls and atomic operations for ticketing system
-- This migration adds database-level constraints, triggers, and functions to prevent
-- race conditions in ticket booking and scanning operations

-- Add version column to ticket_types for optimistic locking
ALTER TABLE public.ticket_types
ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

-- Add unique constraint on ticket codes to prevent duplicates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'tickets' AND constraint_name = 'tickets_code_unique'
  ) THEN
    ALTER TABLE public.tickets
    ADD CONSTRAINT tickets_code_unique UNIQUE (code);
  END IF;
END $$;

-- Add check constraint to ensure sold tickets don't exceed quantity
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.ticket_types
    ADD CONSTRAINT ticket_types_sold_check
    CHECK (sold >= 0 AND sold <= quantity);
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- Add check constraint for ticket status
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.tickets
    ADD CONSTRAINT tickets_status_check
    CHECK (status IN ('issued', 'used', 'cancelled', 'refunded'));
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- Create function for atomic ticket booking
CREATE OR REPLACE FUNCTION book_tickets_atomic(
  p_ticket_type_id uuid,
  p_quantity integer,
  p_order_id uuid
) RETURNS jsonb AS $$
DECLARE
  v_ticket_type record;
  v_available_tickets integer;
  v_ticket record;
  v_tickets_created integer := 0;
  v_result jsonb;
BEGIN
  -- Lock the ticket type row for update to prevent concurrent modifications
  SELECT * INTO v_ticket_type
  FROM public.ticket_types
  WHERE id = p_ticket_type_id
  FOR UPDATE;

  -- Check if ticket type exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ticket type not found');
  END IF;

  -- Check if sale period is valid (if set)
  IF v_ticket_type.sale_start IS NOT NULL AND now() < v_ticket_type.sale_start THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ticket sales have not started yet');
  END IF;

  IF v_ticket_type.sale_end IS NOT NULL AND now() > v_ticket_type.sale_end THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ticket sales have ended');
  END IF;

  -- Calculate available tickets
  v_available_tickets := v_ticket_type.quantity - v_ticket_type.sold;

  -- Check if enough tickets are available
  IF v_available_tickets < p_quantity THEN
    RETURN jsonb_build_object('success', false, 'error', format('Only %s tickets available, requested %s', v_available_tickets, p_quantity));
  END IF;

  -- Update sold count atomically
  UPDATE public.ticket_types
  SET sold = sold + p_quantity, version = version + 1, updated_at = now()
  WHERE id = p_ticket_type_id;

  -- Generate and insert tickets
  FOR i IN 1..p_quantity LOOP
    -- Generate unique ticket code
    INSERT INTO public.tickets (
      order_id,
      ticket_type_id,
      service_id,
      code,
      qr_data,
      status,
      issued_at
    )
    SELECT
      p_order_id,
      p_ticket_type_id,
      v_ticket_type.service_id,
      UPPER('TKT-' || encode(gen_random_bytes(6), 'hex')),
      UPPER('TKT-' || encode(gen_random_bytes(6), 'hex')),
      'issued',
      now()
    ON CONFLICT (code) DO NOTHING; -- Retry if code collision

    GET DIAGNOSTICS v_tickets_created = ROW_COUNT;
    IF v_tickets_created = 0 THEN
      -- Code collision, try again with new code
      INSERT INTO public.tickets (
        order_id,
        ticket_type_id,
        service_id,
        code,
        qr_data,
        status,
        issued_at
      )
      VALUES (
        p_order_id,
        p_ticket_type_id,
        v_ticket_type.service_id,
        UPPER('TKT-' || encode(gen_random_bytes(6), 'hex')),
        UPPER('TKT-' || encode(gen_random_bytes(6), 'hex')),
        'issued',
        now()
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'tickets_created', p_quantity);

EXCEPTION
  WHEN OTHERS THEN
    -- Rollback any partial changes
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for atomic ticket verification and marking as used
CREATE OR REPLACE FUNCTION verify_and_use_ticket_atomic(
  p_ticket_code text,
  p_service_id uuid DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_ticket record;
  v_order_status text;
  v_result jsonb;
BEGIN
  -- Lock the ticket row for update to prevent concurrent scanning
  SELECT t.*, tt.service_id as ticket_service_id
  INTO v_ticket
  FROM public.tickets t
  JOIN public.ticket_types tt ON t.ticket_type_id = tt.id
  WHERE t.code = p_ticket_code OR t.qr_data = p_ticket_code
  FOR UPDATE;

  -- Check if ticket exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ticket not found', 'status', 'not_found');
  END IF;

  -- Check if ticket belongs to the specified service (if provided)
  IF p_service_id IS NOT NULL AND v_ticket.ticket_service_id != p_service_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ticket does not belong to this event', 'status', 'wrong_event');
  END IF;

  -- Check ticket status
  IF v_ticket.status = 'used' THEN
    RETURN jsonb_build_object('success', true, 'already_used', true, 'ticket_id', v_ticket.id, 'used_at', v_ticket.used_at, 'status', 'used');
  ELSIF v_ticket.status NOT IN ('issued', 'confirmed', 'paid') THEN
    RETURN jsonb_build_object('success', false, 'error', format('Ticket status is %s', v_ticket.status), 'status', v_ticket.status);
  END IF;

  -- Check if order is paid (if order exists)
  IF v_ticket.order_id IS NOT NULL THEN
    SELECT status INTO v_order_status
    FROM public.orders
    WHERE id = v_ticket.order_id;

    IF v_order_status NOT IN ('paid', 'completed', 'confirmed') THEN
      RETURN jsonb_build_object('success', false, 'error', format('Order status is %s', v_order_status), 'status', 'order_not_paid');
    END IF;
  END IF;

  -- Mark ticket as used atomically
  UPDATE public.tickets
  SET status = 'used', used_at = now()
  WHERE id = v_ticket.id;

  RETURN jsonb_build_object('success', true, 'already_used', false, 'ticket_id', v_ticket.id, 'status', 'verified');

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'status', 'error');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get available ticket count atomically
CREATE OR REPLACE FUNCTION get_available_tickets(p_ticket_type_id uuid) RETURNS integer AS $$
DECLARE
  v_ticket_type record;
BEGIN
  SELECT quantity - sold as available
  INTO v_ticket_type
  FROM public.ticket_types
  WHERE id = p_ticket_type_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  RETURN GREATEST(0, v_ticket_type.available);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop any existing triggers that may cause issues
DROP TRIGGER IF EXISTS update_ticket_types_updated_at ON public.ticket_types;
DROP TRIGGER IF EXISTS update_tickets_used_at ON public.tickets;
DROP TRIGGER IF EXISTS update_tickets_updated_at ON public.tickets;

-- Note: Timestamps are now explicitly managed within the atomic functions
-- to avoid trigger conflicts and ensure proper column access

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tickets_code_qr_data ON public.tickets(code, qr_data);
CREATE INDEX IF NOT EXISTS idx_tickets_status_used_at ON public.tickets(status, used_at);
CREATE INDEX IF NOT EXISTS idx_ticket_types_service_id_version ON public.ticket_types(service_id, version);

-- Add comments for documentation
COMMENT ON FUNCTION book_tickets_atomic(uuid, integer, uuid) IS 'Atomically books tickets for a ticket type, preventing race conditions';
COMMENT ON FUNCTION verify_and_use_ticket_atomic(text, uuid) IS 'Atomically verifies and marks a ticket as used, preventing double-scanning';
COMMENT ON FUNCTION get_available_tickets(uuid) IS 'Returns the current available ticket count for a ticket type';

-- User Management Atomic Functions

-- Create function for atomic user profile creation/update during registration
CREATE OR REPLACE FUNCTION create_user_profile_atomic(
  p_user_id uuid,
  p_email text,
  p_full_name text,
  p_role text DEFAULT 'tourist'
) RETURNS jsonb AS $$
DECLARE
  v_profile record;
  v_result jsonb;
BEGIN
  -- Lock profiles table to prevent concurrent profile creation
  LOCK TABLE public.profiles IN SHARE ROW EXCLUSIVE MODE;

  -- Check if profile already exists
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id;

  IF FOUND THEN
    -- Update existing profile
    UPDATE public.profiles
    SET
      email = p_email,
      full_name = p_full_name,
      role = p_role,
      updated_at = now()
    WHERE id = p_user_id;

    RETURN jsonb_build_object('success', true, 'action', 'updated', 'profile_id', p_user_id);
  ELSE
    -- Create new profile
    INSERT INTO public.profiles (
      id,
      email,
      full_name,
      role,
      status,
      created_at,
      updated_at
    ) VALUES (
      p_user_id,
      p_email,
      p_full_name,
      p_role,
      'active',
      now(),
      now()
    );

    RETURN jsonb_build_object('success', true, 'action', 'created', 'profile_id', p_user_id);
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for atomic vendor creation during registration
CREATE OR REPLACE FUNCTION create_vendor_profile_atomic(
  p_user_id uuid,
  p_business_name text DEFAULT '',
  p_status text DEFAULT 'pending'
) RETURNS jsonb AS $$
DECLARE
  v_vendor record;
  v_result jsonb;
BEGIN
  -- Lock vendors table to prevent concurrent vendor creation
  LOCK TABLE public.vendors IN SHARE ROW EXCLUSIVE MODE;

  -- Check if vendor already exists
  SELECT * INTO v_vendor
  FROM public.vendors
  WHERE user_id = p_user_id;

  IF FOUND THEN
    -- Update existing vendor
    UPDATE public.vendors
    SET
      business_name = p_business_name,
      status = p_status,
      updated_at = now()
    WHERE user_id = p_user_id;

    RETURN jsonb_build_object('success', true, 'action', 'updated', 'vendor_id', v_vendor.id);
  ELSE
    -- Create new vendor
    INSERT INTO public.vendors (
      user_id,
      business_name,
      status,
      created_at,
      updated_at
    ) VALUES (
      p_user_id,
      p_business_name,
      p_status,
      now(),
      now()
    )
    RETURNING id INTO v_vendor;

    RETURN jsonb_build_object('success', true, 'action', 'created', 'vendor_id', v_vendor.id);
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for atomic user preferences save/update
CREATE OR REPLACE FUNCTION save_user_preferences_atomic(
  p_user_id uuid,
  p_region text,
  p_currency text,
  p_language text
) RETURNS jsonb AS $$
DECLARE
  v_preferences record;
  v_result jsonb;
BEGIN
  -- Lock user_preferences table to prevent concurrent updates
  LOCK TABLE public.user_preferences IN SHARE ROW EXCLUSIVE MODE;

  -- Check if preferences already exist
  SELECT * INTO v_preferences
  FROM public.user_preferences
  WHERE user_id = p_user_id;

  IF FOUND THEN
    -- Update existing preferences
    UPDATE public.user_preferences
    SET
      region = p_region,
      currency = p_currency,
      language = p_language,
      updated_at = now()
    WHERE user_id = p_user_id;

    RETURN jsonb_build_object('success', true, 'action', 'updated', 'preferences_id', v_preferences.id);
  ELSE
    -- Create new preferences
    INSERT INTO public.user_preferences (
      user_id,
      region,
      currency,
      language,
      created_at,
      updated_at
    ) VALUES (
      p_user_id,
      p_region,
      p_currency,
      p_language,
      now(),
      now()
    )
    RETURNING id INTO v_preferences;

    RETURN jsonb_build_object('success', true, 'action', 'created', 'preferences_id', v_preferences.id);
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for atomic vendor status update
CREATE OR REPLACE FUNCTION update_vendor_status_atomic(
  p_vendor_id uuid,
  p_status text,
  p_approved_by uuid DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_vendor record;
  v_result jsonb;
BEGIN
  -- Lock the vendor row for update to prevent concurrent status changes
  SELECT * INTO v_vendor
  FROM public.vendors
  WHERE id = p_vendor_id
  FOR UPDATE;

  -- Check if vendor exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vendor not found');
  END IF;

  -- Update vendor status atomically
  UPDATE public.vendors
  SET
    status = p_status,
    approved_at = CASE WHEN p_status = 'approved' THEN now() ELSE approved_at END,
    approved_by = CASE WHEN p_status = 'approved' THEN p_approved_by ELSE approved_by END,
    updated_at = now()
  WHERE id = p_vendor_id;

  RETURN jsonb_build_object('success', true, 'vendor_id', p_vendor_id, 'new_status', p_status);

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for user management functions
COMMENT ON FUNCTION create_user_profile_atomic(uuid, text, text, text) IS 'Atomically creates or updates a user profile during registration';
COMMENT ON FUNCTION create_vendor_profile_atomic(uuid, text, text) IS 'Atomically creates or updates a vendor profile during registration';
COMMENT ON FUNCTION save_user_preferences_atomic(uuid, text, text, text) IS 'Atomically saves or updates user preferences';
COMMENT ON FUNCTION update_vendor_status_atomic(uuid, text, uuid) IS 'Atomically updates vendor status with proper locking';

-- Service Management Atomic Functions

-- Create function for atomic service creation
CREATE OR REPLACE FUNCTION create_service_atomic(
  p_vendor_id uuid,
  p_category_id uuid,
  p_title text,
  p_description text,
  p_price numeric,
  p_currency text DEFAULT 'UGX',
  p_images text[] DEFAULT '{}',
  p_location text DEFAULT NULL,
  p_duration_hours numeric DEFAULT NULL,
  p_max_capacity integer DEFAULT NULL,
  p_amenities text[] DEFAULT '{}',
  p_status text DEFAULT 'pending'
) RETURNS jsonb AS $$
DECLARE
  v_service record;
  v_result jsonb;
BEGIN
  -- Lock services table to prevent concurrent service creation conflicts
  LOCK TABLE public.services IN SHARE ROW EXCLUSIVE MODE;

  -- Insert new service
  INSERT INTO public.services (
    vendor_id,
    category_id,
    title,
    description,
    price,
    currency,
    images,
    location,
    duration_hours,
    max_capacity,
    amenities,
    status,
    created_at,
    updated_at
  ) VALUES (
    p_vendor_id,
    p_category_id,
    p_title,
    p_description,
    p_price,
    p_currency,
    p_images,
    p_location,
    p_duration_hours,
    p_max_capacity,
    p_amenities,
    p_status,
    now(),
    now()
  )
  RETURNING id INTO v_service;

  RETURN jsonb_build_object('success', true, 'service_id', v_service.id);

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for atomic service update
CREATE OR REPLACE FUNCTION update_service_atomic(
  p_service_id uuid,
  p_updates jsonb,
  p_vendor_id uuid DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_service record;
  v_update_data jsonb;
  v_result jsonb;
BEGIN
  -- Lock the service row for update to prevent concurrent modifications
  SELECT * INTO v_service
  FROM public.services
  WHERE id = p_service_id
  FOR UPDATE;

  -- Check if service exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Service not found');
  END IF;

  -- Check authorization (vendor owns service or is admin)
  IF p_vendor_id IS NOT NULL AND v_service.vendor_id != p_vendor_id THEN
    -- Check if user is admin (this would need to be passed or checked differently)
    -- For now, assume vendor authorization is checked at application level
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Service does not belong to this vendor');
  END IF;

  -- Prepare update data with timestamp
  v_update_data := p_updates || jsonb_build_object('updated_at', now());

  -- Update service atomically
  UPDATE public.services
  SET
    title = COALESCE(v_update_data->>'title', title),
    description = COALESCE(v_update_data->>'description', description),
    price = COALESCE((v_update_data->>'price')::numeric, price),
    currency = COALESCE(v_update_data->>'currency', currency),
    images = COALESCE((v_update_data->>'images')::text[], images),
    location = COALESCE(v_update_data->>'location', location),
    duration_hours = COALESCE((v_update_data->>'duration_hours')::numeric, duration_hours),
    max_capacity = COALESCE((v_update_data->>'max_capacity')::integer, max_capacity),
    amenities = COALESCE((v_update_data->>'amenities')::text[], amenities),
    status = COALESCE(v_update_data->>'status', status),
    scan_enabled = COALESCE((v_update_data->>'scan_enabled')::boolean, scan_enabled),
    updated_at = now()
  WHERE id = p_service_id;

  RETURN jsonb_build_object('success', true, 'service_id', p_service_id);

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for atomic service deletion
CREATE OR REPLACE FUNCTION delete_service_atomic(
  p_service_id uuid,
  p_vendor_id uuid DEFAULT NULL,
  p_is_admin boolean DEFAULT false
) RETURNS jsonb AS $$
DECLARE
  v_service record;
  v_result jsonb;
BEGIN
  -- Lock the service row for update to prevent concurrent operations
  SELECT * INTO v_service
  FROM public.services
  WHERE id = p_service_id
  FOR UPDATE;

  -- Check if service exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Service not found');
  END IF;

  -- Check authorization
  IF NOT p_is_admin AND p_vendor_id IS NOT NULL AND v_service.vendor_id != p_vendor_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Service does not belong to this vendor');
  END IF;

  -- Delete related records in correct order to handle foreign key constraints
  -- 1. Delete tickets that reference this service
  DELETE FROM public.tickets WHERE service_id = p_service_id;

  -- 2. Delete order_items that reference ticket_types of this service
  DELETE FROM public.order_items
  WHERE ticket_type_id IN (
    SELECT id FROM public.ticket_types WHERE service_id = p_service_id
  );

  -- 3. Delete orders that have no more order_items (optional cleanup)
  DELETE FROM public.orders
  WHERE id NOT IN (
    SELECT DISTINCT order_id FROM public.order_items
  );

  -- 4. Delete ticket_types for this service (now safe since order_items are deleted)
  DELETE FROM public.ticket_types WHERE service_id = p_service_id;

  -- 5. Delete the service (other CASCADE relationships will handle the rest)
  DELETE FROM public.services WHERE id = p_service_id;

  RETURN jsonb_build_object('success', true, 'service_id', p_service_id);

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for service management functions
COMMENT ON FUNCTION create_service_atomic(uuid, uuid, text, text, numeric, text, text[], text, numeric, integer, text[], text) IS 'Atomically creates a new service with proper locking';
COMMENT ON FUNCTION update_service_atomic(uuid, jsonb, uuid) IS 'Atomically updates a service with row locking to prevent concurrent modifications';
COMMENT ON FUNCTION delete_service_atomic(uuid, uuid, boolean) IS 'Atomically deletes a service with proper authorization and locking';

-- Create function for atomic booking creation with capacity validation
CREATE OR REPLACE FUNCTION create_booking_atomic(
  p_service_id uuid,
  p_vendor_id uuid,
  p_booking_date date,
  p_guests integer,
  p_total_amount numeric,
  p_tourist_id uuid DEFAULT NULL,
  p_service_date date DEFAULT NULL,
  p_currency text DEFAULT 'UGX',
  p_special_requests text DEFAULT NULL,
  p_guest_name text DEFAULT NULL,
  p_guest_email text DEFAULT NULL,
  p_guest_phone text DEFAULT NULL,
  p_pickup_location text DEFAULT NULL,
  p_dropoff_location text DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_service record;
  v_existing_bookings integer;
  v_available_capacity integer;
  v_booking record;
  v_result jsonb;
BEGIN
  -- Lock the service row for update to prevent concurrent bookings
  SELECT * INTO v_service
  FROM public.services
  WHERE id = p_service_id
  FOR UPDATE;

  -- Check if service exists and is available
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Service not found');
  END IF;

  IF v_service.status NOT IN ('approved', 'active') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Service is not available for booking');
  END IF;

  -- Check capacity if max_capacity is set
  IF v_service.max_capacity IS NOT NULL THEN
    -- Count existing confirmed bookings for this service and date
    SELECT COALESCE(SUM(guests), 0) INTO v_existing_bookings
    FROM public.bookings
    WHERE service_id = p_service_id
      AND service_date = p_service_date
      AND status IN ('confirmed', 'pending');

    v_available_capacity := v_service.max_capacity - v_existing_bookings;

    IF v_available_capacity < p_guests THEN
      RETURN jsonb_build_object('success', false, 'error', format('Insufficient capacity. Available: %s, Requested: %s', v_available_capacity, p_guests));
    END IF;
  END IF;

  -- Create the booking
  INSERT INTO public.bookings (
    service_id,
    tourist_id,
    vendor_id,
    booking_date,
    service_date,
    guests,
    total_amount,
    currency,
    status,
    payment_status,
    special_requests,
    guest_name,
    guest_email,
    guest_phone,
    pickup_location,
    dropoff_location,
    is_guest_booking,
    created_at,
    updated_at
  ) VALUES (
    p_service_id,
    p_tourist_id,
    p_vendor_id,
    p_booking_date,
    p_service_date,
    p_guests,
    p_total_amount,
    p_currency,
    'pending',
    'pending',
    p_special_requests,
    p_guest_name,
    p_guest_email,
    p_guest_phone,
    p_pickup_location,
    p_dropoff_location,
    CASE WHEN p_tourist_id IS NULL THEN true ELSE false END,
    now(),
    now()
  )
  RETURNING id INTO v_booking;

  RETURN jsonb_build_object('success', true, 'booking_id', v_booking.id);

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for atomic booking status update
CREATE OR REPLACE FUNCTION update_booking_status_atomic(
  p_booking_id uuid,
  p_status text,
  p_payment_status text DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_booking record;
  v_result jsonb;
BEGIN
  -- Lock the booking row for update to prevent concurrent status changes
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  -- Check if booking exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;

  -- Update booking status atomically
  UPDATE public.bookings
  SET
    status = COALESCE(p_status, status),
    payment_status = COALESCE(p_payment_status, payment_status),
    updated_at = now()
  WHERE id = p_booking_id;

  RETURN jsonb_build_object('success', true, 'booking_id', p_booking_id, 'new_status', p_status, 'new_payment_status', p_payment_status);

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check service availability for a specific date
CREATE OR REPLACE FUNCTION check_service_availability(
  p_service_id uuid,
  p_service_date date,
  p_requested_guests integer
) RETURNS jsonb AS $$
DECLARE
  v_service record;
  v_existing_bookings integer;
  v_available_capacity integer;
BEGIN
  -- Get service details
  SELECT * INTO v_service
  FROM public.services
  WHERE id = p_service_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('available', false, 'error', 'Service not found');
  END IF;

  IF v_service.status NOT IN ('approved', 'active') THEN
    RETURN jsonb_build_object('available', false, 'error', 'Service is not available');
  END IF;

  -- Check capacity if max_capacity is set
  IF v_service.max_capacity IS NOT NULL THEN
    -- Count existing confirmed bookings for this service and date
    SELECT COALESCE(SUM(guests), 0) INTO v_existing_bookings
    FROM public.bookings
    WHERE service_id = p_service_id
      AND service_date = p_service_date
      AND status IN ('confirmed', 'pending');

    v_available_capacity := v_service.max_capacity - v_existing_bookings;

    RETURN jsonb_build_object(
      'available', v_available_capacity >= p_requested_guests,
      'available_capacity', v_available_capacity,
      'requested_guests', p_requested_guests,
      'max_capacity', v_service.max_capacity
    );
  ELSE
    -- No capacity limit
    RETURN jsonb_build_object('available', true, 'unlimited_capacity', true);
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('available', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for booking management functions
COMMENT ON FUNCTION create_booking_atomic(uuid, uuid, date, integer, numeric, uuid, date, text, text, text, text, text, text, text) IS 'Atomically creates a booking with capacity validation and prevents overbooking';
COMMENT ON FUNCTION update_booking_status_atomic(uuid, text, text) IS 'Atomically updates booking status with row locking to prevent concurrent modifications';
COMMENT ON FUNCTION check_service_availability(uuid, date, integer) IS 'Checks if a service has available capacity for a specific date and number of guests';

-- Payment & Financial Services Atomic Functions

-- Create function for atomic transaction creation
CREATE OR REPLACE FUNCTION create_transaction_atomic(
  p_booking_id uuid DEFAULT NULL,
  p_vendor_id uuid DEFAULT NULL,
  p_tourist_id uuid DEFAULT NULL,
  p_amount numeric DEFAULT NULL,
  p_currency text DEFAULT 'UGX',
  p_transaction_type text DEFAULT 'payment',
  p_status text DEFAULT 'pending',
  p_payment_method text DEFAULT 'card',
  p_reference text DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_transaction record;
  v_result jsonb;
BEGIN
  -- Generate reference if not provided
  IF p_reference IS NULL THEN
    p_reference := UPPER(p_transaction_type || '_' || encode(gen_random_bytes(4), 'hex') || '_' || EXTRACT(epoch FROM now())::text);
  END IF;

  -- Insert transaction atomically
  INSERT INTO public.transactions (
    booking_id,
    vendor_id,
    tourist_id,
    amount,
    currency,
    transaction_type,
    status,
    payment_method,
    reference,
    created_at
  ) VALUES (
    p_booking_id,
    p_vendor_id,
    p_tourist_id,
    p_amount,
    p_currency,
    p_transaction_type,
    p_status,
    p_payment_method,
    p_reference,
    now()
  )
  RETURNING id INTO v_transaction;

  RETURN jsonb_build_object('success', true, 'transaction_id', v_transaction.id, 'reference', p_reference);

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for atomic wallet credit/debit operations
CREATE OR REPLACE FUNCTION update_wallet_balance_atomic(
  p_vendor_id uuid,
  p_amount numeric,
  p_currency text DEFAULT 'UGX',
  p_operation text DEFAULT 'credit' -- 'credit' or 'debit'
) RETURNS jsonb AS $$
DECLARE
  v_wallet record;
  v_new_balance numeric;
  v_result jsonb;
BEGIN
  -- Lock the wallet row for update to prevent concurrent balance modifications
  SELECT * INTO v_wallet
  FROM public.wallets
  WHERE vendor_id = p_vendor_id
  FOR UPDATE;

  -- Check if wallet exists, create if not
  IF NOT FOUND THEN
    IF p_operation = 'debit' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Wallet not found and cannot debit from non-existent wallet');
    END IF;

    -- Create new wallet
    INSERT INTO public.wallets (
      vendor_id,
      balance,
      currency,
      created_at,
      updated_at
    ) VALUES (
      p_vendor_id,
      CASE WHEN p_operation = 'credit' THEN p_amount ELSE 0 END,
      p_currency,
      now(),
      now()
    )
    RETURNING * INTO v_wallet;

    RETURN jsonb_build_object('success', true, 'wallet_id', v_wallet.id, 'new_balance', v_wallet.balance, 'action', 'created');
  END IF;

  -- Check currency consistency
  IF v_wallet.currency != p_currency THEN
    RETURN jsonb_build_object('success', false, 'error', format('Currency mismatch: wallet is %s, operation is %s', v_wallet.currency, p_currency));
  END IF;

  -- Calculate new balance
  IF p_operation = 'credit' THEN
    v_new_balance := v_wallet.balance + p_amount;
  ELSIF p_operation = 'debit' THEN
    v_new_balance := v_wallet.balance - p_amount;
    -- Check for sufficient funds
    IF v_new_balance < 0 THEN
      RETURN jsonb_build_object('success', false, 'error', format('Insufficient funds: balance %s, debit amount %s', v_wallet.balance, p_amount));
    END IF;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid operation. Must be credit or debit');
  END IF;

  -- Update wallet balance atomically
  UPDATE public.wallets
  SET
    balance = v_new_balance,
    updated_at = now()
  WHERE id = v_wallet.id;

  RETURN jsonb_build_object('success', true, 'wallet_id', v_wallet.id, 'old_balance', v_wallet.balance, 'new_balance', v_new_balance, 'action', 'updated');

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for atomic payment processing (transaction + wallet credit)
CREATE OR REPLACE FUNCTION process_payment_atomic(
  p_vendor_id uuid,
  p_amount numeric,
  p_booking_id uuid DEFAULT NULL,
  p_tourist_id uuid DEFAULT NULL,
  p_currency text DEFAULT 'UGX',
  p_payment_method text DEFAULT 'card',
  p_reference text DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_transaction_result jsonb;
  v_wallet_result jsonb;
  v_transaction_id uuid;
  v_result jsonb;
BEGIN
  -- Start transaction
  -- Create transaction record
  SELECT create_transaction_atomic(
    p_booking_id,
    p_vendor_id,
    p_tourist_id,
    p_amount,
    p_currency,
    'payment',
    'completed',
    p_payment_method,
    p_reference
  ) INTO v_transaction_result;

  IF NOT (v_transaction_result->>'success')::boolean THEN
    RETURN jsonb_build_object('success', false, 'error', 'Failed to create transaction: ' || (v_transaction_result->>'error'));
  END IF;

  v_transaction_id := (v_transaction_result->>'transaction_id')::uuid;

  -- Credit vendor wallet
  SELECT update_wallet_balance_atomic(
    p_vendor_id,
    p_amount,
    p_currency,
    'credit'
  ) INTO v_wallet_result;

  IF NOT (v_wallet_result->>'success')::boolean THEN
    -- Rollback transaction if wallet update fails
    UPDATE public.transactions
    SET status = 'failed'
    WHERE id = v_transaction_id;

    RETURN jsonb_build_object('success', false, 'error', 'Failed to credit wallet: ' || (v_wallet_result->>'error'));
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'reference', v_transaction_result->>'reference',
    'wallet_id', v_wallet_result->>'wallet_id',
    'new_balance', v_wallet_result->>'new_balance'
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Mark transaction as failed if any error occurs
    IF v_transaction_id IS NOT NULL THEN
      UPDATE public.transactions
      SET status = 'failed'
      WHERE id = v_transaction_id;
    END IF;

    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for atomic withdrawal processing
CREATE OR REPLACE FUNCTION process_withdrawal_atomic(
  p_vendor_id uuid,
  p_amount numeric,
  p_currency text DEFAULT 'UGX',
  p_payment_method text DEFAULT 'bank_transfer',
  p_reference text DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_wallet_result jsonb;
  v_transaction_result jsonb;
  v_transaction_id uuid;
  v_result jsonb;
BEGIN
  -- First debit the wallet
  SELECT update_wallet_balance_atomic(
    p_vendor_id,
    p_amount,
    p_currency,
    'debit'
  ) INTO v_wallet_result;

  IF NOT (v_wallet_result->>'success')::boolean THEN
    RETURN jsonb_build_object('success', false, 'error', 'Failed to debit wallet: ' || (v_wallet_result->>'error'));
  END IF;

  -- Create withdrawal transaction record
  SELECT create_transaction_atomic(
    NULL, -- no booking_id for withdrawals
    p_vendor_id,
    NULL, -- no tourist_id for withdrawals
    p_amount,
    p_currency,
    'withdrawal',
    'completed',
    p_payment_method,
    p_reference
  ) INTO v_transaction_result;

  IF NOT (v_transaction_result->>'success')::boolean THEN
    -- Rollback wallet debit if transaction creation fails
    UPDATE public.wallets
    SET balance = balance + p_amount
    WHERE vendor_id = p_vendor_id;

    RETURN jsonb_build_object('success', false, 'error', 'Failed to create withdrawal transaction: ' || (v_transaction_result->>'error'));
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_result->>'transaction_id',
    'reference', v_transaction_result->>'reference',
    'wallet_id', v_wallet_result->>'wallet_id',
    'new_balance', v_wallet_result->>'new_balance'
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Rollback wallet debit if any error occurs
    UPDATE public.wallets
    SET balance = balance + p_amount
    WHERE vendor_id = p_vendor_id;

    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for payment and financial functions
COMMENT ON FUNCTION create_transaction_atomic(uuid, numeric, text, uuid, uuid, text, text, text, text) IS 'Atomically creates a transaction record';
COMMENT ON FUNCTION update_wallet_balance_atomic(uuid, numeric, text, text) IS 'Atomically updates wallet balance with row locking to prevent race conditions';
COMMENT ON FUNCTION process_payment_atomic(uuid, numeric, uuid, uuid, text, text, text) IS 'Atomically processes a payment: creates transaction and credits wallet';
COMMENT ON FUNCTION process_withdrawal_atomic(uuid, numeric, text, text, text) IS 'Atomically processes a withdrawal: debits wallet and creates transaction';

-- Create function for atomic payment processing with commission deduction
CREATE OR REPLACE FUNCTION process_payment_with_commission(
  p_vendor_id uuid,
  p_total_amount numeric,
  p_commission_amount numeric,
  p_admin_id uuid,
  p_booking_id uuid DEFAULT NULL,
  p_tourist_id uuid DEFAULT NULL,
  p_currency text DEFAULT 'UGX',
  p_payment_method text DEFAULT 'card',
  p_reference text DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_vendor_amount numeric;
  v_transaction_result jsonb;
  v_vendor_wallet_result jsonb;
  v_admin_wallet_result jsonb;
  v_transaction_id uuid;
  v_result jsonb;
BEGIN
  -- Calculate vendor amount after commission
  v_vendor_amount := p_total_amount - p_commission_amount;

  -- Validate amounts
  IF v_vendor_amount < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Commission amount cannot exceed total payment amount');
  END IF;

  -- Start transaction
  -- Create transaction record for total payment
  SELECT create_transaction_atomic(
    p_booking_id,
    p_vendor_id,
    p_tourist_id,
    p_total_amount,
    p_currency,
    'payment',
    'completed',
    p_payment_method,
    p_reference
  ) INTO v_transaction_result;

  IF NOT (v_transaction_result->>'success')::boolean THEN
    RETURN jsonb_build_object('success', false, 'error', 'Failed to create transaction: ' || (v_transaction_result->>'error'));
  END IF;

  v_transaction_id := (v_transaction_result->>'transaction_id')::uuid;

  -- Credit vendor wallet with amount after commission
  IF v_vendor_amount > 0 THEN
    SELECT update_wallet_balance_atomic(
      p_vendor_id,
      v_vendor_amount,
      p_currency,
      'credit'
    ) INTO v_vendor_wallet_result;

    IF NOT (v_vendor_wallet_result->>'success')::boolean THEN
      -- Rollback transaction if vendor wallet update fails
      UPDATE public.transactions
      SET status = 'failed'
      WHERE id = v_transaction_id;

      RETURN jsonb_build_object('success', false, 'error', 'Failed to credit vendor wallet: ' || (v_vendor_wallet_result->>'error'));
    END IF;
  END IF;

  -- Credit admin wallet with commission
  IF p_commission_amount > 0 THEN
    SELECT update_wallet_balance_atomic(
      p_admin_id,
      p_commission_amount,
      p_currency,
      'credit'
    ) INTO v_admin_wallet_result;

    IF NOT (v_admin_wallet_result->>'success')::boolean THEN
      -- Rollback transaction and vendor credit if admin wallet update fails
      UPDATE public.transactions
      SET status = 'failed'
      WHERE id = v_transaction_id;

      IF v_vendor_amount > 0 THEN
        UPDATE public.wallets
        SET balance = balance - v_vendor_amount
        WHERE vendor_id = p_vendor_id;
      END IF;

      RETURN jsonb_build_object('success', false, 'error', 'Failed to credit admin wallet: ' || (v_admin_wallet_result->>'error'));
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'reference', v_transaction_result->>'reference',
    'vendor_wallet_id', v_vendor_wallet_result->>'wallet_id',
    'admin_wallet_id', v_admin_wallet_result->>'wallet_id',
    'vendor_amount', v_vendor_amount,
    'commission_amount', p_commission_amount,
    'vendor_new_balance', v_vendor_wallet_result->>'new_balance',
    'admin_new_balance', v_admin_wallet_result->>'new_balance'
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Mark transaction as failed if any error occurs
    IF v_transaction_id IS NOT NULL THEN
      UPDATE public.transactions
      SET status = 'failed'
      WHERE id = v_transaction_id;
    END IF;

    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;