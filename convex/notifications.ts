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
              This is an automated notification from your reservation system.
            </p>
          </div>
        </body>
      </html>
    `;

    try {
      const emailPromises = adminEmails.map(async (email) => {
        const { data, error } = await resend.emails.send({
          from: 'Reservations <onboarding@resend.dev>',
          to: email,
          subject: `Reservation Cancelled - ${restaurantData.name} - ${formattedDate}`,
          html: emailHtml,
        });

        if (error) {
          console.error(`Error sending cancellation email to ${email}:`, error);
          return { success: false, email, error: error.message };
        }

        return { success: true, email, emailId: data?.id };
      });

      const results = await Promise.all(emailPromises);
      const successCount = results.filter(r => r.success).length;

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
              This is an automated notification from your reservation system.
            </p>
          </div>
        </body>
      </html>
    `;

    try {
      const emailPromises = adminEmails.map(async (email) => {
        const { data, error } = await resend.emails.send({
          from: 'Reservations <onboarding@resend.dev>',
          to: email,
          subject: `Reservation Updated - ${restaurantData.name} - ${formattedDate}`,
          html: emailHtml,
        });

        if (error) {
          console.error(`Error sending update email to ${email}:`, error);
          return { success: false, email, error: error.message };
        }

        return { success: true, email, emailId: data?.id };
      });

      const results = await Promise.all(emailPromises);
      const successCount = results.filter(r => r.success).length;

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
              This is an automated notification from your restaurant system.
            </p>
          </div>
        </body>
      </html>
    `;

    try {
      console.log('Attempting to send order emails to:', adminEmails);

      // Send individual emails to each recipient
      const emailPromises = adminEmails.map(async (email) => {
        console.log(`Sending order email to: ${email}`);
        const { data, error } = await resend.emails.send({
          from: 'Orders <onboarding@resend.dev>',
          to: email,
          subject: `New To-Go Order - ${restaurantData.name} - ${formattedPickupDate}`,
          html: emailHtml,
        });

        if (error) {
          console.error(`Error sending email to ${email}:`, error);
          return { success: false, email, error: error.message };
        }

        console.log(`Order email sent successfully to ${email}, ID: ${data?.id}`);
        return { success: true, email, emailId: data?.id };
      });

      // Wait for all emails to be sent
      const results = await Promise.all(emailPromises);

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
              This is an automated notification from your restaurant system.
            </p>
          </div>
        </body>
      </html>
    `;

    try {
      const emailPromises = adminEmails.map(async (email) => {
        const { data, error } = await resend.emails.send({
          from: 'Orders <onboarding@resend.dev>',
          to: email,
          subject: `Order Cancelled - ${restaurantData.name} - ${formattedPickupDate}`,
          html: emailHtml,
        });

        if (error) {
          console.error(`Error sending order cancellation email to ${email}:`, error);
          return { success: false, email, error: error.message };
        }

        return { success: true, email, emailId: data?.id };
      });

      const results = await Promise.all(emailPromises);
      const successCount = results.filter(r => r.success).length;

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
              This is an automated notification from your restaurant system.
            </p>
          </div>
        </body>
      </html>
    `;

    try {
      const emailPromises = adminEmails.map(async (email) => {
        const { data, error } = await resend.emails.send({
          from: 'Orders <onboarding@resend.dev>',
          to: email,
          subject: `Order Updated - ${restaurantData.name} - ${formattedPickupDate}`,
          html: emailHtml,
        });

        if (error) {
          console.error(`Error sending order update email to ${email}:`, error);
          return { success: false, email, error: error.message };
        }

        return { success: true, email, emailId: data?.id };
      });

      const results = await Promise.all(emailPromises);
      const successCount = results.filter(r => r.success).length;

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
