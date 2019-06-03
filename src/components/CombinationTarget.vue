<template>
  <div
    :element-loading-text="loadingText"
    v-loading="!systemLoaded"
    class="combination-target chart-container"
  >
    <div class="panel">
      <span class="view-name">定向组合图</span>
      <el-dropdown trigger="click" @command="handleMenuClick">
        <el-button type="text">排序: {{sorter[0].toUpperCase() + sorter.substring(1)}}</el-button>
        <el-dropdown-menu slot="dropdown">
          <el-dropdown-item command="Freq">Freq</el-dropdown-item>
          <el-dropdown-item command="Click">Click</el-dropdown-item>
          <el-dropdown-item command="Ctr">Ctr</el-dropdown-item>
          <el-dropdown-item command="Ecpm">Ecpm</el-dropdown-item>
          <el-dropdown-item command="Expo">Expo</el-dropdown-item>
          <el-dropdown-item command="Cost">Cost</el-dropdown-item>
          <el-dropdown-item command="Cpc">Cpc</el-dropdown-item>
        </el-dropdown-menu>
      </el-dropdown>

      <el-dropdown trigger="click" @command="handleSizeChange">
        <span>
          <el-button type="text">Top {{limit}}</el-button>
        </span>
        <el-dropdown-menu slot="dropdown">
          <el-dropdown-item command="10">10</el-dropdown-item>
          <el-dropdown-item command="20">20</el-dropdown-item>
          <el-dropdown-item command="30">30</el-dropdown-item>
          <el-dropdown-item command="40">40</el-dropdown-item>
        </el-dropdown-menu>
      </el-dropdown>

      <el-popover @hide="handleCancel" v-model="showPopmenu" trigger="click">
        <el-form
          :disabled="lockForm || selectedCmb != null"
          label-width="100px"
          :label-position="'right'"
        >
          <el-form-item label="选择必含定向:">
            <el-select v-model="and" multiple>
              <el-option
                v-for="(i, idx) in selectableAnd"
                :key="idx"
                :label="i.name"
                :value="i.id"
                :disabled="i.disabled"
              ></el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="选择可含定向:">
            <el-select v-model="or" multiple>
              <el-option
                v-for="(i, idx) in selectableOr"
                :key="idx"
                :label="i.name"
                :value="i.id"
                :disabled="i.disabled"
              ></el-option>
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button @click="handleCancel">取消</el-button>
            <el-button @click="onSubmit" type="primary">提交</el-button>
          </el-form-item>
        </el-form>
        <el-button slot="reference" type="text">And | Or</el-button>
      </el-popover>
      <span
        :class="{ active: selectedCmb != null  }"
        @click="handleDetail"
      >{{mode !== 'Global' ? '全局' : '详情'}}模式</span>
      <span
        :class="{ active: selectedCmb != null  }"
        @click="handleCrowdLocation"
      >{{mode === 'Crowd-Location' ? '关闭' : '开启'}}人群定位</span>
      <span class="fill-space"></span>
    </div>
    <div v-show="titles" class="title-container">
      <span
        v-for="(title, index) in titles"
        :key="index"
        :style="{color: title.textFill, left: title.leftPos + 'px'}"
      >{{title.content}}</span>
    </div>
    <div class="chart"></div>
  </div>
</template>
<script lang="ts">
import { Component, Vue, Watch } from "vue-property-decorator";
import { CombinationData, TargetingInfo } from "@/models/targeting";
import CombinationTargetChart, {
  sorter
} from "@/charts/CombinationTargetChart";
import { Getter, Mutation, Action } from "vuex-class";
import Bus from "@/charts/event-bus";
import { CombinationOp } from "@/models/combination";
@Component({
  mounted() {
    const vm: any = this;
    vm.chart = new CombinationTargetChart(".combination-target .chart");
    vm.handleCoordinate();
  }
})
export default class CombinationTarget extends Vue {
  chart!: CombinationTargetChart;

  limit: number = 30;

