<template>
  <div id="app">
    <app-dialog :show="showDialog" @close-dialog="showDialog = false"></app-dialog>
    <div class="top">
      <global-control-panel @open-dialog="showDialog = true"></global-control-panel>
      <hierarchy-chord ref="hierarchyChord"></hierarchy-chord>
      <combination-target ref="cominationTarget"></combination-target>
    </div>
    <div class="bottom">
      <portrait ref="portrait"></portrait>
      <parallel-coordinate></parallel-coordinate>
    </div>
  </div>
</template>
<script lang="ts">
import { Component, Vue, Watch } from "vue-property-decorator";
import HierarchyChord from "@/components/HierarchyChord.vue";
import ParallelCoordinate from "@/components/ParallelCoordinate.vue";
import GlobalControlPanel from "@/components/GlobalControlPanel.vue";
import CombinationTarget from "@/components/CombinationTarget.vue";
import Portrait from "@/components/Portrait.vue";
import AppDialog from "@/components/AppDialog.vue";
import { init } from "@/utils/init.ts";
import { Mutation, Action, Getter } from "vuex-class";

import { FilterForm, Types } from "@/models";
import { TargetingInfo } from "@/models/targeting";
import Bus from "@/charts/event-bus";
@Component({
  components: {
    HierarchyChord,
    CombinationTarget,
    GlobalControlPanel,
    ParallelCoordinate,
    Portrait,
    AppDialog
  },
  mounted() {
    const vm: any = this;
    vm.prepare();
    vm.handleDrilldown();
  }
})
export default class App extends Vue {
  // 是否打开保存面板
  showDialog: boolean = false;
  // 处理定向模板
  @Action("getTemplateAction", { namespace: "template" })
  getTemplateAction() {}
  @Getter("templateLoaded", { namespace: "template" })
  templateLoaded!: boolean;
  @Getter("systemLoaded")
  systemLoaded!: boolean;
  @Action("loadAllState")
  loadAllState(payload: any) {}
  // 监听
  @Watch("templateLoaded")
  watchTemplateLoaded(nVal: boolean) {
    if (nVal === false) return;
    // 当初始打开系统时需要根据systemLoaded判断是否加载了原有方案或是完全初始化
    // if (this.systemLoaded === false) {
    //   console.log("need init");
    //   this.loadAllState();
    // }
    this.loadAllState(Object.assign({ type: "Init" }));
  }
  // 监听
  @Watch("typesLoaded")
  watchTypesLoaded(nVal: boolean) {
    if (nVal === true) this.getTemplateAction();
  }

  // 处理筛选条件
  @Action("getTypesAction", { namespace: "types" })
  getTypesAction() {}
  // @Getter("types", { namespace: "types" })
  // types!: Types;
  @Getter("typesLoaded", { namespace: "types" })
  typesLoaded!: boolean;

  @Mutation("resolveState")
  resolveState(payload: any) {}

  @Mutation("restoreAllState")
  restoreAllState(payload: any) {}

  @Mutation("allMutation", { namespace: "relation" })
  rallMutation(payload: any) {}
  // @Mutation("allMutation", { namespace: "combination" })
  // callMutation(payload: any) {}

  // 在每次刷新或打开浏览器时,应该先查找本地是否存在默认方案
  prepare() {
    let result = init();
    // 将默认方案保存的状态推送至各个state
    // this.restoreAllState(result.test);
    this.resolveState(result.globalState);
    // // 开始请求模板
    this.getTypesAction();
  }

  @Getter("currentOpLog")
  currentState!: any;

  @Action("loadDetailState")
  loadDetailState(payload: string) {}

