# Call Completion Email Notifications - Technical Spike

## Executive Summary

**FEASIBLE ✅** - We can implement **intelligent** email notifications with:
- ✅ AI-generated call summary (OpenAI GPT-4)
- ✅ Customer sentiment score (happy/neutral/frustrated)
- ✅ Call recording attached as MP3 file (no login required)

This feature leverages ElevenLabs' post-call webhook system + OpenAI analysis to give admins a complete overview of each call without listening to every recording.

---

## How It Works (Complete Flow)

```
1. Customer calls restaurant
   ↓
2. ElevenLabs AI agent handles the call
   ↓
3. Call ends → ElevenLabs processes transcript
   ↓
4. Webhook fires to your server with:
   - conversation_id
   - agent_id
   - Full transcript
   - Call metadata (duration, timestamp)
   ↓
5. Your webhook handler:
   a) Sends transcript to OpenAI GPT-4o-mini
   b) Fetches MP3 audio from ElevenLabs API
   ↓
6. OpenAI analyzes and returns:
   - Call summary (2-3 sentences)
   - Sentiment score (0-10)
   - Key details (name provided, action taken, issues)
   ↓
7. Email sent to all restaurant admins with:
   - AI-generated summary
   - Sentiment badge (Green/Yellow/Red)
   - Call details and insights
   - MP3 recording attached
   ↓
8. Admin opens email and sees:
   📞 Reservation - Tuesday 7pm for 4 - Restaurant Name

   [AI Summary: "Customer called to make a reservation..."]
   [Sentiment: Happy (9/10) 🟢]
   [Details: Name provided ✅, Reservation created]
   [📎 call-recording.mp3 attached]

   Admin clicks MP3 → Listens (no login!)
```

**Total time:** Few minutes after call ends (webhook processing + OpenAI analysis)
**Cost per call:** ~$0.0003 (OpenAI) + email delivery
**Admin experience:** Complete call overview in one email, no login required

---

## Current Implementation Status

### ✅ What We Already Have

1. **Admin Email System** (`convex/notifications.ts:15-65`)
   - `getAdminEmails()` query retrieves all relevant admin emails for a restaurant
   - Returns: organization owners + restaurant managers
   - Successfully used for reservation and order notifications

2. **Email Sending Infrastructure** (`convex/notifications.ts`)
   - Resend email service integrated
   - Rate limiting handled (2 emails/second with 600ms delay)
   - HTML email templates established
   - Retry logic and error handling in place

3. **Call Recording Retrieval** (`src/app/api/elevenlabs/conversations/[conversationId]/audio/route.ts`)
   - Existing API route that proxies ElevenLabs audio
   - Fetches audio from: `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}/audio`
   - Requires ElevenLabs API key authentication
   - Returns MP3 audio with proper content headers

4. **Call History UI** (`src/app/(dashboard)/dashboard/agents/[agentId]/calls/page.tsx:313-320`)
   - Already displays calls with embedded audio players
   - Uses route: `/api/elevenlabs/conversations/${conversation_id}/audio`

---

## How Call Completion Detection Works

### ElevenLabs Post-Call Webhooks

ElevenLabs provides **post-call webhooks** that fire after each conversation ends:

#### Webhook Types Available:
1. **`post_call_transcription`** - Full conversation data including:
   - `agent_id`
   - `conversation_id`
   - `status`
   - `transcript`
   - `analysis` results
   - Call metadata (duration, timestamps, etc.)

2. **`post_call_audio`** - Minimal payload with:
   - `agent_id`
   - `conversation_id`
   - Base64-encoded MP3 audio (complete conversation)

#### Timing:
- Webhooks fire **after analysis is complete** (not immediately when call ends)
- Includes `event_timestamp` field (Unix time UTC)

#### Configuration:
- Enabled through **Agents Platform settings page** (workspace-wide)
- Requires returning 200 status code
- Auto-disables after 10+ consecutive failures (if last success was 7+ days ago)

#### Security Features:
- HMAC signature authentication via `ElevenLabs-Signature` header
- Optional IP whitelisting (6 static IPs per region)
- 30-minute timestamp tolerance window

---

---

## NEW: OpenAI Call Analysis Integration

### What Gets Analyzed

For each call, we'll use OpenAI GPT-4 to generate:

