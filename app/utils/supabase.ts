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
  try {
    // First check if the users table exists by trying a simple query
    const { error: tableCheckError } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });
    
    // If the table doesn't exist, return a failure response
    if (tableCheckError && tableCheckError.code === '42P01') { // 42P01 is the "relation does not exist" error code
      console.error('Users table does not exist:', tableCheckError);
      return {
        success: false,
        message: 'Database not set up properly',
        error: tableCheckError
      };
    }
    
    // If the table exists, proceed with the query
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') { // PGRST116 is the "not found" error code
        return {
          success: false,
          message: 'User not found',
          error: null
        };
      }
      
      console.error('Error fetching user:', error);
      return {
        success: false,
        message: 'Error fetching user',
        error
      };
    }
    
    return {
      success: true,
      message: 'User found',
      data,
      userId: data.id,
      email: data.email
    };
  } catch (error) {
    console.error('Unexpected error in getUserByWallet:', error);
    return {
      success: false,
      message: 'Unexpected error',
      error
    };
  }
}

export async function getUserByEmail(email: string) {
  try {
    // First check if the users table exists by trying a simple query
    const { error: tableCheckError } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });
    
    // If the table doesn't exist, return a failure response
    if (tableCheckError && tableCheckError.code === '42P01') { // 42P01 is the "relation does not exist" error code
      console.error('Users table does not exist:', tableCheckError);
      return {
        success: false,
        message: 'Database not set up properly',
        error: tableCheckError
      };
    }
    
    // If the table exists, proceed with the query
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') { // PGRST116 is the "not found" error code
        return {
          success: false,
          message: 'User not found',
          error: null
        };
      }
      
      console.error('Error fetching user:', error);
      return {
        success: false,
        message: 'Error fetching user',
        error
      };
    }
    
    return {
      success: true,
      message: 'User found',
      data,
      userId: data.id,
      email: data.email
    };
  } catch (error) {
    console.error('Unexpected error in getUserByEmail:', error);
    return {
      success: false,
      message: 'Unexpected error',
      error
    };
  }
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
