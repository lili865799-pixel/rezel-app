import { openDB } from 'idb';

const DATABASE_NAME = 'rezel-local';
const DATABASE_VERSION = 1;
const SETTINGS_STORE = 'settings';
const BUSINESS_TYPE_KEY = 'businessType';

let databasePromise;

function getDatabase() {
  if (typeof indexedDB === 'undefined') {
    throw new Error('IndexedDB is not available in this browser.');
  }

  if (!databasePromise) {
    databasePromise = openDB(DATABASE_NAME, DATABASE_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(SETTINGS_STORE)) {
          database.createObjectStore(SETTINGS_STORE);
        }
      },
    }).catch((error) => {
      databasePromise = undefined;
      throw error;
    });
  }

  return databasePromise;
}

export async function saveBusinessType(businessType) {
  if (typeof businessType !== 'string' || businessType.trim().length === 0) {
    throw new TypeError('Business type must be a non-empty string.');
  }

  const database = await getDatabase();
  await database.put(SETTINGS_STORE, businessType.trim(), BUSINESS_TYPE_KEY);
}

export async function getBusinessType() {
  const database = await getDatabase();
  return (await database.get(SETTINGS_STORE, BUSINESS_TYPE_KEY)) ?? null;
}
