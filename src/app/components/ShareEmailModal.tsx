import { useState, useEffect } from 'react';
import { Mail, X, Send, CheckCircle, AlertCircle } from 'lucide-react';
import logoUrl from '../../../logo.png';

interface Props {
  defaultSubject: string;
  getHtml: (logoDataUrl: string) => string;
  defaultTo?: string;
  onClose: () => void;
}

async function fetchLogoBase64(): Promise<string> {
  try {
    const res = await fetch(logoUrl);   // logoUrl = Vite-processed hashed asset URL
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error('[ShareEmailModal] logo fetch failed:', e);
    return '';
  }
}

export function wrapSimpleHtml(body: string) {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/>
<style>body{font-family:'Segoe UI',Arial,sans-serif;color:#1f2937;margin:0;padding:24px;background:#fff}
table{width:100%;border-collapse:collapse;margin:10px 0}
th,td{border:1px solid #e5e7eb;padding:8px 12px;font-size:13px;text-align:left}
th{background:#f9fafb;font-weight:600;color:#374151}img{max-width:100%;height:auto}</style>
</head><body>${body}</body></html>`;
}

export function buildEmailHtml(title: string, subtitle: string, body: string, logoDataUrl: string) {
  const logoImg = logoDataUrl
    ? `<img src="${logoDataUrl}" alt="Sombhabona Foundation" style="height:52px;width:auto;display:block;margin:0 auto 10px" />`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,Helvetica,sans-serif;color:#1f2937">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0">
  <tr><td align="center">
    <table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%">

      <!-- HEADER -->
      <tr>
        <td style="background:linear-gradient(135deg,#14856E 0%,#0d6b59 100%);border-radius:16px 16px 0 0;padding:32px 40px 28px;text-align:center">
          ${logoImg}
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px">Sombhabona Foundation</h1>
          <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.75);letter-spacing:0.5px;text-transform:uppercase">${subtitle}</p>
        </td>
      </tr>

      <!-- BODY -->
      <tr>
        <td style="background:#ffffff;padding:32px 40px">
          ${body}
        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td style="background:#f9fafb;border-top:1px solid #e5e7eb;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center">
          <p style="margin:0 0 4px;font-size:12px;color:#6b7280">This email was sent from the Sombhabona Foundation Management Portal</p>
          <p style="margin:0;font-size:12px;color:#9ca3af">
            📞 01737243447 &nbsp;·&nbsp; 📍 756 West Sewrapara, Mirpur, Dhaka &nbsp;·&nbsp; ✉️ info@sombhabona.org
          </p>
          <p style="margin:8px 0 0;font-size:11px;color:#d1d5db">© 2026 Sombhabona Foundation. All rights reserved.</p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

export function ShareEmailModal({ defaultSubject, getHtml, defaultTo = '', onClose }: Props) {
  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState(defaultSubject);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errMsg, setErrMsg] = useState('');
  const [logoDataUrl, setLogoDataUrl] = useState('');

  useEffect(() => {
    fetchLogoBase64().then(setLogoDataUrl);
  }, []);

  const send = async () => {
    if (!to.trim()) return;
    setSending(true);
    setStatus('idle');
    try {
      const rawHtml = getHtml(logoDataUrl);
      const noteHtml = note.trim()
        ? `<div style="background:#f0fdf4;border-left:3px solid #14856E;padding:12px 16px;border-radius:6px;margin-bottom:20px;font-size:14px;color:#374151;font-style:italic">${note}</div>`
        : '';
      const withNote = rawHtml.replace('<!-- NOTE_PLACEHOLDER -->', noteHtml);

      // Extract every data: URL, replace with cid: reference, send image as MIME attachment
      type Attachment = { cid: string; content: string; contentType: string; filename: string };
      const attachments: Attachment[] = [];
      let n = 0;
      const html = withNote.replace(/src="data:([^;]+);base64,([^"]+)"/g, (_m, type, b64) => {
        const cid = `img${n}@sombhabona`;
        const ext = type.split('/')[1]?.split('+')[0] || 'png';
        attachments.push({ cid, content: b64, contentType: type, filename: `img${n++}.${ext}` });
        return `src="cid:${cid}"`;
      });

      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/v1/notifications/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ to: to.trim(), subject, html, attachments }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || 'Failed to send email');
      }
      setStatus('success');
    } catch (e: any) {
      setStatus('error');
      setErrMsg(e.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Mail size={18} className="text-[#14856E]" />
            <h3 className="font-semibold text-gray-900">Share via Email</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        {status === 'success' ? (
          <div className="px-5 py-10 text-center">
            <CheckCircle size={44} className="text-green-500 mx-auto mb-3" />
            <p className="font-semibold text-gray-900">Email sent successfully!</p>
            <p className="text-sm text-gray-500 mt-1">Sent to {to}</p>
            <button onClick={onClose}
              className="mt-5 px-6 py-2 bg-[#14856E] text-white rounded-lg text-sm font-medium hover:bg-[#0f6b5a]">
              Close
            </button>
          </div>
        ) : (
          <div className="px-5 py-4 space-y-3">
            {status === 'error' && (
              <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                <span>{errMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
              <input
                type="email"
                value={to}
                onChange={e => setTo(e.target.value)}
                placeholder="recipient@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Personal note <span className="text-gray-400">(optional)</span>
              </label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={2}
                placeholder="Add a personal message..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E] resize-none"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={send} disabled={sending || !to.trim()}
                className="flex-1 px-4 py-2 bg-[#14856E] text-white rounded-lg text-sm font-semibold hover:bg-[#0f6b5a] disabled:opacity-50 flex items-center justify-center gap-2">
                <Send size={14} />
                {sending ? 'Sending…' : 'Send Email'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
