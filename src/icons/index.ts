const requireAll = (context: any) => context.keys().map(context);
requireAll(require.context('./svg', false, /\.svg$/));
import Vue from 'vue';
import SvgIcon from '@/components/SvgIcon.vue'
import OpLog from '@/components/OpLog.vue';
Vue.component('svg-icon', SvgIcon);
Vue.component('op-log', OpLog);