/**
 * Jalankan sekali untuk set CORS Firebase Storage:
 *   npm install @google-cloud/storage
 *   node set-storage-cors.mjs
 *
 * Butuh: service account key JSON dari Firebase Console →
 *   Project Settings → Service accounts → Generate new private key
 */

import { Storage } from '@google-cloud/storage';
import { readFileSync } from 'fs';

// Ganti path ini dengan lokasi service account key kamu
const KEY_FILE = './service-account-key.json';
const BUCKET   = 'smartcatfeeder-616b4.firebasestorage.app';

const corsConfig = [
  {
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://192.168.101.103:3000',
      'http://192.168.101.103:5173',
    ],
    method: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    maxAgeSeconds: 3600,
    responseHeader: ['Content-Type', 'Authorization', 'Content-Length', 'x-goog-resumable'],
  },
];

async function main() {
  const storage = new Storage({ keyFilename: KEY_FILE });
  await storage.bucket(BUCKET).setCorsConfiguration(corsConfig);
  console.log('✅ CORS berhasil dikonfigurasi untuk bucket:', BUCKET);
}

main().catch(console.error);
