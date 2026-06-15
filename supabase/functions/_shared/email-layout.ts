/**
 * Shared ShawScope branded email layout.
 * Matches the website dark theme with amber accents.
 */

const LOGO_URL = 'https://huiboexlxhafzywbdmpq.supabase.co/storage/v1/object/public/email-assets/shawscope-logo-dark.png';

export function emailHeader(subtitle?: string): string {
  return `
  <div style="background-color:#0E1420;padding:28px 24px 20px;text-align:center;">
    <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
      <tr>
        <td style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:26px;font-weight:300;letter-spacing:4px;color:#E8ECF1;padding:0;">SHAW</td>
        <td style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:26px;font-weight:300;letter-spacing:4px;color:#D4912A;padding:0;">SCOPE</td>
      </tr>
    </table>
    ${subtitle ? `<p style="font-size:11px;color:#7A8494;letter-spacing:2px;text-transform:uppercase;margin:8px 0 0;text-align:center;">${subtitle}</p>` : `<p style="font-size:11px;color:#7A8494;letter-spacing:2px;text-transform:uppercase;margin:8px 0 0;text-align:center;">A Home Visiting Service</p>`}
  </div>`;
}

export function emailFooter(options?: { noReply?: boolean }): string {
  const noReply = options?.noReply !== false;
  return `
  <div style="border-top:1px solid #E5E7EB;margin:24px 24px 0;padding-top:20px;text-align:center;">
    <p style="color:#9CA3AF;font-size:13px;margin:0;">Kind regards,<br/><strong style="color:#0E1420;">Matt Shaw</strong><br/>ShawScope Clinical Services<br/>
    <a href="mailto:matt@shawscope.co.uk" style="color:#D4912A;text-decoration:none;">matt@shawscope.co.uk</a> · <a href="tel:01305340194" style="color:#D4912A;text-decoration:none;">01305 340 194</a></p>
  </div>
  <div style="background-color:#0E1420;padding:16px 24px;text-align:center;margin-top:24px;">
    <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
      <tr>
        <td style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;font-weight:300;letter-spacing:2px;color:#E8ECF1;padding:0;">SHAW</td>
        <td style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;font-weight:300;letter-spacing:2px;color:#D4912A;padding:0;">SCOPE</td>
      </tr>
    </table>
    <p style="color:#7A8494;font-size:11px;margin:6px 0 0;">Dorchester, Dorset · <a href="https://shawscope.co.uk" style="color:#D4912A;text-decoration:none;">shawscope.co.uk</a></p>
    ${noReply ? `<p style="color:#6B7280;font-size:10px;margin:8px 0 0;line-height:1.4;">⚠️ No Reply — This is an automated system message. Replies are not monitored.<br/>Contact us: <a href="tel:01305340194" style="color:#7A8494;">01305 340 194</a> · <a href="mailto:matt@shawscope.co.uk" style="color:#7A8494;">matt@shawscope.co.uk</a></p>` : ''}
  </div>`;
}

export function emailButton(text: string, href: string, options?: { color?: string; icon?: string }): string {
  const bg = options?.color || '#D4912A';
  const icon = options?.icon ? `${options.icon}&nbsp;&nbsp;` : '';
  return `
  <div style="text-align:center;margin:24px 0;">
    <a href="${href}" style="display:inline-block;background-color:${bg};color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;font-family:'DM Sans','Helvetica Neue',Arial,sans-serif;">${icon}${text}</a>
  </div>`;
}

export function emailInfoBox(icon: string, label: string, text: string, options?: { bgColor?: string; borderColor?: string; textColor?: string; labelColor?: string }): string {
  const bg = options?.bgColor || '#FEF9F0';
  const border = options?.borderColor || '#F5E6CC';
  const textCol = options?.textColor || '#4B5563';
  const labelCol = options?.labelColor || '#92400E';
  return `
  <div style="background-color:${bg};border:1px solid ${border};border-radius:10px;padding:14px 16px;margin-bottom:16px;">
    <p style="margin:0 0 4px;font-size:12px;color:${labelCol};font-weight:600;">${icon} ${label}</p>
    <p style="margin:0;font-size:13px;color:${textCol};">${text}</p>
  </div>`;
}

export function emailDetailTable(rows: { icon: string; label: string; value: string }[]): string {
  const rowsHtml = rows.map((r, i) => `
    <tr>
      <td style="padding:10px 0;color:#9CA3AF;width:32px;vertical-align:top;${i > 0 ? 'border-top:1px solid #F3F4F6;' : ''}">${r.icon}</td>
      <td style="padding:10px 0;color:#6B7280;font-size:14px;${i > 0 ? 'border-top:1px solid #F3F4F6;' : ''}">${r.label}</td>
      <td style="padding:10px 0;color:#0E1420;font-weight:600;text-align:right;font-size:14px;${i > 0 ? 'border-top:1px solid #F3F4F6;' : ''}">${r.value}</td>
    </tr>`).join('');

  return `
  <div style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
    <table cellpadding="0" cellspacing="0" style="width:100%;font-family:'DM Sans','Helvetica Neue',Arial,sans-serif;">
      ${rowsHtml}
    </table>
  </div>`;
}

export function emailWrap(content: string, options?: { subtitle?: string; noReply?: boolean }): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:'DM Sans','Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;">
    ${emailHeader(options?.subtitle)}
    <div style="padding:32px 28px;">
      ${content}
    </div>
    ${emailFooter({ noReply: options?.noReply })}
  </div>
</body>
</html>`;
}

export function emailIconHeading(icon: string, title: string, subtitle?: string): string {
  return `
  <div style="text-align:center;margin-bottom:24px;">
    <div style="font-size:32px;margin:0 0 12px;">${icon}</div>
    <h2 style="color:#0E1420;margin:0 0 4px;font-size:22px;font-weight:bold;font-family:'DM Sans','Helvetica Neue',Arial,sans-serif;">${title}</h2>
    ${subtitle ? `<p style="color:#6B7280;margin:0;font-size:14px;">${subtitle}</p>` : ''}
  </div>`;
}

export function emailSectionHeader(icon: string, title: string): string {
  return `
  <div style="background-color:#0E1420;padding:10px 14px;border-radius:10px 10px 0 0;">
    <p style="margin:0;color:#E8ECF1;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">${icon} ${title}</p>
  </div>`;
}
