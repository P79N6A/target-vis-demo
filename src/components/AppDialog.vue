<template>
  <el-dialog :before-close="beforeClose" title="保存方案（待定）" width="20%" :visible.sync="showDialog">
    <el-form :label-position="'right'" :label-width="'100px'">
      <el-form-item label="方案名称:">
        <el-input></el-input>
      </el-form-item>
      <el-form-item label="保存时间:">
        <el-date-picker type="datetime" placeholder="选择日期时间" default-time="12:00:00"></el-date-picker>
      </el-form-item>
      <el-form-item label="设为默认:">
        <el-switch active-text="是" inactive-text="否"></el-switch>
      </el-form-item>
      <el-form-item>
        <el-button @click="close">取消</el-button>
        <el-button type="success">另存为</el-button>
        <el-button type="primary">保存</el-button>
      </el-form-item>
    </el-form>
  </el-dialog>
</template>
<script lang="ts">
import { Component, Vue, Prop, Watch } from "vue-property-decorator";
@Component
export default class AppDialog extends Vue {
  @Prop({ required: true })
  show!: boolean;

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
    console.log("closing...");
    this.$emit("close-dialog");
  }
}
</script>

