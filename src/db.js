/* === CONSTANTS === */

const DB_NAME = 'techbros-transfer-db';
const DB_VERSION = 1;
const STORE_NAME = 'file-chunks';

export const db = {
    _connection: null,

    /* === CONNECTION === */

    async open() {
        if (this._connection) return this._connection;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (event) => reject('DB Error: ' + event.target.error);

            request.onupgradeneeded = (event) => {
                const database = event.target.result;
                if (!database.objectStoreNames.contains(STORE_NAME)) {
                    const store = database.createObjectStore(STORE_NAME, { keyPath: ['file', 'index'] });
                    store.createIndex('file', 'file', { unique: false });
                }
            };

            request.onblocked = () => {
                console.error('[DB] Upgrade blocked. Please close other tabs of this app.');
                reject('DB Upgrade blocked');
            };

            request.onsuccess = (event) => {
                this._connection = event.target.result;
                this._connection.onclose = () => { this._connection = null; };
                this._connection.onversionchange = () => {
                    this._connection.close();
                    this._connection = null;
                };
                resolve(this._connection);
            };
        });
    },

    close() {
        if (this._connection) {
            this._connection.close();
            this._connection = null;
        }
    },

    /* === OPERATIONS === */

    async countChunks(fileName) {
        const database = await this.open();
        return new Promise((resolve, reject) => {
            const tx = database.transaction([STORE_NAME], 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const index = store.index('file');
            const request = index.count(IDBKeyRange.only(fileName));
            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => reject(e.target.error);
        });
    },

    async addChunk(fileName, index, data) {
        const database = await this.open();
        return new Promise((resolve, reject) => {
            const tx = database.transaction([STORE_NAME], 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.put({ file: fileName, index, data });
            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e.target.error);
        });
    },

    async getFileChunks(fileName) {
        const database = await this.open();
        return new Promise((resolve, reject) => {
            const tx = database.transaction([STORE_NAME], 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const index = store.index('file');
            const request = index.getAll(IDBKeyRange.only(fileName));

            request.onsuccess = () => {
                const sorted = request.result.sort((a, b) => a.index - b.index);
                resolve(sorted.map(item => item.data));
            };
            request.onerror = (e) => reject(e.target.error);
        });
    },

    async *getFileChunkStream(fileName, batchSize = 10) {
        const database = await this.open();
        const tx = database.transaction([STORE_NAME], 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const index = store.index('file');
        
        let currentIndex = 0;
        let batch = [];
        
        return new Promise((resolve, reject) => {
            const keyRange = IDBKeyRange.only(fileName);
            const request = index.openCursor(keyRange);
            
            const results = [];
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    results.push({ index: cursor.value.index, data: cursor.value.data });
                    cursor.continue();
                } else {
                    const sorted = results.sort((a, b) => a.index - b.index);
                    resolve(this._createChunkIterator(sorted, batchSize));
                }
            };
            request.onerror = (e) => reject(e.target.error);
        });
    },

    async *_createChunkIterator(sortedChunks, batchSize) {
        for (let i = 0; i < sortedChunks.length; i += batchSize) {
            const batch = sortedChunks.slice(i, i + batchSize).map(item => item.data);
            yield batch;
        }
    },

    async deleteFileChunks(fileName) {
        const database = await this.open();
        return new Promise((resolve, reject) => {
             const tx = database.transaction([STORE_NAME], 'readwrite');
             const store = tx.objectStore(STORE_NAME);
             const index = store.index('file');
             const keyRange = IDBKeyRange.only(fileName);

             const request = index.openKeyCursor(keyRange);
             request.onsuccess = (e) => {
                 const cursor = e.target.result;
                 if(cursor) {
                     store.delete(cursor.primaryKey);
                     cursor.continue();
                 } else {
                     resolve();
                 }
             };
             request.onerror = (e) => reject(e.target.error);
        });
    }
};
