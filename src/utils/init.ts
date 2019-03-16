// 负责每一次打开浏览器或刷新时,从localstorage中查找是否存在已保存的方案
export function init() {
    let prev = localStorage.getItem('twmp');
    if (prev != null) return JSON.parse(prev);
    else return Object.assign({
        globalState: {
            globalFilter: {
                siteSet: [],
                platform: [],
                prodType: [],
                industry: [],
                click: { lower: 0, upper: 999999999999 },
                cpc: { lower: 0, upper: 999999999999 },
                cost: { lower: 0, upper: 999999999999 },
                ctr: { lower: 0, upper: 100 },
                ecpm: { lower: 0, upper: 999999999999 },
                expo: { lower: 0, upper: 999999999999 }
            },
            idsMap: new Map(),
            idsPointer: null
        },
        relationState: {
            opLogs: [{ type: 'Init' }],
            opPointer: "",
            activeId: null,
            filteredIds: null,
        },
        combinationState: {
            opLogs: [{ type: "Init" }],
            opPointer: "",
            or: [],
            and: []
        },
        filter: {
            siteSet: [],
            platform: [],
            prodType: [],
            industry: [],
            click: { lower: 0, upper: 999999999999 },
            cpc: { lower: 0, upper: 999999999999 },
            cost: { lower: 0, upper: 999999999999 },
            ctr: { lower: 0, upper: 100 },
            ecpm: { lower: 0, upper: 999999999999 },
            expo: { lower: 0, upper: 999999999999 }
        },
        or: [],
        and: [],
        ids: [],
        patterns: []
    });
}

export function openDatabase() {
    let request = window.indexedDB.open('target-vis');
    let db = null;
    request.onerror = function (event) {
        console.log(`打开IndexedDB失败${event}`);
    }
    request.onsuccess = function (event) {
        db = request.result;
        console.log('打开IndexedDB成功');
    }
    request.onupgradeneeded = function (event: any) {
        db = event.target.result;
        let store = null;
        if (!db.objectStoreNames.contains('target')) {
            store = db.createObjectStore('relation', { autoIncrement: true });
        }
    }
}