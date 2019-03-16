<template>
  <div
    :element-loading-text="LoadingText"
    v-loading="!templateLoaded || !allLoaded"
    class="parallel-coordinate chart-container"
  >
    <div class="panel">
      <span class="view-name">Parallel-Coordinate {{mode === 'Detail' ? '(Detail)' : '(Global)'}}</span>
      <span :class="{ active: canClearBrushes }" @click="handleClear">Clear all brushes</span>
    </div>
    <div class="chart"></div>
  </div>
</template>
<script lang="ts">
import { Component, Vue, Watch } from "vue-property-decorator";
import ParallelCoordinateChart from "@/charts/ParallelCoordinateChart";
import CommonService from "@/api/common.service";
import { Getter, Action } from "vuex-class";
import { CombinationData, TargetingInfo } from "@/models/targeting";
let service = CommonService.getInstance();
import Bus from "@/charts/event-bus";
@Component({
  mounted() {
    const vm: any = this;
    vm.chart = new ParallelCoordinateChart(".parallel-coordinate .chart");
    vm.handleCoordinate();
  }
})
export default class ParallelCoordinate extends Vue {
  chart!: ParallelCoordinateChart;
  detailedData: any = null;
  get LoadingText() {
    if (this.templateLoaded === false) return "加载定向树...";
    if (this.loaded === false) return "计算定向指标";
    if (this.detailedLoaded === false) return "计算定向组合详情指标";
    return "";
  }
  handleDetail() {}

  @Getter("templateLoaded", { namespace: "template" })
  templateLoaded!: boolean;

  @Getter("loaded", { namespace: "combination" })
  loaded!: boolean;

  @Getter("allState", { namespace: "parallelCoordinate" })
  state!: any;

  get canClearBrushes() {
    if (this.mode === "Global")
      return this.brushCmbs != null && this.selectedCmb == null;
    else if (this.mode === "Detail") return this.brushCmbs != null;
  }

  get allLoaded() {
    if (this.mode === "Global") return this.loaded;
    else return this.detailedLoaded;
  }

  @Getter("detailedLoaded", { namespace: "parallelCoordinate" })
  detailedLoaded!: boolean;

  handleClear() {
    if (this.canClearBrushes === false) return;
    Bus.$emit("cmbs-brush", null);
    this.brushCmbs = null;
    this.chart.loadData(
      this.data,
      this.indexes,
      this.mode,
      this.selectedCmb,
      this.brushCmbs
    );
  }

  @Watch("state")
  watchState(nVal: any) {
    this.initFilter(nVal);
  }

  @Watch("data")
  watchData(nVal: any) {
    if (nVal == null || this.mode !== "Global") return;
    this.chart.loadData(
      this.data,
      this.indexes,
      this.mode,
      this.selectedCmb,
      this.brushCmbs
    );
  }

  @Watch("detailedLoaded")
  watchDetailedLoaded(nVal: any) {
    this.mode = "Detail";
    this.chart.loadData(this.detailedData, this.indexes, this.mode, null, null);
  }

  indexes: string[] = [];
  data: any[] = [];
  selectedCmb: any = null;
  mode: string = "Global";
  brushCmbs: any = null;

  @Action("getDetailAction", { namespace: "parallelCoordinate" })
  getDetail() {}

  initFilter(op: any) {
    this.indexes = op.indexes;
    this.data = op.data;
    this.mode = op.mode;
    this.detailedData = op.detailedData;
    if (this.mode === "Global") {
      this.selectedCmb = op.selectedCmb;
      this.brushCmbs = op.brushCmbs;
    }
  }

  handleCoordinate() {
    Bus.$on("select-cmb", (message: TargetingInfo[] | null) => {
      this.selectedCmb = message;
      this.mode = "Global";
      this.chart.loadData(
        this.data,
        this.indexes,
        this.mode,
        this.selectedCmb,
        this.brushCmbs
      );
    });
    Bus.$on("alert-select-cmb", () =>
      this.$message({ type: "info", message: "请先取消定向组合选择" })
    );
    Bus.$on("cmbs-brush", (message: any) => (this.brushCmbs = message));
    Bus.$on("get-detail", () => {
      this.mode = "Detail";
      this.getDetail();
    });
  }
}
</script>
<style>
</style>


