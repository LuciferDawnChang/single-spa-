import { ensureJQuerySupport } from '../jquery-support.js';
import { isActive, isLoaded, isntLoaded, toName, NOT_LOADED, shouldBeActive, shouldntBeActive, isntActive, notSkipped } from './app.helpers.js';
import { reroute } from '../navigation/reroute.js';
import { find } from '../utils/find.js';
import { toUnmountPromise } from '../lifecycles/unmount.js';
import { toUnloadPromise, getAppUnloadInfo, addAppToUnload } from '../lifecycles/unload.js';

const apps = [];

// 获取并返回正在显示状态(路由地址匹配)的应用的名称列表
export function getMountedApps() {
  return apps.filter(isActive).map(toName);
}

// 获取返回应用的名称列表
export function getAppNames() {
  return apps.map(toName);
}

// used in devtools, not (currently) exposed as a single-spa API
// 在devtools中使用，不是(当前)作为单一spa API公开的
// 获取apps的所有应用数据信息
export function getRawAppData() {
  return [...apps];
}

// 获取对应应用的状态信息,判断应用存在则返回应用状态,不存在则返回null空
export function getAppStatus(appName) {
  const app = find(apps, app => app.name === appName);
  return app ? app.status : null;
}

// 申明子应用程序
export function declareChildApplication(appName, arg1, arg2) {
    // 控制台输出警告信息"declareChildApplication已被弃用，将在下一个主要版本中被删除，取而代之的是使用“registerApplication”"
  console.warn('declareChildApplication is deprecated and will be removed in the next major version, use "registerApplication" instead')
    // 执行注册应用程序信息,经程序名称,对应组件,对应路由地址注册返回
  return registerApplication(appName, arg1, arg2)
}

/*
* registerApplication(appName, applicationOrLoadingFn, activityFn, customProps = {})
* appName:
*   必选参数,参数为字符串类型
*   作为项目名称存在
* applicationOrLoadingFn:
*   需要加载的函数或已解析的Application=>指向项目内部app文件如() => import('./base/vue.app.js')
* activityFn:
*   此参数是一个可选参数
*   需求传入一个函数,函数的传入参数是window.location需要一个返回值是当返回值为真时此加载组件为运行状态
*   也就是返回状态为true时运行显示如function activityFunction(location) {return location.pathname.indexOf("/app1/") === 0;}
*   或function activityFunction(location) {return location.pathname.startsWith('/login');}
*  customProps:
*   此参数是一个可选参数
*   此参数是将传递到每个生命周期方法中(single的生命周期而非子项目的生命周期),默认为一个空对象
*   如:{ authToken: "d83jD63UdZ6RS6f70D0" }
* */
// 注册应用程序
export function registerApplication(appName, applicationOrLoadingFn, activityFn, customProps = {}) {
  // 如果传入第一个参数非字符串类型或长度为0时返回错误信息
  if (typeof appName !== 'string' || appName.length === 0)
    throw new Error(`The first argument must be a non-empty string 'appName'`);
  // 如果传入第二个参数在getAppNames函数返回数组中查找到相同的传入的组件名称时,返回错误
  if (getAppNames().indexOf(appName) !== -1)
    throw new Error(`There is already an app declared with name ${appName}`);
  //如果传入第三个参数非未对象类型时,或为数组类型时返回错误信息
  if (typeof customProps !== 'object' || Array.isArray(customProps))
    throw new Error('customProps must be an object');
  // 判断第二个传入参数是否存在,如果不存在时提示参数为必须
  if (!applicationOrLoadingFn)
    throw new Error(`The application or loading function is required`);
  /*
  申明一个函数作用域变量loadImpl
  * 判断第二个参数是否不是一个函数类型满足条件的话(app应用组件)将第二个参数作为一个成功的promise状态保存到
  * loadImpl变量中传递下去.如果它是一个函数(加载函数),则将其保存在loadImpl变量中.*/
  let loadImpl;
  if (typeof applicationOrLoadingFn !== 'function') {
    // applicationOrLoadingFn is an application
      // applicationOrLoadingFn是一个应用程序
    loadImpl = () => Promise.resolve(applicationOrLoadingFn);
  } else {
    // applicationOrLoadingFn is a loadingFn
    //   applicationOrLoadingFn是一个加载函数
    loadImpl = applicationOrLoadingFn;
  }

  // 判断第三个参数是否为函数类型,如果非函数类型 则报错
  if (typeof activityFn !== 'function')
    throw new Error(`The activeWhen argument must be a function`);

  // 将组件名称(第一个参数),
    // 加载函数或加载应用组件(第二个参数),
    // 加载条件函数(第三个参数),
    // 状态(初始未加载),
    //
    //
    // 传递到此组件各个生命周期中的数据方法
  apps.push({
    name: appName,
    loadImpl,
    activeWhen: activityFn,
    status: NOT_LOADED,
    parcels: {},
    devtools: {
      overlays: {
        options: {},
        selectors: [],
      }
    },
    customProps
  });

  // 调用jquery-support.js函数
  ensureJQuerySupport();

  reroute();
}

