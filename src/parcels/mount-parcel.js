import { validLifecycleFn, flattenFnArray } from '../lifecycles/lifecycle.helpers.js';
import { NOT_BOOTSTRAPPED, NOT_MOUNTED, MOUNTED, UPDATING, LOADING_SOURCE_CODE, SKIP_BECAUSE_BROKEN } from '../applications/app.helpers.js';
import { toBootstrapPromise } from '../lifecycles/bootstrap.js';
import { toMountPromise } from '../lifecycles/mount.js';
import { toUpdatePromise } from '../lifecycles/update.js';
import { toUnmountPromise } from '../lifecycles/unmount.js';
import { ensureValidAppTimeouts } from '../applications/timeouts.js';

let parcelCount = 0;
const rootParcels = {parcels: {}};

// This is a public api, exported to users of single-spa
// 这是一个公共api，导出给single-spa的用户
export function mountRootParcel() {
  return mountParcel.apply(rootParcels, arguments);
}

// 安装容器
export function mountParcel(config, customProps) {
  // 获取this指向
  const owningAppOrParcel = this;

  // Validate inputs
    // 验证传入是否符合规范
    // 是否不存在 或 (类型是否不为对象 且 类型是否为函数)
  if (!config || (typeof config !== 'object' && typeof config !== 'function')) {
    /* 抛出错误 如果没有配置对象或配置加载函数，则无法加载包*/
    throw new Error('Cannot mount parcel without a config object or config loading function');
  }

  // 判断应用传入应用名称是否存在 类型是否不为string
  if (config.name && typeof config.name !== 'string') {
    // 抛出错误 如果有，包裹名称必须是字符串
    throw new Error('Parcel name must be a string, if provided');
  }

  // 判断传入的属性是否非对象类型
  if (typeof customProps !== 'object') {
    // 抛出错误 包有无效的的自定义属性      必须是一个对象
    throw new Error(`Parcel ${name} has invalid customProps -- must be an object`);
  }

  // 判断传入属性domElement属性是否不存在
  if (!customProps.domElement) {
    // 抛出错误包  包${name}不能在没有提供domElement作为支撑的情况下挂载
    throw new Error(`Parcel ${name} cannot be mounted without a domElement provided as a prop`);
  }

  // 获取ID  每次获取后自增.初始为0
  const id = parcelCount++;

  // 判断配置参数是否是函数类型
  const passedConfigLoadingFunction = typeof config === 'function'
    // 如果是 则返回config配置参数 如果不是 将config配置参数包裹在Promise函数中 以成功的状态向下传递
  const configLoadingFunction = passedConfigLoadingFunction ? config : () => Promise.resolve(config)

  // Internal representation
    // 内部表示,内部表征,内在表征,内在表象
    // id                       ID标识
    // parcels
    // status                   状态
    // customProps              自定义属性
    // parentName               外容器名称
    // unmountThisParcel        卸载安装应组件的方法会返回组件信息
  const parcel = {
    id,
    parcels: {},
    status: passedConfigLoadingFunction ? LOADING_SOURCE_CODE : NOT_BOOTSTRAPPED,
    customProps,
    parentName: owningAppOrParcel.name,
      // 卸载对应组件的方法
    unmountThisParcel() {
      // 判断组件状态是否不为安装
      if (parcel.status !== MOUNTED) {
        // 抛出一个新的错误
          //无法卸载一个包裹器name(包裹器名字) -- 他处于一个parcel.status(非MOUNTED安装)的状态
        throw new Error(`Cannot unmount parcel '${name}' -- it is in a ${parcel.status} status`);
      }

      // 卸载渲染安装的方法
      return toUnmountPromise(parcel, true)
        .then(value => {
          if (parcel.parentName) {
            delete owningAppOrParcel.parcels[parcel.id];
          }

          return value;
        })
        .then(value => {
          resolveUnmount(value);
          return value;
        })
        .catch(err => {
          parcel.status = SKIP_BECAUSE_BROKEN;
          rejectUnmount(err);
          throw err;
        });
    }
  };

  // We return an external representation
    // 我们返回一个外部表示

    // let一个变量保存数据.
  let externalRepresentation

  // Add to owning app or parcel
    // 添加到拥有的应用程序或包裹
  owningAppOrParcel.parcels[id] = parcel;

  // 执行配置加载的函数,保存执行结果
  let loadPromise = configLoadingFunction()

    // 判断loadPromise返回结果是否不存在或非为true  或   loadPromise.then是否非是一个函数,如果满足条件则抛出错误,
  if (!loadPromise || typeof loadPromise.then !== 'function') {
    // 在安装包时，配置加载函数必须返回一个promise，该promise将与包配置一起解析
    throw new Error(`When mounting a parcel, the config loading function must return a promise that resolves with the parcel config`)
  }

  // 判断loadPromise向下resolve的值是否存在,如果不为true或不存在时抛出错误
  loadPromise = loadPromise.then(config => {
    if (!config) {
        // 当挂载一个包时，配置加载函数返回一个未使用包配置解析的promise
      throw new Error(`When mounting a parcel, the config loading function returned a promise that did not resolve with a parcel config`)
    }

    // 判断配置的名称是否存在存在就返回不存在就返回包裹器ID标识
    const name = config.name || `parcel-${id}`;

    // 判断config.bootstrap是否是有效的生命周期,如果不是则抛出错误
    if (!validLifecycleFn(config.bootstrap)) {
        // 包${name}必须有一个有效的引导生命周期函数
      throw new Error(`Parcel ${name} must have a valid bootstrap function`);
    }

      // 判断config.bootstrap是否是有效的生命周期,如果不是则抛出错误
    if (!validLifecycleFn(config.mount)) {
        // 包${name}必须有一个有效的挂载安装生命周期函数
      throw new Error(`Parcel ${name} must have a valid mount function`);
    }

      // 判断config.bootstrap是否是有效的生命周期,如果不是则抛出错误
    if (!validLifecycleFn(config.unmount)) {
        // 包${name}必须有一个有效的卸载安装生命周期函数
      throw new Error(`Parcel ${name} must have a valid unmount function`);
    }

      // 判断config.update是否存在且是有效的生命周期,如果不是则抛出错误
    if (config.update && !validLifecycleFn(config.update)) {
        // 包${name}提供了一个无效的更新函数
      throw new Error(`Parcel ${name} provided an invalid update function`);
    }

    // 判断config.bootstrap是否为一个符合规范的生命周期函数
    const bootstrap = flattenFnArray(config.bootstrap);
      // 判断config.mount是否为一个符合规范的生命周期函数
    const mount = flattenFnArray(config.mount);
      // 判断config.unmount是否为一个符合规范的生命周期函数
    const unmount = flattenFnArray(config.unmount);

    // 将容器的状态变更为未引导
    parcel.status = NOT_BOOTSTRAPPED;
    // 将包裹容器名称变更为config的名称或对应包裹器id
    parcel.name = name;
    // 挂载对应对应组件引导生命周期
    parcel.bootstrap = bootstrap;
      // 挂载对应对应组件安装生命周期
    parcel.mount = mount;
      // 挂载对应对应组件卸载生命周期
    parcel.unmount = unmount;
    // 获取的是组件的状态和集合和个生命周期运行时间
    parcel.timeouts = ensureValidAppTimeouts(config.timeouts);

    // 判断config的update周期是否存在并不为false
    if (config.update) {
        // 获取传入参数是否符合规范处理返回一个promise函数
      parcel.update = flattenFnArray(config.update);
      // 保存一个update的值是一个函数,这个函数将传入的参数赋给parcel容器的自定义属性
      externalRepresentation.update = function(customProps) {
        parcel.customProps = customProps;

        // 执行组件更新的promise方法并将执行完毕后返回null
        return promiseWithoutReturnValue(toUpdatePromise(parcel));
      }
    }
  })

  // Start bootstrapping and mounting
  // 开始引导和安装
  // The .then() causes the work to be put on the event loop instead of happening immediately
  // .then()使工作放在事件循环上，而不是立即发生
  // 判断处理组件状态,推进组件Bootstrap引导进程,返回执行完毕更新后的组件信息
  const bootstrapPromise = loadPromise.then(() => toBootstrapPromise(parcel, true));
  // 将引导生命周期执行完毕的组件运行安装的生命周期,更新组件信息并返回
  const mountPromise = bootstrapPromise.then(() => toMountPromise(parcel, true));

  // 申明变量
  let resolveUnmount, rejectUnmount;

  // (卸载安装)创建一个新的promise对象函数,
    // 用resolveUnmount, rejectUnmount;分别保存这个promise对象函数的成功和失败的状态方法
  const unmountPromise = new Promise((resolve, reject) => {
    resolveUnmount = resolve;
    rejectUnmount = reject;
  });

  // 存放组件下挂载的属性方法
  externalRepresentation = {
    // 将组件推进到mount生命周期并返回
    mount() {
      return promiseWithoutReturnValue(
        Promise
        .resolve()
        .then(() => {
          if (parcel.status !== NOT_MOUNTED) {
            throw new Error(`Cannot mount parcel '${name}' -- it is in a ${parcel.status} status`);
          }

          // Add to owning app or parcel
          owningAppOrParcel.parcels[id] = parcel;

          return toMountPromise(parcel);
        })
      )
    },
      // 将组件推进到unmount生命周期并返回
    unmount() {
      return promiseWithoutReturnValue(
        parcel.unmountThisParcel()
      );
    },
      // 获取组件状态
    getStatus() {
      return parcel.status;
    },
      // 运行加载promise函数,推进组件状态,并返回null
    loadPromise: promiseWithoutReturnValue(loadPromise),
      // 运行引导promise函数,推进组件状态,并返回null
    bootstrapPromise: promiseWithoutReturnValue(bootstrapPromise),
      // 运行安装promise函数,推进组件状态,并返回null
    mountPromise: promiseWithoutReturnValue(mountPromise),
      // 运行卸载安装promise函数,推进组件状态,并返回null
    unmountPromise: promiseWithoutReturnValue(unmountPromise),
  };

  // 将保存的方法标识返回
  return externalRepresentation
}
// 执行传入promise对象 返回null
function promiseWithoutReturnValue(promise) {
  return promise.then(() => null);
}
