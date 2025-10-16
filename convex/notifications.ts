import { v } from 'convex/values';
import { internalAction, query } from './_generated/server';
import { Resend } from 'resend';

/**
 * Get admin emails for a restaurant (public query)
 * Returns: organization owner + restaurant managers
 */
export const getAdminEmails = query({
  args: {
    restaurantId: v.id('restaurants'),
  },
  handler: async (ctx, args) => {
    const restaurant = await ctx.db.get(args.restaurantId);

    if (!restaurant) {
      return [];
    }

    const emails: string[] = [];

    // If restaurant belongs to an organization
    if (restaurant.organizationId) {
      // Get the organization owner
      const organization = await ctx.db.get(restaurant.organizationId);
      if (organization) {
        const orgOwner = await ctx.db.get(organization.createdBy);
        if (orgOwner?.email) {
          emails.push(orgOwner.email);
        }
      }

      // Get restaurant managers only (not owners)
      const restaurantAccess = await ctx.db
        .query('restaurantAccess')
        .withIndex('by_restaurant', (q) => q.eq('restaurantId', args.restaurantId))
        .collect();

      const restaurantManagers = restaurantAccess.filter(
        (access) => access.role === 'restaurant:manager'
      );

      for (const access of restaurantManagers) {
        const user = await ctx.db.get(access.userId);
        if (user?.email && !emails.includes(user.email)) {
          emails.push(user.email);
        }
      }
    } else if (restaurant.ownerId) {
      // Personal account - get owner email
      const owner = await ctx.db.get(restaurant.ownerId);
      if (owner?.email) {
        emails.push(owner.email);
      }
    }

    return emails;
  },
});

/**
 * Send email notification when a new reservation is created
 */
export const sendReservationNotification = internalAction({
  args: {
    reservationId: v.id('reservations'),
    restaurantId: v.id('restaurants'),
    reservationData: v.object({
      reservationId: v.string(),
      customerName: v.string(),
      customerPhone: v.optional(v.string()),
      date: v.string(),
      time: v.string(),
      partySize: v.number(),
      specialRequests: v.optional(v.string()),
      source: v.string(),
    }),
    restaurantData: v.object({
      name: v.string(),
      address: v.string(),
      city: v.string(),
      state: v.string(),
      contactEmail: v.string(),
    }),
    adminEmails: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { reservationData, restaurantData, adminEmails } = args;

    if (adminEmails.length === 0) {
      console.log('No admin emails found for restaurant:', restaurantData.name);
      return { success: false, error: 'No admin emails found' };
    }

    // Initialize Resend
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Format the date and time for better readability
    const formattedDate = new Date(reservationData.date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Create email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Reservation - ${restaurantData.name}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <h1 style="margin: 0 0 8px 0; color: #1a1a1a; font-size: 24px;">New Reservation</h1>
            <p style="margin: 0; color: #6c757d; font-size: 14px;">Reservation ID: #${reservationData.reservationId}</p>
          </div>

          <div style="background-color: #ffffff; border: 1px solid #e9ecef; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <h2 style="margin: 0 0 16px 0; color: #1a1a1a; font-size: 18px; border-bottom: 2px solid #e9ecef; padding-bottom: 8px;">Reservation Details</h2>

            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #495057; width: 140px;">Customer Name:</td>
                <td style="padding: 8px 0; color: #212529;">${reservationData.customerName}</td>
              </tr>
              ${reservationData.customerPhone ? `
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #495057;">Phone:</td>
                <td style="padding: 8px 0; color: #212529;">${reservationData.customerPhone}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #495057;">Date:</td>
                <td style="padding: 8px 0; color: #212529;">${formattedDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #495057;">Time:</td>
                <td style="padding: 8px 0; color: #212529;">${reservationData.time}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #495057;">Party Size:</td>
                <td style="padding: 8px 0; color: #212529;">${reservationData.partySize} ${reservationData.partySize === 1 ? 'guest' : 'guests'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #495057;">Source:</td>
                <td style="padding: 8px 0; color: #212529;">${reservationData.source === 'phone_agent' ? 'Phone Agent' : 'Manual Entry'}</td>
              </tr>
            </table>

            ${reservationData.specialRequests ? `
            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e9ecef;">
              <p style="margin: 0 0 8px 0; font-weight: 600; color: #495057;">Special Requests:</p>
              <p style="margin: 0; color: #212529; background-color: #f8f9fa; padding: 12px; border-radius: 4px;">${reservationData.specialRequests}</p>
            </div>
            ` : ''}
          </div>

          <div style="background-color: #f8f9fa; border-radius: 8px; padding: 16px; text-align: center;">
            <p style="margin: 0; color: #6c757d; font-size: 14px;">
              ${restaurantData.name}<br>
              ${restaurantData.address}, ${restaurantData.city}, ${restaurantData.state}
            </p>
          </div>

          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e9ecef; text-align: center;">
            <p style="margin: 0; color: #6c757d; font-size: 12px;">
              This is an automated notification from your reservation system.
            </p>
          </div>
        </body>
      </html>
    `;

    try {
      console.log('Attempting to send emails to:', adminEmails);

      // Send individual emails to each recipient
      const emailPromises = adminEmails.map(async (email) => {
        console.log(`Sending email to: ${email}`);
        const { data, error } = await resend.emails.send({
          from: 'Reservations <onboarding@resend.dev>',
          to: email,
          subject: `New Reservation - ${restaurantData.name} - ${formattedDate}`,
          html: emailHtml,
        });

        if (error) {
          console.error(`Error sending email to ${email}:`, error);
          return { success: false, email, error: error.message };
        }

        console.log(`Email sent successfully to ${email}, ID: ${data?.id}`);
        return { success: true, email, emailId: data?.id };
      });

      // Wait for all emails to be sent
      const results = await Promise.all(emailPromises);

      // Check if any failed
      const failures = results.filter(r => !r.success);
      if (failures.length > 0) {
        console.error('Some emails failed to send:', failures);
      }

      const successCount = results.filter(r => r.success).length;
      console.log(`Successfully sent ${successCount}/${adminEmails.length} emails`);

      return {
        success: successCount > 0,
        totalSent: successCount,
        totalFailed: failures.length,
        results
      };
    } catch (error: any) {
      console.error('Failed to send reservation notifications:', error);
      return { success: false, error: error.message };
    }
  },
});
