<template>
  <div id="app">
    <app-dialog :show="showDialog" @close-dialog="showDialog = false"></app-dialog>
    <project-list
      :show="showProjectListDialog"
      @close-project-list-dialog="showProjectListDialog = false"
    ></project-list>
    <div class="top">
      <global-control-panel
        @open-dialog="showDialog = true"
        @open-project-list-dialog="showProjectListDialog = true"
      ></global-control-panel>
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
import ProjectList from "@/components/ProjectList.vue";
import Portrait from "@/components/Portrait.vue";
import AppDialog from "@/components/AppDialog.vue";
import { findState } from "@/utils/init.ts";
import { Mutation, Action, Getter } from "vuex-class";
import { defaultGlobalFilter } from "@/utils/init.ts";
import { filter2Form } from "@/utils/index.ts";
import moment from "moment";
import { FilterForm, Types } from "@/models";
import { TargetingInfo, TargetingTreeNode } from "@/models/targeting";
import Bus from "@/charts/event-bus";
import { getNextLevelTargets, form2Filter } from "@/utils";
@Component({
  components: {
    HierarchyChord,
    CombinationTarget,
    GlobalControlPanel,
    ParallelCoordinate,
    Portrait,
    AppDialog,
    ProjectList
  },
  mounted() {
    const vm: any = this;
    vm.prepare();
    vm.handleCoordinate();
  }
})
export default class App extends Vue {
  // 是否打开保存面板
  showDialog: boolean = false;
  // 是否打开方案列表面板
  showProjectListDialog: boolean = false;

  currentGlobalFilter = null;

  preload: boolean = false;

  // 处理定向模板
  @Action("getTemplateAction", { namespace: "template" })
  getTemplateAction(payload: FilterForm) {}

  @Getter("templateLoaded", { namespace: "template" })
  templateLoaded!: boolean;

  @Getter("systemLoaded")
  systemLoaded!: boolean;

  @Mutation("detailedLoadedMutation")
  detailedLoadedMutation(payload: boolean) {}

  @Mutation("targetFreqLoadedMutation")
  targetFreqLoadedMutation(payload: boolean) {}

  @Action("loadAllState")
  loadAllState(payload: any) {}
  // 监听
  @Watch("templateLoaded")
  watchTemplateLoaded(nVal: boolean) {
    if (nVal === false) return;
    // 如果有方案加载, 那么此时应特殊处理
    if (this.preload === true) return;
    // 无方案加载
    if (this.systemLoaded === false || this.currentState == null) {
      let globalFilter = null;
      if (this.currentState == null) globalFilter = defaultGlobalFilter;
      else {
        globalFilter =
          this.currentGlobalFilter != null
            ? this.currentGlobalFilter
            : this.currentState.globalFilterState;
      }
      this.loadAllState(
        Object.assign({
          ids: null,
          globalFilterState: JSON.stringify(this.currentGlobalFilter),
          type: "Init"
        })
      );
    }
  }

