-- Create flights table
CREATE TABLE IF NOT EXISTS public.flights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    flight_number VARCHAR(20) NOT NULL UNIQUE,
    airline VARCHAR(100) NOT NULL,
    departure_airport VARCHAR(10) NOT NULL,
    arrival_airport VARCHAR(10) NOT NULL,
    departure_city VARCHAR(100) NOT NULL,
    arrival_city VARCHAR(100) NOT NULL,
    departure_time TIMESTAMP WITH TIME ZONE NOT NULL,
    arrival_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER NOT NULL,
    aircraft_type VARCHAR(50),
    economy_price DECIMAL(10,2) NOT NULL,
    business_price DECIMAL(10,2),
    first_class_price DECIMAL(10,2),
    currency VARCHAR(3) NOT NULL DEFAULT 'UGX',
    total_seats INTEGER NOT NULL,
    available_seats INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'delayed', 'completed')),
    flight_class VARCHAR(20) NOT NULL DEFAULT 'economy' CHECK (flight_class IN ('economy', 'business', 'first_class')),
    amenities TEXT[] DEFAULT '{}',
    baggage_allowance VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_flights_departure_time ON public.flights(departure_time);
CREATE INDEX IF NOT EXISTS idx_flights_status ON public.flights(status);
CREATE INDEX IF NOT EXISTS idx_flights_departure_city ON public.flights(departure_city);
CREATE INDEX IF NOT EXISTS idx_flights_arrival_city ON public.flights(arrival_city);
CREATE INDEX IF NOT EXISTS idx_flights_flight_number ON public.flights(flight_number);

-- Enable Row Level Security
ALTER TABLE public.flights ENABLE ROW LEVEL SECURITY;

-- Create policies for flights
-- Allow anyone to read active flights
CREATE POLICY "Anyone can view active flights" ON public.flights
    FOR SELECT USING (status = 'active');

-- Allow authenticated users to manage flights (you may want to restrict this to admins/vendors)
CREATE POLICY "Authenticated users can manage flights" ON public.flights
    FOR ALL USING (auth.role() = 'authenticated');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_flights_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_flights_updated_at
    BEFORE UPDATE ON public.flights
    FOR EACH ROW
    EXECUTE FUNCTION update_flights_updated_at();