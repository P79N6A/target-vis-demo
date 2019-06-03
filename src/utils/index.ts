import { TargetingTreeNode, TargetingInfo } from '@/models/targeting';
import { FilterForm, RelationPostData, Types } from '@/models';
import moment from 'moment';

// 依据返回的定向节点数组，构造定向模板树
export function buildTree(raw: TargetingTreeNode[]): TargetingTreeNode {
    let root: TargetingTreeNode | null = null;
    let map = new Map<string, TargetingTreeNode>();
    for (let node of raw) {
        map.set(node.id, Object.assign({}, { children: [], cost: node.cost, freq: node.freq, id: node.id, name: node.name, parentId: node.parentId, parentName: node.parentName, level: node.level }));
    }
    for (let node of map.values()) {
        // 找到根节点
        if (node.parentId == "") root = node;
        let parent = map.get(node.parentId);
        if (parent != null) {
            if (parent.children == null) parent.children = [];
            parent.children.push(node);
        }
    }
    if (root == null) return Object.assign({});
    return root;
}



export function getTreeNodes(root: TargetingTreeNode, targets: TargetingInfo[], freq: any) {
    let result = root.children.map(item => Object.assign({ freq: item.freq, id: item.id, level: item.level, name: item.name, isLeaf: false }));
    let tmpTargets = targets.map((item: any) => Object.assign({ freq: item.freq, id: item.id, level: item.level, name: item.name, parentId: item.parentId, isLeaf: true, selected: item.selected }));
    tmpTargets = tmpTargets.concat(result);
    tmpTargets.forEach((target: any) => {
        let parent: any = tmpTargets.find(t => t.id === target.parentId);
        if (parent == null) return;
        if (parent.children == null) {
            parent.children = [];
            parent.isLeaf = false;
        }
        parent.children.push(target);
    });

    return tmpTargets.filter(t => t.level === 1);
}


export function getInitTargetingIds(tree: TargetingTreeNode, freqLimit: any, filters: string[] = ['6', '7', '8']) {
    let ids: any[] = [];
    let freq = freqLimit.freq;
    let [lower, upper] = freq;
    upper = upper === 'MAX' ? Number.MAX_SAFE_INTEGER : upper;
    tree.children.forEach((node: any) => {
        node.children.forEach((n: any) => {
            let tmpTarget = Object.assign({ cost: n.cost, freq: n.freq, level: n.level, parentId: n.parentId, id: n.id, name: n.name });
            if ((tmpTarget.freq < lower || n.freq > upper) || filters.indexOf(tmpTarget.parentId) !== -1) tmpTarget.selected = false;
            else tmpTarget.selected = true;
            ids.push(tmpTarget);
        });
    });
    return ids;
}

export function getTargets(tree: TargetingTreeNode, ids: string[]) {
    let result: Array<TargetingInfo> = [];
    for (let id of ids) {
        let root = tree.children.find((t) => t.id === id[0]);
        if (root == null) return;
        let strIndex = 1;
        while (strIndex < id.length) {
            root = root.children.find((t: any) => t.id === id.substr(0, strIndex + 2))
            if (root == null) break;
            strIndex = strIndex + 2;
        }
        if (root != null)
            result.push(Object.assign({}, { cost: root.cost, id: root.id, name: root.name, level: root.level, freq: root.freq }));
    }
    return result;
}

export function getNextLevelTargets(template: TargetingTreeNode, parentId: string, globalFilter: any) {
    let freq = globalFilter.freq;
    let [lower, upper] = freq;
    upper = upper === 'MAX' ? Number.MAX_SAFE_INTEGER : upper;
    let root = template.children.find((t) => t.id === parentId[0]);
    let len = 1;
    while (root != null && root.id != parentId) {
        len = len + 2;
        root = root.children.find((t) => t.id === parentId.substr(0, len))
    }
    if (root == null) return [];

    return root.children.map(r => {
        let tmp = Object.assign({ parentId: r.parentId, id: r.id, name: r.name, level: r.level, freq: r.freq, cost: r.cost });
        if (tmp.freq < lower || tmp.freq > upper) tmp.selected = false;
        else tmp.selected = true;
        return tmp;
    });
}

export function filter2Form(str: string, types: any) {
    let filter = JSON.parse(str);
    let realForm: any = {};
    let [lower, upper,] = filter.ctr;
    filter.ctr = [lower * 100, upper * 100];
    let keyGroup1 = ['click', 'cost', 'expo', 'ecpm', 'cpc', 'ctr', 'freq'];
    keyGroup1.forEach((key: string) => {
        realForm[key] = []
        let [lower, upper] = filter[key];
        upper === 'MAX' ? upper : +upper;
        realForm[key] = [+lower, upper];
    });
    let map: any = {
        'site_set': 'siteSet',
        'industry_id': 'industry',
        'ad_platform_type': 'platform',
        'product_type': 'prodType'
    };
    let keys = ["site_set", "industry_id", "ad_platform_type", "product_type"];

    keys.forEach((key: string) => {
        if (filter[key] == null) realForm[map[key]] = [];
        if (filter[key] != null && types != null) {
            let result: any[] = [];
            filter[key].forEach((k: number) => {
                let idx = types[map[key]].findIndex((item: any) => item.value === k);
                if (idx === -1) return;
                result.push(types[map[key]][idx].label);
            });
            realForm[map[key]] = result;
        }
    }
    );
    return realForm;
}

export function form2Filter(form: any, types: any) {
    let realFilter: any = {};

    let [lower, upper,] = form.ctr;
    form.ctr = [+parseFloat((lower / 100) + "").toFixed(2), +parseFloat((upper / 100) + "").toFixed(2)];
    let keyGroup1 = ['click', 'ctr', 'cpc', 'expo', 'cost', 'ecpm', 'freq'];
    keyGroup1.forEach((key: string) => {
        realFilter[key] = []
        let [lower, upper,] = form[key];
        upper = upper === 'MAX' ? upper : +upper;
        realFilter[key] = [+lower, upper];
    });
    let keyGroup2 = ['siteSet', 'industry', 'platform', 'prodType'];
    let map: any = {
        'siteSet': 'site_set',
        'industry': 'industry_id',
        'platform': 'ad_platform_type',
        'prodType': 'product_type'
    };
    keyGroup2.forEach((key: string) => {
        if (form[key] == null || form[key].length === 0) return;
        let result: any[] = [];
        form[key].forEach((k: string) => {
            let idx = types[key].findIndex((item: any) => item.label === k);
            if (idx === -1) return;
            result.push(types[key][idx].value);
        });
        realFilter[map[key]] = result;
    });
    return realFilter;
}


/**
 * 将全局筛选面板值转换为filter参数
 * @param globalFilter 全局筛选面板的值
 * @param types 流量、商品类型、平台等具体值
 */
export function transformPostData(globalFilter: FilterForm, types: Types) {
    let filter: any = globalFilter;
    return filter;
}

export function transformPortraitResult(types: any, data: any) {
    let map: any = {
        'siteSet': 'site_set',
        'platform': 'ad_platform_type',
        'prodType': 'product_type',
        'industry': 'industry_id'
    };
    Object.keys(data).forEach(key => {
        let dict = types[key];
        let tmpData = data[key];
        tmpData.forEach((item: any) => {
            let result = dict.find((s: any) => s.value == item[map[key]]);
            if (result != null) {
                item.name = result.label;
            } else {
                item.name = "Unknown"
            }
        });
    });
}