# Call Completion Email Notifications - Setup Guide

This guide walks you through setting up automated email notifications with AI-powered analysis for every call your restaurant receives.

## What You'll Get

After each call ends, admins automatically receive an email with:
- **📧 Smart subject line:** "Reservation - Tuesday 7pm for 4" / "To-Go Order - Pickup 6pm"
- **🤖 AI summary:** 2-3 sentence summary of what happened
- **💚 Sentiment score:** Visual badge showing customer mood (Happy/Neutral/Frustrated)
- **📊 Key details:** Customer name, action taken, issues, follow-up needed
- **🎧 MP3 recording:** Attached to email - click to listen, no login required

## Prerequisites

1. ✅ ElevenLabs account with Conversational AI agents set up
2. ✅ OpenAI API key ([Get one here](https://platform.openai.com/api-keys))
3. ✅ Resend account for emails ([Sign up here](https://resend.com))

## Step 1: Environment Variables

Add these to your `.env.local` file:

```bash
# OpenAI API (for call analysis)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Resend Email API
RESEND_API_KEY=re_your-resend-api-key-here

# ElevenLabs Webhook Secret (get from ElevenLabs dashboard)
ELEVENLABS_WEBHOOK_SECRET=your_webhook_signing_secret_here
```

### Getting Your API Keys:

**OpenAI API Key:**
1. Go to https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy the key (starts with `sk-`)
4. Add to `.env.local`

**Resend API Key:**
1. Go to https://resend.com/api-keys
2. Click "Create API Key"
3. Copy the key (starts with `re_`)
4. Add to `.env.local`

## Step 2: Configure ElevenLabs Webhook

1. **Go to ElevenLabs Dashboard:**
   - Navigate to: https://elevenlabs.io/app/conversational-ai
   - Click on "Settings" or "Workspace Settings"

2. **Enable Post-Call Webhooks:**
   - Find the "Webhooks" section
   - Enable **`post_call_transcription`** webhook
   - This webhook includes the transcript needed for AI analysis

3. **Set Webhook URL:**
   ```
   https://your-domain.com/api/webhooks/elevenlabs/post-call
   ```

   For local testing with ngrok:
   ```
   https://your-ngrok-id.ngrok.io/api/webhooks/elevenlabs/post-call
   ```

4. **Copy Webhook Signing Secret:**
   - ElevenLabs will show you a webhook signing secret
   - Copy this and add it to your `.env.local` as `ELEVENLABS_WEBHOOK_SECRET`

5. **Save Settings**

## Step 3: Deploy Your Application

The webhook endpoint and email notification system are now ready!

### For Production:
```bash
npm run build
# Deploy to your hosting platform (Vercel, etc.)
```

### For Local Testing:
```bash
# Install ngrok if you haven't already
npm install -g ngrok

# Start your dev server
npm run dev

# In another terminal, expose your local server
ngrok http 3000

# Use the ngrok URL in ElevenLabs webhook settings
```

## Step 4: Test the Setup

1. **Make a test call to your restaurant's phone number**

2. **Check your logs** - you should see:
   ```
   Received post-call webhook: { conversation_id: '...', agent_id: '...', has_transcript: true }
   Found agent: { agentId: '...', restaurantId: '...', agentName: '...' }
   Analyzing call with OpenAI...
   OpenAI analysis complete: { call_subject: 'Reservation - Tuesday 7pm for 4', sentiment: 'Happy' }
   Fetching audio from ElevenLabs...
   Audio fetched: 2.35 MB
   Sending call notification to: admin@restaurant.com (1/1)
   Call notification sent successfully
   ```

3. **Check admin email** - you should receive an email like:

   **Subject:** `📞 Reservation - Tuesday 7pm for 4 - Restaurant Name`

   **Body:**
   - Sentiment badge: Happy Customer (9/10) 🟢
   - AI Summary: "Customer called to make a reservation..."
   - Call details: Name provided ✅, Reservation created
   - MP3 file attached (click to listen)

## Troubleshooting

### Webhook not firing?

1. **Check ElevenLabs webhook configuration:**
   - Correct URL (must be HTTPS for production)
   - `post_call_transcription` webhook is enabled
   - Webhook is active (not disabled due to failures)

2. **Check your server logs:**
   - Is the endpoint receiving requests?
   - Any errors in the webhook handler?

3. **Verify webhook signature:**
   - Make sure `ELEVENLABS_WEBHOOK_SECRET` is set correctly
   - Check that signature validation isn't failing

### Emails not sending?

1. **Check Resend API key:**
   - Valid and not expired
   - Has permission to send emails
   - From email domain is verified in Resend

2. **Check admin emails:**
   - Restaurant has admin users configured
   - `getAdminEmails` query returns email addresses

3. **Check logs:**
   - Look for errors in `sendCallCompletionNotification`
   - Verify OpenAI API call succeeded
   - Verify audio fetch from ElevenLabs succeeded

### OpenAI errors?

1. **Check API key:**
   - Valid and not expired
   - Has credits/billing set up

2. **Check model availability:**
   - `gpt-4o-mini` is available in your region
   - Try switching to `gpt-4o` if needed

### Audio attachment not working?

1. **Check audio file size:**
   - If >35MB, it won't be attached (see logs)
   - Typical 2-10 minute calls are 1-10 MB (fine)

2. **Check ElevenLabs audio API:**
   - Audio endpoint responding successfully
   - Audio is available for the conversation

## Monitoring

### Key Metrics to Watch:

1. **Webhook delivery rate:**
   - Are all webhooks being received?
   - Any failures in ElevenLabs webhook logs?

2. **OpenAI API costs:**
   - ~$0.0003 per call (extremely cheap)
   - Monitor usage in OpenAI dashboard

3. **Email delivery rate:**
   - Check Resend dashboard for delivery stats
   - Monitor bounce/spam rates

4. **Audio attachment success rate:**
   - Check logs for "Audio too large" warnings
   - Most calls should have attachments

### Logging:

The system logs every step:
```
✅ Webhook received
✅ Agent found
✅ OpenAI analysis complete
✅ Audio fetched (2.35 MB)
✅ Email sent successfully
```

Check your application logs for any errors.

## Cost Breakdown

### Per Call:
- **OpenAI (GPT-4o-mini):** ~$0.0003
- **Resend email:** Free tier covers 3,000 emails/month
- **ElevenLabs webhook:** Free (no additional cost)

### Monthly (estimated for 500 calls):
- **OpenAI:** ~$0.15
- **Resend:** Free (under 3,000 emails)
- **Total:** ~$0.15/month 🎉

## Next Steps

Once setup is complete:

1. ✅ **Test with real calls** - make several test calls to verify
2. ✅ **Monitor email deliverability** - check spam folders
3. ✅ **Gather admin feedback** - are the summaries accurate?
4. ✅ **Adjust OpenAI prompt** - tweak if needed for better summaries

## Advanced Configuration

### Customizing the Email Template:

Edit `convex/notifications.ts` → `buildCallEmailTemplate()` function to customize:
- Email styling
- What information is displayed
- Layout and colors

### Customizing the AI Analysis:

Edit `convex/notifications.ts` → `analyzeCallWithOpenAI()` function to:
- Change the OpenAI model (`gpt-4o-mini` → `gpt-4o`)
- Modify the prompt for different analysis
- Add additional fields to extract

### Filtering Which Calls Send Emails:

Add logic in the webhook handler to only send emails for certain calls:
```typescript
// In src/app/api/webhooks/elevenlabs/post-call/route.ts

// Example: Only send emails for calls longer than 30 seconds
if (payload.metadata?.call_duration < 30) {
  return NextResponse.json({ success: true, skipped: 'too short' });
}

// Example: Only send for specific agents
const agent = await convexClient.query(...);
if (agent.sendCallNotifications === false) {
  return NextResponse.json({ success: true, skipped: 'notifications disabled' });
}
```

## Support

If you encounter issues:

1. Check the logs (both server and browser console)
2. Verify all environment variables are set
3. Test each component individually (webhook, OpenAI, email)
4. Check the troubleshooting section above

---

**Setup complete!** 🎉

Your restaurant admins will now receive intelligent email notifications for every call with AI-powered summaries and call recordings attached.
