import { v } from 'convex/values';
import { action, internalAction, query, internalQuery } from './_generated/server';
import { internal } from './_generated/api';
import { Resend } from 'resend';
import OpenAI from 'openai';

/**
 * Helper function to delay execution (for rate limiting)
 * Resend allows 2 requests per second, so we wait 600ms between sends
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));


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

// Internal query version (no auth) for webhook processing
export const getAdminEmailsInternal = internalQuery({
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

    // Add notification emails from restaurant settings
    const restaurantData = restaurant as any;
    if (restaurantData.notificationEmails && Array.isArray(restaurantData.notificationEmails)) {
      for (const email of restaurantData.notificationEmails) {
        if (email && !emails.includes(email)) {
          emails.push(email);
        }
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
              This is an automated notification from your reservation system.<br>
              You're receiving this because you manage ${restaurantData.name}.
            </p>
          </div>
        </body>
      </html>
    `;

    try {
      console.log('Attempting to send emails to:', adminEmails);

      // Send emails sequentially to respect rate limits (2 per second)
      const results = [];
      for (let i = 0; i < adminEmails.length; i++) {
        const email = adminEmails[i];
        console.log(`Sending email to: ${email} (${i + 1}/${adminEmails.length})`);

        const { data, error } = await resend.emails.send({
          from: 'Reservations <reservations@updates.nerdvi.ai>',
          to: email,
          subject: `New Reservation - ${restaurantData.name} - ${formattedDate}`,
          html: emailHtml,
        });

        if (error) {
          console.error(`Error sending email to ${email}:`, error);
          results.push({ success: false, email, error: error.message });
        } else {
          console.log(`Email sent successfully to ${email}, ID: ${data?.id}`);
          results.push({ success: true, email, emailId: data?.id });
        }

        // Wait 600ms before sending the next email (to stay under 2 requests/second)
        if (i < adminEmails.length - 1) {
          await delay(600);
        }
      }

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

/**
 * Send email notification when a reservation is cancelled
 */
