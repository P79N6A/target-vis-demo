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
    tree.children.forEach((node: any) => {
        node.children.forEach((n: any) => {
            let tmpTarget = Object.assign({ cost: n.cost, freq: n.freq, level: n.level, parentId: n.parentId, id: n.id, name: n.name });
            if ((tmpTarget.freq < freq.lower || n.freq > freq.upper) || filters.indexOf(tmpTarget.parentId) !== -1) tmpTarget.selected = false;
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
    let root = template.children.find((t) => t.id === parentId[0]);
    let len = 1;
    while (root != null && root.id != parentId) {
        len = len + 2;
        root = root.children.find((t) => t.id === parentId.substr(0, len))
    }
    if (root == null) return [];

    return root.children.map(r => {
        let tmp = Object.assign({ parentId: r.parentId, id: r.id, name: r.name, level: r.level, freq: r.freq, cost: r.cost });
        if (tmp.freq < freq.lower || tmp.freq > freq.upper) tmp.selected = false;
        else tmp.selected = true;
        return tmp;
    });
}


/**
 * 将全局筛选面板值转换为filter参数
 * @param globalFilter 全局筛选面板的值
 * @param types 流量、商品类型、平台等具体值
 */
export function transformPostData(globalFilter: FilterForm, types: Types) {
    let filter: any = {};
    let indexes = ['click', 'ctr', 'cpc', 'ecpm', 'cost', 'expo'];
    indexes.forEach((key: string) => {
        let lower = (globalFilter as any)[key]['lower'];
        let upper = (globalFilter as any)[key]['upper'];
        if (key === 'ctr') {
            lower = parseFloat("" + (lower / 100)).toFixed(2);
            upper = parseFloat("" + (upper / 100)).toFixed(2);
        }
        filter[key] = Object.assign({ lower: +lower, upper: +upper });
    });
    // filter.click = globalFilter.click;
    // filter.ctr = globalFilter.ctr;
    // filter.cpc = globalFilter.cpc;
    // filter.ecpm = globalFilter.ecpm;
    // filter.cost = globalFilter.cost;
    // filter.expo = globalFilter.expo;
    filter.timerange = globalFilter.timeRange === 7 ?
        [moment().subtract(7, 'd').format("YYYYMMDD"), moment().subtract(1, 'd').format("YYYYMMDD")] :
        [moment().subtract(30, 'd').format("YYYYMMDD"), moment().subtract(1, 'd').format("YYYYMMDD")];
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