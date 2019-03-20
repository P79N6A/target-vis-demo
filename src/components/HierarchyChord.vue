<template>
  <div
    :element-loading-text="loadingText"
    v-loading="!allLoaded"
    class="hierarchy-chord chart-container"
  >
    <div class="panel">
      <span class="view-name">Relation View</span>
      <el-dropdown trigger="click" @command="handleMenuClick">
        <span>
          <el-button type="text">{{index[0].toUpperCase() + index.substring(1)}}</el-button>
        </span>
        <el-dropdown-menu slot="dropdown">
          <el-dropdown-item command="Freq">Freq</el-dropdown-item>
          <el-dropdown-item command="Cost">Cost</el-dropdown-item>
        </el-dropdown-menu>
      </el-dropdown>
      <span v-if="enterFullScreen" @click="handlePan" :class="{active: panable}">缩放与平移</span>
      <span class="active" v-if="!enterFullScreen">
        <el-popover trigger="click">
          <op-log
            :direction="'horizontal'"
            :className="''"
            :index="opPointer"
            @change-op="handleChangeOp"
            :data="opLogs"
          ></op-log>
          <i class="el-icon-document" slot="reference"></i>
        </el-popover>
      </span>
      <span class="fill-space"></span>
      <span class="active" @click="fullscreen">Fullscreen</span>
    </div>
    <op-log
      :direction="'vertical'"
      :className="'op-log'"
      :index="opPointer"
      @change-op="handleChangeOp"
      v-if="enterFullScreen"
      :data="opLogs"
    ></op-log>
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
import {
  TargetingTreeNode,
  TargetingInfo,
  RelationData
} from "@/models/targeting";
import { FilterForm, RelationPostData, RelationOp } from "@/models";

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
  index: string = "freq";
  activeId: TargetingInfo | null = null;
  filteredIds: TargetingInfo[] | null = null;
  cmbs: TargetingInfo[] | null = null;
  data: RelationData[] = [];
  ids: TargetingInfo[] = [];
  get loadingText() {
    if (this.templateLoaded === false) return "加载定向树...";
    if (this.loaded === false) return "计算定向关系...";
    if (this.combinationLoaded === false) return "等待其他视图返回数据";
  }
  get allLoaded() {
    return this.templateLoaded && this.loaded && this.combinationLoaded;
  }
  get currentOp() {
    return this.opLogs.find(item => item.key === this.opPointer);
  }

  @Getter("templateLoaded", { namespace: "template" })
  templateLoaded!: boolean;
  @Getter("loaded", { namespace: "relation" })
  loaded!: boolean;
  @Getter("loaded", { namespace: "combination" })
  combinationLoaded!: boolean;
  @Mutation("opPointerMutation", { namespace: "relation" })
  opPointerMutation(payload: string) {}
  @Action("createState", { namespace: "relation" })
  createState() {}
  @Action("addState", { namespace: "relation" })
  addState(payload: any) {}
  @Getter("template", { namespace: "template" })
  template!: TargetingTreeNode;
  @Getter("opLogs", { namespace: "relation" })
  opLogs!: RelationOp[];
  @Getter("opPointer", { namespace: "relation" })
  opPointer!: string;

  // 无论是初始加载还是全局条件改变,都需要重新获取一份模板
  // 因此只需要监听模板加载的状态来决定是否重新计算
  @Watch("templateLoaded")
  watchTemplateLoaded(nVal: boolean) {
    if (nVal === false) return;
    if (this.restore === true && this.opPointer !== "") {
      this.restore = false;
      if (this.currentOp == null) return;
      // this.chart.loadData(this.currentOp);
    } else {
      this.restore = false;
      this.createState();
    }
  }

  @Watch("opPointer")
  watchOpPointer(nVal: string) {
    if (this.currentOp == null) return;
    this.initState(this.currentOp);
    this.chart.loadData(
      this.data,
      this.ids,
      this.filteredIds,
      this.activeId,
      this.index,
      this.cmbs
    );
  }

  // 在每一次opPointer产生变化时,将所有状态初始化
  initState(op: RelationOp) {
    this.data = op.data;
    this.ids = op.ids;
    this.activeId = op.activeId;
    this.filteredIds = op.filteredIds;
    this.cmbs = op.cmbs;
    this.index = op.index;
  }

  @Mutation("saveStateMutation", { namespace: "relation" })
  saveStateMutation(payload: RelationOp) {}

  // 处理切换状态
  handleChangeOp(pointer: string) {
    this.opPointerMutation(pointer);
    Bus.$emit("change-op", pointer);
  }

  // 处理平移与缩放
  handlePan() {
    this.panable = !this.panable;
    this.chart.drag(this.panable);
    this.chart.zoom(this.panable);
  }

  handleMenuClick(index: string) {
    this.index = index[0].toLowerCase() + index.substring(1);
    if (this.currentOp == null) return;
    this.chart.loadData(
      this.currentOp.data,
      this.currentOp.ids,
      this.filteredIds,
      this.activeId,
      this.index,
      this.cmbs
    );
  }

  // 处理联动
  handleCoordinate() {
    Bus.$on("drilldown", (message: any) => {
      if (this.currentOp != null) {
        let newOp = Object.assign({}, this.currentOp, {
          activeId: this.activeId,
          filteredIds: this.filteredIds,
          cmbs: this.cmbs,
          index: this.index
        });
        this.saveStateMutation(newOp);
      }
      let drilldown = message.drilldown;
      let result = getNextLevelTargets(this.template, drilldown.clicked.id);
      if (result.length === 0) {
        this.$message({ type: "info", message: "当前被下钻的定向已无子定向" });
        return;
      }
      let index = drilldown.ids.findIndex(
        (c: any) => c.id === drilldown.clicked.id
      );
      drilldown.ids.splice(index, 1, ...result);
      this.addState(message);
      Bus.$emit("drilldown-addState", message);
    });
    Bus.$on("select-cmb", (message: TargetingInfo[] | null) => {
      this.cmbs = message;
      if (this.currentOp == null) return;
      this.chart.loadData(
        this.currentOp.data,
        this.currentOp.ids,
        this.filteredIds,
        this.activeId,
        this.index,
        this.cmbs
      );
    });
    Bus.$on("highlight-target", (message: TargetingInfo) => {
      this.activeId = message;
    });
    Bus.$on("filter-targets", (message: TargetingInfo[]) => {
      this.filteredIds = message.length === 0 ? null : message;
    });
    Bus.$on("alert-send-cmb", () =>
      this.$message({ type: "info", message: "请先取消定向组合选择" })
    );
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


