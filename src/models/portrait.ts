import { TargetingInfo } from './targeting'
import { CombinationData } from './combination';

export interface PortraitOp {
    key: string;
    condition: string;
    mode: string; // 全局或详情模式
    index: string; // 广告指标类型
    type: 'Drilldown' | 'Init';
    types: string;
    activeId: TargetingInfo | null;
    filteredIds: TargetingInfo[] | null;
    ids: TargetingInfo[];
    data: CombinationData[];
    detailedData: any;
}