  @Getter("systemLoaded")
  systemLoaded!: boolean;
  @Getter("currentOpLog")
  currentState!: any;

  @Watch("currentState")
  watchCurrentState(nVal: any) {
    if (nVal == null) return;
    this.initState(nVal);
    if (nVal.type === "Crowd-Location") {
      Bus.$emit("send-data", {
        mode: "Detail",
        detailedData: nVal.combinationState.detailedData,
        indexes: this.indexes,
        selectedCmb: null,
        brushedCmbs: null
      });
      return;
    }

    this.process(this.data);
  }
  @Getter("template/templateLoaded")
  templateLoaded!: boolean;
  get loadingText() {
    if (this.templateLoaded === false) return "定向模板加载中...";
    if (this.systemLoaded === false) return "数据加载中...";
    else return "";
  }

  orAndStr: string = "";

  map: any = null;
  restore: boolean = false;
  and: string[] = [];
  or: string[] = [];
  selectableAnd: TargetingInfo[] = [];
  selectableOr: TargetingInfo[] = [];
  sorter: string = "freq";
  ids: TargetingInfo[] = [];
  data: CombinationData[] = [];
  // 可能由关系图传来
  activeId: TargetingInfo | null = null;
  filteredIds: TargetingInfo[] = [];
  showPopmenu: boolean = false;
  indexes: string[] = ["freq", "expo", "cost", "click", "ctr", "cpc", "ecpm"];

  lockForm: boolean = false;
  titles: any = null;

  detailActivate: boolean = false;

  selectedCmb: TargetingInfo[] | null = null;

  processedData: CombinationData[] = [];

  @Watch("or")
  watchOr(nVal: string[]) {
    this.selectableAnd.forEach((item: any) => {
      let index = this.or.indexOf(item.id);
      if (index !== -1) item.disabled = true;
      else item.disabled = false;
    });
  }

  initState(op: any) {
    this.lockForm = false;
    this.data = op.combinationState.data;
    this.controlState = Object.assign({}, op.combinationState.controlState);
    this.sorter = this.controlState.sorter;
    this.limit = this.controlState.limit;
    this.orAndStr = this.controlState.orAndStr;
    this.brushedCmbs = this.controlState.brushedCmbs;
    this.mode = "Global";
    if (op.type === "Crowd-Location") this.mode = "Crowd-Location";
    // 排序坐标轴
    let sIdx = this.indexes.indexOf(this.sorter);
    [this.indexes[0], this.indexes[sIdx]] = [
      this.indexes[sIdx],
      this.indexes[0]
    ];

    this.ids = op.targets;
    let { and, or } = JSON.parse(this.orAndStr);
    this.and = and;
    this.or = or;
    this.selectableAnd = this.ids
      .filter((id: any) => id.selected === true)
      .map(item => Object.assign({}, item));
    this.selectableOr = this.ids
      .filter((id: any) => id.selected === true)
      .map(item => Object.assign({}, item));
    this.and.forEach(
      item =>
        ((this.selectableOr.find(or => or.id === item) as any).disabled = true)
    );
    this.or.forEach(
      item =>
        ((this.selectableAnd.find(
          and => and.id === item
        ) as any).disabled = true)
    );
    this.activeId = op.highlightedTarget;
    this.selectedCmb = op.selectedCmb;
    this.filteredIds = op.filteredTargets == null ? [] : op.filteredTargets;
    if (this.activeId != null) this.operateAnd(this.activeId);
  }

  operateAnd(target: TargetingInfo) {
    this.and = [target.id];
    this.or = [];
    this.lockForm = true;
  }

  cancelAnd() {
    this.activeId = null;
    let { or, and } = JSON.parse(this.orAndStr);
    this.and = and;
    this.or = or;
    this.lockForm = false;
  }

  // 取消对Or与And的选择
  handleCancel() {
    // 此时应是禁用状态
    this.showPopmenu = false;
    if (this.activeId != null) return;
    let { or, and } = JSON.parse(this.orAndStr);
    this.or = or;
    this.and = and;
  }

