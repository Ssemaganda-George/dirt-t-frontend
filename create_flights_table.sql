-- Create flights table for admin-managed flight services
CREATE TABLE IF NOT EXISTS flights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  flight_number TEXT NOT NULL UNIQUE,
  airline TEXT NOT NULL,
  departure_airport TEXT NOT NULL,
  arrival_airport TEXT NOT NULL,
  departure_city TEXT NOT NULL,
  arrival_city TEXT NOT NULL,
  departure_time TIMESTAMP WITH TIME ZONE NOT NULL,
  arrival_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL,
  aircraft_type TEXT,
  economy_price DECIMAL(10,2) NOT NULL,
  business_price DECIMAL(10,2),
  first_class_price DECIMAL(10,2),
  currency TEXT DEFAULT 'UGX',
  total_seats INTEGER NOT NULL,
  available_seats INTEGER NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'delayed', 'completed')),
  flight_class TEXT DEFAULT 'economy' CHECK (flight_class IN ('economy', 'business', 'first_class')),
  amenities TEXT[] DEFAULT '{}',
  baggage_allowance TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_flights_flight_number ON flights(flight_number);
CREATE INDEX IF NOT EXISTS idx_flights_departure_time ON flights(departure_time);
CREATE INDEX IF NOT EXISTS idx_flights_departure_city ON flights(departure_city);
CREATE INDEX IF NOT EXISTS idx_flights_arrival_city ON flights(arrival_city);
CREATE INDEX IF NOT EXISTS idx_flights_status ON flights(status);

-- Enable Row Level Security (RLS)
ALTER TABLE flights ENABLE ROW LEVEL SECURITY;

-- RLS Policies for flights (admin only for management)
CREATE POLICY "Admins can manage all flights" ON flights
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Insert some sample flight data
INSERT INTO flights (
  flight_number, airline, departure_airport, arrival_airport,
  departure_city, arrival_city, departure_time, arrival_time,
  duration_minutes, aircraft_type, economy_price, business_price,
  first_class_price, currency, total_seats, available_seats,
  amenities, baggage_allowance
) VALUES
  ('KQ101', 'Kenya Airways', 'EBB', 'NBO', 'Entebbe', 'Nairobi',
   '2024-01-15 08:00:00+00', '2024-01-15 09:30:00+00', 90, 'Boeing 737',
   450000, 1200000, 2500000, 'UGX', 150, 120,
   ARRAY['WiFi', 'Entertainment', 'Meals'], '20kg checked + 8kg carry-on'),

  ('UR201', 'RwandAir', 'EBB', 'KGL', 'Entebbe', 'Kigali',
   '2024-01-15 10:00:00+00', '2024-01-15 11:15:00+00', 75, 'Bombardier CRJ',
   280000, 750000, 1500000, 'UGX', 80, 65,
   ARRAY['WiFi', 'Snacks'], '15kg checked + 7kg carry-on'),

  ('ET301', 'Ethiopian Airlines', 'EBB', 'ADD', 'Entebbe', 'Addis Ababa',
   '2024-01-15 14:00:00+00', '2024-01-15 16:30:00+00', 150, 'Boeing 787',
   650000, 1800000, 3500000, 'UGX', 200, 180,
   ARRAY['WiFi', 'Entertainment', 'Meals', 'USB Charging'], '23kg checked + 8kg carry-on'),

  ('KL401', 'KLM', 'EBB', 'AMS', 'Entebbe', 'Amsterdam',
   '2024-01-15 22:00:00+00', '2024-01-16 08:00:00+00', 540, 'Boeing 777',
   2200000, 6500000, 12000000, 'UGX', 300, 250,
   ARRAY['WiFi', 'Entertainment', 'Meals', 'Lie-flat seats', 'USB Charging'], '23kg checked + 8kg carry-on')
ON CONFLICT (flight_number) DO NOTHING;