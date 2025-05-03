// Email configuration options
export const emailConfig = {
  // Gmail configuration
  gmail: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.GMAIL_ACCOUNT || '',
      pass: process.env.GMAIL_PASSWORD || '',
    },
    from: process.env.GMAIL_ACCOUNT ? `"TranzAntions" <${process.env.GMAIL_ACCOUNT}>` : '',
  },
  
  // Development configuration (using Ethereal for testing)
  development: {
    // Ethereal is automatically configured in the emailService.ts
    // No need to specify credentials here as they're generated at runtime
    from: '"TranzAntions Dev" <dev-notifications@tranzantions.com>',
  },
  
  // Production configuration (use your actual SMTP service)
  production: {
    // Replace these with your actual SMTP credentials
    host: process.env.EMAIL_HOST || 'smtp.example.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER || '',
      pass: process.env.EMAIL_PASS || '',
    },
    from: process.env.EMAIL_FROM || '"TranzAntions" <notifications@tranzantions.com>',
  },
  
  // Use Gmail by default
  useGmail: true,
};