  controlState: any = null;

  @Watch("and")
  watchAnd(nVal: string[]) {
    // And 值改变有两种
    if (this.lockForm === true) {
      if (this.currentState == null) return;
      this.process(this.data);
    }
    this.selectableOr.forEach((item: any) => {
      let index = this.and.indexOf(item.id);
      if (index !== -1) item.disabled = true;
      else item.disabled = false;
    });
  }

  handleCoordinate() {
    Bus.$on("highlight-target", (message: TargetingInfo) => {
      if (message == null) {
        this.cancelAnd();
      } else {
        this.activeId = message;
        this.operateAnd(this.activeId);
      }
      if (this.currentState == null) return;
      this.process(this.data);
    });
    Bus.$on("filter-targets", (message: any) => {
      this.filteredIds = message;
      if (this.currentState == null) return;
      this.renderChart();
    });
    Bus.$on("select-cmb", (message: any) => {
      this.selectedCmb = message;
      if (this.selectedCmb == null) {
        this.mode = "Global";
        this.quitDetailModeMutation();
        Bus.$emit("change-global");
        Bus.$emit(
          "send-data",
          Object.assign({
            mode: "Global",
            data: this.processedData.map((item: any) =>
              Object.assign({}, item)
            ),
            detailedData: null,
            indexes: this.indexes,
            selectedCmb: this.selectedCmb,
            brushedCmbs: this.brushedCmbs
          })
        );
        return;
      }
      if (this.mode === "Detail") this.sendGetDetailMessage();
      if (this.mode === "Crowd-Location") this.sendCrowdLocationMessage();
      // this.renderChart();
    });
    Bus.$on("drilldown-addState", (message: any) => {
      // 每次组合图下钻之前,应把之前的or and sorter等状态保存
      this.cancelAnd();
    });
    Bus.$on("paint-titles", (message: any) => {
      this.titles = message;
    });
    Bus.$on("cmbs-brush", (message: any) => {
      this.controlState.brushedCmbs = message;
      this.brushedCmbs = message;
      if (this.currentState == null) return;
      this.renderChart();
    });
  }
  brushedCmbs: string[] | null = null;
  selectedCmbtargets: string = "";

  onSubmit() {
    this.orAndStr = JSON.stringify(
      Object.assign({ or: this.or, and: this.and })
    );
    this.controlState.orAndStr = this.orAndStr;
    if (this.currentState == null) return;
    this.brushedCmbs = null;
    this.process(this.data);
    this.showPopmenu = false;
  }

  getDataByOrAnd(data: CombinationData[]) {
    let filteredData: CombinationData[] = data;
    if (this.and.length !== 0) {
      filteredData = data.filter(d => {
        let cmbtargets = d.cmbtargets.split(",");
        return this.and.every(a => {
          return cmbtargets.indexOf(a) !== -1;
        });
      });
    }
    if (this.or.length !== 0) {
      filteredData = filteredData.filter(d => {
        let cmbtargets = d.cmbtargets.split(",");
        return this.or.some(o => {
          return cmbtargets.indexOf(o) !== -1;
        });
      });
    }
    return filteredData;
  }

  limitData(data: CombinationData[]) {
    let topData = data.slice(0, this.limit);
    topData.forEach((d: any, i: number) => (d.rank = i + 1));
    if (
      this.selectedCmb != null &&
      topData.findIndex(
        data => data.cmbtargets === (this.selectedCmb as any).cmbtargets
      ) === -1
    ) {
      let selectedCmbRank = data.findIndex(
        d => d.cmbtargets === (this.selectedCmb as any).cmbtargets
      );
      topData.push(
        Object.assign({}, data[selectedCmbRank], { rank: selectedCmbRank + 1 })
      );
    }
    return topData;
  }

  renderChart() {
    this.chart.loadData(
      this.processedData,
      this.ids,
      this.and,
      this.or,
      this.filteredIds,
      this.selectedCmb,
      this.brushedCmbs
    );
  }

