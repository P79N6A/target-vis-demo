import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
import '@/icons/index';

Vue.config.productionTip = false
Vue.use(ElementUI, { size: 'mini' });
// import VueWorker from 'vue-worker';

// Vue.use(VueWorker);

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