1. **Call Subject/Purpose** (Short, concise label for email subject)
   - Examples:
     - "Reservation - Tuesday 7pm"
     - "To-Go Order - Pickup 6pm"
     - "Menu Inquiry"
     - "Cancellation - Friday Reservation"
     - "General Question - Hours"
     - "Complaint - Wait Time"

2. **Call Summary** (2-3 sentences for email body)
   - What was the purpose of the call?
   - What outcome was achieved?
   - Key details (name provided, reservation made, menu inquiry, etc.)

3. **Sentiment Score** (0-10 scale) - For email body, NOT subject
   - 8-10: Customer was happy, satisfied, pleasant
   - 5-7: Customer was neutral, transactional
   - 0-4: Customer was frustrated, annoyed, upset

4. **Key Insights**
   - Did customer provide their name?
   - Was a reservation/order created?
   - Any issues or complaints?
   - Follow-up needed?

### OpenAI Prompt Design

```typescript
const prompt = `You are analyzing a customer service call transcript for a restaurant.

Call Transcript:
${transcript}

Please provide:

1. CALL_SUBJECT: A short, concise subject line for an email (max 6-8 words). This should capture the main purpose of the call. Examples:
   - "Reservation - Tuesday 7pm for 4"
   - "To-Go Order - Pickup 6pm"
   - "Menu Inquiry - Gluten-Free Options"
   - "Cancellation - Friday Reservation"
   - "Complaint - Long Wait Time"
   - "General Question - Operating Hours"

2. SUMMARY: A brief 2-3 sentence summary of what happened on this call. Include the purpose of the call and any outcomes (reservation made, order placed, just inquiring, etc.)

3. SENTIMENT_SCORE: Rate the customer's sentiment on a scale of 0-10:
   - 0-4: Frustrated, upset, annoyed, had complaints
   - 5-7: Neutral, transactional, just getting information
   - 8-10: Happy, pleasant, satisfied, friendly

4. KEY_DETAILS:
   - Customer provided name: yes/no
   - Action taken: (e.g., "Made reservation for 4 guests on Friday at 7pm", "Placed to-go order", "Just checking menu", "No action taken")
   - Issues or complaints: (if any)
   - Follow-up needed: yes/no (and why)

Format your response as JSON:
{
  "call_subject": "Reservation - Tuesday 7pm for 4",
  "summary": "...",
  "sentiment_score": 8,
  "sentiment_label": "Happy",
  "customer_name_provided": true,
  "action_taken": "...",
  "issues": "",
  "follow_up_needed": false,
  "follow_up_reason": ""
}`;
```

---

## Audio Delivery - Three Approaches

### Option A: Email Attachment (MP3 File) ⭐ **RECOMMENDED - NO LOGIN REQUIRED**

**How it works:**
1. Webhook fires with `post_call_transcription` event (includes transcript + analysis)
2. Send transcript to OpenAI for summary + sentiment analysis
3. Fetch audio file from ElevenLabs API
4. Attach MP3 to email along with AI-generated summary

**Pros:**
- ✅ **No login required** - admins can listen immediately from their email client
- ✅ Works on all devices (phone, desktop, tablet)
- ✅ Audio playback built into email clients
- ✅ Admins can save/archive recordings locally
- ✅ No server bandwidth for audio delivery
- ✅ Simple user experience

