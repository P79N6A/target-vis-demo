import Vue from 'vue'
import Vuex, { StoreOptions } from 'vuex'
import { types, state } from '@/stores/types';
import { template } from '@/stores/template';
// import { parallelCoordinate } from '@/stores/parallel-coordinate';
import { FilterForm } from './models';
import { TargetingInfo } from './models/targeting';
import CommonService from '@/api/common.service';
import { getInitTargetingIds, transformPostData, transformPortraitResult } from './utils';

const service = CommonService.getInstance();
let stateId: number = 0;
let requestId: number = 0;
let targetFreqId: number = 0;


Vue.use(Vuex)

export interface RootState {
  systemLoaded: boolean;
  detailLoaded: boolean;
  targetFreqLoaded: boolean;
  opLogs: any;
  opPointer: number;
  logs: any;
  logPointer: number;
}

const store: StoreOptions<RootState> = {
  state: {
    systemLoaded: false,
    detailLoaded: false,
    targetFreqLoaded: false,
    opLogs: [],
    opPointer: -1,
    logs: [],
    logPointer: -1
  },
  actions: {

    async loadTargetFreq({ rootGetters, commit }, payload: any) {
      let currentRequestId = ++targetFreqId;
      commit('targetFreqLoadedMutation', false);
      let filter = transformPostData(JSON.parse(payload.globalFilter), rootGetters['types/types']);
      let map: any = {
        'site_set': 'siteSet',
        'ad_platform_type': 'platform',
        'industry_id': 'industry',
        'product_type': 'prodType'
      };
      let list = rootGetters['types/types'][map[payload.condition]].map((item: any) => item.value);
      if (filter[payload.condition] != null) {
        let filterCondition = filter[payload.condition];
        list = list.filter((l: any) => filterCondition.indexOf(l) !== -1);
      }
      let result: any = await service.getTargetFreq(Object.assign({
        ids: payload.ids,
        adgroupids: "",
        filter,
        condition: payload.condition,
        list: list
      }));

      if (currentRequestId != targetFreqId) return;
      setTimeout(() => {
        commit('addTargetFreq', Object.assign({
          data: result.data.data,
          condition: payload.condition
        }));
        commit('targetFreqLoadedMutation', true);
      }, 0);
    },


    async loadDetailState({ rootGetters, commit }, payload: any) {
      let currentRequestId = ++stateId;
      commit('detailedLoadedMutation', false);
      let filter = transformPostData(JSON.parse(payload.globalFilter), rootGetters['types/types']);
      let result: any = await service.getDetail(Object.assign({
        ids: [],
        adgroupids: payload.adgroupids,
        filter,
      }));
      if (currentRequestId != stateId) return;
      if (result == null) {
        alert('详情数据加载出错!');
        commit('detailedLoadedMutation', true);
        return;
      }
      transformPortraitResult(rootGetters['types/types'], result.portrait);
      commit('addDetailState', Object.assign({ portrait: result.portrait, combination: result.ads }));
      commit('detailedLoadedMutation', true);
    },


    async changeCurrentLogPointer({ commit, getters, rootGetters }, payload: number) {
      commit('systemLoadedMutation', false);
      // 切换状态时需要判断是否有新的全局条件
      // 即从currentLogPointer - payload 之间是否有新全局筛选条件
      let key = getters['logs'][payload].key;
      let index = getters['opLogs'].findIndex((op: any) => key === op.key);
      let nextState = getters['opLogs'][index];
      let currentState = getters['currentOpLog'];
      let oldGlobalFilter = currentState.globalFilterState;
      let newGlobalFilter = nextState.globalFilterState;
      let globalFilter = JSON.parse(nextState.globalFilterState);
      let result: any = null;
      if (oldGlobalFilter !== newGlobalFilter) {
        let filter = transformPostData(globalFilter, rootGetters['types/types']);
        result = await service.loadTemplate(Object.assign({ filter }));
        commit('template/templateMutation', result);
      }
      setTimeout(() => {
        commit('changeCurrentLogPointer', payload);
      }, 50);
      setTimeout(() => {
        commit('systemLoadedMutation', true);
      }, 50);
    },

    async loadAllState({ rootGetters, commit }, payload: any) {
      let currentRequestId = ++requestId;
      // 每次发送前将所有加载状态设置为false
      commit('systemLoadedMutation', false);
      commit('detailedLoadedMutation', false);
      commit('targetFreqLoadedMutation', false);

      let ids: TargetingInfo[] = [];
      if (payload.ids != null) ids = payload.ids;
      else ids = getInitTargetingIds(rootGetters['template/template'], JSON.parse(payload.globalFilterState));
      let filter = transformPostData(JSON.parse(payload.globalFilterState), rootGetters['types/types']);
      let result = await service.loadAllState(
        Object.assign({
          filter,
          ids: ids.filter((id: any) => id.selected === true).map(id => id.id),
          and: [],
          or: [],
          patterns: []
        }));
      // 如果发出了多次请求,那么根据currentRequestId与requestId判断是否为想要接收的请求
      if (currentRequestId != requestId) return;
      // 数据加载出错
      if (result == null) {
        alert("数据加载出错，请重试");
        return;
      }
      // 将广告主画像数据转换
      transformPortraitResult(rootGetters['types/types'], result.portrait);
      if (payload.newOp != null)
        commit('saveCurrentOp', payload.newOp);

      commit('loadAllStateMutation', Object.assign({
        type: payload.type,
        message: payload.type === 'Init' ? "改变全局筛选条件" : payload.message,
        key: Date.now() + "",
        selectedCmb: null,
        highlightedTarget: null,
        targets: ids,
        globalFilterState: payload.globalFilterState,
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
            types: 'siteSet',
            mode: 'Global'
          }
        }
      }));
      setTimeout(() => {
        commit('detailedLoadedMutation', true);
        commit('systemLoadedMutation', true);
        commit('targetFreqLoadedMutation', true);
      }, 50);
    }
  },
  getters: {
    targetFreqLoaded(store) { return store.targetFreqLoaded },
    // currentLogs(store) {
    //   return store.logs
    // },
    logs(store) {
      return store.logs;
    },
    logPointer(store) {
      return store.logPointer;
    },
    currentOpLog(store) {
      if (store.logPointer === -1) return null;
      let key = store.logs[store.logPointer].key;
      let index = store.opLogs.findIndex((op: any) => key === op.key);
      return Object.assign({}, store.opLogs[index]);
    },
    detailLoaded(store) { return store.detailLoaded },
    systemLoaded(store) { return store.systemLoaded },
    opLogs(store) { return store.opLogs },
  },
  mutations: {
    addTargetFreq(store, payload) {

      let map: any = {
        'site_set': 'siteSet',
        'ad_platform_type': 'platform',
        'industry_id': 'industry',
        'product_type': 'prodType'
      };
      let key = store.logs[store.logPointer].key;
      let index = store.opLogs.findIndex((op: any) => key === op.key);
      let currentState = Object.assign({}, store.opLogs[index]);
      let data = payload.data;
      let condition = payload.condition;

      currentState.portraitState.data[map[condition]].forEach((item: any) => {
        let id = item[condition];
        let pattern = data[id];
        item.pattern = pattern;
      });
    },
    addDetailState(store, payload) {
      let key = store.logs[store.logPointer].key;
      let index = store.opLogs.findIndex((op: any) => key === op.key);
      let currentState = Object.assign({}, store.opLogs[index]);
      currentState.combinationState.detailedData = payload.combination.ads;
      currentState.portraitState.detailedData = payload.portrait;
    },
    changeCurrentLogPointer(store, payload: number) {
      store.logPointer = payload;
    },
    targetFreqLoadedMutation(store, payload: boolean) { store.targetFreqLoaded = payload },
    detailedLoadedMutation(store, payload: boolean) { store.detailLoaded = payload },
    systemLoadedMutation(store, payload: boolean) { store.systemLoaded = payload },
    loadAllStateMutation(store, payload: any) {
      let time = new Date(+payload.key);
      let timeStr = `操作时间: ${time.getHours()}:${time.getMinutes()}:${time.getSeconds()}`;
      store.opLogs.push(payload);
      store.logs.splice(store.logPointer + 1);
      let len = store.logs.push(Object.assign({
        type: payload.type,
        key: payload.key,
        time: timeStr,
        message: payload.message
      }));
      store.logPointer = len - 1;
      if (store.opLogs.length != 0)
        store.opLogs = store.opLogs.filter((op: any) => store.logs.findIndex((log: any) => log.key === op.key) !== -1);
      // 每次插入新的数据时，应该判断是否只是增加了新的数据而不是直接替换
      // 如 1 -> 2 -> 3   或 1 -> new2
      // if (store.logs.length === 0 || payload.type === 'Init') {
      //   let len = store.logs.push(Object.assign({
      //     step: payload.key,
      //     data: [Object.assign({ type: payload.type, key: payload.key, message: payload.message })]
      //   }));
      //   store.logPointer = len - 1
      // }
      // else {

      //   let activeStep = store.logs[store.logPointer].step;
      //   let activeLogs = store.logs[store.logPointer].data.map((log: any) => Object.assign({}, log));
      //   store.logs.splice(store.logPointer + 1, store.logs.length - store.logPointer - 1);
      //   let activeStepIndex = activeLogs.findIndex((item: any) => item.key === activeStep);
      //   activeLogs.splice(activeStepIndex + 1, activeLogs.length - activeStepIndex - 1);
      //   activeLogs.push(Object.assign({ type: payload.type, key: payload.key, message: payload.message }));
      //   store.logs.push({ step: payload.key, data: activeLogs });
      //   store.logPointer = store.logs.length - 1;
      // }
      // store.opPointer = payload.key;
    },
    saveCurrentOp(store, payload: any) {
      let index = store.opLogs.findIndex((op: any) => op.key === payload.key);
      store.opLogs[index] = payload;
    },
    resolveState(store, payload: any) {
    },
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