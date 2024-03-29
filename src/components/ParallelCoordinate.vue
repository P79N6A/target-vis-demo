<template>
  <div
    :element-loading-text="loadingText"
    v-loading=" !systemLoaded || !detailLoaded"
    class="parallel-coordinate chart-container"
  >
    <div class="panel">
      <span class="view-name">平行坐标 {{mode === 'Detail' ? '(定向组合限定)' : '(全局)'}}</span>
      <span :class="{ active: canClearBrushes }" @click="handleClear">清除刷选</span>
      <span class="active" @click="handleShowData">{{showData === true ? '显示视图' : '原始数据'}}</span>
      <span class="fill-space"></span>
      <span class="active" v-if="mode === 'Detail'">广告数: {{dataLength}}</span>
    </div>
    <div class="table-container" v-if="showData">
      <el-table style="width: 100%" border :data="tableData" height="340">
        <el-table-column sortable prop="rank" label="Rank" v-if="mode === 'Global'"></el-table-column>

        <el-table-column prop="adgroup_id" label="广告ID" v-if="mode === 'Detail'"></el-table-column>
        <el-table-column prop="advertiser_id" label="广告主ID" v-if="mode === 'Detail'"></el-table-column>
        <el-table-column
          sortable
          v-for="(index, idx) in this.indexes.filter(index => this.mode === 'Global' || index !== 'freq')"
          :key="idx"
          :prop="index"
          :label="index[0].toUpperCase() + index.substring(1)"
        ></el-table-column>
      </el-table>
      <el-pagination
        :current-page.sync="currentPage"
        background
        :page-size="pageSize"
        :total="dataLength"
        :style="{'margin-top': '20px'}"
      ></el-pagination>
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
  currentPage: number = 1;
  pageSize: number = 50;

  @Getter("template/templateLoaded")
  templateLoaded!: boolean;

  @Watch("dataLength")
  watchDataLength() {
    this.currentPage = 1;
  }

  get dataLength() {
    if (this.data != null) return this.data.length;
    return this.detailedData.filter(
      (d: any) =>
        this.detailedBrush == null ||
        this.detailedBrush.data.indexOf(d.adgroup_id) !== -1
    ).length;
  }

  get loadingText() {
    if (this.templateLoaded === false) return "定向模板加载中...";
    if (this.systemLoaded === false) return "全局数据加载中...";
    if (this.detailLoaded === false) return "详情数据加载中";
    else return "";
  }

  get tableData() {
    if (this.mode === "Global")
      return this.data.filter(
        (d: any) =>
          this.brushCmbs == null ||
          this.brushCmbs.data.indexOf(d.cmbtargets) !== -1
      );
    else
      return this.detailedData
        .filter(
          (d: any) =>
            this.detailedBrush == null ||
            this.detailedBrush.data.indexOf(d.adgroup_id) !== -1
        )
        .slice(
          (this.currentPage - 1) * this.pageSize,
          this.currentPage * this.pageSize
        );
  }

  @Getter("systemLoaded")
  systemLoaded!: boolean;

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
        this.detailedBrush
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
  get canClearBrushes() {
    if (this.mode === "Global")
      return this.brushCmbs != null && this.selectedCmb == null;
    else if (this.mode === "Detail") return this.detailedBrush != null;
  }

  get allLoaded() {
    return true;
  }

  handleClear() {
    if (this.canClearBrushes === false) return;
    if (this.mode === "Global") {
      Bus.$emit("cmbs-brush", null);
      this.brushCmbs = null;
    } else {
      Bus.$emit("detail-cmbs-brush", null);
      this.detailedBrush = null;
    }
    this.renderChart();
  }

  @Getter("detailLoaded")
  detailLoaded!: boolean;

  indexes: string[] = [];
  data: any = [];
  selectedCmb: any = null;
  mode: string = "Global";
  brushCmbs: any = null;
  detailedBrush: any = null;

  initState(op: any) {
    this.indexes = op.indexes;
    this.mode = op.mode;
    this.currentPage = 1;
    if (this.mode === "Global") {
      this.data = op.data;
      this.detailedData = null;
      this.selectedCmb = op.selectedCmb;
      this.brushCmbs = op.brushedCmbs;
    } else {
      this.data = null;
      this.detailedData = op.detailedData;
    }
    this.detailedBrush = null;
  }

  handleCoordinate() {
    Bus.$on("send-data", (message: any) => {
      this.initState(message);
      if (this.showData === false) this.renderChart();
    });
    Bus.$on("select-cmb", (message: TargetingInfo[] | null) => {
      this.selectedCmb = message;
      if (this.chart == null) return;
      this.renderChart();
    });
    Bus.$on("alert-select-cmb", () => {
      let self: any = this;
      self.$message({ type: "info", message: "请先取消定向组合选择" });
    });
    Bus.$on("cmbs-brush", (message: any) => {
      if (this.mode === "Global") this.brushCmbs = message;
    });
    Bus.$on("detail-cmbs-brush", (message: any) => {
      this.detailedBrush = message;
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


