import fs from 'fs';
import path from 'path';

interface PushTokenEntry {
  token: string;
  userId?: number;
  memberId?: number;
  platform: string;
  createdAt: string;
}

const TOKENS_FILE = path.join(__dirname, '../../../data/push-tokens.json');

function ensureFile() {
  const dir = path.dirname(TOKENS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(TOKENS_FILE)) fs.writeFileSync(TOKENS_FILE, '[]', 'utf-8');
}

function readTokens(): PushTokenEntry[] {
  ensureFile();
  try {
    return JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeTokens(tokens: PushTokenEntry[]) {
  ensureFile();
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2), 'utf-8');
}

export function saveToken(token: string, userId?: number, memberId?: number, platform: string = 'ios') {
  const tokens = readTokens().filter((t) => t.token !== token);
  tokens.push({ token, userId, memberId, platform, createdAt: new Date().toISOString() });
  writeTokens(tokens);
}

export function removeToken(token: string) {
  const tokens = readTokens().filter((t) => t.token !== token);
  writeTokens(tokens);
}

export function getTokensForUser(userId?: number, memberId?: number): string[] {
  return readTokens()
    .filter((t) => (userId && t.userId === userId) || (memberId && t.memberId === memberId))
    .map((t) => t.token);
}

export function getAllTokens(): string[] {
  return readTokens().map((t) => t.token);
}

export async function sendPushNotification(token: string, title: string, body: string, data?: Record<string, any>) {
  try {
    const message = {
      to: token,
      sound: 'default' as const,
      title,
      body,
      data: data || {},
      priority: 'high' as const,
    };

    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    return await res.json();
  } catch (error) {
    console.error('[Push] Failed to send:', error);
  }
}

export async function broadcastPush(title: string, body: string, data?: Record<string, any>) {
  const tokens = getAllTokens();
  for (const token of tokens) {
    await sendPushNotification(token, title, body, data);
  }
}
