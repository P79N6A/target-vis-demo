<template>
  <el-dialog :before-close="beforeClose" title="方案列表" width="50%" :visible.sync="showDialog">
    <el-table :data="states">
      <el-table-column label="方案名称">
        <template slot-scope="scope">
          <i class="el-icon-time"></i>
          <span style="margin-left: 10px">{{scope.row.title}}</span>
          <el-tag
            style="margin-left: 10px"
            v-if="defaultProject != null && defaultProject.key === scope.row.key"
          >当前</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="保存时间">
        <template slot-scope="scope">
          <i class="el-icon-time"></i>
          <span style="margin-left: 10px">{{getProjectTime(scope.row.updatedAt)}}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作">
        <template slot-scope="scope">
          <el-button size="mini" @click="openProject(scope.row.key)" type="primary">打开</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-dialog>
</template>
<script lang="ts">
import moment from "moment";
import { Component, Vue, Prop, Watch } from "vue-property-decorator";
import { fetchAllState, openProject } from "../utils/init";
import Bus from "../charts/event-bus";
@Component({
  mounted() {
    const vm: any = this;
    fetchAllState((states: any[]) => (vm.states = states));
    Bus.$on(
      "has-default-project",
      (message: any) => (vm.defaultProject = message)
    );
  }
})
export default class ProjectList extends Vue {
  @Prop({ required: true })
  show!: boolean;

  defaultProject: any = null;

  getProjectTime(time: number) {
    return moment(time).format("YYYY-MM-DD HH:mm:SS");
  }

  states: any[] = [];

  showDialog: boolean = false;

  openProject(key: number) {
    openProject(key);
  }

  @Watch("show")
  watchShow(nVal: boolean) {
    this.showDialog = nVal;
  }

  beforeClose() {
    this.showDialog = false;
    this.$emit("close-project-list-dialog");
  }
}
</script>
