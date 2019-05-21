<template>
  <el-dialog :before-close="beforeClose" title="保存方案（待定）" width="25%" :visible.sync="showDialog">
    <el-form
      :rules="rules"
      ref="stateForm"
      :model="form"
      :label-position="'right'"
      :label-width="'100px'"
    >
      <el-form-item prop="title" label="方案名称:">
        <el-input placeholder="请输入方案名称" v-model="form.title"></el-input>
      </el-form-item>
      <el-form-item>
        <el-button @click="close">取消</el-button>
        <el-button @click="saveAsNew" type="success">新建</el-button>
        <el-button type="primary" @click="update" v-if="defaulted === false">更新</el-button>
      </el-form-item>
    </el-form>
  </el-dialog>
</template>
<script lang="ts">
import { Component, Vue, Prop, Watch } from "vue-property-decorator";
import { addState, updateState, fetchAllState } from "@/utils/init";
import { Getter } from "vuex-class";
import Bus from "../charts/event-bus";
@Component({
  mounted() {
    const vm: any = this;
    vm.handleCoordinate();
    fetchAllState(() => {});
  }
})
export default class AppDialog extends Vue {
  @Prop({ required: true })
  show!: boolean;

  defaulted: boolean = true;
  defaultProject: any = null;
  form: any = {};
  rules: any = {
    title: [{ required: true, message: "请输入方案名称", trigger: "blur" }]
  };

  @Getter("currentOpLog")
  currentState!: any;
  @Getter("template/template")
  template!: any;

  @Watch("show")
  watchShow(nVal: boolean) {
    this.showDialog = nVal;
  }

  showDialog: boolean = false;

  close() {
    this.showDialog = false;
    this.$emit("close-dialog");
  }

  beforeClose() {
    this.$emit("close-dialog");
  }

  @Getter("fullState")
  fullState!: any;

  @Getter("logs")
  logs!: any[];

  @Getter("opLogs")
  opLogs!: any[];

  // 用于获取保存的数据
  getSnapshot() {
    return this.fullState;
  }

  mode: string = "create";

  handleCoordinate() {
    Bus.$on("has-default-project", (message: any) => {
      this.defaulted = message == null ? true : false;
      this.form = message == null ? {} : message;
    });
    Bus.$on("get-saved-state", () => {
      let now = new Date();
      this.mode === "create"
        ? addState({
            updatedAt: now.getTime(),
            key: now.getTime(),
            title: this.form.title,
            state: this.getSnapshot()
          })
        : updateState(this.form.key, {
            updatedAt: now.getTime(),
            key: this.form.key,
            title: this.form.title,
            state: this.getSnapshot()
          });
      this.showDialog = false;
      this.$emit("close-dialog");
    });
  }

  saveAsNew() {
    (this.$refs["stateForm"] as any).validate((valid: boolean) => {
      if (valid === true) {
        this.mode = "create";
        Bus.$emit("save-state");
      }
    });
  }

  update() {
    (this.$refs["stateForm"] as any).validate((valid: boolean) => {
      if (valid === true) {
        this.mode = "update";
        Bus.$emit("save-state");
      }
    });
  }
}
</script>

