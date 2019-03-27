import { TargetingInfo } from './targeting';

export interface CombinationData {
    rank?: number;
    click: number;
    cost: number;
    cpc: number;
    ctr: number;
    ecpm: number;
    expo: number;
    freq: number;
    cmbtargets: string;
}

export interface CombinationOp {
    key: string;
    type: 'Drilldown' | 'Init';
    message: string;

    targets: TargetingInfo[] | null;
    data: CombinationData[];
    highlightedTarget: TargetingInfo | null;
    // 当前哪些定向必含哪些定向可含
    orAndStr: string;
    filteredTargets: TargetingInfo[] | null;
    sorter: keyof CombinationData
    selectedCmb: TargetingInfo[] | null;
    brushedCmbs: any;
    limit: number;

    ids: TargetingInfo[];
    activeId: TargetingInfo | null;
    filteredIds: TargetingInfo[] | null;
    brushCmbs: any;
    itemSize: number;
}