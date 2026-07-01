// Simple, email-client-safe HTML in the style of adamjones.me: red-600 on
// white, stone grays. Tables and inline styles only, mobile-first (single
// column, max 440px) which also reads fine on desktop.

const FONT = '-apple-system,\'Segoe UI\',\'Helvetica Neue\',Helvetica,Arial,sans-serif';

export type Template = {
	heading: string;
	paragraphs: string[];
	/** Optional highlighted detail line, e.g. the meeting time + place. */
	highlight?: string;
	/** Makes the highlight row a link (e.g. to the meeting point on Google Maps). */
	highlightUrl?: string;
	cta: {label: string; url: string};
};

const escapeHtml = (value: string): string => value
	.replaceAll('&', '&amp;')
	.replaceAll('<', '&lt;')
	.replaceAll('>', '&gt;')
	.replaceAll('"', '&quot;');

export const renderEmailHtml = ({
	heading, paragraphs, highlight, highlightUrl, cta,
}: Template): string => `<!doctype html>
<html>
<body style="margin:0;padding:0;background-color:#fafaf9;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafaf9;">
<tr><td align="center" style="padding:28px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;">
<tr><td style="padding:0 4px 14px;font-family:${FONT};font-size:21px;font-weight:800;color:#e7000b;">AdamCon <span style="color:#1c1917;">&rsquo;26</span></td></tr>
<tr><td style="background-color:#ffffff;border:1px solid #e7e5e4;border-radius:16px;padding:24px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="font-family:${FONT};font-size:19px;font-weight:800;color:#1c1917;">${escapeHtml(heading)}</td></tr>
${paragraphs.map((p) => `<tr><td style="padding-top:10px;font-family:${FONT};font-size:15px;line-height:1.6;color:#44403c;">${escapeHtml(p)}</td></tr>`).join('\n')}
${highlight ? `<tr><td style="padding-top:14px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="background-color:#fff5f5;border:1px solid #fee2e2;border-radius:12px;padding:12px 14px;font-family:${FONT};font-size:15px;font-weight:700;color:#9f0712;">${highlightUrl ? `<a href="${highlightUrl}" style="color:#9f0712;text-decoration:underline;">${escapeHtml(highlight)}</a>` : escapeHtml(highlight)}</td></tr></table></td></tr>` : ''}
<tr><td style="padding-top:20px;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td bgcolor="#e7000b" style="border-radius:12px;">
<a href="${cta.url}" style="display:inline-block;padding:13px 26px;font-family:${FONT};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">${escapeHtml(cta.label)}</a>
</td>
</tr></table>
</td></tr>
</table>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

/** Plain-text alternative for clients that prefer it. */
export const renderEmailText = ({
	heading, paragraphs, highlight, highlightUrl, cta,
}: Template): string => [
	heading,
	'',
	...paragraphs,
	...(highlight ? ['', highlight, ...(highlightUrl ? [highlightUrl] : [])] : []),
	'',
	`${cta.label}: ${cta.url}`,
].join('\n');