  @Getter("currentOpLog")
  currentOpLog!: any[];
  // 监听
  // 此监听器负责第一次打开系统或刷新浏览器时处理
  @Watch("typesLoaded")
  watchTypesLoaded(nVal: boolean) {
    if (nVal === false) return;
    if (this.currentState == null) {
      // 证明当前无任何方案加载
      // 则一切按照默认方案加载
      let dF = JSON.stringify(defaultGlobalFilter);
      this.getTemplateAction(JSON.parse(dF));
      this.currentGlobalFilter = JSON.parse(dF);
    }
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

  @Mutation("resolveAllState")
  resolveAllState(payload: any) {}

  @Mutation("template/resolveTemplateMutation")
  resolveTemplateMutation(payload: TargetingTreeNode) {}

  @Mutation("allLoaded")
  allLoaded() {}

  // 在每次刷新或打开浏览器时,应该先查找本地是否存在默认方案
  prepare() {
    findState((payload: any) => {
      // 如果查找到了历史方案
      if (payload != null) {
        Bus.$emit(
          "has-default-project",
          Object.assign({ key: payload.key, title: payload.title })
        );
        this.resolveAllState(payload.state);
        setTimeout(() => (this.preload = false), 50);
      } else {
        Bus.$emit("has-default-project", null);
      }
      setTimeout(() => this.getTypesAction(), 50);
    });
  }

  @Getter("currentOpLog")
  currentState!: any;

  @Getter("template", { namespace: "template" })
  template!: any;

  @Action("loadDetailState")
  loadDetailState(payload: string) {}

  saveCurrentOp() {
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
    // 在详情模式下，数据量可能较大，如果要形成当前状态快照，
    //需要将详情模式得到的数据清除
    newOp.portraitState.controlState.mode = "Global";
    newOp.portraitState.detailedData = null;
    newOp.combinationState.detailedData = null;
    return newOp;
  }

  @Mutation("systemLoadedMutation")
  systemLoadedMutation(payload: boolean) {}

  @Mutation("saveCurrentOp")
  saveCurrentOpMutation(payload: any) {}

  @Watch("currentState")
  watchCurrentState(nVal: any, oVal: any) {
    if (nVal == null) return;
    if (oVal == null || nVal.globalFilterState !== oVal.globalFilterState)
      this.currentGlobalFilter = JSON.parse(nVal.globalFilterState);

    let globalFilter = JSON.parse(nVal.globalFilterState);
    let timeRange = globalFilter.timeRange;
    // 数据库中应有的最后分区
    let lastPartition = moment().subtract(30, "d");
    // 当前状态中的数据范围
    let projectLastPartition = moment;
  }

  @Getter("types/types")
  types!: Types;

  handleCoordinate() {
    Bus.$on("save-state", () => {
      let op = this.saveCurrentOp();
      this.saveCurrentOpMutation(op);
      Bus.$emit("get-saved-state");
    });
    // 保存高亮定向
    Bus.$on("highlight-target", (message: any) => {
      if (this.currentState == null) return;
      this.currentState.highlightedTarget = message;
    });
    // 筛选定向
    Bus.$on("filter-targets", (message: any) => {
      if (this.currentState == null) return;
      this.loadAllState(
        Object.assign({
          ids: message,
          type: "Filter",
          message: "筛选定向",
          globalFilterState: JSON.stringify(this.currentGlobalFilter),
          newOp: this.saveCurrentOp()
        })
      );
    });
    // 用于保存当前选中的定向组合
    Bus.$on("select-cmb", (message: any) => {
      this.currentState.selectedCmb = message;
    });
    // 用于监听详情模式事件
    Bus.$on("get-detail", (adgroupids: string) => {
      this.loadDetailState(
        Object.assign({
          globalFilter: JSON.stringify(this.currentGlobalFilter),
          ids: this.currentState.targets.map((item: any) => item.id),
          adgroupids
        })
      );
    });
    // 改变了全局筛选条件
    // 需要创建新的请求
    // 先请求模板
    Bus.$on("change-global-filter", (message: any) => {
      let filter = form2Filter(JSON.parse(message), this.types);
      this.currentGlobalFilter = filter;
      this.getTemplateAction(this.currentGlobalFilter as any);
      this.systemLoadedMutation(false);
    });
    Bus.$on("drilldown-addState", (message: any) => {
      // 每次下钻时，需要将状态保存起来,但也需要预先判断是否能够下钻
      let clicked = message.drilldown.clicked;
      // 找到被下钻定向如dmp人群的下一级全部子定向
      let children = getNextLevelTargets(
        this.template,
        clicked.id,
        this.currentGlobalFilter
      );
      // 如果被下钻定向不存在子定向，或子定向频次不符合全局筛选条件
      // 显示提示信息并返回，此时不会向后端发送请求
      if (children.some((child: any) => child.selected === true) === false) {
        let self: any = this;
        self.$message({
          type: "info",
          message: "当前被下钻的定向已无符合定向频次条件的子定向"
        });
        return;
      }
      // 从现有定向中找出被下钻的定向如dmp人群,将它的选中状态取消,表示计算定向
      // 关系与定向组合时，dmp人群不参与计算
      let newTargets = this.currentState.targets.map((target: any) => {
        let tmp = Object.assign({}, target);
        if (tmp.id === clicked.id) tmp.selected = false;
        return tmp;
      });
      // 将dmp人群下的所有子定向插入targets数组中，用于计算新的定向关系
      // 与定向组合
      let idx = newTargets.findIndex((target: any) => target.id === clicked.id);
      newTargets.splice(idx, 0, ...children);
      // 每次进行下钻、筛选定向、选择新全局筛选条件均会生成新的状态
      // 因此需要将当前状态所有更改（高亮、定向模式选择）保存, 形成快照
      this.loadAllState(
        Object.assign({
          type: "Drilldown",
          ids: newTargets,
          globalFilterState: JSON.stringify(this.currentGlobalFilter),
          message: `下钻-${message.drilldown.clicked.name}`,
          newOp: this.saveCurrentOp()
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
  grid-template-columns: minmax(280px, 17%) 1fr 45%;
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
  padding: 0 5px;
  align-items: center;
  border-bottom: 1px solid #d2d2d2;
}

.panel > span {
  color: #d2d2d2;
  cursor: pointer;
  padding: 0 5px;
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
