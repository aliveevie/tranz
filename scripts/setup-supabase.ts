import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Import Supabase client after loading environment variables
import { supabase } from '../app/utils/supabase';

async function createTables() {
  console.log('Setting up Supabase tables...');

  try {
    // Check if the users table exists
    let userTableExists = false;
    try {
      const { data } = await supabase
        .from('users')
        .select('*')
        .limit(1);
      userTableExists = !!(data && data.length > 0);
    } catch (error) {
      console.log('Users table does not exist yet');
    }

    // Check if the notification_history table exists
    let notificationTableExists = false;
    try {
      const { data } = await supabase
        .from('notification_history')
        .select('*')
        .limit(1);
      notificationTableExists = !!(data && data.length > 0);
    } catch (error) {
      console.log('Notification history table does not exist yet');
    }

    // If tables don't exist, we need to create them using SQL
    // Read the SQL file with the table creation statements
    const sqlFilePath = path.resolve(__dirname, 'supabase-tables.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    if (!userTableExists) {
      console.log('Creating users table...');
      
      try {
        // Execute the SQL to create the users table
        const createUsersTableSQL = `
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
        `;
        
        const { error } = await supabase.rpc('exec_sql', { sql: createUsersTableSQL });
        
        if (error) {
          console.error('Error creating users table:', error.message);
          console.log('Please create the users table manually in the Supabase dashboard SQL editor.');
        } else {
          console.log('Users table created successfully!');
        }
      } catch (error) {
        console.error('Error executing SQL:', error);
        console.log('Please create the tables manually in the Supabase dashboard using the SQL in scripts/supabase-tables.sql');
      }
    } else {
      console.log('Users table already exists.');
    }

    if (!notificationTableExists) {
      console.log('Creating notification_history table...');
      
      try {
        // Execute the SQL to create the notification_history table
        const createNotificationTableSQL = `
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
        `;
        
        const { error } = await supabase.rpc('exec_sql', { sql: createNotificationTableSQL });
        
        if (error) {
          console.error('Error creating notification_history table:', error.message);
          console.log('Please create the notification_history table manually in the Supabase dashboard SQL editor.');
        } else {
          console.log('Notification history table created successfully!');
        }
      } catch (error) {
        console.error('Error executing SQL:', error);
        console.log('Please create the tables manually in the Supabase dashboard using the SQL in scripts/supabase-tables.sql');
      }
    } else {
      console.log('Notification history table already exists.');
    }

    console.log('Supabase setup complete!');
  } catch (error) {
    console.error('Error setting up Supabase tables:', error);
    console.log('Please create the tables manually in the Supabase dashboard.');
  }
}

// Run the setup
createTables()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Setup failed:', error);
    process.exit(1);
  });
