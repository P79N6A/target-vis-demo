import { TargetingInfo, RelationData, CombinationData } from './targeting';
import { sorter } from '@/charts/CombinationTargetChart';

export interface Types {
    siteSet: Array<{ value: string, label: string }>;
    platform: Array<{ value: string, label: string }>;
    prodType: Array<{ value: string, label: string }>;
    industry: Array<{ value: string, label: string }>;
}

export interface FilterForm {
    siteSet: Array<string>;
    platform: Array<string>;
    prodType: Array<string>;
    industry: Array<string>;
    click: { gte: number, lte: number | string };
    cpc: { gte: number, lte: number | string };
    ctr: { gte: number, lte: number | string };
    ecpm: { gte: number, lte: number | string };
    expo: { gte: number, lte: number | string };
    cost: { gte: number, lte: number | string };
}

export interface RelationPostData {
    filter: FilterForm | null;
    ids: Array<string>;
    or: Array<string>;
    and: Array<string>;
    patterns: Array<string>;
}

export interface RelationOp {
    key: string;
    type: 'Filter' | 'Drilldown' | 'Init';
    message: string;
    filteredIds: TargetingInfo[] | null;
    activeId: TargetingInfo | null;
    cmbs: TargetingInfo[] | null;
    ids: TargetingInfo[];
    data: RelationData[];
    index: string;
}

export interface CombinationOp {
    key: string;
    type: 'Drilldown' | 'Init';
    message: string;
    ids: TargetingInfo[];
    data: CombinationData[];
    orAndStr: string;
    activeId: TargetingInfo | null;
    filteredIds: TargetingInfo[] | null;
    selectedCmb: TargetingInfo[] | null;
    sorter: string;
    brushCmbs: any;
    itemSize: number;
}

export interface PortraitOp {
    key: string;
    condition: string;
    mode: string; // 全局或详情模式
    index: string; // 广告指标类型
    type: 'Drilldown' | 'Init';
    activeId: TargetingInfo | null;
    filteredIds: TargetingInfo[] | null;
    ids: TargetingInfo[];
    data: CombinationData[];
    detailedData: any;
}