export const sendReservationCancellationNotification = internalAction({
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

    const resend = new Resend(process.env.RESEND_API_KEY);

    const formattedDate = new Date(reservationData.date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reservation Cancelled - ${restaurantData.name}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #fee2e2; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <h1 style="margin: 0 0 8px 0; color: #991b1b; font-size: 24px;">Reservation Cancelled</h1>
            <p style="margin: 0; color: #7f1d1d; font-size: 14px;">Reservation ID: #${reservationData.reservationId}</p>
          </div>

          <div style="background-color: #ffffff; border: 1px solid #e9ecef; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <h2 style="margin: 0 0 16px 0; color: #1a1a1a; font-size: 18px; border-bottom: 2px solid #e9ecef; padding-bottom: 8px;">Cancelled Reservation Details</h2>

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
            </table>
          </div>

          <div style="background-color: #f8f9fa; border-radius: 8px; padding: 16px; text-align: center;">
            <p style="margin: 0; color: #6c757d; font-size: 14px;">
              ${restaurantData.name}<br>
              ${restaurantData.address}, ${restaurantData.city}, ${restaurantData.state}
            </p>
          </div>

          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e9ecef; text-align: center;">
            <p style="margin: 0; color: #6c757d; font-size: 12px;">
              This is an automated notification from your reservation system.<br>
              You're receiving this because you manage ${restaurantData.name}.
            </p>
          </div>
        </body>
      </html>
    `;

    try {
      // Send emails sequentially to respect rate limits (2 per second)
      const results = [];
      for (let i = 0; i < adminEmails.length; i++) {
        const email = adminEmails[i];
        console.log(`Sending cancellation email to: ${email} (${i + 1}/${adminEmails.length})`);

        const { data, error } = await resend.emails.send({
          from: 'Reservations <reservations@updates.nerdvi.ai>',
          to: email,
          subject: `Reservation Cancelled - ${restaurantData.name} - ${formattedDate}`,
          html: emailHtml,
        });

        if (error) {
          console.error(`Error sending cancellation email to ${email}:`, error);
          results.push({ success: false, email, error: error.message });
        } else {
          console.log(`Cancellation email sent successfully to ${email}, ID: ${data?.id}`);
          results.push({ success: true, email, emailId: data?.id });
        }

        // Wait 600ms before sending the next email (to stay under 2 requests/second)
        if (i < adminEmails.length - 1) {
          await delay(600);
        }
      }

      const successCount = results.filter(r => r.success).length;
      console.log(`Successfully sent ${successCount}/${adminEmails.length} cancellation emails`);

      return {
        success: successCount > 0,
        totalSent: successCount,
        totalFailed: results.filter(r => !r.success).length,
        results
      };
    } catch (error: any) {
      console.error('Failed to send reservation cancellation notifications:', error);
      return { success: false, error: error.message };
    }
  },
});

/**
 * Send email notification when a reservation is updated
 */
export const sendReservationUpdateNotification = internalAction({
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
    }),
    changes: v.object({
      date: v.optional(v.object({ from: v.string(), to: v.string() })),
      time: v.optional(v.object({ from: v.string(), to: v.string() })),
      partySize: v.optional(v.object({ from: v.number(), to: v.number() })),
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
    const { reservationData, changes, restaurantData, adminEmails } = args;

    if (adminEmails.length === 0) {
      console.log('No admin emails found for restaurant:', restaurantData.name);
      return { success: false, error: 'No admin emails found' };
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const formattedDate = new Date(reservationData.date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Build changes HTML
    let changesHtml = '';
    if (changes.date) {
      const oldDate = new Date(changes.date.from).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const newDate = new Date(changes.date.to).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      changesHtml += `
        <tr>
          <td style="padding: 8px 0; font-weight: 600; color: #495057;">Date:</td>
          <td style="padding: 8px 0; color: #212529;"><s style="color: #6c757d;">${oldDate}</s> → ${newDate}</td>
        </tr>
      `;
    }
    if (changes.time) {
      changesHtml += `
        <tr>
          <td style="padding: 8px 0; font-weight: 600; color: #495057;">Time:</td>
          <td style="padding: 8px 0; color: #212529;"><s style="color: #6c757d;">${changes.time.from}</s> → ${changes.time.to}</td>
        </tr>
      `;
    }
    if (changes.partySize) {
      changesHtml += `
        <tr>
          <td style="padding: 8px 0; font-weight: 600; color: #495057;">Party Size:</td>
          <td style="padding: 8px 0; color: #212529;"><s style="color: #6c757d;">${changes.partySize.from}</s> → ${changes.partySize.to} ${changes.partySize.to === 1 ? 'guest' : 'guests'}</td>
        </tr>
      `;
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reservation Updated - ${restaurantData.name}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #dbeafe; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <h1 style="margin: 0 0 8px 0; color: #1e3a8a; font-size: 24px;">Reservation Updated</h1>
            <p style="margin: 0; color: #1e40af; font-size: 14px;">Reservation ID: #${reservationData.reservationId}</p>
          </div>

          <div style="background-color: #ffffff; border: 1px solid #e9ecef; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <h2 style="margin: 0 0 16px 0; color: #1a1a1a; font-size: 18px; border-bottom: 2px solid #e9ecef; padding-bottom: 8px;">Changes Made</h2>

            <table style="width: 100%; border-collapse: collapse;">
              ${changesHtml}
            </table>
          </div>

          <div style="background-color: #ffffff; border: 1px solid #e9ecef; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <h2 style="margin: 0 0 16px 0; color: #1a1a1a; font-size: 18px; border-bottom: 2px solid #e9ecef; padding-bottom: 8px;">Current Reservation Details</h2>

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
            </table>
          </div>

          <div style="background-color: #f8f9fa; border-radius: 8px; padding: 16px; text-align: center;">
            <p style="margin: 0; color: #6c757d; font-size: 14px;">
              ${restaurantData.name}<br>
              ${restaurantData.address}, ${restaurantData.city}, ${restaurantData.state}
            </p>
          </div>

          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e9ecef; text-align: center;">
            <p style="margin: 0; color: #6c757d; font-size: 12px;">
              This is an automated notification from your reservation system.<br>
              You're receiving this because you manage ${restaurantData.name}.
            </p>
          </div>
        </body>
      </html>
    `;

    try {
      // Send emails sequentially to respect rate limits (2 per second)
      const results = [];
      for (let i = 0; i < adminEmails.length; i++) {
        const email = adminEmails[i];
        console.log(`Sending update email to: ${email} (${i + 1}/${adminEmails.length})`);

        const { data, error } = await resend.emails.send({
          from: 'Reservations <reservations@updates.nerdvi.ai>',
          to: email,
          subject: `Reservation Updated - ${restaurantData.name} - ${formattedDate}`,
          html: emailHtml,
        });

        if (error) {
          console.error(`Error sending update email to ${email}:`, error);
          results.push({ success: false, email, error: error.message });
        } else {
          console.log(`Update email sent successfully to ${email}, ID: ${data?.id}`);
          results.push({ success: true, email, emailId: data?.id });
        }

        // Wait 600ms before sending the next email (to stay under 2 requests/second)
        if (i < adminEmails.length - 1) {
          await delay(600);
        }
      }

      const successCount = results.filter(r => r.success).length;
      console.log(`Successfully sent ${successCount}/${adminEmails.length} update emails`);

      return {
        success: successCount > 0,
        totalSent: successCount,
        totalFailed: results.filter(r => !r.success).length,
        results
      };
    } catch (error: any) {
      console.error('Failed to send reservation update notifications:', error);
      return { success: false, error: error.message };
    }
  },
});

/**
 * Send email notification when a new order is created
 */
