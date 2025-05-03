# TranzAntions Email Notification Setup

This guide explains how to set up and use the email notification system for TranzAntions.

## Overview

TranzAntions uses Nodemailer to send email notifications for:
1. Welcome emails when users register their wallet
2. Transaction alerts when monitored wallets have activity

## Development Setup

For development and testing, the system uses Ethereal (a fake SMTP service) by default. This allows you to test email functionality without actually sending emails.

When you run the application in development mode, the system will:
1. Create a test account on Ethereal
2. Log the credentials and preview URL in the console
3. Send emails to this test account

You can view these test emails by:
1. Looking for the "Preview URL" in the console logs
2. Using the provided username and password to log in to Ethereal

## Production Setup

For production use, follow these steps:

1. Copy the `email-config-sample.txt` file to `.env.local` in your project root:
   ```
   cp email-config-sample.txt .env.local
   ```

2. Edit `.env.local` and update with your actual SMTP credentials:
   ```
   NODE_ENV=production
   EMAIL_HOST=your-smtp-server.com
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=your-username
   EMAIL_PASS=your-password
   EMAIL_FROM="TranzAntions <notifications@yourdomain.com>"
   ```

3. Restart your application to apply the changes

## Email Service Options

You can use various email service providers:

### Gmail
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-app-password  # Use an app password, not your regular Gmail password
```

### Outlook/Office 365
```
EMAIL_HOST=smtp.office365.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@outlook.com
EMAIL_PASS=your-password
```

### Amazon SES
```
EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=YOUR_SES_ACCESS_KEY
EMAIL_PASS=YOUR_SES_SECRET_KEY
```

## Testing the Email System

To test if your email system is working:

1. Register a new wallet using the email registration form
2. Check for the welcome email
3. Make a transaction with the registered wallet
4. Check for the transaction alert email

## Troubleshooting

If emails are not being sent:

1. Check the console logs for error messages
2. Verify your SMTP credentials are correct
3. Make sure your email provider allows sending from applications
4. For Gmail, make sure you're using an app password if you have 2FA enabled
