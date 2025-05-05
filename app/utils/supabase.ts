import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client with proper environment variable handling
let supabaseUrl: string;
let supabaseAnonKey: string;

// Handle both browser and Node.js environments
if (typeof window !== 'undefined') {
  // Browser environment - use NEXT_PUBLIC_ variables
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
} else {
  // Node.js environment (for scripts and API routes)
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
}

// Hardcoded fallback values for development/testing
if (!supabaseUrl) {
  supabaseUrl = 'https://oznphwzrocbuufjwagmb.supabase.co';
}

if (!supabaseAnonKey) {
  supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96bnBod3pyb2NidXVmandhZ21iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkxOTI0OTIsImV4cCI6MjA1NDc2ODQ5Mn0.3GRn0xsueWZ-Lr9bEDBtKDXZaoCe1MH7YBVo2Tvi990';
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for our database tables
export interface User {
  id: string;
  email: string;
  wallet_address: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationHistory {
  id: string;
  user_id: string;
  transaction_hash: string;
  transaction_type: 'sent' | 'received';
  transaction_status: 'pending' | 'processing' | 'confirmed' | 'failed';
  sent_at: string;
  email_status: 'sent' | 'failed';
  error_message?: string;
}

// Helper functions for database operations

// User operations
export async function createUser(email: string, walletAddress: string) {
  const { data, error } = await supabase
    .from('users')
    .insert([
      { 
        email, 
        wallet_address: walletAddress.toLowerCase(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ])
    .select();
  
  if (error) {
    console.error('Error creating user:', error);
    throw error;
  }
  
  return data?.[0];
}

export async function getUserByWallet(walletAddress: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('wallet_address', walletAddress.toLowerCase())
    .single();
  
  if (error && error.code !== 'PGRST116') { // PGRST116 is the "not found" error code
    console.error('Error fetching user:', error);
    throw error;
  }
  
  return data;
}

export async function getUserByEmail(email: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase())
    .single();
  
  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching user:', error);
    throw error;
  }
  
  return data;
}

// Notification history operations
export async function createNotificationRecord(
  userId: string,
  transactionHash: string,
  transactionType: 'sent' | 'received',
  transactionStatus: 'pending' | 'processing' | 'confirmed' | 'failed',
  emailStatus: 'sent' | 'failed' = 'sent',
  errorMessage?: string
) {
  const { data, error } = await supabase
    .from('notification_history')
    .insert([
      { 
        user_id: userId,
        transaction_hash: transactionHash,
        transaction_type: transactionType,
        transaction_status: transactionStatus,
        sent_at: new Date().toISOString(),
        email_status: emailStatus,
        error_message: errorMessage
      }
    ])
    .select();
  
  if (error) {
    console.error('Error creating notification record:', error);
    throw error;
  }
  
  return data?.[0];
}

export async function getNotificationHistory(userId: string, limit = 50) {
  const { data, error } = await supabase
    .from('notification_history')
    .select('*')
    .eq('user_id', userId)
    .order('sent_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('Error fetching notification history:', error);
    throw error;
  }
  
  return data;
}

export async function checkDuplicateNotification(userId: string, transactionHash: string, transactionStatus: string) {
  const { data, error } = await supabase
    .from('notification_history')
    .select('*')
    .eq('user_id', userId)
    .eq('transaction_hash', transactionHash)
    .eq('transaction_status', transactionStatus)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    console.error('Error checking for duplicate notification:', error);
    throw error;
  }
  
  return !!data; // Return true if a record was found (duplicate exists)
}
