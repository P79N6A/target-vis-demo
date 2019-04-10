<template>
  <div
    class="portrait chart-container"
    v-loading="!systemLoaded || !detailLoaded || !targetFreqLoaded"
    :element-loading-text="loadingText"
  >
    <div class="panel">
      <span class="view-name">广告指标图 ({{controlState.mode === 'Global' ? '全局' : '定向组合限定'}})</span>
      <el-dropdown trigger="click" @command="handleTypeClick">
        <el-button type="text">{{typeStr}}维度</el-button>
        <el-dropdown-menu slot="dropdown">
          <el-dropdown-item command="siteSet">流量</el-dropdown-item>
          <el-dropdown-item command="industry">行业</el-dropdown-item>
          <el-dropdown-item command="prodType">产品类型</el-dropdown-item>
          <el-dropdown-item command="platform">平台</el-dropdown-item>
        </el-dropdown-menu>
      </el-dropdown>

      <el-dropdown trigger="click" @command="handleMenuClick">
        <el-button type="text">{{index}}</el-button>
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
      <span
        @click="handleMoreDetail"
        class="active"
        v-if="controlState.mode === 'Detail'"
      >{{!moreDetail ? '打开' : '关闭'}}人群定位</span>
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
  moreDetail: boolean = false;

  @Getter("systemLoaded")
  systemLoaded!: boolean;
  @Getter("detailLoaded")
  detailLoaded!: boolean;
  @Getter("targetFreqLoaded")
  targetFreqLoaded!: boolean;

  get typeStr() {
    if (this.controlState.mode === "Global") {
      if (this.controlState.types === "siteSet") return "流量";
      if (this.controlState.types === "industry") return "行业";
      if (this.controlState.types === "prodType") return "产品类型";
      if (this.controlState.types === "platform") return "平台";
    } else {
      if (this.types === "siteSet") return "流量";
      if (this.types === "industry") return "行业";
      if (this.types === "prodType") return "产品类型";
      if (this.types === "platform") return "平台";
    }

    return "";
  }

  get loadingText() {
    if (this.systemLoaded === false) return "Loading...";
    if (this.detailLoaded === false) return "加载详情数据...";
    if (this.targetFreqLoaded === false) return "加载定向频次数据...";
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
    this.index = "Freq";
    this.types = "siteSet";
    this.renderChart();
  }

  @Watch("targetFreqLoaded")
  watchTargetFreqLoaded(nVal: boolean) {
    if (nVal === false) return;
    this.renderChart();
  }

  handleMoreDetail() {}

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
      this.index = this.controlState.index;
      this.types = this.controlState.types;
      this.detailedData = null;
      this.renderChart();
    });
  }

  @Action("loadTargetFreq")
  loadTargetFreq(payload: any) {}

  // 切换行业、产品类型、流量等
  handleTypeClick(command: string) {
    if (command == this.types) return;
    this.types = command;
    if (this.controlState.mode !== "Detail") this.controlState.types = command;

    this.fixTargetFreq();
  }

  handleMenuClick(command: string) {
    if (this.index == command) return;
    this.index = command;
    // 详情模式下不更改types与index
    if (this.controlState.mode !== "Detail") this.controlState.index = command;
    if (this.currentState == null) return;
    this.fixTargetFreq();
  }

  index: string = "";
  types: string = "";
  condition: string = "";

  initState(op: any) {
    // 当前视图所要展示的指标
    this.controlState = Object.assign({}, op.portraitState.controlState);
    this.index = this.controlState.index;
    this.types = this.controlState.types;
    // 当前是否有需要高亮的定向
    this.highlightedTarget = op.highlightedTarget;
    // 是否有被过滤的定向
    this.filteredTargets = op.filteredTargets;
    this.data = op.portraitState.data;
    this.ids = op.targets;
    this.detailedData = op.portraitState.detailedData;
  }

  // 如果当前维度下没有加载对应的定向频次,则需要尝试加载
  fixTargetFreq() {
    if (
      this.controlState.mode === "Global" &&
      this.controlState.index === "Target-Freq"
    ) {
      let map: any = {
        siteSet: "site_set",
        platform: "ad_platform_type",
        prodType: "product_type",
        industry: "industry_id"
      };
      let index = this.controlState.types;
      let tmpData = this.currentState.portraitState.data[index];
      let hasPattern = tmpData.some((item: any) => item.pattern != null);
      if (hasPattern === true) this.renderChart();
      else
        this.loadTargetFreq(
          Object.assign({
            ids: this.ids.map((item: any) => item.id),
            condition: map[index]
          })
        );
    } else {
      this.renderChart();
    }
  }

  controlState: any = {};

  renderChart() {
    if (this.controlState.mode === "Global")
      this.chart.loadData(
        this.data[this.controlState.types],
        this.ids,
        this.controlState.index,
        this.highlightedTarget,
        this.filteredTargets
      );
    else
      this.chart.loadData(
        this.detailedData[this.types],
        this.ids,
        this.index,
        this.highlightedTarget,
        this.filteredTargets
      );
  }

  data: any = null;
  ids: TargetingInfo[] = [];
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

