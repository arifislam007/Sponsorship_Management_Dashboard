import { JWT } from 'google-auth-library';
import { config } from './config.js';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

function parseCredentials() {
  const raw = config.googleServiceAccountJson;
  if (!raw) {
    throw new Error('Google Sheets sync is not configured (missing GOOGLE_SERVICE_ACCOUNT_JSON)');
  }
  try {
    return JSON.parse(raw);
  } catch {
    // Allow the env var to hold a base64-encoded JSON key instead of raw JSON,
    // which avoids quoting/newline issues with the private_key field in .env files.
    try {
      return JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'));
    } catch {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON (or base64-encoded JSON)');
    }
  }
}

let cachedClient = null;
let cachedCredentials = null;

function getClient() {
  if (!cachedClient) {
    cachedCredentials = parseCredentials();
    cachedClient = new JWT({
      email: cachedCredentials.client_email,
      key: cachedCredentials.private_key,
      scopes: SCOPES,
    });
  }
  return cachedClient;
}

export function getServiceAccountEmail() {
  getClient();
  return cachedCredentials?.client_email || null;
}

export function extractSpreadsheetId(input) {
  const trimmed = String(input || '').trim();
  const match = trimmed.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : trimmed;
}

// Returns rows as an array of objects keyed by the sheet's header row (row 1).
export async function fetchSheetRows(spreadsheetIdOrUrl, sheetName) {
  const client = getClient();
  const spreadsheetId = extractSpreadsheetId(spreadsheetIdOrUrl);
  const range = encodeURIComponent(sheetName || 'Sheet1');

  const { token } = await client.getAccessToken();
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = body?.error?.message || `Google Sheets API error (${res.status})`;
    if (res.status === 403 || res.status === 404) {
      const email = getServiceAccountEmail();
      throw new Error(
        `Cannot access this sheet. Make sure it's shared (Viewer access) with ${email || 'the service account'}. (${message})`
      );
    }
    throw new Error(message);
  }

  const data = await res.json();
  const values = data.values || [];
  if (values.length < 2) return [];

  const headers = values[0].map(h => String(h || '').trim());
  return values.slice(1)
    .filter(row => row.some(cell => String(cell ?? '').trim() !== ''))
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
      return obj;
    });
}
