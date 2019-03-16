<template>
  <svg class="svg-icon">
    <use v-bind:xlink:href="iconClass"></use>
  </svg>
</template>
<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
@Component
export default class SvgIcon extends Vue {
  @Prop({ type: String, required: true })
  iconName!: string;

  get iconClass() {
    return `#icon-${this.iconName}`;
  }
}
</script>
<style >
.svg-icon {
  width: 1em;
  height: 1em;
  fill: currentColor;
  /* vertical-align: -0.1em; */
  cursor: pointer;
}
</style>

