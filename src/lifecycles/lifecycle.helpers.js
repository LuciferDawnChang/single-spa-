import { find } from '../utils/find.js';

// 判断传参是否有效的生命周期函数,存在 且 (是一个函数 或 一个数组(内部元素时函数))
export function validLifecycleFn(fn) {
  return fn && (typeof fn === 'function' || isArrayOfFns(fn));

  // 判断参数是否为数组 且 数组内部元素不包含非函数
  function isArrayOfFns(arr) {
    return Array.isArray(arr) && !find(arr, item => typeof item !== 'function');
  }
}

// 判断传入参数是否符合
export function flattenFnArray(fns, description) {
  // 判断fns是否为数组 是的话返回 不是的话将其包装成数组返回
  fns = Array.isArray(fns) ? fns : [fns];
  // 判断fns参数长度是否为0是的话将其指向一个新的数组 数组内是一个promise成功的resolve传递
  if (fns.length === 0) {
    fns = [() => Promise.resolve()];
  }

  // 返回一个函数 函数内部使用一个promise包装的返回
    // 向下传递的值是成功(传入的值是一个符合规范的生命周期函数)
    // 或失败(传递的值不是一个符合规范的生命周期函数)
  return function(props) {
    // 返回一个新的peomise对象函数
    return new Promise((resolve, reject) => {
      // 判断fns是否为一个符合规范的生命周期函数
      waitForPromises(0);
      // 判断fns是否是一个符合规范的生命周期函数
      function waitForPromises(index) {
        // 将对应值(props参数)传入fns对应生命周期函数运行并赋予常量promise
        const promise = fns[index](props);
        // 判断是否非为一个promise
        if (!smellsLikeAPromise(promise)) {
          // 向下传递一个失败的状态 参数是"${index}没有return一个promise"
          reject(`${description} at index ${index} did not return a promise`);
            // 否则的话 执行
        } else {
          // 执行这个promise对象函数,
          promise
          // 传递的是一个成功的状态执行,
          // 判断index是否为fns数组的长度-1是的话向下resolve一个成功的状态没有参数
          // 否则(index不为fns数组的长度-1),递归调用执行参数为index+1
            .then(() => {
              if (index === fns.length - 1) {
                resolve();
              } else {
                waitForPromises(index + 1);
              }
            })
              // 如果传递了一个失败的状态 则 什么都不做
            .catch(reject);
        }
      }
    });
  }
}

// 判断参数promise是否存在不为false且其的.then类型为function 且 它的.catch也是一个函数
export function smellsLikeAPromise(promise) {
  return promise && typeof promise.then === 'function' && typeof promise.catch === 'function';
}
