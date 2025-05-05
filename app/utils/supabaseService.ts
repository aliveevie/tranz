import { createUser, getUserByWallet, getUserByEmail, createNotificationRecord, checkDuplicateNotification } from './supabase';

/**
 * Register a user's email and wallet address in Supabase
 */
export async function registerUserEmail(email: string, walletAddress: string) {
  try {
    // Check if user already exists by wallet
    const existingUserByWalletResult = await getUserByWallet(walletAddress);
    
    // Handle database not set up properly
    if (!existingUserByWalletResult.success && existingUserByWalletResult.message === 'Database not set up properly') {
      return {
        success: false,
        message: 'Database not set up properly. Please run the SQL setup script in the Supabase dashboard.',
        error: existingUserByWalletResult.error
      };
    }
    
    // Handle user already exists
    if (existingUserByWalletResult.success) {
      return {
        success: false,
        message: 'Wallet address already registered',
        data: existingUserByWalletResult.data
      };
    }

    // Check if user already exists by email
    const existingUserByEmailResult = await getUserByEmail(email);
    
    // Handle database not set up properly (redundant check, but just to be safe)
    if (!existingUserByEmailResult.success && existingUserByEmailResult.message === 'Database not set up properly') {
      return {
        success: false,
        message: 'Database not set up properly. Please run the SQL setup script in the Supabase dashboard.',
        error: existingUserByEmailResult.error
      };
    }
    
    // Handle user already exists
    if (existingUserByEmailResult.success) {
      return {
        success: false,
        message: 'Email already registered',
        data: existingUserByEmailResult.data
      };
    }

    // Create new user
    try {
      const newUser = await createUser(email, walletAddress);
      return {
        success: true,
        message: 'Registration successful',
        data: newUser
      };
    } catch (error: any) {
      // Check if the error is because the table doesn't exist
      if (error.code === '42P01') {
        return {
          success: false,
          message: 'Database not set up properly. Please run the SQL setup script in the Supabase dashboard.',
          error
        };
      }
      
      throw error; // Re-throw other errors to be caught by the outer try/catch
    }
  } catch (error) {
    console.error('Error registering user:', error);
    return {
      success: false,
      message: 'Registration failed',
      error
    };
  }
}

/**
 * Get user's email by wallet address
 */
export async function getEmailByWallet(walletAddress: string) {
  try {
    // getUserByWallet now returns a result object with success/error info
    const result = await getUserByWallet(walletAddress);
    
    // Just pass through the result from getUserByWallet
    return result;
  } catch (error) {
    console.error('Error getting email by wallet:', error);
    return {
      success: false,
      message: 'Failed to get email',
      error
    };
  }
}

/**
 * Record a notification sent to a user
 */
export async function recordNotification(
  userId: string,
  transactionHash: string,
  transactionType: 'sent' | 'received',
  transactionStatus: 'pending' | 'processing' | 'confirmed' | 'failed',
  emailStatus: 'sent' | 'failed' = 'sent',
  errorMessage?: string
) {
  try {
    // Check for duplicate notification
    const isDuplicate = await checkDuplicateNotification(userId, transactionHash, transactionStatus);
    if (isDuplicate) {
      return {
        success: false,
        message: 'Duplicate notification',
        isDuplicate: true
      };
    }

    // Create notification record
    const notification = await createNotificationRecord(
      userId,
      transactionHash,
      transactionType,
      transactionStatus,
      emailStatus,
      errorMessage
    );

    return {
      success: true,
      message: 'Notification recorded',
      data: notification
    };
  } catch (error) {
    console.error('Error recording notification:', error);
    return {
      success: false,
      message: 'Failed to record notification',
      error
    };
  }
}
