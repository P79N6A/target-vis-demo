<template>
  <div
    class="portrait chart-container"
    v-loading="!templateLoaded || !loaded"
    :element-loading-text="loadingText"
  >
    <div class="panel">
      <span class="view-name">Indexes ({{mode === 'Global' ? 'Global' : 'Detail'}})</span>
      <el-dropdown trigger="click" @command="handleMenuClick">
        <el-button type="text">{{index}}</el-button>
        <el-dropdown-menu slot="dropdown">
          <el-dropdown-item command="Freq">Freq</el-dropdown-item>
          <el-dropdown-item v-if="mode === 'Global'" command="Target-Freq">Target-Freq</el-dropdown-item>
          <el-dropdown-item command="Click">Click</el-dropdown-item>
          <el-dropdown-item command="Ctr">Ctr</el-dropdown-item>
          <el-dropdown-item command="Ecpm">Ecpm</el-dropdown-item>
          <el-dropdown-item command="Expo">Expo</el-dropdown-item>
          <el-dropdown-item command="Cost">Cost</el-dropdown-item>
          <el-dropdown-item command="Cpc">Cpc</el-dropdown-item>
        </el-dropdown-menu>
      </el-dropdown>
      <el-dropdown trigger="click" @command="handleTypeClick">
        <el-button type="text">{{type}}</el-button>
        <el-dropdown-menu slot="dropdown">
          <el-dropdown-item command="流量">流量</el-dropdown-item>
          <el-dropdown-item command="行业">行业</el-dropdown-item>
          <el-dropdown-item command="产品类型">产品类型</el-dropdown-item>
          <el-dropdown-item command="平台">平台</el-dropdown-item>
        </el-dropdown-menu>
      </el-dropdown>
      <span class="fill-space"></span>
    </div>
    <div class="chart"></div>
  </div>
</template>
<script lang="ts">
import { Component, Vue, Watch } from "vue-property-decorator";
import PortraitChart from "@/charts/PortraitChart.ts";
import { Getter, Action, Mutation } from "vuex-class";
import { PortraitOp } from "@/models";
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
  @Getter("templateLoaded", { namespace: "template" })
  templateLoaded!: boolean;
  @Watch("templateLoaded")
  watchTemplateLoaded(nVal: boolean) {
    if (nVal === false) return;
    this.createState(this.typeStr as string);
  }

  get typeStr() {
    if (this.type === "流量") return "site_set";
    if (this.type === "行业") return "industry_id";
    if (this.type === "产品类型") return "product_type";
    if (this.type === "平台") return "ad_platform_type";
  }

  type: string = "流量";
  mode: string = "Global";

  // 用于接收关系图传来的被高亮的定向
  activeId: TargetingInfo | null = null;
  // 用于接收关系图传来的被过滤的定向
  filteredIds: TargetingInfo[] | null = null;

  adgroupids: string = "";

  @Mutation("saveStateMutation", { namespace: "portrait" })
  saveStateMutation(payload: PortraitOp) {}

  @Mutation("opPointerMutation", { namespace: "portrait" })
  opPointerMutation(payload: string) {}

  handleCoordinate() {
    Bus.$on("drilldown-addState", (message: any) => {
      if (this.currentOp == null) return;
      let newOp = Object.assign({}, this.currentOp, {
        index: this.index,
        mode: this.mode,
        activeId: this.activeId,
        filteredIds: this.filteredIds,
        condition: this.condition
      });
      this.saveStateMutation(newOp);
      this.addState(message.drilldown);
    });

    Bus.$on("change-op", (message: string) => {
      this.opPointerMutation(message);
    });

    Bus.$on("highlight-target", (message: any) => {
      this.activeId = message;
      if (this.currentOp == null) return;
      this.chart.loadData(
        this.data,
        this.ids,
        this.index,
        this.activeId,
        this.filteredIds
      );
    });
    Bus.$on("filter-targets", (message: any) => {
      this.filteredIds = message.length === 0 ? null : message;
      if (this.currentOp == null) return;
      this.chart.loadData(
        this.currentOp.data,
        this.currentOp.ids,
        this.index,
        this.activeId,
        this.filteredIds
      );
    });
    Bus.$on("get-detail", (message: string) => {
      this.adgroupids = message;
      this.changeState(
        Object.assign({
          condition: this.typeStr as string,
          ids: this.ids,
          adgroupids: this.adgroupids
        })
      );
    });
    Bus.$on("select-cmb", () => {
      if (this.mode === "Detail") {
        this.mode = "Global";
        this.index = "Freq";
        this.renderChart();
      }
    });
  }

  @Getter("loaded", { namespace: "portrait" })
  loaded!: boolean;

  @Action("createState", { namespace: "portrait" })
  createState(payload: string) {}
  @Action("changeState", { namespace: "portrait" })
  changeState(payload: string) {}

  // 切换行业、产品类型、流量等
  handleTypeClick(command: string) {
    this.type = command;
    this.condition = this.typeStr;
    this.changeState(
      Object.assign({
        condition: this.typeStr as string,
        ids: this.ids
        // adgroupids: this.adgroupids
      })
    );
  }

  @Getter("opPointer", { namespace: "portrait" })
  opPointer!: string;
  @Getter("opLogs", { namespace: "portrait" })
  opLogs!: PortraitOp[];

  @Watch("loaded")
  watchLoaded(nval: string) {
    if (this.currentOp == null) return;
    this.initState(this.currentOp);
    this.renderChart();
  }

  @Watch("opPointer")
  watchOpPointer(nVal: string) {
    if (nVal === "") return;
    if (this.currentOp == null) return;
    this.initState(this.currentOp);
    this.renderChart();
  }

  renderChart() {
    if (this.mode === "Global")
      this.chart.loadData(
        this.data,
        this.ids,
        this.index,
        this.activeId,
        this.filteredIds
      );
    else
      this.chart.loadData(
        this.detailedData,
        this.ids,
        this.index,
        this.activeId,
        this.filteredIds
      );
  }

  @Action("addState", { namespace: "portrait" })
  addState(payload: any) {}

  handleMenuClick(command: string) {
    if (this.currentOp == null) return;
    this.index = command
      .replace(/^([a-z])/, ($1: string) => $1.toUpperCase())
      .replace(/-([a-z])/, ($1: string) => $1.toUpperCase());
    this.renderChart();
  }

  index: string = "";
  data: any[] = [];
  ids: TargetingInfo[] = [];
  condition: any = "";
  detailedData: any = null;

  initState(op: PortraitOp) {
    // 当前视图所要展示的指标
    this.index = op.index
      .replace(/^([a-z])/, ($1: string) => $1.toUpperCase())
      .replace(/-([a-z])/, $1 => $1.toUpperCase());
    // 当前是否有需要高亮的定向
    this.activeId = op.activeId;
    // 是否有被过滤的定向
    this.filteredIds = op.filteredIds;
    this.data = op.data;
    this.ids = op.ids;
    this.condition = op.condition;
    this.detailedData = op.detailedData;
    this.mode = op.mode;
  }

  get currentOp() {
    return this.opLogs.find(item => item.key === this.opPointer);
  }

  get loadingText() {
    if (this.templateLoaded === false) return "加载定向树...";
    if (this.loaded === false) return "计算数据...";
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

