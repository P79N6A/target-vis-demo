import { RootState } from '@/store';
import { ActionTree, MutationTree, GetterTree, Module } from 'vuex';
import CommonService from '@/api/common.service';
import { RelationOp } from '@/models';
import { RelationData, TargetingInfo } from '@/models/targeting';
import { getInitTargetingIds, transformPostData } from '@/utils/index'


let service = CommonService.getInstance();

export interface RelationState {
    opLogs: RelationOp[];
    opPointer: string;
    loaded: boolean;
}

export const state: RelationState = {
    opLogs: [],
    opPointer: "",
    loaded: false
}

const namespaced: boolean = true;

const actions: ActionTree<RelationState, RootState> = {

    async createState({ rootGetters, commit }) {
        // 当template改变时,之前所有状态都不存在了,应该重新请求
        commit('opPointerMutation', "");
        // 开始发送请求
        commit('loadedMutation', false);
        let ids: TargetingInfo[] = [];
        ids = getInitTargetingIds(rootGetters['template/template']);

        let filter = transformPostData(rootGetters['globalFilter'], rootGetters['types/types']);
        let result: any = await service.getRelations('/calrelandcmbdata',
            Object.assign({ ids: ids.map((item: any) => item.id), or: [], and: [], patterns: [], filter }))
            .then(res => res.data)
            .then(res => res);
        commit('opLogsMutation',
            Object.assign({
                type: 'Init',
                key: 'Init',
                index: 'freq',
                filteredIds: null,
                activeId: null,
                ids: ids,
                cmbs: null,
                message: '初始状态',
                data: result.relations
            }))
        commit('loadedMutation', true);
    },

    async addState({ commit, getters }, payload: any) {
        let ids = payload.drilldown.ids;
        // 开始发送请求
        commit('loadedMutation', false);
        let result: any = await service.getRelations('/calrelandcmbdata',
            Object.assign({ ids: ids.map((item: any) => item.id), or: [], and: [], patterns: [], filter: {} }))
            .then(res => res.data)
            .then(res => res);
        commit('clearOpLogsMutation', getters['opPointer']);
        // 进行下钻并成功获取到了数据
        commit('opLogsMutation', Object.assign({
            key: 'Drilldown-' + payload.drilldown.clicked.name,
            type: 'Drilldown',
            data: result.relations,
            index: 'freq',
            activeId: null,
            filteredIds: null,
            cmbs: null,
            ids: ids,
            message: payload.drilldown.clicked.name
        }));
        commit('loadedMutation', true);
    }
};

const mutations: MutationTree<RelationState> = {

    opLogsMutation(store, payload: RelationOp) {
        if (payload.type === 'Init') store.opLogs = [];
        store.opLogs.push(payload);
        store.opPointer = payload.key;
    },
    saveStateMutation(store, op: RelationOp) {
        let index = store.opLogs.findIndex(item => item.key === op.key);
        store.opLogs.splice(index, 1, op);
    },
    clearOpLogsMutation(store, pointer: string) {
        let index = store.opLogs.findIndex(op => op.key === pointer);
        store.opLogs.splice(index + 1, store.opLogs.length - index - 1);
    },
    opPointerMutation(store, payload: string) {
        store.opPointer = payload;
    },
    loadedMutation(store, payload: boolean) { store.loaded = payload },
    allMutation(store, payload: RelationState) {
        store.opLogs = payload.opLogs;
        store.opPointer = payload.opPointer;
    }
};

const getters: GetterTree<RelationState, RootState> = {

    opLogs(store) { return store.opLogs },
    opPointer(store) { return store.opPointer },
    loaded(store) { return store.loaded }
};

export const relation: Module<RelationState, RootState> = {
    namespaced,
    state,
    actions,
    getters,
    mutations
}