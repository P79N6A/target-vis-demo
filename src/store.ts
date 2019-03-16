import Vue from 'vue'
import Vuex, { StoreOptions } from 'vuex'
import { combination } from '@/stores/combination';
import { types } from '@/stores/types';
import { relation } from '@/stores/relation';
import { template } from '@/stores/template';
import { parallelCoordinate } from '@/stores/parallel-coordinate';
import { portrait } from '@/stores/portrait';
import { FilterForm } from './models';
import { TargetingInfo } from './models/targeting';
Vue.use(Vuex)

export interface RootState {
  globalFilter: FilterForm | null,
}

const store: StoreOptions<RootState> = {
  state: {
    globalFilter: null,
  },
  getters: {
    globalFilter(store) { return store.globalFilter },
  },
  mutations: {
    resolveState(store, payload: any) {
      store.globalFilter = payload.globalFilter;
    },
    globalFilterMutation(store, payload: FilterForm) { store.globalFilter = Object.assign({}, payload) }
  },
  modules: {
    types,
    relation,
    template,
    combination,
    parallelCoordinate,
    portrait
  }
}

export default new Vuex.Store<RootState>(store);