<template>
  <div
    :element-loading-text="loadingText"
    v-loading="!systemLoaded || currentState.type === 'Crowd-Location'"
    class="hierarchy-chord chart-container"
  >
    <div class="panel">
      <span class="view-name">定向关系图</span>
      <el-switch
        size="mini"
        @change="handleIndexChange"
        v-model="index"
        active-text="频次"
        inactive-text="消耗"
      ></el-switch>
      <span v-if="enterFullScreen" @click="handlePan" :class="{active: panable}">缩放/平移</span>
      <span v-if="enterFullScreen" @click="handleResetChart" :class="{active: panable}">还原缩放/平移</span>

      <span class="fill-space"></span>
      <span class="active" @click="fullscreen">全屏</span>
    </div>

    <div class="chart"></div>
  </div>
</template>
<script lang="ts">
import CommonService from "@/api/common.service";
let service = CommonService.getInstance();
import { Component, Vue, Watch } from "vue-property-decorator";
import HierarchyChordChart from "@/charts/HierarchyChordChart";
import { Action, Getter, Mutation } from "vuex-class";
import Bus from "@/charts/event-bus.ts";
import { getNextLevelTargets } from "@/utils/index.ts";
import { RelationOp, RelationData } from "@/models/relation";
import { TargetingTreeNode, TargetingInfo } from "@/models/targeting";
import { FilterForm, RelationPostData } from "@/models";

@Component({
  mounted() {
    const vm: any = this;
    vm.chart = new HierarchyChordChart(".hierarchy-chord .chart");
    vm.handleCoordinate();
  }
})
export default class HierarchyChord extends Vue {
  chart!: HierarchyChordChart;
  panable: boolean = false;
  enterFullScreen: boolean = false;
  restore: boolean = true;
  index: boolean = false;
  highlightedTarget: TargetingInfo | null = null;
  filteredIds: TargetingInfo[] | null = null;
  cmbs: TargetingInfo[] | null = null;
  data: any = [];
  ids: TargetingInfo[] = [];

  confirmCount: number = 1;

  controlState: any = {};

  @Getter("systemLoaded")
  systemLoaded!: boolean;

  @Getter("template/templateLoaded")
  templateLoaded!: boolean;

  get loadingText() {
    if (this.templateLoaded === false) return "定向模板加载中...";
    if (this.systemLoaded === false) return "数据加载中...";
    if (
      this.currentState != null &&
      this.currentState.type === "Crowd-Location"
    )
      return "人群定位功能与关系图无关";
    else return "";
  }

  @Mutation("changeCurrentOpLogPointer")
  changeCurrentOpLogPointer(payload: any) {}
  @Mutation("changeCurrentLogPointer")
  changeCurrentLogPointer(payload: number) {}

  handleIndexChange(condition: boolean) {
    this.index = condition;
    this.controlState.index = condition === true ? "freq" : "cost";
    this.renderChart();
  }

  @Getter("template", { namespace: "template" })
  template!: TargetingTreeNode;

  @Getter("globalFilter")
  globalFilter!: any;

  // 在每一次opPointer产生变化时,将所有状态初始化
  initState(op: any) {
    this.controlState.index = op.relationState.controlState.index;
    this.index = this.controlState.index === "freq" ? true : false;
    this.data = op.relationState.data;
    this.ids = op.targets;
    this.highlightedTarget = op.highlightedTarget;
    this.filteredIds = op.filteredTargets;
    this.cmbs = op.selectedCmb;
  }

  renderChart() {
    this.chart.loadData(
      this.data,
      this.ids,
      this.filteredIds,
      this.highlightedTarget,
      this.controlState.index,
      this.cmbs
    );
  }

  // 处理平移与缩放
  handlePan() {
    this.panable = !this.panable;
    this.chart.drag(this.panable);
    this.chart.zoom(this.panable);
  }

  handleResetChart() {
    this.chart.reset();
  }

  @Getter("currentLog")
  currentLog!: any;
  @Getter("currentOpLog")
  currentState!: any;

  @Getter("logPointerStatus")
  logPointerStatus!: any;

  @Watch("currentState")
  watchCurrentOpLog(nVal: any) {
    if (nVal == null || nVal.relationState.data == null) return;

    this.initState(nVal);
    this.renderChart();
  }

  // 处理联动
  handleCoordinate() {
    Bus.$on(
      "highlight-target",
      (message: any) => (this.highlightedTarget = message)
    );
    // Bus.$on("filter-targets", (message: any) => (this.filteredIds = message));
    Bus.$on("select-cmb", (message: TargetingInfo[] | null) => {
      this.cmbs = message;
      if (this.currentState == null) return;
      this.renderChart();
    });
    Bus.$on("alert-send-cmb", () => {
      let self: any = this;
      self.$message({ type: "info", message: "请先取消定向组合选择" });
    });
  }
  // 进入全屏
  fullscreen() {
    let dom: any = document.getElementsByClassName("hierarchy-chord")[0];
    dom.classList.toggle("fullscreen");
    this.enterFullScreen = !this.enterFullScreen;
    this.chart.fullscreen();
    if (this.enterFullScreen === false) {
      this.panable = false;
      this.chart.reset();
    }
  }
}
</script>
<style>
.hierarchy-chord .chart {
  flex: 1 1 auto;
  position: relative;
  overflow: hidden;
}
</style>


