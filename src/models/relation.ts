import { TargetingInfo } from './targeting';

export interface RelationData {
    id: string;
    relation: Array<Record<string, string>>;
}

export interface RelationOp {
    // 当前操作的标识符,全视图一致
    key: string;
    // 当前操作的类型
    type: 'Drilldown' | 'Init';
    // 当前操作的相关信息
    message: string;
    // 被筛选掉的定向
    filteredTargets: TargetingInfo[] | null;
    // 被高亮的定向
    highlightedTarget: TargetingInfo | null;
    // 当前视图需要展示的定向
    targets: TargetingInfo[] | null;
    // 当前操作相关数据
    data: RelationData[];
    // 当前关系图展示的具体指标
    index: 'Freq' | 'Cost';
    // 当前被选中的定向组合模式
    selectedCmb: TargetingInfo[] | null;

    filteredIds: TargetingInfo[] | null;
    activeId: TargetingInfo | null;
    cmbs: TargetingInfo[] | null;
    ids: TargetingInfo[];
}