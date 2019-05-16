<template>
  <div class="global-control-panel">
    <div class="panel">
      <span class="view-name">筛选器</span>

      <span class="active" @click="showDialog = true">定向结构</span>
      <span class="active">
        <i v-if="!templateLoaded || !typesLoaded" class="el-icon-loading"></i>
      </span>
      <span class="fill-space"></span>
      <span class="active" v-if="typesLoaded" @click="openDialog">保存</span>
    </div>
    <div class="filter-form">
      <el-tabs>
        <el-tab-pane label="广告属性">
          <el-form
            v-if="form != null"
            :disabled="!templateLoaded || !typesLoaded || !systemLoaded"
            :label-position="'right'"
            label-width="75px"
          >
            <el-form-item label="流量:" prop="siteSet">
              <el-select
                :placeholder="form.siteSet.length === 0 ? '搜索或选择流量' : ''"
                filterable
                v-model="form.siteSet"
                multiple
              >
                <el-option
                  v-for="(s, index) in siteSetSelection"
                  :key="index"
                  :label="s.label"
                  :value="s.label"
                ></el-option>
              </el-select>
            </el-form-item>
            <el-form-item label="行业:">
              <el-select
                :placeholder="form.industry.length === 0 ? '搜索或选择行业' : ''"
                filterable
                v-model="form.industry"
                multiple
              >
                <el-option
                  v-for="(i, index) in industrySelection"
                  :key="index"
                  :label="i.label"
                  :value="i.label"
                ></el-option>
              </el-select>
            </el-form-item>
            <el-form-item label="平台:">
              <el-select placeholder="搜索或选择平台" filterable v-model="form.platform" multiple>
                <el-option
                  v-for="(p, index) in platformSelection"
                  :key="index"
                  :label="p.label"
                  :value="p.label"
                ></el-option>
              </el-select>
            </el-form-item>
            <el-form-item label="商品类型:">
              <el-select placeholder="搜索或选择商品类型" filterable v-model="form.prodType" multiple>
                <el-option
                  v-for="(p, index) in prodTypeSelection"
                  :key="index"
                  :label="p.label"
                  :value="p.label"
                ></el-option>
              </el-select>
            </el-form-item>
            <el-form-item label="定向频次:">
              <el-row>
                <el-col :span="11">
                  <el-input v-model="form.freq.lower"></el-input>
                </el-col>
                <el-col :span="2" class="line">-</el-col>
                <el-col :span="11">
                  <el-input v-model="form.freq.upper"></el-input>
                </el-col>
              </el-row>
            </el-form-item>
            <el-form-item label="Click:">
              <el-row>
                <el-col :span="11">
                  <el-input v-model="form.click.lower"></el-input>
                </el-col>
                <el-col :span="2" class="line">-</el-col>
                <el-col :span="11">
                  <el-input v-model="form.click.upper"></el-input>
                </el-col>
              </el-row>
            </el-form-item>
            <el-form-item label="Expo:">
              <el-row>
                <el-col :span="11">
                  <el-input v-model="form.expo.lower"></el-input>
                </el-col>
                <el-col :span="2" class="line">-</el-col>
                <el-col :span="11">
                  <el-input v-model="form.expo.upper"></el-input>
                </el-col>
              </el-row>
            </el-form-item>
            <el-form-item label="Cost:">
              <el-row>
                <el-col :span="11">
                  <el-input v-model="form.cost.lower"></el-input>
                </el-col>
                <el-col :span="2" class="line">-</el-col>
                <el-col :span="11">
                  <el-input v-model="form.cost.upper"></el-input>
                </el-col>
              </el-row>
            </el-form-item>
            <el-form-item label="Cpc:">
              <el-row>
                <el-col :span="11">
                  <el-input v-model="form.cpc.lower"></el-input>
                </el-col>
                <el-col :span="2" class="line">-</el-col>
                <el-col :span="11">
                  <el-input v-model="form.cpc.upper"></el-input>
                </el-col>
              </el-row>
            </el-form-item>
            <el-form-item label="Ctr:">
              <el-row>
                <el-col :span="11">
                  <el-input v-model="form.ctr.lower"></el-input>
                </el-col>
                <el-col :span="2" class="line">-</el-col>
                <el-col :span="11">
                  <el-input v-model="form.ctr.upper"></el-input>
                </el-col>
              </el-row>
            </el-form-item>
            <el-form-item label="Ecpm:">
              <el-row>
                <el-col :span="11">
                  <el-input v-model="form.ecpm.lower"></el-input>
                </el-col>
                <el-col :span="2" class="line">-</el-col>
                <el-col :span="11">
                  <el-input v-model="form.ecpm.upper"></el-input>
                </el-col>
              </el-row>
            </el-form-item>

            <el-form-item>
              <el-button @click="reset">重置</el-button>
              <el-button @click="onSubmit" type="primary">确认</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        <el-tab-pane label="操作日志">
          <el-timeline>
            <el-timeline-item
              placement="top"
              :type="index === logPointer ? 'primary' : 'default'"
              @click.native="changeLogPointer(index)"
              v-for="(log, index) in logs"
              :key="index"
              :timestamp="log.time"
            >
              <el-card>
                <span>操作内容: {{log.message}}</span>
              </el-card>
            </el-timeline-item>
          </el-timeline>
        </el-tab-pane>
      </el-tabs>
      <el-dialog title="定向结构(人口属性等虚拟定向,不会参与分析流程)" :visible.sync="showDialog" width="40%">
        <el-tree
          ref="tree"
          show-checkbox
          :default-checked-keys="defaultCheckedKey"
          v-if="templateLoaded && treeData != null"
          :props="{children: 'children', label: 'name', isLeaf: 'isLeaf'}"
          :data="treeData"
          node-key="id"
        >
          <span class="custom-tree-node" slot-scope="{ node, data }">
            <span>{{node.label}}</span>
            <span class="fill-space-node"></span>
            <span>频次: {{data.freq}}</span>
          </span>
        </el-tree>
        <span slot="footer" class="dialog-footer">
          <el-button @click="handleCancelCheckBox">取 消</el-button>
          <el-button type="primary" @click="handleCheckbox">确 定</el-button>
        </span>
      </el-dialog>
    </div>
  </div>
