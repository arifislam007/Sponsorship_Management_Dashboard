import { useState } from 'react';
import { Mail, X, Send, CheckCircle, AlertCircle } from 'lucide-react';

interface Props {
  defaultSubject: string;
  /** Return the HTML body to send. Called at send time. */
  getHtml: () => string;
  /** Pre-fill the To field (e.g. donor email) */
  defaultTo?: string;
  onClose: () => void;
}

const EMAIL_WRAPPER = (title: string, body: string) => `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width"/>
<style>
  body{font-family:Arial,Helvetica,sans-serif;color:#1f2937;margin:0;padding:0;background:#f9fafb}
  .wrap{max-width:680px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)}
  .hdr{background:#14856E;padding:24px 32px;color:#fff}
  .hdr h1{margin:0;font-size:20px;font-weight:700}
  .hdr p{margin:4px 0 0;font-size:13px;opacity:.8}
  .body{padding:28px 32px}
  .ftr{background:#f3f4f6;padding:16px 32px;font-size:12px;color:#6b7280;text-align:center}
  table{width:100%;border-collapse:collapse;margin:12px 0}
  th,td{border:1px solid #e5e7eb;padding:8px 12px;font-size:13px;text-align:left}
  th{background:#f9fafb;font-weight:600;color:#374151}
  img{max-width:100%;height:auto}
</style>
</head>
<body>
<div class="wrap">
  <div class="hdr">
    <h1>Sombhabona Foundation</h1>
    <p>${title}</p>
  </div>
  <div class="body">${body}</div>
  <div class="ftr">
    <p>This email was sent from the Sombhabona Foundation Management Portal</p>
    <p>📞 01737243447 &nbsp;|&nbsp; 📍 Mirpur, Dhaka &nbsp;|&nbsp; © 2026 Sombhabona Foundation</p>
  </div>
</div>
</body>
</html>`;

export function wrapEmailHtml(title: string, body: string) {
  return EMAIL_WRAPPER(title, body);
}

export function ShareEmailModal({ defaultSubject, getHtml, defaultTo = '', onClose }: Props) {
  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState(defaultSubject);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errMsg, setErrMsg] = useState('');

  const send = async () => {
    if (!to.trim()) return;
    setSending(true);
    setStatus('idle');
    try {
      const contentHtml = getHtml();
      const noteHtml = note.trim() ? `<p style="background:#f0fdf4;border-left:4px solid #14856E;padding:10px 14px;border-radius:4px;margin-bottom:16px"><em>${note}</em></p>` : '';
      const html = wrapEmailHtml(subject, noteHtml + contentHtml);

      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/v1/notifications/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ to: to.trim(), subject, html }),
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
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
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
              <label className="block text-xs font-medium text-gray-600 mb-1">Personal note <span className="text-gray-400">(optional)</span></label>
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
