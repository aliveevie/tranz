-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  wallet_address TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policy for anon access (for development only, restrict in production)
CREATE POLICY "Allow full access to users table" ON public.users
  USING (true)
  WITH CHECK (true);

-- Create notification_history table
CREATE TABLE IF NOT EXISTS public.notification_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  transaction_hash TEXT NOT NULL,
  transaction_type TEXT NOT NULL,
  transaction_status TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  email_status TEXT NOT NULL,
  error_message TEXT,
  UNIQUE(user_id, transaction_hash, transaction_status)
);

-- Enable Row Level Security
ALTER TABLE public.notification_history ENABLE ROW LEVEL SECURITY;

-- Create policy for anon access (for development only, restrict in production)
CREATE POLICY "Allow full access to notification_history table" ON public.notification_history
  USING (true)
  WITH CHECK (true);
  
-- Create index for faster queries
CREATE INDEX IF NOT EXISTS notification_history_user_id_idx ON public.notification_history(user_id);
CREATE INDEX IF NOT EXISTS notification_history_transaction_hash_idx ON public.notification_history(transaction_hash);