**Cons:**
- ⚠️ File size limitations (Resend: max 40MB after base64 encoding)
- ⚠️ Long calls may exceed attachment limits
- ⚠️ Email deliverability may be affected by large attachments
- ⚠️ Security: anyone with email access can listen (but they're already admin)

**File Size Analysis:**
- Phone quality MP3: ~0.5-1 MB per minute
- 5-minute call: ~2.5-5 MB ✅ Well within limits
- 10-minute call: ~5-10 MB ✅ Still fine
- 30-minute call: ~15-30 MB ✅ Should work
- 60-minute call: ~30-60 MB ⚠️ May approach limit

**Recommendation:** Perfect for typical restaurant calls (2-10 minutes). For longer calls, fall back to Option B or C.

---

### Option B: Authenticated Links via Your API

**How it works:**
- Email contains link like: `https://your-app.com/api/elevenlabs/conversations/conv_123/audio`
- Your API route authenticates the request and proxies audio from ElevenLabs
- Users must be logged in (via Clerk authentication middleware)

**Pros:**
- ✅ Already implemented (route exists)
- ✅ Secure - requires user authentication
- ✅ No ElevenLabs API key exposure
- ✅ Can track who listens to recordings
- ✅ Can revoke access by changing authentication rules
- ✅ No file size limits

**Cons:**
- ⚠️ Users must log in to listen
- ⚠️ Requires your server to proxy every audio request
- ⚠️ Bandwidth costs (proxying audio through your server)
- ⚠️ Extra friction for admins

**Example email link:**
```
https://your-app.com/api/elevenlabs/conversations/conv_abc123/audio
```

---

### Option C: Signed URLs via ElevenLabs API

**How it works:**
- Use ElevenLabs endpoint: `GET /v1/convai/conversation/get-signed-url?agent_id=xxx`
- Returns a temporary signed URL for direct access
- Email contains this signed URL (no login required)

**Pros:**
- ✅ Direct audio access (no proxying)
- ✅ No login required
- ✅ Reduced bandwidth on your server
- ✅ No file size limits

**Cons:**
- ⚠️ URL expiration duration **not documented** by ElevenLabs
- ⚠️ Cannot revoke access once URL is shared
- ⚠️ No tracking of who accessed the recording
- ⚠️ May expire before admin clicks the link
- ⚠️ Security implications of pre-authenticated URLs
- ⚠️ Requires additional API call to ElevenLabs

**Documentation gaps:**
- ElevenLabs docs don't specify signed URL expiration time
- No guidance on public sharing vs restricted use
- Unclear if URLs are meant for temporary or persistent access

---

## **RECOMMENDED APPROACH: Option A (Email Attachment)**

Since you want admins to click and listen without logging in, and typical restaurant calls are short (2-10 minutes), attaching the MP3 file directly is the best solution.

---

## Recommended Implementation Plan (With OpenAI Analysis + MP3 Attachment)

### Phase 1: Webhook Setup

1. **Create webhook endpoint**
   - Route: `/api/webhooks/elevenlabs/post-call`
   - Validates HMAC signature
   - Extracts transcript, conversation_id, agent_id, and metadata

2. **Configure webhook in ElevenLabs**
   - Navigate to Agents Platform settings
   - Enable **`post_call_transcription`** webhook (includes transcript + analysis)
   - Point to: `https://your-app.com/api/webhooks/elevenlabs/post-call`

### Phase 2: OpenAI Analysis

**Add OpenAI GPT-4 call to analyze transcript:**

```typescript
// In webhook handler, before triggering email
async function analyzeCallWithOpenAI(transcript: string) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini", // Cheaper and faster for this task
    messages: [
      {
        role: "system",
        content: "You are analyzing customer service call transcripts for restaurants. Provide concise, accurate analysis in JSON format."
      },
      {
        role: "user",
        content: `Analyze this restaurant call transcript:

${transcript}

Provide a JSON response with:
1. summary: 2-3 sentence summary of what happened
2. sentiment_score: 0-10 (0-4=frustrated, 5-7=neutral, 8-10=happy)
3. sentiment_label: "Frustrated", "Neutral", or "Happy"
4. customer_name_provided: true/false
5. action_taken: brief description (e.g., "Made reservation for 4 on Friday at 7pm")
6. issues: any complaints or problems (or empty string)
7. follow_up_needed: true/false`
      }
    ],
    response_format: { type: "json_object" },
    temperature: 0.3, // Lower temperature for more consistent analysis
  });

  return JSON.parse(completion.choices[0].message.content);
}
```

### Phase 3: Email Notification with AI Summary + Attachment

1. **Create enhanced Convex action** (`convex/notifications.ts`)
   ```typescript
   export const sendCallCompletionNotification = internalAction({
     args: {
       conversationId: v.string(),
       agentId: v.string(),
       restaurantId: v.id('restaurants'),
       transcript: v.string(),
       callData: v.object({
         duration: v.optional(v.number()),
         timestamp: v.number(),
       }),
     },
     handler: async (ctx, args) => {
       // 1. Get admin emails
       const adminEmails = await ctx.runQuery(
         api.notifications.getAdminEmails,
         { restaurantId: args.restaurantId }
       );

       // 2. Get agent and restaurant details
       const agent = await ctx.runQuery(
         api.agents.get,
         { id: args.agentId }
       );
       const restaurant = await ctx.db.get(args.restaurantId);

       // 3. Analyze call with OpenAI
       const analysis = await analyzeCallWithOpenAI(args.transcript);

       // 4. Fetch audio from ElevenLabs
       const audioResponse = await fetch(
         `https://api.elevenlabs.io/v1/convai/conversations/${args.conversationId}/audio`,
         {
           headers: {
             'xi-api-key': process.env.ELEVENLABS_API_KEY!,
           },
         }
       );
       const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());

       // 5. Build email HTML with AI analysis
       const emailHtml = buildEmailTemplate({
         restaurant,
         agent,
         analysis,
         callData: args.callData,
         conversationId: args.conversationId,
       });

       // 6. Send email with MP3 attachment
       const resend = new Resend(process.env.RESEND_API_KEY);

       for (const email of adminEmails) {
         await resend.emails.send({
           from: 'Calls <calls@updates.nerdvi.ai>',
           to: email,
           subject: `📞 ${analysis.call_subject} - ${restaurant.name}`,
           html: emailHtml,
           attachments: [
             {
               filename: `call-${args.conversationId}.mp3`,
               content: audioBuffer
             }
           ]
         });

         await delay(600); // Rate limiting
       }
     }
   });
   ```

2. **Email template** with AI analysis + audio attachment:

```typescript
function buildEmailTemplate({ restaurant, agent, analysis, callData, conversationId }) {
  // Sentiment badge color
  const sentimentColor =
    analysis.sentiment_score >= 8 ? '#10b981' : // green
    analysis.sentiment_score >= 5 ? '#f59e0b' : // yellow
    '#ef4444'; // red

  const formattedDate = new Date(callData.timestamp * 1000).toLocaleString();

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Call - ${restaurant.name}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">

        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 24px; margin-bottom: 20px; text-align: center;">
          <h1 style="margin: 0; color: white; font-size: 24px;">📞 New Call Received</h1>
          <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">${restaurant.name}</p>
        </div>

        <!-- Sentiment Badge -->
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="display: inline-block; background-color: ${sentimentColor}; color: white; padding: 8px 20px; border-radius: 20px; font-weight: 600; font-size: 14px;">
            ${analysis.sentiment_label} Customer (${analysis.sentiment_score}/10)
          </div>
        </div>

        <!-- Call Summary -->
        <div style="background-color: white; border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <h2 style="margin: 0 0 12px 0; color: #1a1a1a; font-size: 18px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
            📝 Call Summary
          </h2>
          <p style="margin: 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
            ${analysis.summary}
          </p>
        </div>

        <!-- Call Details -->
        <div style="background-color: white; border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <h2 style="margin: 0 0 16px 0; color: #1a1a1a; font-size: 18px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
            📊 Call Details
          </h2>

          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: #6b7280; width: 140px;">Date & Time:</td>
              <td style="padding: 8px 0; color: #1f2937;">${formattedDate}</td>
            </tr>
            ${callData.duration ? `
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: #6b7280;">Duration:</td>
              <td style="padding: 8px 0; color: #1f2937;">${Math.floor(callData.duration / 60)}m ${callData.duration % 60}s</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: #6b7280;">Agent:</td>
              <td style="padding: 8px 0; color: #1f2937;">${agent.name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: #6b7280;">Customer Name:</td>
              <td style="padding: 8px 0; color: #1f2937;">
                ${analysis.customer_name_provided ? '✅ Provided' : '❌ Not provided'}
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: #6b7280;">Action Taken:</td>
              <td style="padding: 8px 0; color: #1f2937;">${analysis.action_taken}</td>
            </tr>
          </table>

          ${analysis.issues ? `
          <div style="margin-top: 16px; padding: 12px; background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px;">
            <p style="margin: 0; color: #991b1b; font-weight: 600; font-size: 13px;">⚠️ Issues Reported:</p>
            <p style="margin: 4px 0 0 0; color: #7f1d1d; font-size: 14px;">${analysis.issues}</p>
          </div>
          ` : ''}

          ${analysis.follow_up_needed ? `
          <div style="margin-top: 16px; padding: 12px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
            <p style="margin: 0; color: #92400e; font-weight: 600; font-size: 13px;">👀 Follow-up Needed</p>
            <p style="margin: 4px 0 0 0; color: #78350f; font-size: 14px;">${analysis.follow_up_reason || 'Action required'}</p>
          </div>
          ` : ''}
        </div>

        <!-- Audio Recording -->
        <div style="background-color: white; border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); text-align: center;">
          <h2 style="margin: 0 0 12px 0; color: #1a1a1a; font-size: 18px;">🎧 Call Recording</h2>
          <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 14px;">
            The full call recording is attached to this email.<br>
            Click the MP3 file to listen.
          </p>
          <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; display: inline-block;">
            <p style="margin: 0; color: #374151; font-size: 13px;">
              📎 <strong>call-${conversationId.substring(0, 12)}....mp3</strong>
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="margin: 0; color: #9ca3af; font-size: 12px;">
            This is an automated notification from your restaurant's AI phone system.<br>
            You're receiving this because you manage ${restaurant.name}.
          </p>
        </div>
      </body>
    </html>
  `;
}
```

3. **Webhook handler** (updated for transcription webhook):
   ```typescript
   // In /api/webhooks/elevenlabs/post-call

   export async function POST(req: NextRequest) {
     // 1. Verify HMAC signature
     const signature = req.headers.get('ElevenLabs-Signature');
     const rawBody = await req.text();

     if (!verifySignature(signature, rawBody)) {
       return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
     }

     // 2. Parse webhook payload
     const payload = JSON.parse(rawBody);

     // For post_call_transcription webhook:
     // payload.conversation_id
     // payload.agent_id
     // payload.transcript (full conversation transcript)
     // payload.analysis (ElevenLabs analysis results)
     // payload.metadata (call duration, timestamps, etc.)

     // 3. Look up agent to get restaurant using Convex client
     const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

     const agent = await client.query(api.agents.getByElevenLabsAgentId, {
       elevenLabsAgentId: payload.agent_id
     });

     if (!agent) {
       console.error('Agent not found:', payload.agent_id);
       return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
     }

     // 4. Trigger email with OpenAI analysis + audio attachment
     await client.action(api.notifications.sendCallCompletionNotification, {
       conversationId: payload.conversation_id,
       agentId: agent._id,
       restaurantId: agent.restaurantId,
       transcript: payload.transcript, // Full transcript for OpenAI
       callData: {
         timestamp: payload.event_timestamp,
         duration: payload.metadata?.call_duration,
       }
     });

     return NextResponse.json({ success: true });
   }
   ```

### Phase 3: Fallback for Large Files

For calls that exceed the 40MB limit, implement a fallback:

```typescript
// Check file size before attaching
const audioBuffer = Buffer.from(audioBase64, 'base64');
const fileSizeMB = audioBuffer.byteLength / (1024 * 1024);

if (fileSizeMB > 35) { // Leave 5MB buffer
  // Fallback: Use authenticated link instead
  emailHtml += `
    <p>This call was too long to attach directly.</p>
    <p><a href="${appUrl}/api/elevenlabs/conversations/${conversationId}/audio">
      Click here to listen to the recording
    </a></p>
  `;
  // Don't include attachment
} else {
  // Include attachment
  attachments = [{
    filename: `call-${conversationId}.mp3`,
    content: audioBuffer
  }];
}
```

---

## Database Schema Considerations

**Do we need to store call records?**

### Option 1: Store Nothing ✅ **Simplest**
- Rely entirely on ElevenLabs API
- Fetch call history on-demand via `/api/elevenlabs/agents/{agentId}/conversations`
- **Current approach** used in calls page

**Pros:**
- No database changes
- ElevenLabs is source of truth
- Simpler implementation

**Cons:**
- Can't add custom metadata
- No offline access
- Dependent on ElevenLabs availability

### Option 2: Store Call Metadata
Create `calls` table in Convex:
```typescript
calls: defineTable({
  conversationId: v.string(),
  agentId: v.id('agents'),
  restaurantId: v.id('restaurants'),
  startTime: v.number(),
  duration: v.number(),
  successful: v.optional(v.boolean()),
  transcript: v.optional(v.string()),
  notificationSent: v.boolean(),
  notificationSentAt: v.optional(v.number()),
})
```

**Pros:**
- Can track which calls sent notifications
- Enable custom filtering/searching
- Faster queries (no ElevenLabs API calls)
- Can add custom tags/notes

**Cons:**
- More complexity
- Data sync challenges
- Storage costs

**Recommendation:** Start with Option 1, migrate to Option 2 if needed later.

---

## Security Considerations

### 1. Webhook Authentication
- **MUST** validate `ElevenLabs-Signature` header using HMAC
- Prevents unauthorized webhook calls
- Implement timestamp validation (30-min window)

### 2. Email Attachment Security
- **Attachment approach bypasses traditional access control**
- Anyone with access to the admin's email can listen
- This is acceptable because:
  - Recipients are verified admin users
  - Email accounts are already secured
  - Similar to how reservation/order notifications work
  - Audio files don't contain PII (just conversation audio)

### 3. Best Practices
- Use TLS/SSL for webhook endpoint
- Log all webhook deliveries for audit trail
- Monitor for suspicious patterns
- Consider encrypting attachments for sensitive restaurants (future enhancement)

---

## Implementation Checklist

### Backend
- [ ] Create `/api/webhooks/elevenlabs/post-call` endpoint
- [ ] Implement HMAC signature validation
- [ ] Create `sendCallCompletionNotification` Convex action with attachment support
- [ ] Design email HTML template with call details
- [ ] Implement file size check with fallback logic
- [ ] Test webhook locally using ngrok/tunneling

### ElevenLabs Configuration
- [ ] Access Agents Platform settings page
- [ ] Enable post-call webhook (**`post_call_audio`** type - includes MP3)
- [ ] Configure webhook URL to your endpoint
- [ ] Store webhook signing secret in environment variables
- [ ] Test webhook delivery with test call

### Email System
- [ ] Add Resend attachment support to Convex action
- [ ] Create email template showing attachment icon/instructions
- [ ] Test email delivery with MP3 attachment
- [ ] Verify attachment plays on mobile devices
- [ ] Test with various email clients (Gmail, Outlook, Apple Mail)

### Testing
- [ ] Make test call to agent (short, 2-3 minutes)
- [ ] Verify webhook fires with base64 audio
- [ ] Confirm email sent to all admin users with attachment
- [ ] **Test attachment playback - NO LOGIN REQUIRED** ✅
- [ ] Test long call (>30 minutes) to verify fallback logic
- [ ] Test with multiple admins (rate limiting)

### Monitoring
- [ ] Log webhook deliveries
- [ ] Track email send success/failure rates
- [ ] Monitor attachment file sizes
- [ ] Alert on webhook signature validation failures
- [ ] Track fallback link usage for oversized files

---

## Estimated Development Time (With OpenAI Analysis)

- **Webhook endpoint with signature validation:** 3-4 hours
- **OpenAI integration & prompt engineering:** 2-3 hours
- **Email notification action with OpenAI + attachment:** 4-5 hours
- **Email template design (with AI summary):** 2-3 hours
- **File size check & fallback logic:** 1-2 hours
- **Testing & debugging (OpenAI responses, email clients):** 4-5 hours
- **ElevenLabs configuration:** 1 hour

**Total:** 17-23 hours (2-3 days)

---

## Cost Considerations

### OpenAI API Costs (GPT-4o-mini)

**Pricing** (as of 2025):
- Input: $0.150 per 1M tokens (~$0.00015 per 1K tokens)
- Output: $0.600 per 1M tokens (~$0.0006 per 1K tokens)

**Typical Restaurant Call Analysis:**
- Average transcript: ~500-1000 tokens (2-5 min call)
- System prompt: ~200 tokens
- Response (JSON): ~150 tokens
- **Total per call: ~$0.0002-0.0004** (less than a penny!)

**Monthly costs examples:**
- 100 calls/month: ~$0.03-0.04
- 500 calls/month: ~$0.15-0.20
- 1000 calls/month: ~$0.30-0.40

**Extremely affordable** - negligible cost compared to value provided.

### Resend Email Costs
- Free tier: 100 emails/day, 3000 emails/month
- After that: $20/month for 50,000 emails
- Email attachments count toward storage but within limits for typical use

### ElevenLabs Costs
- Already using ElevenLabs for calls
- Webhook delivery: No additional cost
- Audio API calls: No additional cost (already created)

---

## Open Questions / Decisions Needed

1. **Webhook type choice:**
   - ✅ **`post_call_transcription`** (includes transcript for OpenAI analysis)
   - We fetch audio separately via API

2. **Email frequency?**
   - Send for EVERY call? Or only certain types?
   - **Recommendation:** All calls (admins can filter by sentiment in email)

3. **Store calls + AI analysis in database?**
   - Could enable analytics dashboard (sentiment trends, common issues, etc.)
   - **Recommendation:** Consider storing for future analytics

4. **Email subject line format?**
   - ✅ **Final format:** `📞 [Call Subject] - [Restaurant Name]`
   - Examples:
     - `📞 Reservation - Tuesday 7pm for 4 - La Bella Vista`
     - `📞 To-Go Order - Pickup 6pm - Joe's Pizza`
     - `📞 Menu Inquiry - Gluten-Free - Pasta House`
     - `📞 Complaint - Wait Time - Blue Moon Bistro`
   - **Benefit:** Admins know exactly what the call was about at a glance

5. **OpenAI model choice?**
   - ✅ **GPT-4o-mini** - Cheaper, faster, good enough for this task
   - Alternative: GPT-4o - More expensive but potentially better analysis
   - **Recommendation:** Start with mini, upgrade if needed

6. **Handle very long calls?**
   - Implement fallback link for calls >35MB
   - **Recommendation:** Yes, include fallback logic

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Webhook failures (>10 consecutive) | Auto-disabled, no emails sent | Implement monitoring, health checks, alerting |
| Large attachment email bounces | Email delivery failures | Implement file size check with fallback link |
| High call volume email costs | Expensive email bills | Monitor costs, consider daily digest for high-volume restaurants |
| Email client attachment blocking | Admins can't listen | Test with major email providers, provide fallback link |
| Base64 decoding issues | Corrupted audio files | Add error handling, logging, retry logic |
| Spam folder filtering | Admins miss notifications | Configure SPF/DKIM/DMARC, use clear subject lines |

---

## Conclusion

**This feature is fully implementable with AI-powered analysis + MP3 attachments** using:
- ✅ ElevenLabs `post_call_transcription` webhooks (includes transcript + metadata)
- ✅ OpenAI GPT-4o-mini for intelligent call analysis (~$0.0003 per call)
- ✅ Your existing admin email infrastructure (Resend)
- ✅ Resend attachment support (40MB limit)
- ✅ Convex internal actions for orchestration
- ✅ **NO LOGIN REQUIRED** - admins click attachment to listen instantly

**What Admins Get in Each Email:**

**Subject Line:** `📞 Reservation - Tuesday 7pm for 4 - [Restaurant Name]`
*(AI determines the call purpose and creates concise subject)*

**Email Body:**

1. **Sentiment Badge** (Visual color-coded badge)
   - 🟢 Happy Customer (8/10)
   - 🟡 Neutral Customer (6/10)
   - 🔴 Frustrated Customer (3/10)

2. **AI-Generated Summary** (2-3 sentences)
   - "Customer called to make a reservation for 6 guests on Friday at 7pm. They requested a table near the window. Reservation was successfully created."

3. **Key Details**
   - Customer name provided: ✅ Yes
   - Action taken: "Made reservation for 6 guests"
   - Issues: (if any complaints - highlighted in red)
   - Follow-up needed: (if action required - highlighted in yellow)

4. **MP3 Recording Attached**
   - Click to listen - no login needed
   - Typical 2-10 min calls = 1-10 MB ✅

**Key Benefits:**
- 🎯 **Subject line tells the story** - "Reservation - Tuesday 7pm" / "Menu Inquiry" / "Complaint - Wait Time"
- 📧 **Admins can filter/search emails** by call type without opening
- 🚨 **Prioritize urgent calls** - complaints and follow-ups are highlighted
- ⚡ **Zero friction** - just click attachment to listen
- 💰 **Negligible cost** - ~$0.0003 per call for AI analysis
- 📱 **Works everywhere** - email clients, mobile, desktop

**Next step:** Implement webhook endpoint → OpenAI analysis → email notification system.
