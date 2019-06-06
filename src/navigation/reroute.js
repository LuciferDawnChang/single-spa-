import CustomEvent from 'custom-event';
import { isStarted } from '../start.js';
import { toLoadPromise } from '../lifecycles/load.js';
import { toBootstrapPromise } from '../lifecycles/bootstrap.js';
import { toMountPromise } from '../lifecycles/mount.js';
import { toUnmountPromise } from '../lifecycles/unmount.js';
import { getMountedApps, getAppsToLoad, getAppsToUnmount, getAppsToMount } from '../applications/apps.js';
import { callCapturedEventListeners } from './navigation-events.js';
import { getAppsToUnload, toUnloadPromise } from '../lifecycles/unload.js';

// 初始化appChangeUnderway标识为false
// 初始化数组peopleWaitingOnAppChange为空数组[]
let appChangeUnderway = false, peopleWaitingOnAppChange = [];

// 路由指向新
export function reroute(pendingPromises = [], eventArguments) {
  // appChangeUnderway判断是否为true(初始为false)
  if (appChangeUnderway) {
    // 返回一个新的Promise函数
    // 将成功的状态,失败的状态和参数作为对象存入数组peopleWaitingOnAppChange
    return new Promise((resolve, reject) => {
      peopleWaitingOnAppChange.push({
        resolve,
        reject,
        eventArguments,
      });
    });
  }

  // 将初始标识符appChangeUnderway置为true,添加标识符wasNoOp初始状态为true
  appChangeUnderway = true;
  let wasNoOp = true;

  // 获取start中isStarted返回的状态如果为true则
    // 运行执行performAppChanges函数并返回结果
    // 否则执行loadApps函数并返回结果
  if (isStarted()) {
    return performAppChanges();
  } else {
    return loadApps();
  }

  // 返回执行一个Promise对象为成功的状态运行getAppsToLoad方法(返回app.helpers.js中的 notSkipped isntLoaded shouldBeActive三个方法)并放入toLoadPromise函数中执行(判断app.status !== NOT_LOADED则返回return app否则将app.status = LOADING_SOURCE_CODE并报错后将一个Promise的对象处理返回)后的结果赋予loadPromises常量中保存结果
  function loadApps() {
    return Promise.resolve().then(() => {
      const loadPromises = getAppsToLoad().map(toLoadPromise);

      // 判断是否获取到需求的方法,loadPromises不为空
        // 如果已经获取到则将wasNoOp置为false
      if (loadPromises.length > 0) {
        wasNoOp = false;
      }

      // 返回一个Promise对象
        // 这个Promise对象通过.all方法处理loadPromises返回值是否为成功,成功返回一个成功的数组向下传递,失败则向下传递失败的状态并报错

      return Promise
        .all(loadPromises)
        .then(finishUpAndReturn)
        .catch(err => {
          callAllEventListeners();
          throw err;
        })
    })
  }

  // 以成功的状态执行Promise对象,
    // 执行一个自定义事件,触发事件回调函数.
    // 将即将程序卸载的app名称解析保存在常量unloadPromises中
  function performAppChanges() {
    return Promise.resolve().then(() => {
      window.dispatchEvent(new CustomEvent("single-spa:before-routing-event", getCustomEventDetail()));
      const unloadPromises = getAppsToUnload().map(toUnloadPromise);

      // 获取对应状态的apps,通过遍历使用toUnmountPromise(判定组件状态是否非为MOUNTED是的话返回组件否的话经状态置为UNMOUNTING后处理返回)和toUnloadPromise(获取组件信息根据组件状态对组件信息进行加工返回)方法对数据进行加工返回
      const unmountUnloadPromises = getAppsToUnmount()
        .map(toUnmountPromise)
        .map(unmountPromise => unmountPromise.then(toUnloadPromise));

      // 以unmountUnloadPromises数组为基准将unloadPromises数组链接合并到unmountUnloadPromises数组中
      const allUnmountPromises = unmountUnloadPromises.concat(unloadPromises);
      // 如果allUnmountPromises数组为空则将wasNoOp标识置为false
      if (allUnmountPromises.length > 0) {
        wasNoOp = false;
      }

      // 使用Promise同步获取allUnmountPromises保存的状态参数数组,
      const unmountAllPromise = Promise.all(allUnmountPromises);

      // 运行getAppsToLoad函数,并保存返回值
        // 判断组件是否存在,组件和组件状态是否为非SKIP_BECAUSE_BROKEN状态
        // 判断组件状态是非NOT_LOADED或非LOADING_SOURCE_CODE,LOADING_SOURCE_CODE状态
        // 判断代码块是否有错误,有错误就将此组建状态置为SKIP_BECAUSE_BROKEN
        // 返回过滤后的数组保存
      const appsToLoad = getAppsToLoad();

      /* We load and bootstrap apps while other apps are unmounting, but we
       * wait to mount the app until all apps are finishing unmounting
       */
      /*
      * 我们加载和引导应用程序当其他应用程序正在卸载时，
      * 但我们要等到所有的应用程序都卸载完毕后才能安装应用程序
      */
      // 遍历组件信息,推进组件状态,并将组件信息返回
      const loadThenMountPromises = appsToLoad.map(app => {
        // 判断app组件是否为NOT_LOADED,并组件加载情况向下传递一个Promise成功或失败的Promise回调,并对这些回调进行判断出来
        return toLoadPromise(app)
          // 判断处理组件状态,推进组件Bootstrap进程,更新返回组件
          .then(toBootstrapPromise)
          // 推进组件状态并返回组件信息
          .then(app => {
            return unmountAllPromise
              .then(() => toMountPromise(app))
          })
      })
        // 判断用于组件加载安装的方法是否运行完毕,并正常返回保存
      if (loadThenMountPromises.length > 0) {
        // 将wasNoOp组件状态置为false
        wasNoOp = false;
      }

      /* These are the apps that are already bootstrapped and just need
       * to be mounted. They each wait for all unmounting apps to finish up
       * before they mount.
       */
      /*
      * 这些是应用程序已经引导
      * 只需要挂载。每个应用都要等到所有需要卸载的应用程序完成后才能加载。
      * */
      // 判断过滤组件状态,与组件符合当前路由地址的组件
      const mountPromises = getAppsToMount()
          // 过滤符合当前路由状态的组件是否在正常可运行组件数组内(状态非已损坏NOT_BOOTSTRAPPED)
        .filter(appToMount => appsToLoad.indexOf(appToMount) < 0)
          // 遍历返回处理后的数组保存
        .map(appToMount => {
          return toBootstrapPromise(appToMount)
            .then(() => unmountAllPromise)
            .then(() => toMountPromise(appToMount))
        })
        // 判断mountPromises长度是否不为0,mountPromises不为0 说明组件加载状态正常,且正常获取到组件状态返回值
      if (mountPromises.length > 0) {
          // 将wasNoOp组件状态置为false
        wasNoOp = false;
      }
      // 执行unmountAllPromise保存的promise方法,(卸载安装加载)
      return unmountAllPromise
      // 失败时执行,调用callAllEventListeners方法,顺序执行时间监听的函数,抛出错误信息
        .catch(err => {
          callAllEventListeners();
          throw err;
        })
        // 成功的回调,卸载成功调取callAllEventListeners方法,顺序执行时间监听的函数.
        .then(() => {
          /* Now that the apps that needed to be unmounted are unmounted, their DOM navigation
           * events (like hashchange or popstate) should have been cleaned up. So it's safe
           * to let the remaining captured event listeners to handle about the DOM event.
           */
            /*
            现在需要卸载的应用程序已经卸载了，它们的DOM导航
            事件(如hashchange或popstate)应该已经清理干净了。因此，让其余
            捕获的事件侦听器处理DOM事件是安全的。
          */
          callAllEventListeners();

            // 将应用程序组件信息的集合和组件当前组件的状态进行合并
          return Promise
            .all(loadThenMountPromises.concat(mountPromises))
            //  如果回调返回一个失败的状态,则遍历传入的pendingPromises并之间内部的promise将其置为reject状态返回一个错误的信息,
            // 且在控制台弹出警告信息
            .catch(err => {
              pendingPromises.forEach(promise => promise.reject(err));
              throw err;
            })
            // 如果返回的是成功的状态信息则调用finishUpAndReturn方法,传入false的状态值并返回执行结果
            .then(() => finishUpAndReturn(false))
        })

    })
  }

  //
  function finishUpAndReturn(callEventListeners=true) {
    // 获取安装完毕的对应应用程序列表
    const returnValue = getMountedApps();

    // 判断传入值是否为true(如调用方法函数时未传入参数false也为true)
    if (callEventListeners) {
      // 顺序执行所有事件监听
      callAllEventListeners();
    }

    // 遍历所有正在等待执行的promise对象函数列表,执行这些列表中的方法,
    // 且以resolve成功的状态向下传递,并将安装完毕的对应应用程序列表作为参数传递下去
    pendingPromises.forEach(promise => promise.resolve(returnValue));

    // 执行判断以下代码段是否有错
    try {
      // 判断wasNoOp是否为true返回对应的字符串状态提示
      const appChangeEventName = wasNoOp ? "single-spa:no-app-change": "single-spa:app-change";
      // 触发自定义事件,获取自定义事件所有信息
      window.dispatchEvent(new CustomEvent(appChangeEventName, getCustomEventDetail()));
        // 触发自定义事件,获取自定义事件所有信息
      window.dispatchEvent(new CustomEvent("single-spa:routing-event", getCustomEventDetail()));
    } catch (err) {
      /* We use a setTimeout because if someone else's event handler throws an error, single-spa
       * needs to carry on. If a listener to the event throws an error, it's their own fault, not
       * single-spa's.
       */
      /* 我们使用setTimeout定时器，因为如果其他的事件处理程序抛出错误，single-spa需要继续执行。如果事件的侦听器抛出错误，这是他们自己的错误，而不是single-spa的。 */
      // 定时立即抛出一个错误 因为是定时器所以会在需执行的同步代码执行完毕后才会执行这个错误抛出
      setTimeout(() => {
        throw err;
      });
    }

    /* Setting this allows for subsequent calls to reroute() to actually perform
     * a reroute instead of just getting queued behind the current reroute call.
     * We want to do this after the mounting/unmounting is done but before we
     * resolve the promise for the `reroute` function.
     */
    /*
    设置此选项允许后续调用reroute()实际执行一个路由，而不只是在当前路由调用后面排队。我们希望在挂载/卸载完成后，但在我们resolve一个promise的'reroute'函数之前。
    */
    // 标识appChangeUnderway(组件是否正在改变的状态)初始值设为false
    appChangeUnderway = false;

    // 判断appChangeUnderway数组是否不为空(数组中是应用成功的数据和失败的数据和传入的事件参数)
    if (peopleWaitingOnAppChange.length > 0) {
      /* While we were rerouting, someone else triggered another reroute that got queued.
       * So we need reroute again.
       */
      /*
      * 当我们启动路由时，另一个人触发了另一个排队的路由。
      * 所以我们需要重新路由。
      * */
      // 获取appChangeUnderway的值
      const nextPendingPromises = peopleWaitingOnAppChange;
      // 将peopleWaitingOnAppChange指向置空
      peopleWaitingOnAppChange = [];
      // 将保存的数组中是应用成功的数据和失败的数据和传入的事件参数作为参数传入reroute回调执行
      reroute(nextPendingPromises);
    }

    // 将正在显示状态(路由地址匹配)的应用的名称列表参数返回
    return returnValue;
  }

  /* We need to call all event listeners that have been delayed because they were
   * waiting on single-spa. This includes haschange and popstate events for both
   * the current run of performAppChanges(), but also all of the queued event listeners.
   * We want to call the listeners in the same order as if they had not been delayed by
   * single-spa, which means queued ones first and then the most recent one.
   */
    /*我们需要调用所有因为在single-spa上等待而被延迟的事件监听器。
  这包括用于performAppChanges()的当前运行的haschange和popstate事件，以及所有排队的事件侦听器。
  我们希望以与它们没有被single-spa延迟一样的顺序调用侦听器，这意味着侦听器首先要排队的，然后是执行最近的侦听器*/
  function callAllEventListeners() {
    // 遍历pendingPromises获取正在等待执行的promise对象函数
    pendingPromises.forEach(pendingPromise => {
    // 调用捕获的事件监听器,传入遍历出来的元素参数.并执行第一个监听函数
      callCapturedEventListeners(pendingPromise.eventArguments);
    });

    // 调用捕获的事件监听器,传入调用reroute方法是传入的函数作为参数.并执行第一个监听函数
    callCapturedEventListeners(eventArguments);
  }

  // 获取自定义事件详细信息
  function getCustomEventDetail() {
    // 设置一个默认对象,将信息存放在对象的detail属性中
    const result = {detail: {}}

    // 判断事件参数是否存在且第一项不为空
    if (eventArguments && eventArguments[0]) {
      // 将eventArguments[0]的数据存放在result的detail属性对象的originalEvent属性内
      result.detail.originalEvent = eventArguments[0]
    }

    // 返回获取的数据
    return result
  }
}
