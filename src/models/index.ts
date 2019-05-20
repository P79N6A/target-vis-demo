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
    timeRange: number;
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

