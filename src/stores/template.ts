import { RootState } from '@/store';
import { ActionTree, MutationTree, GetterTree, Module } from 'vuex';
import CommonService from '@/api/common.service';
import { RelationPostData } from '@/models';
import { RelationData, TargetingTreeNode } from '@/models/targeting';
import { buildTree, transformPostData } from '@/utils/index'


let service = CommonService.getInstance();

export interface TemplateState {
    template: TargetingTreeNode | null;
    templateLoaded: boolean;
}

export const state: TemplateState = {
    template: null,
    templateLoaded: false
}

const namespaced: boolean = true;

const actions: ActionTree<TemplateState, RootState> = {
    // 当获取模板成功后,此时应该是系统开开被启动
    // 以此为信号,开始为各个视图发送数据
    async getTemplateAction({ commit, rootGetters }, payload: any) {
        commit('templateLoadedMutation', false);
        let filter = transformPostData(payload, rootGetters['types/types']);
        let result: any = await service.loadTemplate(Object.assign({ filter }));
        if (result == null) {
            alert("定向模板加载出错");
            return;
        }
        commit('templateMutation', result);
        commit('templateLoadedMutation', true);
    }
};

const mutations: MutationTree<TemplateState> = {
    resolveTemplateMutation(store, payload: TargetingTreeNode) {
        store.templateLoaded = true;
        store.template = payload;
    },
    templateMutation(store, payload: TargetingTreeNode[]) {
        let root = buildTree(payload);
        store.template = root;
    },
    templateLoadedMutation(store, payload: boolean) {
        store.templateLoaded = payload;
    }
};

const getters: GetterTree<TemplateState, RootState> = {
    template(store) { return store.template },
    templateLoaded(store) { return store.templateLoaded }
};

export const template: Module<TemplateState, RootState> = {
    namespaced,
    state,
    actions,
    getters,
    mutations
}