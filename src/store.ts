import Vue from 'vue'
import Vuex, { StoreOptions } from 'vuex'
import { types, state } from '@/stores/types';
import { template } from '@/stores/template';
// import { parallelCoordinate } from '@/stores/parallel-coordinate';
import { FilterForm } from './models';
import { TargetingInfo } from './models/targeting';
import CommonService from '@/api/common.service';
import { getInitTargetingIds, transformPostData } from './utils';

const service = CommonService.getInstance();
let stateId: number = 0;
let requestId: number = 0;


Vue.use(Vuex)

export interface RootState {
  globalFilter: FilterForm | null;
  systemLoaded: boolean;
  detailLoaded: boolean;
  opLogs: any;
  opPointer: number;
  logs: any;
  logPointer: number;
}

const store: StoreOptions<RootState> = {
  state: {
    globalFilter: null,
    systemLoaded: false,
    detailLoaded: false,
    opLogs: [],
    opPointer: -1,
    logs: [],
    logPointer: -1
  },
  actions: {

    async loadDetailState({ rootGetters, commit }, payload: any) {
      let currentRequestId = ++stateId;
      commit('detailedLoadedMutation', false);
      let result: any = await service.getDetail(payload);
      if (currentRequestId != stateId) return;
      let realData: any = {};
      let portraitData = result.portrait;
      let dict = rootGetters['types/types']['prodType'];
      let sData = portraitData['product_type']
      sData.forEach((item: any) => {
        let result = dict.find((s: any) => s.value == item['product_type']);
        if (result != null) {
          item.name = result.label;
        }
      });
      realData['product_type'] = sData;
      dict = rootGetters['types/types']['siteSet'];
      sData = portraitData['site_set'];
      sData.forEach((item: any) => {
        let result = dict.find((s: any) => s.value == item['site_set']);
        if (result != null) {
          item.name = result.label;
        }
      });
      realData['site_set'] = sData;
      dict = rootGetters['types/types']['industry'];
      sData = portraitData['industry_id']
      sData.forEach((item: any) => {
        let result = dict.find((s: any) => s.value == item['industry_id']);
        if (result != null) {
          item.name = result.label;
        }
      });
      realData['industry_id'] = sData;
      dict = rootGetters['types/types']['platform'];
      sData = portraitData['ad_platform_type']
      sData.forEach((item: any) => {
        let result = dict.find((s: any) => s.value == item['ad_platform_type']);
        if (result != null) {
          item.name = result.label;
        } else { item.name = 'Unknown' }
      });
      realData['ad_platform_type'] = sData;
      commit('addDetailState', Object.assign({ portrait: realData, combination: result.ads }));
      commit('detailedLoadedMutation', true);
    },

    async loadAllState({ rootGetters, commit }, payload: any) {
      let currentRequestId = ++requestId;
      commit('systemLoadedMutation', false);
      commit('detailedLoadedMutation', false);
      let ids: TargetingInfo[] = [];
      if (payload.ids != null) ids = payload.ids;
      else ids = getInitTargetingIds(rootGetters['template/template'], rootGetters['globalFilter']);
      let filter = transformPostData(rootGetters['globalFilter'], rootGetters['types/types']);
      let result = await service.loadAllState(Object.assign({ filter, ids: ids.map(id => id.id), and: [], or: [], patterns: [] }));
      if (currentRequestId != requestId) return;

      let realData: any = {};
      let portraitData = result.portrait;
      let dict = rootGetters['types/types']['prodType'];
      let sData = portraitData['product_type']
      sData.forEach((item: any) => {
        let result = dict.find((s: any) => s.value == item['product_type']);
        if (result != null) {
          item.name = result.label;
        }
      });
      realData['product_type'] = sData;
      dict = rootGetters['types/types']['siteSet'];
      sData = portraitData['site_set'];
      sData.forEach((item: any) => {
        let result = dict.find((s: any) => s.value == item['site_set']);
        if (result != null) {
          item.name = result.label;
        }
      });
      realData['site_set'] = sData;
      dict = rootGetters['types/types']['industry'];
      sData = portraitData['industry_id']
      sData.forEach((item: any) => {
        let result = dict.find((s: any) => s.value == item['industry_id']);
        if (result != null) {
          item.name = result.label;
        }
      });
      realData['industry_id'] = sData;
      dict = rootGetters['types/types']['platform'];
      sData = portraitData['ad_platform_type']
      sData.forEach((item: any) => {
        let result = dict.find((s: any) => s.value == item['ad_platform_type']);
        if (result != null) {
          item.name = result.label;
        } else { item.name = 'Unknown' }
      });
      realData['ad_platform_type'] = sData;

      if (payload.type !== 'Init' && payload.newOp != null)
        commit('saveCurrentOP', payload.newOp);

      commit('loadAllStateMutation', Object.assign({
        type: payload.type,
        message: payload.type === 'Init' ? "" : payload.message,
        key: Date.now() + "",
        selectedCmb: null,
        filteredTargets: null,
        highlightedTarget: null,
        targets: ids,
        relationState: {
          data: result['relations'],
          controlState: { index: 'freq' }
        },
        combinationState: {
          data: result['combinations'],
          detailedData: null,
          controlState: {
            brushedCmbs: null,
            limit: 30,
            sorter: 'freq',
            orAndStr: JSON.stringify({ and: [], or: [] })
          }
        },
        portraitState: {
          data: result['portrait'],
          detailedData: null,
          controlState: {
            index: 'Freq',
            condition: 'site_set',
            types: '流量',
            mode: 'Global'
          }
        }
      }));
      commit('detailedLoadedMutation', true);
      commit('systemLoadedMutation', true);
    }
  },
  getters: {
    globalFilter(store) { return store.globalFilter },
    currentLog(store) {
      return store.logs[store.logPointer];
    },
    currentOpLog(store) {
      let currentLog = store.logs[store.logPointer];
      if (currentLog == null) return;
      let index = store.opLogs.findIndex((op: any) => currentLog.step === op.key);
      return Object.assign({}, store.opLogs[index]);
    },
    detailLoaded(store) { return store.detailLoaded },
    systemLoaded(store) { return store.systemLoaded },
    opLogs(store) { return store.opLogs },
  },
  mutations: {
    addDetailState(store, payload) {
      let currentLog = store.logs[store.logPointer];
      if (currentLog == null) return;
      let index = store.opLogs.findIndex((op: any) => currentLog.step === op.key);
      let currentState = Object.assign({}, store.opLogs[index]);
      currentState.combinationState.detailedData = payload.combination.ads;
      currentState.portraitState.detailedData = payload.portrait;
    },
    changeCurrentOpLogPointer(store, payload: string) {
      store.logs[store.logPointer].step = payload;
    },
    detailedLoadedMutation(store, payload: boolean) { store.detailLoaded = payload },
    systemLoadedMutation(store, payload: boolean) { store.systemLoaded = payload },
    loadAllStateMutation(store, payload: any) {
      store.opLogs.push(payload);
      // 每次插入新的数据时，应该判断是否只是增加了新的数据而不是直接替换
      // 如 1 -> 2 -> 3   或 1 -> new2
      if (store.logs.length === 0) {
        store.logs.push(Object.assign({
          step: payload.key,
          data: [Object.assign({ type: payload.type, key: payload.key, message: payload.message })]
        }));
        store.logPointer = 0;
      }
      else {
        let activeStep = store.logs[store.logPointer].step;
        let activeLogs = store.logs[store.logPointer].data.map((log: any) => Object.assign({}, log));
        store.logs.splice(store.logPointer + 1, store.logs.length - store.logPointer - 1);
        let activeStepIndex = activeLogs.findIndex((item: any) => item.key === activeStep);
        activeLogs.splice(activeStepIndex + 1, activeLogs.length - activeStepIndex - 1);
        activeLogs.push(Object.assign({ type: payload.type, key: payload.key, message: payload.message }));
        store.logs.push({ step: payload.key, data: activeLogs });
        store.logPointer = store.logs.length - 1;
      }
      store.opPointer = payload.key;
    },
    saveCurrentOP(store, payload: any) {
      let index = store.opLogs.findIndex((op: any) => op.key === payload.key);
      store.opLogs[index] = payload;
    },
    opPointerMutation(store, payload: any) {
      store.opPointer = payload;
    },
    resolveState(store, payload: any) {
      store.globalFilter = payload.globalFilter;
    },
    globalFilterMutation(store, payload: FilterForm) { store.globalFilter = Object.assign({}, payload) }
  },
  modules: {
    types,
    // relation,
    template,
    // combination,
    // parallelCoordinate,
    // portrait
  }
}

export default new Vuex.Store<RootState>(store);