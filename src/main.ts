import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import '@/icons/index';
import './plugins/element.js'

Vue.config.productionTip = false
// Vue.use(ElementUI, { size: 'mini' });
// import VueWorker from 'vue-worker';

// Vue.use(VueWorker);

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
