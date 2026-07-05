const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v22.0';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

const API_URL = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${PHONE_NUMBER_ID}/messages`;

interface WhatsAppTextParams {
  to: string;
  body: string;
  previewUrl?: boolean;
}

interface WhatsAppTemplateParams {
  to: string;
  templateName: string;
  languageCode?: string;
  bodyParameters: string[];
}

const isConfigured = () => !!PHONE_NUMBER_ID && !!ACCESS_TOKEN;

export const sendWhatsAppText = async (params: WhatsAppTextParams) => {
  if (!isConfigured()) {
    console.log(`[WhatsApp] Not configured. Would send to ${params.to}: ${params.body}`);
    return;
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: params.to,
      type: 'text',
      text: { body: params.body, preview_url: params.previewUrl ?? false },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[WhatsApp] Failed to send text:', error);
    throw new Error(`WhatsApp API error: ${response.status}`);
  }

  return response.json();
};

export const sendWhatsAppTemplate = async (params: WhatsAppTemplateParams) => {
  if (!isConfigured()) {
    console.log(`[WhatsApp] Not configured. Would send template "${params.templateName}" to ${params.to}`);
    return;
  }

  const components = [
    {
      type: 'body',
      parameters: params.bodyParameters.map((p) => ({ type: 'text', text: p })),
    },
  ];

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: params.to,
      type: 'template',
      template: {
        name: params.templateName,
        language: { code: params.languageCode || 'en' },
        components,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[WhatsApp] Failed to send template:', error);
    throw new Error(`WhatsApp API error: ${response.status}`);
  }

  return response.json();
};

export const sendPaymentConfirmation = async (
  to: string,
  memberName: string,
  invoiceNumber: string,
  amount: number,
  balance: number,
) => {
  if (!isConfigured()) {
    console.log(
      `[WhatsApp] Dev mode — payment confirmation for ${memberName} (${to}): Invoice ${invoiceNumber}, Amount ₹${amount}, Balance ₹${balance}`,
    );
    return;
  }

  try {
    await sendWhatsAppTemplate({
      to,
      templateName: 'payment_confirmation',
      bodyParameters: [memberName, invoiceNumber, String(amount), String(balance)],
    });
  } catch {
    console.log('[WhatsApp] Template not available, sending as text...');
    const body = [
      `Dear ${memberName},`,
      ``,
      `Your payment has been confirmed.`,
      ``,
      `Invoice: ${invoiceNumber}`,
      `Amount Paid: ₹${amount}`,
      `Outstanding Balance: ₹${balance}`,
      ``,
      `Thank you,`,
      `The Stellaar Club`,
    ].join('\n');

    await sendWhatsAppText({ to, body });
  }
};
