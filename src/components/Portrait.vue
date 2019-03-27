<template>
  <div
    class="portrait chart-container"
    v-loading="!systemLoaded || !detailLoaded"
    :element-loading-text="loadingText"
  >
    <div class="panel">
      <span class="view-name">广告指标图 ({{controlState.mode === 'Global' ? '全局' : '定向组合限定'}})</span>
      <el-dropdown trigger="click" @command="handleTypeClick">
        <el-button type="text">{{controlState.types}}维度</el-button>
        <el-dropdown-menu slot="dropdown">
          <el-dropdown-item command="流量">流量</el-dropdown-item>
          <el-dropdown-item command="行业">行业</el-dropdown-item>
          <el-dropdown-item command="产品类型">产品类型</el-dropdown-item>
          <el-dropdown-item command="平台">平台</el-dropdown-item>
        </el-dropdown-menu>
      </el-dropdown>

      <el-dropdown trigger="click" @command="handleMenuClick">
        <el-button type="text">{{controlState.index}}</el-button>
        <el-dropdown-menu slot="dropdown">
          <el-dropdown-item command="Freq">Freq</el-dropdown-item>
          <el-dropdown-item v-if="controlState.mode === 'Global'" command="Target-Freq">Target-Freq</el-dropdown-item>
          <el-dropdown-item command="Click">Click</el-dropdown-item>
          <el-dropdown-item command="Ctr">Ctr</el-dropdown-item>
          <el-dropdown-item command="Ecpm">Ecpm</el-dropdown-item>
          <el-dropdown-item command="Expo">Expo</el-dropdown-item>
          <el-dropdown-item command="Cost">Cost</el-dropdown-item>
          <el-dropdown-item command="Cpc">Cpc</el-dropdown-item>
        </el-dropdown-menu>
      </el-dropdown>
      <span>人群定位（待定）</span>
      <span class="fill-space"></span>
    </div>
    <div class="chart"></div>
  </div>
</template>
<script lang="ts">
import { Component, Vue, Watch } from "vue-property-decorator";
import PortraitChart from "@/charts/PortraitChart.ts";
import { Getter, Action, Mutation } from "vuex-class";
import { PortraitOp } from "@/models/portrait";
import Bus from "@/charts/event-bus";
import { TargetingInfo } from "@/models/targeting";
@Component({
  mounted() {
    const vm: any = this;
    vm.chart = new PortraitChart(".portrait .chart");
    vm.handleCoordinate();
  }
})
export default class Portrait extends Vue {
  chart!: PortraitChart;

  detailedData!: any;

  @Getter("systemLoaded")
  systemLoaded!: boolean;
  @Getter("detailLoaded")
  detailLoaded!: boolean;

  get typeStr() {
    if (this.controlState.types === "流量") return "site_set";
    if (this.controlState.types === "行业") return "industry_id";
    if (this.controlState.types === "产品类型") return "product_type";
    if (this.controlState.types === "平台") return "ad_platform_type";
  }

  get loadingText() {
    if (this.systemLoaded === false) return "Loading...";
    if (this.detailLoaded === false) return "加载详情数据...";
    else return "";
  }

  // 用于接收关系图传来的被高亮的定向
  highlightedTarget: TargetingInfo | null = null;
  // 用于接收关系图传来的被过滤的定向
  filteredTargets: TargetingInfo[] | null = null;

  @Getter("currentOpLog")
  currentState!: any;

  @Watch("currentState")
  watchCurrentState(nval: any) {
    if (nval == null) return;
    this.initState(nval);
    this.renderChart();
  }

  @Watch("detailLoaded")
  watchDetailLoaded(nval: boolean) {
    if (
      nval === false ||
      this.currentState == null ||
      this.currentState.portraitState.detailedData == null
    )
      return;
    this.controlState.mode = "Detail";
    this.detailedData = this.currentState.portraitState.detailedData;
    this.controlState.index === "Target-Freq"
      ? "Freq"
      : this.controlState.index;
    this.renderChart();
  }

  handleCoordinate() {
    Bus.$on("highlight-target", (message: any) => {
      this.highlightedTarget = message;
      if (this.currentState == null) return;
      this.renderChart();
    });
    Bus.$on("filter-targets", (message: any) => {
      this.filteredTargets = message;
      if (this.currentState == null) return;
      this.renderChart();
    });
    Bus.$on("change-global", () => {
      this.controlState.mode = "Global";
      this.controlState.index = "Freq";
      this.detailedData = null;
      this.renderChart();
    });
    // Bus.$on("select-cmb", () => {
    //   if (this.controlState.mode === "Detail") {
    //     this.controlState.mode = "Global";
    //     this.controlState.index = "Freq";
    //     this.detailedData = null;
    //     this.renderChart();
    //   }
    // });
  }

  // 切换行业、产品类型、流量等
  handleTypeClick(command: string) {
    this.controlState.types = command;
    this.controlState.condition = this.typeStr;
    this.renderChart();
  }

  controlState: any = {};

  renderChart() {
    if (this.controlState.mode === "Global")
      this.chart.loadData(
        this.data[this.controlState.condition as any],
        this.ids,
        this.controlState.index,
        this.highlightedTarget,
        this.filteredTargets
      );
    else
      this.chart.loadData(
        this.detailedData[this.controlState.condition as any],
        this.ids,
        this.controlState.index,
        this.highlightedTarget,
        this.filteredTargets
      );
  }

  handleMenuClick(command: string) {
    this.controlState.index = command
      .replace(/^([a-z])/, ($1: string) => $1.toUpperCase())
      .replace(/-([a-z])/, ($1: string) => $1.toUpperCase());
    if (this.currentState == null) return;
    this.renderChart();
  }

  data: any = null;
  ids: TargetingInfo[] = [];

  initState(op: any) {
    // 当前视图所要展示的指标
    this.controlState = Object.assign({}, op.portraitState.controlState);
    // 当前是否有需要高亮的定向
    this.highlightedTarget = op.highlightedTarget;
    // 是否有被过滤的定向
    this.filteredTargets = op.filteredTargets;
    this.data = op.portraitState.data;
    this.ids = op.targets;
    this.detailedData = op.portraitState.detailedData;
  }
}
</script>
<style>
.info-table .chart {
  padding: 10px;
}
.portrait {
  overflow: hidden;
}
</style>