</template>
<script lang="ts">
import { Component, Vue, Prop, Watch } from "vue-property-decorator";
import { Action, Getter, Mutation } from "vuex-class";
import { FilterForm, Types } from "@/models";
import Bus from "@/charts/event-bus";
import { TargetingTreeNode } from "@/models/targeting";
import { getTreeNodes } from "@/utils/index";
import { defaultGlobalFilter } from "@/utils/init";
@Component({})
export default class GlobalControlPanel extends Vue {
  @Getter("typesLoaded", { namespace: "types" })
  typesLoaded!: boolean;
  // 监听globalFilter是为了确认是否加载了历史方案
  @Getter("logs")
  logs!: any[];

  // 取消定向筛选
  handleCancelCheckBox() {
    let oldTreeData = this.treeData;
    this.treeData = null;
    this.showDialog = false;
    setTimeout(() => (this.treeData = oldTreeData), 50);
  }

  // 提交定向筛选
  handleCheckbox() {
    let tree: any = this.$refs["tree"];
    let newCheckedNodes = tree.getCheckedNodes();
    newCheckedNodes = newCheckedNodes.filter(
      (node: any) => node.isLeaf === true
    );
    // 选中的叶子节点未发生改变
    if (
      newCheckedNodes.map((i: any) => i.id).toString() ===
      this.defaultCheckedKey.toString()
    ) {
      this.showDialog = false;
      return;
    }

    let freq = this.form.freq;
    let hasDisabledTarget: boolean = false;
    let newTargets = this.currentState.targets.map((target: any) => {
      let tmp = Object.assign({}, target);
      let idx = newCheckedNodes.findIndex((node: any) => node.id === tmp.id);
      if (idx === -1 || (freq.lower > tmp.freq || freq.upper < tmp.freq)) {
        tmp.selected = false;
      } else tmp.selected = true;
      if (idx !== -1 && (freq.lower > tmp.freq || freq.upper < tmp.freq))
        hasDisabledTarget = true;
      return tmp;
    });

    this.showDialog = false;
    const self: any = this;
    if (hasDisabledTarget !== false)
      setTimeout(() => {
        self
          .$confirm(
            "部分选中定向不符合定向频次筛选, 如仍要选择可能不会对视图结果产生影响, 是否提交修改?"
          )
          .then(() => Bus.$emit("filter-targets", newTargets))
          .catch(() => this.handleCancelCheckBox());
      }, 50);
    else {
      Bus.$emit("filter-targets", newTargets);
    }
  }

