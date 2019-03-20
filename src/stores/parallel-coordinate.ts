import { RootState } from '@/store';
import { ActionTree, MutationTree, GetterTree, Module } from 'vuex';
import { TargetingInfo, CombinationData } from '@/models/targeting';
import fakeData from '@/data/ad.json';
import CommonService from '@/api/common.service';
let service = CommonService.getInstance();
export interface ParallelCoordinateState {
    data: any[];
    detailedData: any;
    detailedLoaded: boolean;
    mode: string;
    indexes: string[];
    loaded: boolean;
    selectedCmb: any | null;
    brushCmbs: any | null;
}

export const state: ParallelCoordinateState = {
    data: [],
    detailedLoaded: true,
    loaded: false,
    mode: 'Global',
    indexes: [],
    selectedCmb: null,
    brushCmbs: null,
    detailedData: null
}

const namespaced: boolean = true;

const actions: ActionTree<ParallelCoordinateState, RootState> = {
    async getDetailAction({ commit, getters }, payload: any) {
        commit('detailedLoadedMutation', false);
        // setTimeout(() => {
        //     commit('addDetailState', Object.assign({ detailedData: fakeData.ads }));
        //     commit('detailedLoadedMutation', true);
        // }, 1500)
        let result: any = await service.getAdsData(payload)
            .then(res => res.data);
        commit('addDetailState', Object.assign({ detailedData: result.ads }));
        commit('detailedLoadedMutation', true)
    }
};

const mutations: MutationTree<ParallelCoordinateState> = {
    indexesMutation(store, payload: string[]) { store.indexes = payload },
    dataMutation(store, payload: any[]) { store.detailedData = payload },
    modeMutation(store, payload: string) { store.mode = payload },
    detailedLoadedMutation(store, payload: boolean) { store.detailedLoaded = payload },
    addState(store, payload: ParallelCoordinateState) {
        store.data = payload.data;
        store.indexes = payload.indexes;
        store.selectedCmb = payload.selectedCmb;
        store.brushCmbs = payload.brushCmbs;
    },
    addDetailState(store, payload: ParallelCoordinateState) {
        store.detailedData = payload.detailedData;
    }
};

const getters: GetterTree<ParallelCoordinateState, RootState> = {
    allState(store) { return Object.assign({ detailedData: store.detailedData, brushCmbs: store.brushCmbs, data: store.data, selectedCmb: store.selectedCmb, mode: store.mode, indexes: store.indexes }) },
    selectedCmb(store) { return store.selectedCmb },
    detailedLoaded(store) { return store.detailedLoaded }
};

export const parallelCoordinate: Module<ParallelCoordinateState, RootState> = {
    namespaced,
    state,
    actions,
    getters,
    mutations
}