import { handleAppError } from './app-errors.js';

// App statuses
export const NOT_LOADED = 'NOT_LOADED';
export const LOADING_SOURCE_CODE = 'LOADING_SOURCE_CODE';
export const NOT_BOOTSTRAPPED = 'NOT_BOOTSTRAPPED';
export const BOOTSTRAPPING = 'BOOTSTRAPPING';
export const NOT_MOUNTED = 'NOT_MOUNTED';
export const MOUNTING = 'MOUNTING';
export const MOUNTED = 'MOUNTED';
export const UPDATING = 'UPDATING';
export const UNMOUNTING = 'UNMOUNTING';
export const UNLOADING = 'UNLOADING';
export const SKIP_BECAUSE_BROKEN = 'SKIP_BECAUSE_BROKEN';
// 将组件状态置为加载安装完毕
export function isActive(app) {
  return app.status === MOUNTED;
}
// 判断事件app是否为安装的状态
export function isntActive(app) {
  return !isActive(app);
}
// 判断组件是否不为未加载 且不为正在加载源代码的阶段
export function isLoaded(app) {
  return app.status !== NOT_LOADED && app.status !== LOADING_SOURCE_CODE;
}
// 判断组件是否不为未加载或不为正在加载源代码的状态
export function isntLoaded(app) {
  return !isLoaded(app);
}
/* try {
    // 此处是可能产生例外的语句
} catch(error) {
    // 此处是负责例外处理的语句
} finally {
    // 此处是出口语句
} */
// 检测对应路由组件是否匹配当前地址
export function shouldBeActive(app) {
  try {
    // activeWhen是判断在当前地址下是否显示某个组件的函数,window.location传入参数用于获取当前路由导航指向地址
    return app.activeWhen(window.location);
  } catch (err) {
    // 代码错误则等,向控制台抛错,并将状态更改为已损坏
    handleAppError(err, app);
    app.status = SKIP_BECAUSE_BROKEN;
  }
}

// 判断返回当前地址匹配路由组件
// 如代码错误则等,向控制台抛错,并将状态更改为已损坏
export function shouldntBeActive(app) {
  try {
    return !app.activeWhen(window.location);
  } catch (err) {
    handleAppError(err, app);
    app.status = SKIP_BECAUSE_BROKEN;
  }
}

// 判断返回传入组件状态是否不为未引导状态
export function notBootstrapped(app) {
  return app.status !== NOT_BOOTSTRAPPED;
}

// 判断返回传入组件是否存在切不为已损坏状态
export function notSkipped(item) {
  return item !== SKIP_BECAUSE_BROKEN && (!item || item.status !== SKIP_BECAUSE_BROKEN);
}

// 返回传入组件的name
export function toName(app) {
  return app.name;
}
