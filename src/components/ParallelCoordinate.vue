<template>
  <div
    :element-loading-text="loadingText"
    v-loading=" !systemLoaded || !detailLoaded"
    class="parallel-coordinate chart-container"
  >
    <div class="panel">
      <span class="view-name">平行坐标 {{mode === 'Detail' ? '(定向组合限定)' : '(全局)'}}</span>
      <span :class="{ active: canClearBrushes }" @click="handleClear">清除全部刷选</span>
      <span class="active" @click="handleShowData">{{showData === true ? '显示视图' : '显示数据'}}</span>
    </div>
    <div class="table-container" v-if="showData">
      <el-table
        :row-class-name="tableRowClassName"
        style="width: 100%"
        border
        :data="tableData"
        height="400px"
      >
        <el-table-column prop="rank" label="Rank" v-if="mode === 'Global'"></el-table-column>
        <el-table-column prop="freq" label="Freq" v-if="mode === 'Global'"></el-table-column>
        <el-table-column prop="adgroup_id" label="广告ID" v-if="mode === 'Detail'"></el-table-column>
        <el-table-column prop="advertiser_id" label="广告主ID" v-if="mode === 'Detail'"></el-table-column>
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
  get loadingText() {
    if (this.systemLoaded === false) return "Loading...";
    if (this.detailLoaded === false) return "加载详情数据...";
    return "";
  }

  get tableData() {
    if (this.mode === "Global") {
      if (this.brushCmbs == null) return this.data;
      else
        return this.data.filter(
          (d: any) => this.brushCmbs.data.indexOf(d.cmbtargets) != -1
        );
    } else {
      if (this.detailedBrush == null) return this.detailedData;
      else
        return this.detailedData.filter(
          (d: any) => this.detailedBrush.data.indexOf(d.adgroup_id) != -1
        );
    }
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

  preprocess(data: any[]) {
    data.forEach(d => {
      let keys = Object.keys(d);
      keys.forEach(key => {
        if (
          key === "rank" ||
          key === "cmbtargets" ||
          key === "adgroupids" ||
          key === "aids"
        )
          return;
        let value: any = d[key];
        if (!Number.isInteger(+value)) {
          if (key === "ctr") value = +value.toFixed(5);
          else value = +value.toFixed(3);
        }
        d[key] = value;
      });
    });
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
      this.renderChart();
    });
    Bus.$on("select-cmb", (message: TargetingInfo[] | null) => {
      this.selectedCmb = message;
      if (this.chart == null) return;
      this.renderChart();
    });
    Bus.$on("alert-select-cmb", () =>
      this.$message({ type: "info", message: "请先取消定向组合选择" })
    );
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


