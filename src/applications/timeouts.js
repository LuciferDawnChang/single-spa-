// 生命周期状态和生命周期加载时限的对象
const globalTimeoutConfig = {
  bootstrap: {
    millis: 4000,
    dieOnTimeout: false,
  },
  mount: {
    millis: 3000,
    dieOnTimeout: false,
  },
  unmount: {
    millis: 3000,
    dieOnTimeout: false,
  },
  unload: {
    millis: 3000,
    dieOnTimeout: false,
  },
};

// 设置引导导入生命周期最大时间和状态
export function setBootstrapMaxTime(time, dieOnTimeout = false) {
  // 确认传入路由引导运行的时间类型和范围正常,避免出错
    // 如果类型非number或其小于等于0时报错
  if (typeof time !== 'number' || time <= 0) {
    throw new Error(`bootstrap max time must be a positive integer number of milliseconds`);
  }

  // 将引导执行的生命周期时间和组状态做出调整
  globalTimeoutConfig.bootstrap = {
    millis: time,
    dieOnTimeout,
  };
}

// 设置安装渲染生命周期最大时间和状态
export function setMountMaxTime(time, dieOnTimeout = false) {
    // 如果时间类型非number或其小于等于0时报错
  if (typeof time !== 'number' || time <= 0) {
    throw new Error(`mount max time must be a positive integer number of milliseconds`);
  }

  // 变更生命时间和状态类型
  globalTimeoutConfig.mount = {
    millis: time,
    dieOnTimeout,
  };
}

// 设置卸载安装渲染生命周期时间和组状态做出调整
export function setUnmountMaxTime(time, dieOnTimeout = false) {
    // 如果时间类型非number或其小于等于0时报错
  if (typeof time !== 'number' || time <= 0) {
    throw new Error(`unmount max time must be a positive integer number of milliseconds`);
  }

    // 变更生命时间和状态类型
  globalTimeoutConfig.unmount = {
    millis: time,
    dieOnTimeout,
  };
}

// 设置卸载组件生命周期时间和组状态做出调整
export function setUnloadMaxTime(time, dieOnTimeout = false) {
    // 如果时间类型非number或其小于等于0时报错
  if (typeof time !== 'number' || time <= 0) {
    throw new Error(`unload max time must be a positive integer number of milliseconds`);
  }

    // 变更生命时间和状态类型
  globalTimeoutConfig.unload = {
    millis: time,
    dieOnTimeout,
  };
}

// 判断是否能在合理的时间内运行解析执行传入组件的对应生命周期
// 执行将组件或容器调用到对应的生命周期,并将执行结果返回
// promise:传入执行的将组件属性获取, 并谁要执行的生命周期promise对象函数方法
// description:传入的将要执行的生命周期行为
// timeoutConfig:组件进入此生命周期所能解析使用的时间,超出时限为超时
export function reasonableTime(promise, description, timeoutConfig) {
  // 定时器执行时间
  const warningPeriod = 1000;

  return new Promise((resolve, reject) => {
    let finished = false;
    let errored = false;

    // 执行传入的 用于app资额在的函数1
    promise
        // 执行成功
    .then(val => {
        // 将传入的promise执行完毕finished标识的状态标志位true
      finished = true;
      // 传递一个成功的状态并将处理后的信息一同向下传递
      resolve(val);
    })
        // 如果执行失败
    .catch(val => {
      // 将传入的promise执行完毕finished标识的状态标志位true
      finished = true;
      // 传递一个失败的状态,并将处理后的信息一同向下传递
      reject(val);
    });

    // 定时(1秒)执行一次maybeTimingOut函数,传入参数是1类型是number
    setTimeout(() => maybeTimingOut(1), warningPeriod);
    // 定时()执行一次maybeTimingOut函数,传入参数是true类型是布尔,执行时间是20ms
    setTimeout(() => maybeTimingOut(true), timeoutConfig.millis);

    function maybeTimingOut(shouldError) {
        // 如果finished状态为false=>未执行传入生命周期函数
      if (!finished) {
        // 传入shouldError值为true时
        if (shouldError === true) {
          // errored标识置为true
          errored = true;
          // 如果卸载组件时出错在时间超时
          if (timeoutConfig.dieOnTimeout) {
            // 向下传递一个失败的状态,并将失败的信息一同传递下去
            reject(`${description} did not resolve or reject for ${timeoutConfig.millis} milliseconds`);
          } else {
            // 如果卸载组件时不是出错在时间超时
            // 输出错误信息
            console.error(`${description} did not resolve or reject for ${timeoutConfig.millis} milliseconds -- we're no longer going to warn you about it.`);
            //don't resolve or reject, we're waiting this one out
              // 不是成功或失败，我们等待这个问题的结果
          }
        } else if (!errored) {
          // 传入shouldError值不为true时
          // 获取这个错误shouldError的值
          const numWarnings = shouldError;
          // 将传入的值(不为true就为1)和设置的警告时间(1000)相乘的值赋予numMillis
          const numMillis = numWarnings * warningPeriod;
          // 输出警告语句(${description}没有在${numMillis}毫秒内返回成功或失败的状态)
          console.warn(`${description} did not resolve or reject within ${numMillis} milliseconds`);
          // 如果时间numMillis + warningPeriod总时长小于timeoutConfig.millis引导时间递归运行maybeTimingOut在warningPeriod毫秒后
            // 也就是在为超出指定的时间段的情况下检测是否有运行结束的标识finished否则会一直运行到超出时限
          if (numMillis + warningPeriod < timeoutConfig.millis) {
            setTimeout(() => maybeTimingOut(numWarnings + 1), warningPeriod);
          }
        }
      }
    }
  });
}
// 获取组件状态集
export function ensureValidAppTimeouts(timeouts = {}) {
  // 获取返回组件生命周期状态和生命周期加载时限的设置值对象集
  return {
    ...globalTimeoutConfig,
    ...timeouts,
  }
}
