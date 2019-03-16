<template>
  <div class="global-control-panel">
    <div class="panel">
      <span>Filter</span>
      <span class="active">
        <i v-if="!templateLoaded || !typesLoaded" class="el-icon-loading"></i>
      </span>
      <span class="fill-space"></span>
      <span class="active" v-if="typesLoaded" @click="openDialog">
        <svg-icon :iconName="'save'"></svg-icon>
      </span>
    </div>
    <div class="filter-form">
      <el-tabs>
        <el-tab-pane label="定向结构" :disabled="!templateLoaded">
          <el-tree
            v-if="templateLoaded && treeData.length !== 0"
            :props="{children: 'children',  label: 'name', isLeaf: 'isLeaf'}"
            :data="treeData"
            node-key="id"
            :default-expanded-keys="expandKeys"
          >
            <span class="custom-tree-node" slot-scope="{ node, data }">
              <span>{{node.label}}</span>
              <span class="fill-space-node"></span>
              <span>频次: {{data.freq}}</span>
            </span>
          </el-tree>
        </el-tab-pane>
        <el-tab-pane label="广告属性">
          <el-form
            ref="form"
            :model="form"
            v-if="form != null"
            :disabled="!templateLoaded || !typesLoaded"
            :label-position="'right'"
            label-width="50px"
          >
            <el-form-item label="流量:" prop="siteSet">
              <el-select v-model="form.siteSet" multiple>
                <el-option
                  v-for="(s, index) in siteSetSelection"
                  :key="index"
                  :label="s.label"
                  :value="s.label"
                ></el-option>
              </el-select>
            </el-form-item>
            <el-form-item label="行业">
              <el-select v-model="form.industry" multiple>
                <el-option
                  v-for="(i, index) in industrySelection"
                  :key="index"
                  :label="i.label"
                  :value="i.label"
                ></el-option>
              </el-select>
            </el-form-item>
            <el-form-item label="平台:">
              <el-select v-model="form.platform" multiple>
                <el-option
                  v-for="(p, index) in platformSelection"
                  :key="index"
                  :label="p.label"
                  :value="p.label"
                ></el-option>
              </el-select>
            </el-form-item>
            <el-form-item label="产品:">
              <el-select v-model="form.prodType" multiple>
                <el-option
                  v-for="(p, index) in prodTypeSelection"
                  :key="index"
                  :label="p.label"
                  :value="p.label"
                ></el-option>
              </el-select>
            </el-form-item>
            <el-button @click="reset">重置</el-button>
            <el-button @click="onSubmit" type="primary">确认</el-button>
          </el-form>
        </el-tab-pane>
        <!-- <el-tab-pane label="广告指标">
          <el-form :label-position="'right'" label-width="50px">
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
              <el-button type="primary">确认</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>-->
      </el-tabs>
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
@Component({
  mounted() {
    const vm: any = this;
    Bus.$on("send-and", (message: any) => {
      if (message == null) vm.expandKeys = [];
      else vm.expandKeys = [message];
    });
  }
})
export default class GlobalControlPanel extends Vue {
  @Getter("typesLoaded", { namespace: "types" })
  typesLoaded!: boolean;
  // 监听globalFilter是为了确认是否加载了历史方案
  @Getter("globalFilter")
  globalFilter!: FilterForm;

  expandKeys: string[] = [];

  showDialog: boolean = false;

  @Watch("globalFilter")
  watchGlobalFilter(nVal: FilterForm) {
    this.form = Object.assign({}, nVal);
    this.formStr = JSON.stringify(this.form);
    if (this.typesLoaded === true) this.getTemplateAction();
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

  treeData: any[] = [];

  @Watch("templateLoaded")
  watchTemplateLoaded(nVal: boolean) {
    if (nVal === true) this.treeData = getTreeNodes(this.template);
  }

  @Mutation("globalFilterMutation")
  globalFilterMutation(filter: FilterForm) {}

  industrySelection: Array<{ value: string; label: string }> = [];
  siteSetSelection: Array<{ value: string; label: string }> = [];
  platformSelection: Array<{ value: string; label: string }> = [];
  prodTypeSelection: Array<{ value: string; label: string }> = [];

  form: any = null;

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
    (this.$refs["form"] as any).resetFields();
  }

  onSubmit() {
    let newFormStr = JSON.stringify(this.form);
    let oldFormStr = this.formStr;
    if (newFormStr !== oldFormStr) {
      this.formStr = newFormStr;
      this.globalFilterMutation(this.form);
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
}
.line {
  text-align: center;
  font-weight: bold;
}
</style>

