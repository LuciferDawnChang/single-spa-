import { NOT_MOUNTED, UNLOADING, NOT_LOADED, SKIP_BECAUSE_BROKEN, isntActive } from '../applications/app.helpers.js';
import { handleAppError } from '../applications/app-errors.js';
import { reasonableTime } from '../applications/timeouts.js';
import { getProps } from './prop.helpers.js';

const appsToUnload = {};

// 卸载加载(取消加载)的生命周期函数app是调用这个函数传入的应用名称
export function toUnloadPromise(app) {
  return Promise.resolve().then(() => {
    // 获取需要卸载加载的应用信息应用名称
    const unloadInfo = appsToUnload[app.name];

    // 判断是否未获取到信息
    if (!unloadInfo) {
      /* No one has called unloadApplication for this app,
      没有人为这个应用程序调用unloadApplication，
      */
      // 将app返回并结束函数
      return app;
    }

    // 判断应用组件状态是否为未加载
    if (app.status === NOT_LOADED) {
      /* This app is already unloaded. We just need to clean up
       * anything that still thinks we need to unload the app.
       * 这个应用程序已经卸载。我们只需要清理任何仍然认为我们需要卸载应用程序的东西。
       */
      // 完成卸载应用程序将组件和所要卸载的信息传入
      finishUnloadingApp(app, unloadInfo);
      return app;
    }

    // 判断应用状态是否为卸载加载中
    if (app.status === UNLOADING) {
      /* Both unloadApplication and reroute want to unload this app.
       * It only needs to be done once, though.
       * 卸载应用程序和重新路由都想卸载这个应用程序。但是，只需要卸载一次。
       */
      // 调用unloadInfo获取的保存在对应组件下的promise函数,将app返回
      return unloadInfo.promise.then(() => app);
    }

    if (app.status !== NOT_MOUNTED) {
      /* The app cannot be unloaded until it is unmounted.
      */
      /*应用程序在卸载加载之前不能卸载安装。*/
      return app;
    }

    // 将应用的状态变更为卸载加载
    app.status = UNLOADING;

    // 判断组件卸载载入的生命周期是否能在合理的时间内执行完成
      // 第一个参数事将组件卸载的生命函数, 第二个参数是所有执行的生命周期行为, 第三个参数是生命周期所要执行的时间
    return reasonableTime(app.unload(getProps(app)), `Unloading application '${app.name}'`, app.timeouts.unload)

      .then(() => {
      // 调用完成卸载应用程序的方法将需要卸载的组件和卸载加载的组件方法对象并将组件返回结束函数运行
        finishUnloadingApp(app, unloadInfo);
        return app;
      })
      .catch(err => {
        // 调用卸载应用程序错误的函数将对应的组件 卸载加载的组件方法对象 和错误信息传入并将组件返回结束函数运行
        errorUnloadingApp(app, unloadInfo, err);
        return app;
      })
  })
}
// 完全卸载应用程序并将组件状态修改为未加载,并向下传递一个成功的promise状态
function finishUnloadingApp(app, unloadInfo) {
  // 删除对应组件卸载加载的方法和信息
  delete appsToUnload[app.name];

  // Unloaded apps don't have lifecycles
    // 卸载的应用程序没有生命周期
    // 删除组件所有对应的生命周期
  delete app.bootstrap;
  delete app.mount;
  delete app.unmount;
  delete app.unload;

  // 将组件装填置为未加载
  app.status = NOT_LOADED;

  /* resolve the promise of whoever called unloadApplication.
   * This should be done after all other cleanup/bookkeeping
   */
  /*
  解析调用unloadApplication的promise。
  这应该在所有其他清理/记账之后完成
  */
  unloadInfo.resolve();
}

// 卸载应用程序错误后清除组件信息,将组件置为损坏,排除错误 并向下传递一个错误的promise状态和错误参数
function errorUnloadingApp(app, unloadInfo, err) {
  delete appsToUnload[app.name];

  // Unloaded apps don't have lifecycles
  delete app.bootstrap;
  delete app.mount;
  delete app.unmount;
  delete app.unload;

  handleAppError(err, app);
  app.status = SKIP_BECAUSE_BROKEN;
  unloadInfo.reject(err);
}

// 添加App到卸载加载的队列
export function addAppToUnload(app, promiseGetter, resolve, reject) {
  // 将对应组件名称的项的信息变更为传入的app, resolve, reject值
  appsToUnload[app.name] = {app, resolve, reject};
  // 将appsToUnload[app.name]的promise属性修改或定义一个新属性{get: promiseGetter}
  Object.defineProperty(appsToUnload[app.name], 'promise', {get: promiseGetter});
}

export function getAppUnloadInfo(appName) {
  return appsToUnload[appName];
}
// 遍历需要卸载的组件信息
// 获取appName(事件组件的名称)应用中的app属性判断 他是否不是MOUNTED(安装)的状态
export function getAppsToUnload() {
  return Object.keys(appsToUnload)
    .map(appName => appsToUnload[appName].app)
    .filter(isntActive)
}
