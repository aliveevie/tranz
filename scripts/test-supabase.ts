// Simple script to test Supabase connection
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Import Supabase client after loading environment variables
import { supabase } from '../app/utils/supabase';

async function testConnection() {
  try {
    console.log('Testing Supabase connection...');
    
    // Simple query to test the connection
    const { data, error } = await supabase.from('users').select('*').limit(1);
    
    if (error) {
      console.error('Error connecting to Supabase:', error.message);
      return;
    }
    
    console.log('Supabase connection successful!');
    console.log('Data:', data);
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the test
testConnection()
  .then(() => console.log('Test complete'))
  .catch(console.error);
