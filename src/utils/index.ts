import { TargetingTreeNode, TargetingInfo } from '@/models/targeting';
import { FilterForm, RelationPostData, Types } from '@/models';

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

export function getTreeNodes(root: TargetingTreeNode, freqLimit: any) {
    let queue: TargetingTreeNode[] = [];
    queue.push(root);
    while (queue.length !== 0) {
        let front = queue.shift();
        if (front == null) return [];
        if (front.level > 1 && (front.freq < freqLimit.lower || front.freq > freqLimit.upper)) {
            (front as any).disabled = true;
        }
        let children = front.children;
        for (let child of children) {
            queue.push(child);
        }
    }
    return root.children;
}

export function getInitTargetingIds(tree: TargetingTreeNode, freqLimit: any, filters: string[] = ['6', '7', '8']) {
    let ids: any[] = [];
    let freq = freqLimit.freq;
    tree.children.forEach((node: any) => {
        if (filters.indexOf(node.id) !== -1) return;
        node.children.forEach((n: any) => {
            if (n.freq >= freq.lower)
                ids.push(Object.assign({}, { id: n.id, name: n.name, level: n.level, freq: n.freq, cost: n.cost }))
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
    let result: Array<TargetingInfo> = [];
    let freq = globalFilter.freq;
    let root = template.children.find((t) => t.id === parentId[0]);
    let len = 1;
    while (root != null && root.id != parentId) {
        len = len + 2;
        root = root.children.find((t) => t.id === parentId.substr(0, len))
    }
    if (root == null) return [];
    return root.children.map(r => Object.assign({ id: r.id, name: r.name, level: r.level, freq: r.freq, cost: r.cost }))
        .filter(t => t.freq >= freq.lower);
}

export function transformPostData(globalFilter: FilterForm, types: Types) {
    let filter: any = {};
    filter.click = globalFilter.click;
    filter.ctr = globalFilter.ctr;
    filter.cpc = globalFilter.cpc;
    filter.ecpm = globalFilter.ecpm;
    filter.cost = globalFilter.cost;
    filter.expo = globalFilter.expo;
    if (globalFilter.siteSet.length !== 0)
        filter.site_set = globalFilter.siteSet.map(s => {
            let index: number = types.siteSet.findIndex(item => item.label === s);
            return types.siteSet[index].value;
        });

    if (globalFilter.platform.length !== 0)
        filter.ad_platform_type = globalFilter.platform.map(p => {
            let index: number = types.platform.findIndex(item => item.label === p);
            return types.platform[index].value;
        });

    if (globalFilter.prodType.length !== 0)
        filter.product_type = globalFilter.prodType.map(p => {
            let index: number = types.prodType.findIndex(item => item.label === p);
            return types.prodType[index].value;
        });

    if (globalFilter.industry.length !== 0)
        filter.industry_id = globalFilter.industry.map(p => {
            let index: number = types.industry.findIndex(item => item.label === p);
            return types.industry[index].value;
        });
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