//检查活动的函数
export function checkActivityFunctions(location) {
  // 初始化活动组件数组
  const activeApps = []
    // 遍历应用列表
    // 判断应用处于已安装或者说是活跃状态(路由地址判定返回为true)时
    // 将组件名称放入活跃(已安装)数组最后一位
  for (let i = 0; i < apps.length; i++) {
    if (apps[i].activeWhen(location)) {
      activeApps.push(apps[i].name)
    }
  }
  // 返回这个组件名称的列表,结束函数
  return activeApps
}

// 过滤获取返回正在加载载入生命周期的应用程序列表
// 未损坏    不在未加载且加载源代码生命周期    代码组件指向无错且指向和当前路由地址吻合的应用组件
export function getAppsToLoad() {
  return apps
    .filter(notSkipped)
    .filter(isntLoaded)
    .filter(shouldBeActive)
}

// 过滤获取返回未损坏且正在加载安装完毕生命周期且路由匹配的的应用程序列表
export function getAppsToUnmount() {
  return apps
    .filter(notSkipped)
    .filter(isActive)
    .filter(shouldntBeActive)
}

// 过滤获取返回正在安装生命周期的应用程序列表
// 判断组件状态,和组件地址是否符合当前路由地址
export function getAppsToMount() {
  return apps
    .filter(notSkipped)
    .filter(isntActive)
    .filter(isLoaded)
    .filter(shouldBeActive)
}

// 卸载加载子应用程序
export function unloadChildApplication(appName, opts) {
    // unloadChildApplication是不推荐的，将在下一个主要版本中删除，使用“unloadApplication”代替“
  console.warn('unloadChildApplication is deprecated and will be removed in the next major version, use "unloadApplication" instead')
    // 调用unloadApplication(卸载加载的应用程序)将appName, opts参数传入
  return unloadApplication(appName, opts)
}
// 下载加载的应用程序参数是应用名称和一个布尔标识符
export function unloadApplication(appName, opts={waitForUnmount: false}) {
  // 判断传入参数是否不符合需求类型
  if (typeof appName !== 'string') {
  // 不符合需求类型向外抛出错误信息
    throw new Error(`unloadApplication requires a string 'appName'`);
  }
  // 过滤出组件列表中name对应的组件
  const app = find(apps, App => App.name === appName);
  // 判断是否未正确获取组件
  if (!app) {
      // 向外抛出错误信息
    throw new Error(`Could not unload application '${appName}' because no such application has been declared`);
  }

  //  获取对应名称的应用组件信息
  const appUnloadInfo = getAppUnloadInfo(app.name);
  // 判断opts参数是否存在,opts.waitForUnmount是否存在,切值是否为true
  if (opts && opts.waitForUnmount) {
    // We need to wait for unmount before unloading the app
      //我们需要等待卸载安装之前卸载应用程序

    if (appUnloadInfo) {
      // Someone else is already waiting for this, too
      // 返回卸载加载信息中的promise对象函数,退出运行
      return appUnloadInfo.promise;
    } else {
      // We're the first ones wanting the app to be resolved.
      // 创建一个新的promise对象
        // 执行时会调用addAppToUnload方法将app组件和一个包含promise的resolve, reject状态的函数传入执行
      const promise = new Promise((resolve, reject) => {
        // 将组件添加到卸载加载的队列
        addAppToUnload(app, () => promise, resolve, reject);
      });
      // 返回promise对象
      return promise;
    }
  } else {
    /* We should unmount the app, unload it, and remount it immediately.
     */
    /*我们应该卸载应用程序，卸载它，并重新安装它立即。*/

    // 用于保存组件promise的变量
    let resultPromise;

    // appUnloadInfo存在或为true说明此组件已经在等待卸载
    if (appUnloadInfo) {
      // Someone else is already waiting for this app to unload
        // 已经有人在等待卸载这个应用程序了
        // 获取组件卸载加载的方法
      resultPromise = appUnloadInfo.promise;
      // 立即卸载应用程序
      immediatelyUnloadApp(app, appUnloadInfo.resolve, appUnloadInfo.reject);
    } else {
      // We're the first ones wanting the app to be resolved.
        // 我们是第一个想要解决这个应用程序的人。
        // 获取一个新的promise它将运行=>将组件添加到卸载加载队列,立即卸载应用程序加载的生命周期
      resultPromise = new Promise((resolve, reject) => {
        addAppToUnload(app, () => resultPromise, resolve, reject);
        immediatelyUnloadApp(app, resolve, reject);
      });
    }

    return resultPromise;
  }
}
// 立即卸载应用程序
function immediatelyUnloadApp(app, resolve, reject) {
  // 将组件卸载的方法
  toUnmountPromise(app)
      // 卸载成功调用将组件卸载加载的方法
    .then(toUnloadPromise)
      //卸载成功 将路由指向重重新指向
    .then(() => {
      resolve()
      setTimeout(() => {
        // reroute, but the unload promise is done
          // 重新路由，但是卸载promise已经完成
        reroute()
      });
    })
    .catch(reject);
}
