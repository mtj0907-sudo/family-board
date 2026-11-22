import { initializeApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';
import { parseFirebaseConfig } from './lib/firebaseConfig';

const cfg = parseFirebaseConfig(import.meta.env.VITE_FIREBASE_CONFIG as string | undefined);

let db: Firestore | null = null;
if (cfg) {
  const app = initializeApp(cfg);
  // 오프라인에서도 마지막 내용을 보여주고, 연결되면 자동으로 동기화
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
}

export { db };
export const firebaseReady = db !== null;
