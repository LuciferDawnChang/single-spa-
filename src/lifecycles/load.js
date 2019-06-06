import { NOT_BOOTSTRAPPED, LOADING_SOURCE_CODE, SKIP_BECAUSE_BROKEN, NOT_LOADED } from '../applications/app.helpers.js';
import { ensureValidAppTimeouts } from '../applications/timeouts.js';
import { handleAppError } from '../applications/app-errors.js';
import { flattenFnArray, smellsLikeAPromise, validLifecycleFn } from './lifecycle.helpers.js';
import { getProps } from './prop.helpers.js';
// 加载的promise对象
export function toLoadPromise(app) {
  // 返回值是一个成功的Promise对象的运行结果
  return Promise.resolve().then(() => {
    // 判断组件状态是否不是NOT_LOADED(未加载)
    if (app.status !== NOT_LOADED) {
      // 如果不是NOT_LOADED(未加载)状态将组件返回
      return app;
    }

    // 将NOT_LOADED(未加载)状态的组件状态变更为LOADING_SOURCE_CODE(加载源代码)
    app.status = LOADING_SOURCE_CODE;

    // 申明变量
    let appOpts;

    // 返回一个Promise运行的结果
    return Promise.resolve().then(() => {
      const loadPromise = app.loadImpl(getProps(app));
      if (!smellsLikeAPromise(loadPromise)) {
        // The name of the app will be prepended to this error message inside of the handleAppError function
          // 应用程序的名称将在handleAppError函数内的这个错误消息前
          // 抛出一个错误信息 并结束函数运行
        throw new Error(`single-spa loading function did not return a promise. Check the second argument to registerApplication('${app.name}', loadingFunction, activityFunction)`);
      }
      // 调用加载的Promise方法判断组件是否为一个正确指向的组件,
      return loadPromise.then(val => {
          // 如果其执行传递的状态为成功的话则运行
        appOpts = val;

        // 验证错误消息
        let validationErrMessage;
        // 判断传入组件appOpts不是一个对象的话设置错误信息
        if (typeof appOpts !== 'object') {
          // 设置信息为:不导出任何东西
          validationErrMessage = `does not export anything`;
        }
        // 如果传入组件的引导生命周期函数不是有效生命周期函数的话
        if (!validLifecycleFn(appOpts.bootstrap)) {
            // 设置信息为:不导出引导函数或函数数组
          validationErrMessage = `does not export a bootstrap function or array of functions`;
        }
        // 如果传入组件的挂载安装的生命周期函数不是有效生命周期函数的话
        if (!validLifecycleFn(appOpts.mount)) {
            // 设置信息为:不导出挂载函数或函数数组
          validationErrMessage = `does not export a mount function or array of functions`;
        }
          // 如果传入组件的卸载挂载卸载安装生命周期函数不是有效生命周期函数的话
        if (!validLifecycleFn(appOpts.unmount)) {
          // 设置信息为:不导出卸载函数或函数数组
          validationErrMessage = `does not export an unmount function or array of functions`;
        }

        // 如果validationErrMessage不为空
        if (validationErrMessage) {
          // 抛出错误信息和对应组件
          handleAppError(validationErrMessage, app);
          // 将组件状态设置为已损坏
          app.status = SKIP_BECAUSE_BROKEN;
          // 返回组件结束组件运行
          return app;
        }

        // 判断组件devtools存在且devtools.overlays存在(正确注册)
        if (appOpts.devtools && appOpts.devtools.overlays) {
          // 将需要加载的组件的devtools.overlays属性置为app.devtools.overlays的属性且与appOpts.devtools.overlays有重复的属性以appOpts.devtools.overlays为准
          app.devtools.overlays = {...app.devtools.overlays, ...appOpts.devtools.overlays}
        }

        // 组件状态置为未引导
        app.status = NOT_BOOTSTRAPPED;
        // 获取组件对应生命周期方法
        app.bootstrap = flattenFnArray(appOpts.bootstrap, `App '${app.name}' bootstrap function`);
        app.mount = flattenFnArray(appOpts.mount, `App '${app.name}' mount function`);
        app.unmount = flattenFnArray(appOpts.unmount, `App '${app.name}' unmount function`);
        app.unload = flattenFnArray(appOpts.unload || [], `App '${app.name}' unload function`);
        app.timeouts = ensureValidAppTimeouts(appOpts.timeouts);

        // 将组件返回
        return app;
      })
    })
        // 如果处理返回信息为失败
    .catch(err => {
      // 抛出错误信息和组件
      handleAppError(err, app);
      // 组件装置为已损坏
      app.status = SKIP_BECAUSE_BROKEN;
      //返回组件并借宿组件运行
      return app;
    })
  })
}