  showDialog: boolean = false;

  @Getter("currentOpLog")
  currentState!: any;

  defaultCheckedKey: string[] = [];

  @Watch("systemLoaded")
  watchSystemLoaded(nVal: boolean) {
    if (nVal === false) return;
    this.treeData = getTreeNodes(
      this.template,
      this.currentState.targets,
      this.form.freq
    );
    this.defaultCheckedKey = this.currentState.targets
      .filter((t: any) => t.selected === true)
      .map((t: any) => t.id);
  }

  @Watch("currentState")
  watchCurrentState(nVal: any) {
    if (nVal == null) return;
    if (nVal.globalFilterState === this.formStr) return;
    let newGlobalFilterStr = JSON.parse(nVal.globalFilterState);
    if (this.formStr === newGlobalFilterStr) return;
    this.form = Object.assign({}, newGlobalFilterStr);
    this.formStr = JSON.stringify(this.form);
  }

  levelTraverse(root: TargetingTreeNode) {
    if (root == null) return;
  }

  @Getter("systemLoaded")
  systemLoaded!: boolean;

  // @Getter("currentLogs")
  // currentLogs!: any;

  @Action("changeCurrentLogPointer")
  changeCurrentLogPointer(payload: number) {}

  @Getter("logPointer")
  logPointer!: number;

  changeLogPointer(index: number) {
    this.changeCurrentLogPointer(index);
  }

  @Getter("template", { namespace: "template" })
  template!: TargetingTreeNode;

  @Getter("templateLoaded", { namespace: "template" })
  templateLoaded!: boolean;

  @Action("getTemplateAction", { namespace: "template" })
  getTemplateAction() {}

  @Getter("types", { namespace: "types" })
  types!: Types;

  @Watch("typesLoaded")
  watchTypesLoaded(nVal: boolean) {
    if (nVal === true) this.processFilter(this.types);
  }

  treeData: any[] | null = null;

  @Mutation("globalFilterMutation")
  globalFilterMutation(filter: FilterForm) {}

  industrySelection: Array<{ value: string; label: string }> = [];
  siteSetSelection: Array<{ value: string; label: string }> = [];
  platformSelection: Array<{ value: string; label: string }> = [];
  prodTypeSelection: Array<{ value: string; label: string }> = [];

  form: any = defaultGlobalFilter;

  formStr: string = "";

  processFilter(payload: Types) {
    this.industrySelection = payload.industry;
    this.siteSetSelection = payload.siteSet;
    this.prodTypeSelection = payload.prodType;
    this.platformSelection = payload.platform;
  }

  // 将筛选条件重置为初始状态
  reset() {
    let oldForm = JSON.parse(this.formStr);
    this.form = Object.assign({}, oldForm);
  }

  @Mutation("systemLoadedMutation")
  systemLoadedMutation(payload: boolean) {}

  onSubmit() {
    let newFormStr = JSON.stringify(this.form);
    let oldFormStr = this.formStr;
    if (newFormStr !== oldFormStr) {
      this.formStr = newFormStr;
      // this.systemLoadedMutation(false);
      Bus.$emit("change-global-filter", this.formStr);
      // this.globalFilterMutation(this.form);
    }
  }

  openDialog() {
    this.$emit("open-dialog");
  }
}
</script>
<style>
.global-control-panel {
  border-top: 2px solid brown;
  box-shadow: 0 2px 2px #d2d2d2;
  overflow: auto;
  /* z-index: 100; */
}

.global-control-panel .filter-form {
  padding: 10px;
}

.global-control-panel .custom-tree-node {
  flex: 1;
  display: flex;
  align-items: center;
  font-size: 12px;
  justify-content: center;
}
.global-control-panel .custom-tree-node .fill-space-node {
  flex: 1;
  min-width: 50px;
}
.line {
  text-align: center;
  font-weight: bold;
}
</style>

