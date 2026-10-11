This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Calendar Task Notifications

The workflow editor's **Schedule task + notify** action creates a future event on the connected Google account's primary calendar and sends a scheduling confirmation by email and WhatsApp when the workflow runs live.

### Transactional email with Resend

Email workflow actions and the email notification in **Schedule task + notify** use [Resend](https://resend.com), not the Gmail API. Resend's [pricing page](https://resend.com/pricing) currently lists a free plan with 3,000 emails per month and a 100-email daily limit; limits and pricing can change. Create a Resend account, [add and verify a domain you own](https://resend.com/docs/dashboard/domains/introduction), and create an API key. Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in `.env` or the deployment environment. The sender must be an address on your verified domain, for example `Fuzzie <notifications@example.com>`. Keep the key server-side and never use a `NEXT_PUBLIC_` prefix.

Configure Google OAuth separately for the Calendar action: enable the Google Calendar API, set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_GMAIL_REDIRECT_URI`, then connect through the existing Google integration and store its refresh token as `GMAIL_REFRESH_TOKEN`. Google is used for Calendar only; email sending no longer needs Gmail API access. Set `LIVE_WORKFLOWS_ENABLED=true` on the server after the required integrations are configured.

### WhatsApp Cloud API

Create a Meta developer app with the WhatsApp use case, connect a WhatsApp Business account and phone number, then use **WhatsApp > API Setup** to generate a test access token and phone number ID. Add a verified test recipient there to test. For a persistent deployment, create a Meta system user token with `whatsapp_business_messaging` and `whatsapp_business_management` permissions and assign it access to the WhatsApp account.

Set `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` in `.env` or the deployment environment. `WHATSAPP_API_VERSION` defaults to `v25.0`. Never expose these values with a `NEXT_PUBLIC_` prefix or commit a real token.

The **Send a WhatsApp message** action can send free-form text during the 24-hour customer-service window after the recipient messages the business. Outside that window, choose **Approved template** and provide its approved name, language code, and body parameters as a JSON array, for example `["Ada"]`. Recipients must have opted in. Meta's messaging pricing and policies apply; a developer test sender is limited to configured test recipients.

For **Schedule task + notify**, create and approve a positional utility template with body `Your task {{1}} is scheduled for {{2}}.`. Set its exact template name in `WHATSAPP_TASK_TEMPLATE_NAME` and language (for example `en_US`) in `WHATSAPP_TASK_TEMPLATE_LANGUAGE`, or set these in the action. The action still requires a valid confirmation email and an Indian mobile number.

Group sends are supported only through Meta's Groups API: your business must qualify for an Official Business Account, and the group must be created through that API. Participants join via its invite link. This does not allow sending to arbitrary existing personal WhatsApp groups. Meta currently documents a maximum of 8 participants per group; group messaging has separate pricing and feature limits. See the [WhatsApp Cloud API setup](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started), [message rules](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/send-messages), and [Groups API requirements](https://developers.facebook.com/documentation/business-messaging/whatsapp/groups).

## Website Form Workflows

Add **On website form submission** as the workflow trigger, then add the desired actions. Form fields such as `name`, `email`, `phone`, and `message` are available to later steps as `{{name}}`, `{{email}}`, `{{phone}}`, and `{{message}}`. For example, use `{{email}}` as an email recipient and `{{phone}}` as a WhatsApp recipient; outbound WhatsApp messages still require opt-in and an approved template unless the 24-hour service window is open.

Select **Publish website form**, then copy the generated form code into your website. The form submits JSON to the signed webhook endpoint and displays a success or error message. Save the workflow after publishing; republish after changing its steps so the endpoint runs the latest version.

The endpoint URL is a secret bearer link: anyone who obtains it can trigger the workflow and its live actions. Do not post it publicly in documentation or source control. For a public production form, put a server-side proxy with rate limiting and CAPTCHA/bot protection in front of it instead of embedding the endpoint directly in public page code. Set `WORKFLOW_WEBHOOK_SECRET` to a random secret of at least 32 characters.

Use **Continue only if** before an external action to gate it on input data. For example, check whether `message` contains `urgent` before sending an alert. If the condition does not match, all later workflow steps are skipped. Supported checks include text equality/containment, empty values, and numeric greater-than/less-than comparisons.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
