import { RootState } from '@/store';
import { ActionTree, MutationTree, GetterTree, Module } from 'vuex';
import CommonService from '@/api/common.service';
import { CombinationOp } from '@/models';
import { TargetingInfo, CombinationData } from '@/models/targeting';
import { getInitTargetingIds, transformPostData } from '@/utils/index'

let service = CommonService.getInstance();

export interface CombinationState {

    opLogs: CombinationOp[];
    opPointer: string;
    loaded: boolean;
    detailedLoaded: boolean;
}

export const state: CombinationState = {

    opLogs: [],
    opPointer: "",
    loaded: false,
    detailedLoaded: false
}

const namespaced: boolean = true;

const actions: ActionTree<CombinationState, RootState> = {
    async createState({ commit, rootGetters }) {
        commit('loadedMutation', false);
        commit("opPointerMutation", "");
        let ids: TargetingInfo[] = [];
        ids = getInitTargetingIds(rootGetters['template/template']);
        let filter = transformPostData(rootGetters['globalFilter'], rootGetters['types/types']);
        // 开始发送请求
        let result: any = await service.getRelations('/calrelandcmbdata',
            Object.assign({ ids: ids.map((item: any) => item.id), or: [], and: [], patterns: [], filter }))
            .then(res => res.data);
        commit('opLogsMutation',
            Object.assign({
                type: 'Init', key: 'Init',
                orAndStr: JSON.stringify({ and: [], or: [] }),
                itemSize: 30, sorter: 'freq',
                selectedCmb: null,
                brushCmbs: null,
                activeId: null,
                filteredIds: null,
                ids: ids,
                data: result.cmbs
            }))
        commit('loadedMutation', true);
    },
    async addState({ commit, getters, rootGetters }, payload: any) {
        let ids = payload.ids;
        commit('loadedMutation', false);

        let filter = transformPostData(rootGetters['globalFilter'], rootGetters['types/types']);
        // 开始发送请求
        let result: any = await service.getRelations('/calrelandcmbdata',
            Object.assign({ ids: ids.map((item: any) => item.id), or: [], and: [], patterns: [], filter }))
            .then(res => res.data);

        // let result: any = await service.getRelations('/calrelandcmbdata',
        //     Object.assign({ ids: ids.map((item: any) => item.id), or: [], and: [], patterns: [], filter: {} }))
        //     .then(res => res.data)
        //     .then(res => res);

        // 此时新的状态获取成功
        commit('clearOpLogsMutation', getters['opPointer']);

        commit('opLogsMutation',
            Object.assign({
                type: 'Drilldown', key: 'Drilldown-' + payload.clicked.name,
                selectedCmb: null,
                brushCmbs: null,
                orAndStr: JSON.stringify({ and: [], or: [] }), sorter: 'freq', itemSize: 30, ids: ids, data: result.cmbs
            }));
        commit('loadedMutation', true);
    },
    async getDetail({ commit }, payload: any) {
        let result: any = await service.getDetailed()
            .then(res => res.data)
            .then(res => res);
        commit('detailedMutation', result.result.ads);
    }

};

const mutations: MutationTree<CombinationState> = {

    opLogsMutation(store, payload: CombinationOp) {
        if (payload.type === 'Init') store.opLogs = []
        store.opLogs.push(payload);
        store.opPointer = payload.key;
    },
    clearOpLogsMutation(store, payload: any) {
        let index = store.opLogs.findIndex(op => op.key === payload);
        store.opLogs.splice(index + 1, store.opLogs.length - index - 1);
    },
    saveStateMutation(store, payload: any) {
        let opPointer = payload.opPointer;
        let index = store.opLogs.findIndex(item => item.key === opPointer);
        store.opLogs.splice(index, 1, payload.op);
    },
    opPointerMutation(store, payload: string) {
        store.opPointer = payload;
    },
    loadedMutation(store, payload: boolean) { store.loaded = payload },
    detailedLoadedMutation(store, payload: boolean) { store.detailedLoaded = payload }
};

const getters: GetterTree<CombinationState, RootState> = {
    opLogs(store) { return store.opLogs },
    opPointer(store) { return store.opPointer },
    loaded(store) { return store.loaded },
    detailedLoaded(store) { return store.detailedLoaded }
};

export const combination: Module<CombinationState, RootState> = {
    namespaced,
    state,
    actions,
    getters,
    mutations
}