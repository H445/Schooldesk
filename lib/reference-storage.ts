export const MAX_REFERENCE_BYTES = 500 * 1024 * 1024;

const ASSET_PREFIX = 'asset:';
const DATABASE_NAME = 'schooldesk.reference-assets.v1';
const STORE_NAME = 'assets';
let databasePromise: Promise<IDBDatabase> | undefined;

export function referenceAssetId(href: string) {
  if (!href.startsWith(ASSET_PREFIX)) return undefined;
  const id = href.slice(ASSET_PREFIX.length);
  return /^[A-Za-z0-9_-]{1,100}$/.test(id) ? id : undefined;
}

function openDatabase() {
  if (databasePromise) return databasePromise;
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(
      new Error('Local file storage is unavailable in this browser.'),
    );
  }
  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('Could not open local file storage.'));
  });
  return databasePromise;
}

function runAssetTransaction<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T> | undefined,
) {
  return openDatabase().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        try {
          const transaction = database.transaction(STORE_NAME, mode);
          const request = action(transaction.objectStore(STORE_NAME));
          transaction.oncomplete = () => resolve(request?.result as T);
          transaction.onerror = () =>
            reject(
              transaction.error ??
                request?.error ??
                new Error('Could not save the local file.'),
            );
          transaction.onabort = () =>
            reject(
              transaction.error ?? new Error('Could not save the local file.'),
            );
        } catch (error) {
          reject(error);
        }
      }),
  );
}

export function storeReferenceAsset(assetId: string, file: Blob) {
  return runAssetTransaction('readwrite', (store) => {
    return store.put(file, assetId);
  });
}

export function loadReferenceAsset(assetId: string) {
  return runAssetTransaction<Blob | undefined>('readonly', (store) =>
    store.get(assetId),
  );
}

export function deleteReferenceAsset(assetId: string) {
  return runAssetTransaction('readwrite', (store) => {
    return store.delete(assetId);
  });
}
