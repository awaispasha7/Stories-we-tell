# Admin Panel Setup Guide

## Overview
The admin panel allows authorized users to review and validate story scripts before they are sent to clients. This implements a human-in-the-loop workflow for quality control.

## Setup Instructions

### 1. Environment Variables

Add the following to your `.env.local` file:

```env
# Admin Access Control
NEXT_PUBLIC_ADMIN_EMAILS=admin@yourcompany.com,reviewer@yourcompany.com,manager@yourcompany.com
```

**Note**: Separate multiple admin emails with commas. These emails must match exactly with the email addresses used to sign up in the application.

### 2. Access the Admin Panel

1. **Sign up** with an admin email address at `/auth/signup`
2. **Navigate** to `/admin` to access the admin dashboard
3. **Unauthorized users** will be redirected back to the chat page

### 3. Admin Features

#### Dashboard Overview
- **Queue Statistics**: View counts by status (pending, approved, rejected, etc.)
- **Recent Activity**: See today's requests and average review times

#### Validation Queue
- **View All Requests**: List of all validation requests with filters by status
- **Request Details**: Full conversation transcript and generated script
- **Actions Available**:
  - ✅ **Approve**: Send script to client
  - ❌ **Reject**: Block sending with notes
  - ✏️ **Edit Script**: Modify the generated script before approval

#### Validation Process
1. **Story Completion**: When a user completes a story, it's automatically queued for validation
2. **Internal Notification**: Admin team receives email notification
3. **Review**: Admins can review transcript and script in the admin panel
4. **Action**: Approve (sends to client) or reject (with feedback)
5. **Client Delivery**: Approved stories are automatically sent to the client

## API Endpoints

The admin panel uses these backend endpoints:

- `GET /api/v1/validation/queue` - List validation requests
- `GET /api/v1/validation/queue/{id}` - Get specific request
- `POST /api/v1/validation/queue/{id}/approve` - Approve request
- `POST /api/v1/validation/queue/{id}/reject` - Reject request
- `PUT /api/v1/validation/queue/{id}/script` - Update script
- `GET /api/v1/validation/stats` - Get queue statistics

## Security

- **Email-based Access**: Only emails listed in `NEXT_PUBLIC_ADMIN_EMAILS` can access the admin panel
- **Authentication Required**: Must be logged in with a valid admin email
- **Automatic Redirects**: Unauthorized users are redirected to chat or login pages

## Usage Workflow

### For Admins:
1. Receive email notification when new stories need validation
2. Log in to `/admin` to review stories
3. Read conversation transcript to understand context
4. Review generated script for accuracy and quality
5. Edit script if needed (grammar, tone, structure)
6. Approve to send to client or reject with notes

### For Story Creators:
- Stories are automatically queued after completion
- No action needed - validation happens behind the scenes
- Approved stories are delivered via email

## Troubleshooting

### "Access Denied" Error
- Verify your email is in `NEXT_PUBLIC_ADMIN_EMAILS`
- Check for typos in email addresses
- Ensure you're logged in with the correct account

### Missing Validation Requests
- Check if the backend validation service is running
- Verify database connection for `validation_queue` table
- Check backend logs for errors

### Email Notifications Not Sent
- Verify `CLIENT_EMAIL` environment variable in backend
- Check `RESEND_API_KEY` configuration
- Review backend email service logs

## Development

### Adding New Admin Features
1. **Frontend**: Add components in `src/components/admin/`
2. **API**: Add endpoints in `stories-we-tell-backend/app/api/validation.py`
3. **Database**: Create migrations in `supabase/migrations/`

### Testing Admin Access
```env
# Add your development email for testing
NEXT_PUBLIC_ADMIN_EMAILS=yourdev@email.com
```

## Production Deployment

1. Set `NEXT_PUBLIC_ADMIN_EMAILS` with real admin emails
2. Ensure backend validation service is deployed
3. Test the full workflow from story completion to client delivery
4. Monitor logs for any validation errors

---

For questions or issues, check the validation service logs and ensure all environment variables are properly configured.
