import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Import Supabase client after loading environment variables
import { supabase } from '../app/utils/supabase';

async function generateSqlScript() {
  console.log('Generating SQL script for Supabase setup...');

  // Read the SQL file with the table creation statements
  const sqlFilePath = path.resolve(__dirname, 'supabase-tables.sql');
  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

  console.log('\n=== SQL SCRIPT FOR SUPABASE DASHBOARD ===\n');
  console.log(sqlContent);
  console.log('\n=== END OF SQL SCRIPT ===\n');

  console.log('Instructions:');
  console.log('1. Go to your Supabase dashboard: https://app.supabase.com/project/_/sql');
  console.log('2. Click on "New Query"');
  console.log('3. Paste the SQL script above');
  console.log('4. Click "Run" to execute the script');
  console.log('5. Check that the tables were created successfully');

  // Test connection to Supabase
  try {
    console.log('\nTesting Supabase connection...');
    const { data, error } = await supabase.from('users').select('*').limit(1);
    
    if (error) {
      console.error('Error connecting to Supabase:', error.message);
      console.log('Please make sure your Supabase credentials are correct in the .env file.');
    } else {
      console.log('Supabase connection successful!');
      console.log('Users table exists:', data !== null);
    }
  } catch (error) {
    console.error('Error testing Supabase connection:', error);
  }
}

// Run the script
generateSqlScript()
  .then(() => console.log('Done!'))
  .catch(console.error);
