<template>
  <div :class="className">
    <el-steps :direction="direction">
      <el-step
        @click.native="handleClick(idx)"
        :status="o.key !== index ? 'wait' : 'finish'"
        v-for="(o, idx) in data"
        :key="idx"
        :title="o.type"
        :description="o.message"
      ></el-step>
    </el-steps>
  </div>
</template>
<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
@Component
export default class OpLog extends Vue {
  @Prop({ required: true })
  data!: any[];
  @Prop({ required: true })
  index!: number;
  @Prop({ required: true })
  className!: string;
  @Prop({ required: true })
  direction!: string;

  handleClick(index: number) {
    let operation = this.data[index];
    if (index === this.index) return;
    this.$emit("change-op", operation.key);
  }
}
</script>
<style>
.op-log {
  position: absolute;
  top: 0;
  bottom: 0;
  padding: 50px 0;
  left: 10px;
  overflow-y: auto;
}
</style>

