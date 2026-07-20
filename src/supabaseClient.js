import { createClient } from '@supabase/supabase-js'

// These should be environment variables in production
// e.g. import.meta.env.VITE_SUPABASE_URL
const supabaseUrl = 'https://bllhzzyhvpiebpetysyd.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsbGh6enlodnBpZWJwZXR5c3lkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0Njc0NTgsImV4cCI6MjEwMDA0MzQ1OH0.1UQ_wDzTjOXHQ3tbzxgu22deXKrlW7mylbNKgAQTe78'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