  process(data: CombinationData[]) {
    this.processedData = this.getDataByOrAnd(data);
    this.processedData = this.sortData(this.processedData, this.sorter);
    this.processedData = this.limitData(this.processedData);
    this.renderChart();
    Bus.$emit(
      "send-data",
      Object.assign({
        mode: "Global",
        data: this.processedData.map((item: any) => Object.assign({}, item)),
        detailedData: null,
        indexes: this.indexes,
        selectedCmb: this.selectedCmb,
        brushedCmbs: this.brushedCmbs
      })
    );
  }

  mode: string = "Global";

  handleCrowdLocation() {
    if (this.mode === "Global") {
      this.mode = "Crowd-Location";
      this.sendCrowdLocationMessage();
    } else if (this.mode === "Crowd-Location") {
      this.quitCrowdLocationMutation();
    }
  }

  @Mutation("quitCrowdLocationMutation")
  quitCrowdLocationMutation() {}
  sendCrowdLocationMessage() {
    if (this.selectedCmb == null) return;
    let selectedCmb = this.selectedCmb.map((item: TargetingInfo) => item.id);
    if (selectedCmb == null) return;
    Bus.$emit("get-crowd-location", selectedCmb);
  }

  @Mutation("quitDetailModeMutation")
  quitDetailModeMutation() {}

  handleDetail() {
    if (this.mode === "Global") {
      this.mode = "Detail";
      this.sendGetDetailMessage();
    } else if (this.mode === "Detail") {
      this.mode = "Global";
      Bus.$emit("change-global");
      this.quitDetailModeMutation();
      Bus.$emit(
        "send-data",
        Object.assign({
          mode: "Global",
          data: this.processedData.map((item: any) => Object.assign({}, item)),
          detailedData: null,
          indexes: this.indexes,
          selectedCmb: this.selectedCmb,
          brushedCmbs: this.brushedCmbs
        })
      );
    }
  }

  sendGetDetailMessage() {
    if (this.selectedCmb == null) return;
    let selectedCmb = this.selectedCmb.map((item: TargetingInfo) => item.id);
    Bus.$emit("get-detail", selectedCmb);
  }

  @Getter("detailLoaded")
  detailLoaded!: boolean;

  @Watch("detailLoaded")
  watchDetailLoaded(nVal: boolean) {
    if (
      nVal === false ||
      this.currentState == null ||
      this.currentState.combinationState.detailedData == null
    )
      return;
    Bus.$emit(
      "send-data",
      Object.assign({
        mode: "Detail",
        detailedData: this.currentState.combinationState.detailedData,
        indexes: this.indexes,
        selectedCmb: null,
        brushedCmbs: null
      })
    );
  }

  sortData(data: CombinationData[], condition: string) {
    data.sort(function(a: any, b: any) {
      return b[condition] - a[condition];
    });
    return data;
  }

  handleMenuClick(sorter: string) {
    this.sorter = sorter.toLowerCase();
    this.controlState.sorter = sorter.toLowerCase();
    let sIdx = this.indexes.indexOf(this.sorter);
    let clickedIndex = this.indexes[sIdx];
    this.indexes.splice(sIdx, 1);
    this.indexes.unshift(clickedIndex);
    if (this.currentState == null) return;
    this.brushedCmbs = null;
    this.process(this.data);
  }

  handleSizeChange(size: number) {
    this.limit = +size;
    this.controlState.limit = this.limit;
    if (this.currentState == null) return;
    this.brushedCmbs = null;
    this.process(this.data);
  }
}
</script>
<style>
.combination-target.chart-container .chart {
  overflow-y: scroll;
}
.combination-target.chart-container .title-container {
  overflow-x: hidden;
  position: relative;
  margin-left: 60px;
  height: 80px;
  font-size: 12px;
}
.combination-target.chart-container .title-container span {
  position: absolute;
  top: 65px;
  min-width: 100px;
  transform-origin: left;
  transform: rotate(-45deg);
}
</style>