export const sendOrderNotification = internalAction({
  args: {
    orderId: v.id('orders'),
    restaurantId: v.id('restaurants'),
    orderData: v.object({
      orderId: v.string(),
      customerName: v.string(),
      customerPhone: v.string(),
      items: v.array(
        v.object({
          name: v.string(),
          quantity: v.number(),
          specialInstructions: v.optional(v.string()),
        })
      ),
      orderNotes: v.optional(v.string()),
      pickupTime: v.optional(v.string()),
      pickupDate: v.optional(v.string()),
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
    const { orderData, restaurantData, adminEmails } = args;

    if (adminEmails.length === 0) {
      console.log('No admin emails found for restaurant:', restaurantData.name);
      return { success: false, error: 'No admin emails found' };
    }

    // Initialize Resend
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Format the pickup date if provided
    let formattedPickupDate = 'ASAP';
    if (orderData.pickupDate) {
      formattedPickupDate = new Date(orderData.pickupDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }

    // Format order items
    const itemsHtml = orderData.items.map(item => `
      <tr>
        <td style="padding: 8px 0; color: #212529;">${item.quantity}x</td>
        <td style="padding: 8px 0; color: #212529;">
          <strong>${item.name}</strong>
          ${item.specialInstructions ? `<br><span style="font-size: 12px; color: #6c757d; font-style: italic;">${item.specialInstructions}</span>` : ''}
        </td>
      </tr>
    `).join('');

    // Create email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New To-Go Order - ${restaurantData.name}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #fef3c7; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <h1 style="margin: 0 0 8px 0; color: #1a1a1a; font-size: 24px;">New To-Go Order</h1>
            <p style="margin: 0; color: #92400e; font-size: 14px;">Order ID: #${orderData.orderId}</p>
          </div>

          <div style="background-color: #ffffff; border: 1px solid #e9ecef; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <h2 style="margin: 0 0 16px 0; color: #1a1a1a; font-size: 18px; border-bottom: 2px solid #e9ecef; padding-bottom: 8px;">Customer Information</h2>

            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #495057; width: 140px;">Customer Name:</td>
                <td style="padding: 8px 0; color: #212529;">${orderData.customerName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #495057;">Phone:</td>
                <td style="padding: 8px 0; color: #212529;">${orderData.customerPhone}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #495057;">Pickup Date:</td>
                <td style="padding: 8px 0; color: #212529;">${formattedPickupDate}</td>
              </tr>
              ${orderData.pickupTime ? `
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #495057;">Pickup Time:</td>
                <td style="padding: 8px 0; color: #212529;">${orderData.pickupTime}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #495057;">Source:</td>
                <td style="padding: 8px 0; color: #212529;">${orderData.source === 'phone_agent' ? 'Phone Agent' : 'Manual Entry'}</td>
              </tr>
            </table>
          </div>

          <div style="background-color: #ffffff; border: 1px solid #e9ecef; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <h2 style="margin: 0 0 16px 0; color: #1a1a1a; font-size: 18px; border-bottom: 2px solid #e9ecef; padding-bottom: 8px;">Order Items</h2>

            <table style="width: 100%; border-collapse: collapse;">
              ${itemsHtml}
            </table>

            ${orderData.orderNotes ? `
            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e9ecef;">
              <p style="margin: 0 0 8px 0; font-weight: 600; color: #495057;">Order Notes:</p>
              <p style="margin: 0; color: #212529; background-color: #f8f9fa; padding: 12px; border-radius: 4px;">${orderData.orderNotes}</p>
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
              This is an automated notification from your restaurant system.<br>
              You're receiving this because you manage ${restaurantData.name}.
            </p>
          </div>
        </body>
      </html>
    `;

    try {
      console.log('Attempting to send order emails to:', adminEmails);

      // Send emails sequentially to respect rate limits (2 per second)
      const results = [];
      for (let i = 0; i < adminEmails.length; i++) {
        const email = adminEmails[i];
        console.log(`Sending order email to: ${email} (${i + 1}/${adminEmails.length})`);

        const { data, error } = await resend.emails.send({
          from: 'Orders <orders@updates.nerdvi.ai>',
          to: email,
          subject: `New To-Go Order - ${restaurantData.name} - ${formattedPickupDate}`,
          html: emailHtml,
        });

        if (error) {
          console.error(`Error sending order email to ${email}:`, error);
          results.push({ success: false, email, error: error.message });
        } else {
          console.log(`Order email sent successfully to ${email}, ID: ${data?.id}`);
          results.push({ success: true, email, emailId: data?.id });
        }

        // Wait 600ms before sending the next email (to stay under 2 requests/second)
        if (i < adminEmails.length - 1) {
          await delay(600);
        }
      }

      // Check if any failed
      const failures = results.filter(r => !r.success);
      if (failures.length > 0) {
        console.error('Some order emails failed to send:', failures);
      }

      const successCount = results.filter(r => r.success).length;
      console.log(`Successfully sent ${successCount}/${adminEmails.length} order emails`);

      return {
        success: successCount > 0,
        totalSent: successCount,
        totalFailed: failures.length,
        results
      };
    } catch (error: any) {
      console.error('Failed to send order notifications:', error);
      return { success: false, error: error.message };
    }
  },
});

/**
 * Send email notification when an order is cancelled
 */
export const sendOrderCancellationNotification = internalAction({
  args: {
    orderId: v.id('orders'),
    restaurantId: v.id('restaurants'),
    orderData: v.object({
      orderId: v.string(),
      customerName: v.string(),
      customerPhone: v.string(),
      items: v.array(
        v.object({
          name: v.string(),
          quantity: v.number(),
        })
      ),
      pickupTime: v.optional(v.string()),
      pickupDate: v.optional(v.string()),
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
    const { orderData, restaurantData, adminEmails } = args;

    if (adminEmails.length === 0) {
      console.log('No admin emails found for restaurant:', restaurantData.name);
      return { success: false, error: 'No admin emails found' };
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    let formattedPickupDate = 'ASAP';
    if (orderData.pickupDate) {
      formattedPickupDate = new Date(orderData.pickupDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }

    const itemsHtml = orderData.items.map(item => `
      <tr>
        <td style="padding: 8px 0; color: #212529;">${item.quantity}x</td>
        <td style="padding: 8px 0; color: #212529;"><strong>${item.name}</strong></td>
      </tr>
    `).join('');

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Order Cancelled - ${restaurantData.name}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #fee2e2; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <h1 style="margin: 0 0 8px 0; color: #991b1b; font-size: 24px;">Order Cancelled</h1>
            <p style="margin: 0; color: #7f1d1d; font-size: 14px;">Order ID: #${orderData.orderId}</p>
          </div>

          <div style="background-color: #ffffff; border: 1px solid #e9ecef; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <h2 style="margin: 0 0 16px 0; color: #1a1a1a; font-size: 18px; border-bottom: 2px solid #e9ecef; padding-bottom: 8px;">Cancelled Order Details</h2>

            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #495057; width: 140px;">Customer Name:</td>
                <td style="padding: 8px 0; color: #212529;">${orderData.customerName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #495057;">Phone:</td>
                <td style="padding: 8px 0; color: #212529;">${orderData.customerPhone}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #495057;">Pickup Date:</td>
                <td style="padding: 8px 0; color: #212529;">${formattedPickupDate}</td>
              </tr>
              ${orderData.pickupTime ? `
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #495057;">Pickup Time:</td>
                <td style="padding: 8px 0; color: #212529;">${orderData.pickupTime}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          <div style="background-color: #ffffff; border: 1px solid #e9ecef; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <h2 style="margin: 0 0 16px 0; color: #1a1a1a; font-size: 18px; border-bottom: 2px solid #e9ecef; padding-bottom: 8px;">Order Items</h2>
            <table style="width: 100%; border-collapse: collapse;">
              ${itemsHtml}
            </table>
          </div>

          <div style="background-color: #f8f9fa; border-radius: 8px; padding: 16px; text-align: center;">
            <p style="margin: 0; color: #6c757d; font-size: 14px;">
              ${restaurantData.name}<br>
              ${restaurantData.address}, ${restaurantData.city}, ${restaurantData.state}
            </p>
          </div>

          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e9ecef; text-align: center;">
            <p style="margin: 0; color: #6c757d; font-size: 12px;">
              This is an automated notification from your restaurant system.<br>
              You're receiving this because you manage ${restaurantData.name}.
            </p>
          </div>
        </body>
      </html>
    `;

    try {
      // Send emails sequentially to respect rate limits (2 per second)
      const results = [];
      for (let i = 0; i < adminEmails.length; i++) {
        const email = adminEmails[i];
        console.log(`Sending order cancellation email to: ${email} (${i + 1}/${adminEmails.length})`);

        const { data, error } = await resend.emails.send({
          from: 'Orders <orders@updates.nerdvi.ai>',
          to: email,
          subject: `Order Cancelled - ${restaurantData.name} - ${formattedPickupDate}`,
          html: emailHtml,
        });

        if (error) {
          console.error(`Error sending order cancellation email to ${email}:`, error);
          results.push({ success: false, email, error: error.message });
        } else {
          console.log(`Order cancellation email sent successfully to ${email}, ID: ${data?.id}`);
          results.push({ success: true, email, emailId: data?.id });
        }

        // Wait 600ms before sending the next email (to stay under 2 requests/second)
        if (i < adminEmails.length - 1) {
          await delay(600);
        }
      }

      const successCount = results.filter(r => r.success).length;
      console.log(`Successfully sent ${successCount}/${adminEmails.length} order cancellation emails`);

      return {
        success: successCount > 0,
        totalSent: successCount,
        totalFailed: results.filter(r => !r.success).length,
        results
      };
    } catch (error: any) {
      console.error('Failed to send order cancellation notifications:', error);
      return { success: false, error: error.message };
    }
  },
});

/**
 * Send email notification when an order is updated
 */
export const sendOrderUpdateNotification = internalAction({
  args: {
    orderId: v.id('orders'),
    restaurantId: v.id('restaurants'),
    orderData: v.object({
      orderId: v.string(),
      customerName: v.string(),
      customerPhone: v.string(),
      items: v.array(
        v.object({
          name: v.string(),
          quantity: v.number(),
          specialInstructions: v.optional(v.string()),
        })
      ),
      orderNotes: v.optional(v.string()),
      pickupTime: v.optional(v.string()),
      pickupDate: v.optional(v.string()),
    }),
    changes: v.object({
      items: v.optional(v.boolean()),
      orderNotes: v.optional(v.boolean()),
      pickupTime: v.optional(v.object({ from: v.optional(v.string()), to: v.optional(v.string()) })),
      pickupDate: v.optional(v.object({ from: v.optional(v.string()), to: v.optional(v.string()) })),
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
    const { orderData, changes, restaurantData, adminEmails } = args;

    if (adminEmails.length === 0) {
      console.log('No admin emails found for restaurant:', restaurantData.name);
      return { success: false, error: 'No admin emails found' };
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    let formattedPickupDate = 'ASAP';
    if (orderData.pickupDate) {
      formattedPickupDate = new Date(orderData.pickupDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }

    // Build changes HTML
    let changesHtml = '';
    if (changes.pickupDate) {
      const oldDate = changes.pickupDate.from ? new Date(changes.pickupDate.from).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'ASAP';
      const newDate = changes.pickupDate.to ? new Date(changes.pickupDate.to).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'ASAP';
      changesHtml += `
        <tr>
          <td style="padding: 8px 0; font-weight: 600; color: #495057;">Pickup Date:</td>
          <td style="padding: 8px 0; color: #212529;"><s style="color: #6c757d;">${oldDate}</s> → ${newDate}</td>
        </tr>
      `;
    }
    if (changes.pickupTime) {
      changesHtml += `
        <tr>
          <td style="padding: 8px 0; font-weight: 600; color: #495057;">Pickup Time:</td>
          <td style="padding: 8px 0; color: #212529;"><s style="color: #6c757d;">${changes.pickupTime.from || 'ASAP'}</s> → ${changes.pickupTime.to || 'ASAP'}</td>
        </tr>
      `;
    }
    if (changes.items) {
      changesHtml += `
        <tr>
          <td style="padding: 8px 0; font-weight: 600; color: #495057;">Items:</td>
          <td style="padding: 8px 0; color: #212529;">Order items have been modified</td>
        </tr>
      `;
    }
    if (changes.orderNotes) {
      changesHtml += `
        <tr>
          <td style="padding: 8px 0; font-weight: 600; color: #495057;">Notes:</td>
          <td style="padding: 8px 0; color: #212529;">Order notes have been updated</td>
        </tr>
      `;
    }

    const itemsHtml = orderData.items.map(item => `
      <tr>
        <td style="padding: 8px 0; color: #212529;">${item.quantity}x</td>
        <td style="padding: 8px 0; color: #212529;">
          <strong>${item.name}</strong>
          ${item.specialInstructions ? `<br><span style="font-size: 12px; color: #6c757d; font-style: italic;">${item.specialInstructions}</span>` : ''}
        </td>
      </tr>
    `).join('');

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Order Updated - ${restaurantData.name}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #dbeafe; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <h1 style="margin: 0 0 8px 0; color: #1e3a8a; font-size: 24px;">Order Updated</h1>
            <p style="margin: 0; color: #1e40af; font-size: 14px;">Order ID: #${orderData.orderId}</p>
          </div>

          <div style="background-color: #ffffff; border: 1px solid #e9ecef; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <h2 style="margin: 0 0 16px 0; color: #1a1a1a; font-size: 18px; border-bottom: 2px solid #e9ecef; padding-bottom: 8px;">Changes Made</h2>

            <table style="width: 100%; border-collapse: collapse;">
              ${changesHtml}
            </table>
          </div>

          <div style="background-color: #ffffff; border: 1px solid #e9ecef; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <h2 style="margin: 0 0 16px 0; color: #1a1a1a; font-size: 18px; border-bottom: 2px solid #e9ecef; padding-bottom: 8px;">Current Order Details</h2>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #495057; width: 140px;">Customer Name:</td>
                <td style="padding: 8px 0; color: #212529;">${orderData.customerName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #495057;">Phone:</td>
                <td style="padding: 8px 0; color: #212529;">${orderData.customerPhone}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #495057;">Pickup Date:</td>
                <td style="padding: 8px 0; color: #212529;">${formattedPickupDate}</td>
              </tr>
              ${orderData.pickupTime ? `
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #495057;">Pickup Time:</td>
                <td style="padding: 8px 0; color: #212529;">${orderData.pickupTime}</td>
              </tr>
              ` : ''}
            </table>

            <h3 style="margin: 16px 0 8px 0; color: #1a1a1a; font-size: 16px;">Order Items</h3>
            <table style="width: 100%; border-collapse: collapse;">
              ${itemsHtml}
            </table>

            ${orderData.orderNotes ? `
            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e9ecef;">
              <p style="margin: 0 0 8px 0; font-weight: 600; color: #495057;">Order Notes:</p>
              <p style="margin: 0; color: #212529; background-color: #f8f9fa; padding: 12px; border-radius: 4px;">${orderData.orderNotes}</p>
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
              This is an automated notification from your restaurant system.<br>
              You're receiving this because you manage ${restaurantData.name}.
            </p>
          </div>
        </body>
      </html>
    `;

    try {
      // Send emails sequentially to respect rate limits (2 per second)
      const results = [];
      for (let i = 0; i < adminEmails.length; i++) {
        const email = adminEmails[i];
        console.log(`Sending order update email to: ${email} (${i + 1}/${adminEmails.length})`);

        const { data, error } = await resend.emails.send({
          from: 'Orders <orders@updates.nerdvi.ai>',
          to: email,
          subject: `Order Updated - ${restaurantData.name} - ${formattedPickupDate}`,
          html: emailHtml,
        });

        if (error) {
          console.error(`Error sending order update email to ${email}:`, error);
          results.push({ success: false, email, error: error.message });
        } else {
          console.log(`Order update email sent successfully to ${email}, ID: ${data?.id}`);
          results.push({ success: true, email, emailId: data?.id });
        }

        // Wait 600ms before sending the next email (to stay under 2 requests/second)
        if (i < adminEmails.length - 1) {
          await delay(600);
        }
      }

      const successCount = results.filter(r => r.success).length;
      console.log(`Successfully sent ${successCount}/${adminEmails.length} order update emails`);

      return {
        success: successCount > 0,
        totalSent: successCount,
        totalFailed: results.filter(r => !r.success).length,
        results
      };
    } catch (error: any) {
      console.error('Failed to send order update notifications:', error);
      return { success: false, error: error.message };
    }
  },
});

/**
 * Analyze call transcript with OpenAI
 */
interface CallAnalysis {
  call_subject: string;
  summary: string;
  sentiment_score: number;
  sentiment_label: 'Happy' | 'Neutral' | 'Frustrated';
  customer_name_provided: boolean;
  action_taken: string;
  issues: string;
  follow_up_needed: boolean;
  follow_up_reason: string;
}

async function analyzeCallWithOpenAI(transcript: string): Promise<CallAnalysis> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'You are analyzing customer service call transcripts for restaurants. Provide concise, accurate analysis in JSON format.',
      },
      {
        role: 'user',
        content: `Analyze this restaurant call transcript:

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
}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });

  const analysis = JSON.parse(completion.choices[0].message.content || '{}');

  return analysis as CallAnalysis;
}

/**
 * Build email HTML template for call completion notification
 */
function buildCallEmailTemplate(params: {
  restaurant: any;
  agent: any;
  analysis: CallAnalysis;
  callData: { timestamp: number; duration?: number };
  conversationId: string;
}) {
  const { restaurant, agent, analysis, callData, conversationId } = params;

  // Sentiment badge color
  const sentimentColor =
    analysis.sentiment_score >= 8
      ? '#10b981' // green
      : analysis.sentiment_score >= 5
        ? '#f59e0b' // yellow
        : '#ef4444'; // red

  const formattedDate = new Date(callData.timestamp * 1000).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

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
          <h1 style="margin: 0; color: white; font-size: 24px;">📞 ${analysis.call_subject}</h1>
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
            ${
              callData.duration
                ? `
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: #6b7280;">Duration:</td>
              <td style="padding: 8px 0; color: #1f2937;">${Math.floor(callData.duration / 60)}m ${callData.duration % 60}s</td>
            </tr>
            `
                : ''
            }
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

          ${
            analysis.issues
              ? `
          <div style="margin-top: 16px; padding: 12px; background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px;">
            <p style="margin: 0; color: #991b1b; font-weight: 600; font-size: 13px;">⚠️ Issues Reported:</p>
            <p style="margin: 4px 0 0 0; color: #7f1d1d; font-size: 14px;">${analysis.issues}</p>
          </div>
          `
              : ''
          }

          ${
            analysis.follow_up_needed
              ? `
          <div style="margin-top: 16px; padding: 12px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
            <p style="margin: 0; color: #92400e; font-weight: 600; font-size: 13px;">👀 Follow-up Needed</p>
            <p style="margin: 4px 0 0 0; color: #78350f; font-size: 14px;">${analysis.follow_up_reason || 'Action required'}</p>
          </div>
          `
              : ''
          }
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

/**
 * Send email notification when a call is completed
 * Includes AI-generated summary and sentiment analysis
 */
export const sendCallCompletionNotification = action({
  args: {
    conversationId: v.string(),
    agentId: v.string(),
    restaurantId: v.string(),
    agentName: v.string(),
    restaurantName: v.string(),
    transcript: v.string(),
    adminEmails: v.array(v.string()),
    callData: v.object({
      timestamp: v.number(),
      duration: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    try {
      console.log('Processing call completion notification:', args.conversationId);

      const { adminEmails, agentName, restaurantName } = args;

      if (adminEmails.length === 0) {
        console.log('No admin emails found for restaurant:', restaurantName);
        return { success: false, error: 'No admin emails found' };
      }

      // Build agent and restaurant objects from provided data
      const agent = { _id: args.agentId, name: agentName };
      const restaurant = { _id: args.restaurantId, name: restaurantName };

      // 3. Analyze call with OpenAI
      console.log('Analyzing call with OpenAI...');
      const analysis = await analyzeCallWithOpenAI(args.transcript);
      console.log('OpenAI analysis complete:', {
        call_subject: analysis.call_subject,
        sentiment: analysis.sentiment_label,
      });

      // 4. Fetch audio from ElevenLabs
      console.log('Fetching audio from ElevenLabs...');
      const audioResponse = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversations/${args.conversationId}/audio`,
        {
          headers: {
            'xi-api-key': process.env.ELEVENLABS_API_KEY!,
          },
        }
      );

      if (!audioResponse.ok) {
        throw new Error(`Failed to fetch audio: ${audioResponse.statusText}`);
      }

      const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
      const audioSizeMB = audioBuffer.byteLength / (1024 * 1024);
      console.log(`Audio fetched: ${audioSizeMB.toFixed(2)} MB`);

      // 5. Build email HTML
      const emailHtml = buildCallEmailTemplate({
        restaurant,
        agent,
        analysis,
        callData: args.callData,
        conversationId: args.conversationId,
      });

      // 6. Send email with MP3 attachment (or fallback link if too large)
      const resend = new Resend(process.env.RESEND_API_KEY);
      const results = [];

      for (let i = 0; i < adminEmails.length; i++) {
        const email = adminEmails[i];
        console.log(`Sending call notification to: ${email} (${i + 1}/${adminEmails.length})`);

        try {
          // Check if audio is too large (>35MB to leave buffer for base64 encoding)
          const emailOptions: any = {
            from: 'Calls <calls@updates.nerdvi.ai>',
            to: email,
            subject: `📞 ${analysis.call_subject} - ${restaurant.name}`,
            html: emailHtml,
          };

          if (audioSizeMB <= 35) {
            // Attach audio file
            emailOptions.attachments = [
              {
                filename: `call-${args.conversationId}.mp3`,
                content: audioBuffer,
              },
            ];
          } else {
            // Audio too large - add note in email (would need to add fallback link in template)
            console.warn(
              `Audio too large (${audioSizeMB.toFixed(2)} MB), skipping attachment`
            );
          }

          const { data, error } = await resend.emails.send(emailOptions);

          if (error) {
            console.error(`Error sending call notification to ${email}:`, error);
            results.push({ success: false, email, error: error.message });
          } else {
            console.log(`Call notification sent successfully to ${email}, ID: ${data?.id}`);
            results.push({ success: true, email, emailId: data?.id });
          }
        } catch (error: any) {
          console.error(`Error sending to ${email}:`, error);
          results.push({ success: false, email, error: error.message });
        }

        // Rate limiting (2 emails/second)
        if (i < adminEmails.length - 1) {
          await delay(600);
        }
      }

      const successCount = results.filter((r) => r.success).length;
      console.log(`Successfully sent ${successCount}/${adminEmails.length} call notifications`);

      return {
        success: successCount > 0,
        totalSent: successCount,
        totalFailed: results.filter((r) => !r.success).length,
        results,
      };
    } catch (error: any) {
      console.error('Failed to send call completion notifications:', error);
      return { success: false, error: error.message };
    }
  },
});

/**
 * Process post-call webhook - public action called from webhook endpoint
 * Looks up agent, restaurant, and admin emails using internal queries, then sends notification
 */
export const processPostCallWebhook = action({
  args: {
    conversationId: v.string(),
    elevenLabsAgentId: v.string(), // ElevenLabs agent ID (not Convex ID)
    transcript: v.string(),
    eventTimestamp: v.optional(v.number()),
    callDuration: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string; totalSent?: number; totalFailed?: number; results?: any[] }> => {
    try {
      console.log('🔔 Processing post-call webhook:', args.conversationId);

      // 1. Look up agent by ElevenLabs agent ID using internal query
      // @ts-expect-error - Type instantiation depth issue with Convex generated types
      const agent = (await ctx.runQuery(internal.agents.getByElevenLabsAgentIdInternal, {
        elevenLabsAgentId: args.elevenLabsAgentId,
      })) as any;

      if (!agent) {
        console.error('❌ Agent not found for ElevenLabs agent_id:', args.elevenLabsAgentId);
        return { success: false, error: 'Agent not found' };
      }

      console.log('✅ Found agent:', agent._id, '- Restaurant:', agent.restaurantId);

      // 2. Get restaurant details using internal query
      const restaurant = (await ctx.runQuery(internal.restaurants.getRestaurantInternal, {
        id: agent.restaurantId,
      })) as any;

      if (!restaurant) {
        console.error('❌ Restaurant not found:', agent.restaurantId);
        return { success: false, error: 'Restaurant not found' };
      }

      // 3. Get admin emails using internal query
      const adminEmails = (await ctx.runQuery(internal.notifications.getAdminEmailsInternal, {
        restaurantId: agent.restaurantId,
      })) as string[];

      if (adminEmails.length === 0) {
        console.warn('⚠️ No admin emails found for restaurant:', restaurant.name);
        return { success: false, error: 'No admin emails found' };
      }

      console.log(`✅ Found ${adminEmails.length} admin email(s)`);

      // 4. Analyze call with OpenAI
      console.log('Analyzing call with OpenAI...');
      const analysis = await analyzeCallWithOpenAI(args.transcript);
      console.log('OpenAI analysis complete:', {
        call_subject: analysis.call_subject,
        sentiment: analysis.sentiment_label,
      });

      // 5. Fetch audio from ElevenLabs
      console.log('Fetching audio from ElevenLabs...');
      const audioResponse = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversations/${args.conversationId}/audio`,
        {
          headers: {
            'xi-api-key': process.env.ELEVENLABS_API_KEY!,
          },
        }
      );

      if (!audioResponse.ok) {
        console.error('Failed to fetch audio:', audioResponse.statusText);
        return { success: false, error: 'Failed to fetch audio' };
      }

      const arrayBuffer = await audioResponse.arrayBuffer();
      const audioBuffer = new Uint8Array(arrayBuffer);
      const audioSizeMB = audioBuffer.length / (1024 * 1024);
      console.log(`Audio fetched: ${audioSizeMB.toFixed(2)} MB`);

      // Convert Uint8Array to Base64 string for email attachment
      // Resend requires attachments as Base64 strings or Buffer (Node.js only)
      let binary = '';
      const chunkSize = 8192; // Process in chunks to avoid stack overflow
      for (let i = 0; i < audioBuffer.length; i += chunkSize) {
        const chunk = audioBuffer.subarray(i, Math.min(i + chunkSize, audioBuffer.length));
        binary += String.fromCharCode(...chunk);
      }
      const base64Audio = btoa(binary);
      console.log('Converted audio to base64, length:', base64Audio.length);

      // 6. Build email content
      const agentData = { _id: agent._id, name: agent.name };
      const restaurantData = { _id: agent.restaurantId, name: restaurant.name };

      const emailHtml = buildCallEmailTemplate({
        agent: agentData,
        restaurant: restaurantData,
        conversationId: args.conversationId,
        analysis,
        callData: {
          timestamp: args.eventTimestamp || Date.now() / 1000,
          duration: args.callDuration,
        },
      });

      // 7. Send emails to all admins with Resend
      const resend = new Resend(process.env.RESEND_API_KEY);
      const results = [];
      let successCount = 0;

      for (let i = 0; i < adminEmails.length; i++) {
        const email = adminEmails[i];

        try {
          console.log(`Sending call notification to: ${email} (${i + 1}/${adminEmails.length})`);

          const emailData: any = {
            from: 'Calls <calls@updates.nerdvi.ai>',
            to: email,
            subject: `📞 ${analysis.call_subject} - ${restaurant.name}`,
            html: emailHtml,
          };

          // Only attach MP3 if less than 35MB (Resend limit is 40MB)
          if (audioSizeMB < 35) {
            emailData.attachments = [
              {
                filename: `call-${args.conversationId}.mp3`,
                content: base64Audio,
              },
            ];
          } else {
            console.warn(`Audio too large (${audioSizeMB.toFixed(2)} MB) to attach to email`);
          }

          const result = await resend.emails.send(emailData);

          console.log(`Call notification sent successfully to ${email}`);
          results.push({ email, success: true, id: result.data?.id });
          successCount++;

          // Rate limit: Resend allows 2 requests per second
          if (i < adminEmails.length - 1) {
            await delay(600);
          }
        } catch (error: any) {
          console.error(`Failed to send call notification to ${email}:`, error.message);
          results.push({ email, success: false, error: error.message });
        }
      }

      console.log(`Successfully sent ${successCount}/${adminEmails.length} call notifications`);

      return {
        success: successCount > 0,
        totalSent: successCount,
        totalFailed: results.filter((r) => !r.success).length,
        results,
      };
    } catch (error: any) {
      console.error('❌ Error processing post-call webhook:', error);
      return { success: false, error: error.message };
    }
  },
});
