<template>
  <div
    :element-loading-text="loadingText"
    v-loading="!templateLoaded || !loaded"
    class="combination-target chart-container"
  >
    <div class="panel">
      <span class="view-name">Combination View</span>
      <el-dropdown trigger="click" @command="handleMenuClick">
        <el-button type="text">Sort by {{sorter[0].toUpperCase() + sorter.substring(1)}}</el-button>
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
          <el-button type="text">Top {{itemSize}}</el-button>
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
        :class="{ active: selectedCmb != null && detailedLoaded === true }"
        @click="handleDetail"
      >Switch to detail</span>
      <span class="fill-space"></span>
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
import { CombinationOp } from "@/models";
@Component({
  mounted() {
    const vm: any = this;
    vm.chart = new CombinationTargetChart(".combination-target .chart");
    vm.handleCoordinate();
  }
})
export default class CombinationTarget extends Vue {
  chart!: CombinationTargetChart;
  lock: boolean = false;
  itemSize: number = 30;

  @Getter("loaded", { namespace: "relation" })
  rLoade!: boolean;

  get loadingText() {
    if (this.templateLoaded === false) return "加载定向树...";
    else if (this.loaded === false) return "计算定向组合模式...";
    else return "等待其它视图加载数据...";
  }

  orAndStr: string = "";

  map: object = {};
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

  get currentOp() {
    return this.opLogs.find(item => item.key === this.opPointer);
  }

  @Watch("filteredIds")
  watchfilteredIds(nVal: TargetingInfo[] | null) {
    this.filteredIds = nVal == null ? [] : nVal;
    if (this.currentOp == null) return;
    else this.process(this.currentOp.data);
  }

  @Mutation("modeMutation", { namespace: "parallelCoordinate" })
  modeMutation(mode: string) {}

  lockForm: boolean = false;

  detailActivate: boolean = false;

  selectedCmb: TargetingInfo[] | null = null;

  @Mutation("indexesMutation", { namespace: "parallelCoordinate" })
  indexesMutation(payload: string[]) {}

  @Action("addState", { namespace: "combination" })
  addState(payload: any) {}

  @Mutation("opPointerMutation", { namespace: "combination" })
  opPointerMutation(payload: string) {}

  @Getter("templateLoaded", { namespace: "template" })
  templateLoaded!: boolean;
  @Watch("templateLoaded")
  watchTemplateLoaded(nVal: boolean) {
    if (nVal === false) return;
    // 当第一次加载视图并且opPointer不为空,表明当前应恢复视图在上一次操作中保存的状态
    if (this.restore === true && this.opPointer !== "") {
      this.restore = false;
    } else {
      this.createState();
    }
  }
  @Action("createState", { namespace: "combination" })
  createState() {}
  @Getter("loaded", { namespace: "combination" })
  loaded!: boolean;
  processedData: CombinationData[] = [];

  @Getter("opLogs", { namespace: "combination" })
  opLogs!: CombinationOp[];
  @Getter("opPointer", { namespace: "combination" })
  opPointer!: string;

  @Mutation("dataMutation", { namespace: "parallelCoordinate" })
  dataMutation(payload: any[]) {}

  @Watch("opPointer")
  watchOpPointer(nVal: string) {
    let op = this.currentOp;
    if (op == null) return;
    this.initState(op);
    this.initData(op.data as CombinationData[]);
    this.indexesMutation(this.indexes);
    this.process(op.data);
  }

  @Watch("or")
  watchOr(nVal: string[]) {
    this.selectableAnd.forEach((item: any) => {
      let index = this.or.indexOf(item.id);
      if (index !== -1) item.disabled = true;
      else item.disabled = false;
    });
  }

