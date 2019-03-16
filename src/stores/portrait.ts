import { Module, GetterTree, ActionTree, MutationTree } from 'vuex';
import { RootState } from '@/store';
import CommonService from '@/api/common.service';
import { TargetingInfo } from '@/models/targeting';
import { getInitTargetingIds } from '@/utils';
import { PortraitOp } from '@/models';



let service = CommonService.getInstance();

export interface PortraitState {
    loaded: boolean;
    opLogs: PortraitOp[];
    opPointer: string;
}

const state: PortraitState = {
    loaded: false,
    opLogs: [],
    opPointer: ""
};

const namespaced: boolean = true;

const getters: GetterTree<PortraitState, RootState> = {
    loaded(store) { return store.loaded },
    opLogs(store) { return store.opLogs },
    opPointer(store) { return store.opPointer }
}

const actions: ActionTree<PortraitState, RootState> = {
    async createState({ commit, rootGetters }, payload: string) {
        commit('loadedMutation', false);
        commit("opPointerMutation", "");
        let ids: TargetingInfo[] = [];
        ids = getInitTargetingIds(rootGetters['template/template']);
        let result: any = await service.getPortrait(Object.assign({ ids: ids.map(item => item.id), adgroupids: "", condition: payload }))
            .then(res => res.data);
        let tmp = rootGetters['types/types']['siteSet'];
        result.forEach((item: any) => {
            let result = tmp.find((s: any) => s.value == item[payload]);
            if (result != null) {
                item.name = result.label;
            }
        });
        result = result.filter((item: any) => item.name != null);
        commit('opLogsMutation', Object.assign({
            data: result,
            activeId: null,
            filteredIds: null,
            condition: payload,
            mode: true,
            index: 'freq',
            ids: ids,
            type: 'Init',
            key: 'Init'
        }));
        commit('loadedMutation', true);
    },
    async changeState({ commit, rootGetters }, payload: any) {
        let condition = payload.condition;
        let ids: TargetingInfo[] = payload.ids;
        commit('loadedMutation', false);
        let result: any = await service.getPortrait(Object.assign({ ids: ids.map(item => item.id), adgroupids: "", condition: condition }))
            .then(res => res.data);
        let tmp = "";
        if (condition === "site_set") tmp = "siteSet";
        if (condition === "industry_id") tmp = "industry";
        if (condition === "product_type") tmp = "prodType";
        if (condition === "ad_platform_type") tmp = "platform";
        let process = rootGetters['types/types'][tmp];
        result.forEach((item: any) => {
            let result = process.find((a: any) => a.value == item[condition]);
            if (result != null) item.name = result.label;
            else item.name = "Unknown"
        });
        commit('changeStateMutation', result);
        commit('loadedMutation', true);
    },
    async addState({ commit, rootGetters, getters }, payload: any) {
        let ids: TargetingInfo[] = payload.ids;
        commit('loadedMutation', false);
        let result: any = await service.getPortrait(Object.assign({ ids: ids.map(item => item.id), adgroupids: "", condition: "site_set" }))
            .then(res => res.data);
        let siteSet = rootGetters['types/types']['siteSet'];
        result.forEach((item: any) => {
            let result = siteSet.find((s: any) => s.value == item['site_set']);
            if (result != null) item.name = result.label;
        });
        commit('clearOpLogsMutation', getters['opPointer']);
        commit('opLogsMutation', Object.assign({
            data: result, index: 'freq',
            mode: true,
            filteredIds: null,
            activeId: null,
            condition: payload,
            ids: ids, type: 'Drilldown', key: 'Drilldown-' + payload.clicked.name,
        }))
        commit('loadedMutation', true);
    },

};

const mutations: MutationTree<PortraitState> = {
    loadedMutation(store, payload: boolean) { store.loaded = payload },
    opPointerMutation(store, payload: string) { store.opPointer = payload },
    saveStateMutation(store, payload: PortraitOp) {
        let index = store.opLogs.findIndex(op => op.key === payload.key);
        store.opLogs.splice(index, 1, payload);
    },
    changeStateMutation(store, payload: any) {
        let currentOpIndex = store.opLogs.findIndex(op => op.key === store.opPointer);
        store.opLogs[currentOpIndex].data = payload;
    },
    clearOpLogsMutation(store, payload: string) {
        let index = store.opLogs.findIndex(op => op.key === payload);
        store.opLogs.splice(index + 1, store.opLogs.length - index - 1);
    },
    opLogsMutation(store, payload: PortraitOp) {
        if (payload.key === 'Init') store.opLogs = [];
        store.opLogs.push(payload);
        store.opPointer = payload.key;
    }
};

export const portrait: Module<PortraitState, RootState> = {
    namespaced,
    getters,
    mutations,
    actions,
    state
}