  handleDrilldown() {
    Bus.$on("highlight-target", (message: any) => {
      if (this.currentState == null) return;
      this.currentState.highlightedTarget = message;
    });
    Bus.$on("filter-targets", (message: any) => {
      if (this.currentState == null) return;
      if (message == null) this.currentState.filteredTargets = null;
      else
        this.currentState.filteredTargets = message.map((item: any) =>
          Object.assign({}, item)
        );
    });
    Bus.$on("select-cmb", (message: any) => {
      this.currentState.selectedCmb = message;
    });
    Bus.$on("get-detail", (adgroupids: string) => {
      this.loadDetailState(
        Object.assign({
          ids: this.currentState.targets.map((item: any) => item.id),
          adgroupids
        })
      );
    });
    Bus.$on("drilldown-addState", (message: any) => {
      if (this.currentState == null) return;
      let newOp = Object.assign({}, this.currentState);
      newOp.relationState.controlState = Object.assign(
        {},
        (this.$refs["hierarchyChord"] as any).controlState
      );
      newOp.combinationState.controlState = Object.assign(
        {},
        (this.$refs["cominationTarget"] as any).controlState
      );
      newOp.portraitState.controlState = Object.assign(
        {},
        (this.$refs["portrait"] as any).controlState
      );
      newOp.portraitState.controlState.mode = "Global";
      newOp.portraitState.detailedData = null;
      newOp.combinationState.detailedData = null;
      this.loadAllState(
        Object.assign({
          type: "Drilldown",
          ids: message.drilldown.ids,
          message: `${message.drilldown.clicked.name}`,
          newOp
        })
      );
    });
  }
}
</script>

<style>
html,
body {
  margin: 0;
  height: 100%;
}
#app {
  font-family: Arial, Helvetica, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  display: grid;
  height: 100%;
  box-sizing: border-box;
  padding: 5px;
  grid-gap: 5px;
  grid-template-rows: 50% calc(50% - 5px);
  grid-template-columns: 1fr;
}
#app .top {
  display: grid;
  grid-gap: 5px;
  grid-template-rows: minmax(100%, 100%);
  grid-template-columns: 250px 1fr 45%;
}
#app .bottom {
  display: grid;
  grid-gap: 5px;
  grid-auto-rows: minmax(100%, 100%);
  grid-template-columns: 55% 1fr;
}
#app .top > div {
  max-height: 100%;
}

.panel {
  display: flex;
  height: 30px;
  padding: 0 20px;
  align-items: center;
  border-bottom: 1px solid #d2d2d2;
}

.panel > span {
  color: #d2d2d2;
  cursor: pointer;
  padding: 0 10px;
  font-size: 12px;
}
.panel span.view-name {
  font-size: 12px;
  color: #000;
  margin-right: 10px;
}
.panel .el-dropdown {
  padding: 0 5px;
}
.panel > span.active {
  color: #409eff;
}

.fill-space {
  flex: 1 1 auto;
}

.chart .tooltip {
  position: absolute;
  visibility: hidden;
  border-style: solid;
  white-space: nowrap;
  z-index: 9999999;
  transition: left 0.4s cubic-bezier(0.23, 1, 0.32, 1) 0s,
    top 0.4s cubic-bezier(0.23, 1, 0.32, 1) 0s;
  background-color: rgba(50, 50, 50, 0.7);
  border-width: 0px;
  border-color: rgb(51, 51, 51);
  border-radius: 4px;
  color: rgb(255, 255, 255);
  font: 14px/21px sans-serif;
  padding: 5px;
  left: 266px;
  top: 201px;
  pointer-events: none;
}

.chart .tooltip .tip {
  display: inline-block;
  margin-right: 5px;
  border: 5px solid transparent;
  border-radius: 100%;
}
.chart .tooltip p {
  margin: 0;
  display: flex;
  align-items: center;
  line-height: 18px;
}
.chart .tooltip p span {
  font-size: 10px;
}

.chart-container {
  position: relative;
  border-top: 2px solid brown;
  box-shadow: 0 2px 2px #d2d2d2;
  display: flex;
  flex-flow: column nowrap;
  z-index: 1;
}
.chart-container.fullscreen {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  right: 0;
  z-index: 1000;
  background-color: #fff;
}
.chart-container .chart {
  flex: 1 1;
  position: relative;
}
</style>