  initState(op: CombinationOp) {
    this.data = op.data;
    this.sorter = op.sorter;
    this.itemSize = op.itemSize;
    let sIdx = this.indexes.indexOf(this.sorter);
    [this.indexes[0], this.indexes[sIdx]] = [
      this.indexes[sIdx],
      this.indexes[0]
    ];
    this.ids = op.ids;
    this.orAndStr = op.orAndStr;
    let { and, or } = JSON.parse(this.orAndStr);
    this.and = and;
    this.or = or;
    this.selectableAnd = op.ids.map(item => Object.assign({}, item));
    this.selectableOr = op.ids.map(item => Object.assign({}, item));
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
    this.activeId = op.activeId;
    this.selectedCmb = op.selectedCmb;
    this.filteredIds = op.filteredIds == null ? [] : op.filteredIds;
    this.brushedCmbs = op.brushCmbs;
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

  @Watch("and")
  watchAnd(nVal: string[]) {
    // And 值改变有两种
    if (this.lockForm === true) {
      if (this.currentOp == null) return;
      this.process(this.currentOp.data);
    }
    this.selectableOr.forEach((item: any) => {
      let index = this.and.indexOf(item.id);
      if (index !== -1) item.disabled = true;
      else item.disabled = false;
    });
  }

  @Mutation("saveStateMutation", { namespace: "combination" })
  saveStateMutation(payload: any) {}

  handleCoordinate() {
    Bus.$on("highlight-target", (message: TargetingInfo) => {
      if (message == null) {
        this.cancelAnd();
      } else {
        this.activeId = message;
        this.operateAnd(this.activeId);
      }
      if (this.currentOp == null) return;
      this.process(this.data);
    });
    Bus.$on("filter-targets", (message: any) => {
      this.filteredIds = message;
      if (this.currentOp == null) return;
      this.process(this.data);
    });
    Bus.$on("select-cmb", (message: any) => {
      this.selectedCmb = message;
    });
    Bus.$on("drilldown", (message: any) => {
      // 每次组合图下钻之前,应把之前的or and sorter等状态保存
      let newOp = Object.assign({}, this.currentOp, {
        orAndStr: this.orAndStr,
        activeId: this.activeId,
        filteredIds: this.filteredIds,
        itemSize: this.itemSize,
        sorter: this.sorter,
        selectedCmb: this.selectedCmb,
        brushCmbs: this.brushedCmbs
      });
      this.cancelAnd();
      this.saveStateMutation(
        Object.assign({ opPointer: this.opPointer, op: newOp })
      );
      this.addState(message.drilldown);
    });
    Bus.$on("change-op", (message: string) => {
      // this.cancelAnd();
      this.opPointerMutation(message);
    });
    Bus.$on("cmbs-brush", (message: any) => {
      this.brushedCmbs = message;
      if (this.currentOp == null) return;
      this.chart.loadData(
        this.processedData,
        this.ids,
        this.and,
        this.or,
        this.filteredIds,
        this.selectedCmb,
        this.brushedCmbs
      );
    });
  }
  brushedCmbs: string[] | null = null;
  selectedCmbtargets: string = "";

  onSubmit() {
    this.orAndStr = JSON.stringify(
      Object.assign({ or: this.or, and: this.and })
    );
    if (this.currentOp == null) return;
    this.brushedCmbs = null;
    this.process(this.currentOp.data);
    this.showPopmenu = false;
  }

  initData(data: CombinationData[]) {
    if (data.length == 0) return;
    let map = new Map<number, string[]>();
    data.forEach((d, i) => {
      if (d.index == null) d.index = i;
      map.set(i, (d as any).adgroupids);
      delete (d as any).adgroupids;
    });
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
    let topData = data.slice(0, this.itemSize);
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
  @Mutation("addState", { namespace: "parallelCoordinate" })
  addStateP(payload: any) {}

  process(data: CombinationData[]) {
    this.processedData = this.getDataByOrAnd(data);
    this.processedData = this.sortData(this.processedData, this.sorter);
    this.processedData = this.limitData(this.processedData);
    this.chart.loadData(
      this.processedData,
      this.ids,
      this.and,
      this.or,
      this.filteredIds,
      this.selectedCmb,
      this.brushedCmbs
    );
    this.addStateP(
      Object.assign({
        data: this.processedData,
        indexes: this.indexes,
        selectedCmb: this.selectedCmb,
        brushCmbs: this.brushedCmbs
      })
    );
  }

  @Getter("detailedLoaded", { namespace: "parallelCoordinate" })
  detailedLoaded!: boolean;

  handleDetail() {
    Bus.$emit("get-detail");
  }

  sortData(data: CombinationData[], condition: string) {
    data.sort(function(a: any, b: any) {
      return b[condition] - a[condition];
    });
    return data;
  }

  handleMenuClick(sorter: string) {
    this.sorter = sorter.toLowerCase();
    let sIdx = this.indexes.indexOf(this.sorter);
    let clickedIndex = this.indexes[sIdx];
    this.indexes.splice(sIdx, 1);
    this.indexes.unshift(clickedIndex);
    let op = this.currentOp;
    if (op == null) return;
    this.brushedCmbs = null;
    this.process(op.data);
  }

  handleSizeChange(size: number) {
    this.itemSize = +size;
    if (this.currentOp == null) return;
    this.process(this.currentOp.data);
  }
}
</script>
<style>
.combination-target.chart-container .chart {
  overflow-y: scroll;
}
</style>

