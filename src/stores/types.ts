import { RootState } from '@/store';
import { ActionTree, MutationTree, GetterTree, Module } from 'vuex';
import CommonService from '@/api/common.service';
import { Types } from '@/models';
import typeData from '@/data/fake.json';

let service = CommonService.getInstance();

export interface TypesState {
    types: Types | null;
    typesLoaded: boolean;
}

export const state: TypesState = {
    types: null,
    typesLoaded: false
}

const namespaced: boolean = true;

const actions: ActionTree<TypesState, RootState> = {
    async getTypesAction({ commit }) {
        commit('typesLoadedMutation', false);
        // let result: any = await service.getTypes()
        //     .then(res => res.data)
        //     .then((res: any) => res.result);
        commit('typesMutation', typeData);
        commit('typesLoadedMutation', true);
    }
};

const mutations: MutationTree<TypesState> = {
    typesMutation(store, payload: any) {
        (store.types as any) = {};
        (store.types as any).siteSet = payload['site_set'];
        (store.types as any).platform = payload['ad_platform_type'];
        (store.types as any).industry = payload['industry_id'];
        (store.types as any).prodType = payload['product_type'];
    },
    typesLoadedMutation(store, payload: boolean) { store.typesLoaded = payload }
};

const getters: GetterTree<TypesState, RootState> = {
    types(store) { return store.types },
    typesLoaded(store) { return store.typesLoaded }
};

export const types: Module<TypesState, RootState> = {
    namespaced,
    state,
    actions,
    getters,
    mutations
}