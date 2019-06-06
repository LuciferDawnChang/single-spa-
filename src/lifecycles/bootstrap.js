import { NOT_BOOTSTRAPPED, BOOTSTRAPPING, NOT_MOUNTED, SKIP_BECAUSE_BROKEN } from '../applications/app.helpers.js';
import { reasonableTime } from '../applications/timeouts.js';
import { handleAppError, transformErr } from '../applications/app-errors.js';
import { getProps } from './prop.helpers.js'
// 判断处理组件状态,推进组件Bootstrap进程,更新返回组件
export function toBootstrapPromise(appOrParcel, hardFail = false) {
  return Promise.resolve().then(() => {
      // 判断状态不处于NOT_BOOTSTRAPPED不引导的情况下降应用或者包裹容器返回
    if (appOrParcel.status !== NOT_BOOTSTRAPPED) {
      return appOrParcel;
    }

    // 将组件状态变更为BOOTSTRAPPING引导中
    appOrParcel.status = BOOTSTRAPPING;

    // 执行判断是否能在于其时间内将组件挂载进入对应生命周期,并将组件属性向下传递
    return reasonableTime(appOrParcel.bootstrap(getProps(appOrParcel)), `Bootstrapping appOrParcel '${appOrParcel.name}'`, appOrParcel.timeouts.bootstrap)
    // 状态成功的话,将组件状态变更为未安装,并将最新组件返回
      .then(() => {
        appOrParcel.status = NOT_MOUNTED;
        return appOrParcel;
      })
      // 如果失败,将组件状态变更为已损坏,
      // 根据参数hardFail判定执行函数,向控制台抛出一个错误的信息
      // 如果hardFail判定为true则想外部抛出一个错误提示,如果为false抛出一个错误提示的同时会return返回这个应用组件或容器
      .catch(err => {
        appOrParcel.status = SKIP_BECAUSE_BROKEN;
        if (hardFail) {
          const transformedErr = transformErr(err, appOrParcel)
          throw transformedErr
        } else {
          handleAppError(err, appOrParcel);
          return appOrParcel;
        }
      })
  })
}
