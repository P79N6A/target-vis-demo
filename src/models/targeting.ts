

export interface TargetingTreeNode {
    id: string;
    name: string;
    level: number;
    parentId: string;
    parentName: string;
    freq: number;
    cost: number;
    children: Array<TargetingTreeNode>;
}

export interface TargetingInfo {
    id: string;
    name: string;
    level: number;
    cost: number;
    freq: number;
}

export interface RelationData {
    id: string;
    relation: Array<{ id: string; value: number }>;
}

export interface CombinationData {
    index?: number;
    click: number;
    cost: number;
    cpc: number;
    ctr: number;
    ecpm: number;
    expo: number;
    freq: number;
    cmbtargets: string;
}