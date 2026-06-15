-- Add travel_fee column to appointments table
ALTER TABLE public.appointments 
ADD COLUMN travel_fee numeric DEFAULT 0;

-- Add travel_distance_miles column for reference
ALTER TABLE public.appointments 
ADD COLUMN travel_distance_miles numeric DEFAULT NULL;