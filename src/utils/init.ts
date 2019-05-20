

// 负责每一次打开浏览器或刷新时,从localstorage中查找是否存在已保存的方案

export const defaultGlobalFilter: any = {
    siteSet: [],
    platform: [],
    prodType: [],
    industry: [],
    timeRange: 7,
    freq: { lower: 10, upper: 999999999999 },
    click: { lower: 0, upper: 999999999999 },
    cpc: { lower: 0, upper: 999999999999 },
    cost: { lower: 50, upper: 999999999999 },
    ctr: { lower: 0, upper: 100 },
    ecpm: { lower: 0, upper: 999999999999 },
    expo: { lower: 0, upper: 999999999999 }
};

export function updateState(key: string, data: any) {
    let request: any = intiDatabase();
    request.onsuccess = function (e: any) {
        let db = e.target.result;
        let transaction = db.transaction('target-database', 'readwrite');
        let store = transaction.objectStore('target-database');
        let index = store.index('time');
        index.get(key).onsuccess = function (e: any) {
            store.put(data).onsuccess = function (e: any) {
                console.log('方案更新成功');
            }
        }
    }
}

export function addState(data: any) {
    let request: any = intiDatabase();
    request.onsuccess = function (e: any) {
        let db = e.target.result;
        let transaction = db.transaction('target-database', 'readwrite');
        let store = transaction.objectStore('target-database');
        let addRequest = store.add(data);
        addRequest.onsuccess = function (e: any) {
            console.log('添加成功');
        }
    }

}

export function findState(callback: any) {
    let request: any = intiDatabase();
    let searched: boolean = false;
    request.onsuccess = function (e: any) {
        let db = e.target.result;
        let transaction = db.transaction('target-database', 'readwrite');
        let store = transaction.objectStore('target-database');
        let findRequest = store.openCursor();
        let lastUpdated = -1;
        findRequest.onsuccess = function (e: any) {
            // if (searched === true) return;
            let cursor = e.target.result;
            if (cursor == null) {
                if (lastUpdated === -1) return callback(null);
                let index = store.index('time');
                index.get(lastUpdated).onsuccess = function (e: any) {
                    callback(e.target.result);
                }
            }
            if (cursor != null && cursor.value != null) {
                if (cursor.value.updatedAt > lastUpdated) lastUpdated = cursor.value.updatedAt;
                cursor.continue();
            }

        };
    };
}

export function intiDatabase() {
    let request = window.indexedDB.open('target');
    request.onerror = function (event) {
        console.log(`打开IndexedDB失败${event}`);
    }
    request.onsuccess = function (event) {
        console.log('打开IndexedDB成功');
    }
    request.onupgradeneeded = function (event: any) {
        let db = event.target.result;
        if (!db.objectStoreNames.contains('target-database')) {
            let store = db.createObjectStore('target-database', { keyPath: 'key' });
            store.createIndex('time', 'updatedAt', { unique: true });
        }
    }
    return request;
}