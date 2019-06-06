import { reroute } from './navigation/reroute.js';
// 初始started状态为false,用来表示路由是否启动
let started = false;
// 执行started将状态改为true
export function start() {
  // 将组件状态设置为true
  started = true;
  // 执行路由执行函数,变更组件状态
  reroute();
}
// 返回获取started状态,判断路由状态
export function isStarted() {
  return started;
}
// 警告延迟时间
const startWarningDelay = 5000;
// 加载组件${5000}毫秒后singleSpa.start()未加载执行则会返回错误
setTimeout(() => {
  if (!started) {
    console.warn(`singleSpa.start() has not been called, ${startWarningDelay}ms after single-spa was loaded. Before start() is called, apps can be declared and loaded, but not bootstrapped or mounted. See https://github.com/CanopyTax/single-spa/blob/master/docs/single-spa-api.md#start`);
  }
}, startWarningDelay)
