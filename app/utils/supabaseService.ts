import { createUser, getUserByWallet, getUserByEmail, createNotificationRecord, checkDuplicateNotification } from './supabase';

/**
 * Register a user's email and wallet address in Supabase
 */
export async function registerUserEmail(email: string, walletAddress: string) {
  try {
    // Check if user already exists by wallet
    const existingUserByWallet = await getUserByWallet(walletAddress);
    if (existingUserByWallet) {
      return {
        success: false,
        message: 'Wallet address already registered',
        data: existingUserByWallet
      };
    }

    // Check if user already exists by email
    const existingUserByEmail = await getUserByEmail(email);
    if (existingUserByEmail) {
      return {
        success: false,
        message: 'Email already registered',
        data: existingUserByEmail
      };
    }

    // Create new user
    const newUser = await createUser(email, walletAddress);
    return {
      success: true,
      message: 'Registration successful',
      data: newUser
    };
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
    const user = await getUserByWallet(walletAddress);
    if (!user) {
      return {
        success: false,
        message: 'User not found'
      };
    }

    return {
      success: true,
      email: user.email,
      userId: user.id
    };
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
