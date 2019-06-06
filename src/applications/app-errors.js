let errorHandlers = []
// 用于处理应用程序错误,报错终止组件运行
export function handleAppError(err, app) {
  // 处理错误信息保存
  const transformedErr = transformErr(err, app);

  // 判断errorHandlers是否为空,不为空(长度不为0执行内部代码)
  if (errorHandlers.length) {
    // 遍历数组,使用句柄中传入的方法处理组件信息并返回
    errorHandlers.forEach(handler => handler(transformedErr));

    // 判断errorHandlers为空(长度为0执行内部代码)
  } else {
    // 开启定时器早控制台抛出一个错误信息
    setTimeout(() => {
      throw transformedErr;
    });
  }
}

// 添加错误手柄(函数方法)的函数
export function addErrorHandler(handler) {
  // 判断传入参数不是函数类型则运行
  if (typeof handler !== 'function') {
      // 抛出错误信息:single-spa错误处理程序必须是一个函数并结束函数运行
    throw new Error('a single-spa error handler must be a function');
  }
  // 将处理手柄传入错误手柄素组集合
  errorHandlers.push(handler);
}
// 删除错误手柄(函数方法)的函数
export function removeErrorHandler(handler) {
  if (typeof handler !== 'function') {
      // 判断传入参数不是函数类型则运行
      // 抛出错误信息:single-spa错误处理程序必须是一个函数并结束函数运行
    throw new Error('a single-spa error handler must be a function');
  }
  // 初始化removedSomething(删除的东西)为false
  let removedSomething = false;
  // errorHandlers处理,过滤判断是否和参数handler符合如果符合则返回保存在isHandler中
  errorHandlers = errorHandlers.filter(h => {
    const isHandler = h === handler;
    // 判断removedSomething和isHandler是否都为false或空
    removedSomething = removedSomething || isHandler;
    // 返回isHandler值的取反
    return !isHandler;
  })

    // 将removedSomething值返回
  return removedSomething;
}
//
// ogErr错误信息, appOrParcel对应路由
export function transformErr(ogErr, appOrParcel) {
  // 判断获取组件对象是外包裹器还是对应应用
  const objectType = appOrParcel.unmountThisParcel ? 'Parcel' : 'Application';
  // 用于保存组件出错时所在的状态
  // objectType(组件类型)appOrParcel.name(组件名称)死亡在状态appOrParcel.status(组件状态):
  const errPrefix = `${objectType} '${appOrParcel.name}' died in status ${appOrParcel.status}: `;

  // 用于保存错误结果的变量
  let result;

  // 判断ogErr是否是一个错误
  if (ogErr instanceof Error) {
    try {
      // 将错误的信息拼接上组件错误的信息
      ogErr.message = errPrefix + ogErr.message;
    } catch(err) {
      // 如果信息为只读时,不可对信息做变更会执行这里
      /* Some errors have read-only message properties, in which case there is nothing
       * that we can do.
       */
      /*
      * 有些错误具有只读消息属性，在这种情况下，我们
      * 也无能为力。
      */
    }
    // 保存错误信息
    result = ogErr;
  } else {
    // else=>ogErr不是一个错误
    // 输出警告信息
    console.warn(`While ${appOrParcel.status}, '${appOrParcel.name}' rejected its lifecycle function promise with a non-Error. This will cause stack traces to not be accurate.`);
    try {
      // 判断执行代码块 创建一个新的错误,内容是(错误信息:错误信息)
      result = new Error(errPrefix + JSON.stringify(ogErr));
    } catch(err) {
      // 如果这不是一个错误,而且你不能把它拼串,那你还能对它做什么?
      // If it's not an Error and you can't stringify it, then what else can you even do to it?
      // 保存这个信息
      result = ogErr;
    }
  }

  // 错误路由名称
  result.appName = appOrParcel.name;
  result.name = appOrParcel.name

  // 返回错误信息
  return result;
}
