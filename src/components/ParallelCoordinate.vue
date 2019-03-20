<template>
  <div
    :element-loading-text="LoadingText"
    v-loading=" !allLoaded"
    class="parallel-coordinate chart-container"
  >
    <div class="panel">
      <span class="view-name">Parallel-Coordinate {{mode === 'Detail' ? '(Detail)' : '(Global)'}}</span>
      <span :class="{ active: canClearBrushes }" @click="handleClear">Clear all brushes</span>
      <span
        class="active"
        @click="handleShowData"
      >{{showData === true ? 'Show chart' : 'Show data'}}</span>
    </div>
    <div class="table-container" v-if="showData">
      <el-table
        :row-class-name="tableRowClassName"
        style="width: 100%"
        border
        :data="tableData"
        height="400px"
      >
        <el-table-column prop="rank" label="Rank"></el-table-column>
        <el-table-column prop="freq" label="Freq" v-if="mode === 'Global'"></el-table-column>
        <el-table-column
          v-for="(index, idx) in this.indexes.filter(index => index !== 'freq')"
          :key="idx"
          :prop="index"
          :label="index[0].toUpperCase() + index.substring(1)"
        ></el-table-column>
      </el-table>
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
  chart!: any;
  detailedData: any = null;
  showData: boolean = false;
  get LoadingText() {
    if (this.templateLoaded === false) return "加载定向树...";
    if (this.loaded === false) return "计算定向指标";
    if (this.detailedLoaded === false) return "计算定向组合详情指标";
    return "";
  }

  get tableData() {
    if (this.mode === "Global") return this.data;
    else return this.detailedData;
  }

  handleDetail() {}

  @Getter("templateLoaded", { namespace: "template" })
  templateLoaded!: boolean;

  @Getter("loaded", { namespace: "combination" })
  loaded!: boolean;

  @Getter("allState", { namespace: "parallelCoordinate" })
  state!: any;

  renderChart() {
    if (this.mode === "Global")
      this.chart.loadData(
        this.data,
        this.indexes,
        this.mode,
        this.selectedCmb,
        this.brushCmbs
      );
    else
      this.chart.loadData(
        this.detailedData,
        this.indexes,
        this.mode,
        null,
        null
      );
  }

  handleShowData() {
    this.showData = !this.showData;
    if (this.showData === true) {
      this.chart.dispose();
      this.chart = null;
    } else {
      this.chart = new ParallelCoordinateChart(".parallel-coordinate .chart");
      this.renderChart();
    }
  }

  tableRowClassName(params: any) {
    let row = params.row;
    if (this.brushCmbs == null && this.selectedCmb == null) return "";
    let cmbtargets = row.cmbtargets;
    let isBrushed =
      this.brushCmbs == null
        ? false
        : this.brushCmbs.data.findIndex((d: any) => d === cmbtargets) !== -1;
    let isSelected =
      this.selectedCmb == null
        ? false
        : this.selectedCmb.cmbtargets === cmbtargets;
    if (isSelected === true) return "success-row";
    else if (isBrushed === true && isSelected === false) return "warning-row";
    else return "";
  }

  get canClearBrushes() {
    if (this.mode === "Global")
      return this.brushCmbs != null && this.selectedCmb == null;
    else if (this.mode === "Detail") return this.brushCmbs != null;
  }

  get allLoaded() {
    if (this.templateLoaded === false) return false;
    if (this.loaded === false) return false;
    if (this.detailedLoaded === false) return false;
    return true;
  }

  @Getter("detailedLoaded", { namespace: "parallelCoordinate" })
  detailedLoaded!: boolean;

  handleClear() {
    if (this.canClearBrushes === false) return;
    Bus.$emit("cmbs-brush", null);
    this.brushCmbs = null;
    this.renderChart();
  }

  @Watch("state")
  watchState(nVal: any) {
    this.initFilter(nVal);
  }

  @Watch("data")
  watchData(nVal: any) {
    if (nVal == null || this.mode !== "Global") return;
    this.preprocess(this.data);
    if (this.chart == null) return;
    this.renderChart();
  }

  preprocess(data: any[]) {
    data.forEach(d => {
      let keys = Object.keys(d);
      keys.forEach(key => {
        if (key === "rank" || key === "cmbtargets") return;
        let value = d[key];
        if (!Number.isInteger(value)) {
          if (key === "ctr") value = +value.toFixed(5);
          else value = +value.toFixed(3);
        }
        d[key] = value;
      });
    });
  }

  @Watch("detailedLoaded")
  watchDetailedLoaded(nVal: any) {
    if (nVal === false) return;
    this.mode = "Detail";
    this.renderChart();
  }

  indexes: string[] = [];
  data: any[] = [];
  selectedCmb: any = null;
  mode: string = "Global";
  brushCmbs: any = null;

  @Action("getDetailAction", { namespace: "parallelCoordinate" })
  getDetail(message: string) {}

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
      if (this.chart == null) return;
      this.renderChart();
    });
    Bus.$on("alert-select-cmb", () =>
      this.$message({ type: "info", message: "请先取消定向组合选择" })
    );
    Bus.$on("cmbs-brush", (message: any) => (this.brushCmbs = message));
    Bus.$on("get-detail", (message: string) => {
      // this.mode = "Detail";
      this.getDetail(message);
    });
  }
}
</script>
<style>
.table-container {
  position: absolute;
  left: 0;
  top: 30px;
  width: 98%;
  padding: 10px;
  flex: 1;
  z-index: 100;
}
.el-table .success-row {
  background: #f0f9eb;
}
.el-table .warning-row {
  background: oldlace;
}
</style>


