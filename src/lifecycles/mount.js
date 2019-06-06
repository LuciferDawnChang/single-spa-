import { NOT_MOUNTED, MOUNTED, SKIP_BECAUSE_BROKEN } from '../applications/app.helpers.js';
import { handleAppError, transformErr } from '../applications/app-errors.js';
import { reasonableTime } from '../applications/timeouts.js';
import CustomEvent from 'custom-event';
import { getProps } from './prop.helpers.js';
import { toUnmountPromise } from './unmount.js';

let beforeFirstMountFired = false;
let firstMountFired = false;
// 推进组件状态,并将组件返回
export function toMountPromise(appOrParcel, hardFail = false) {
  // 返回一个Promise对象的成功的回调
  return Promise.resolve().then(() => {
    // 判断组件状态是否不为NOT_MOUNTED未安装
    if (appOrParcel.status !== NOT_MOUNTED) {
      // 返回这个组件
      return appOrParcel;
    }

    // 判断beforeFirstMountFired(首次挂载前)状态是否为false
    if (!beforeFirstMountFired) {
      // 触发一个自定义创建的事件
      window.dispatchEvent(new CustomEvent('single-spa:before-first-mount'));
      // beforeFirstMountFired状态变更为true
      beforeFirstMountFired = true;
    }

      // 执行判断是否能在于其时间内将组件挂载进入对应生命周期,并将组件属性向下传递
    return reasonableTime(appOrParcel.mount(getProps(appOrParcel)), `Mounting application '${appOrParcel.name}'`, appOrParcel.timeouts.mount)
        // resolve成功的状态执行
      .then(() => {
      // 将组件状态变更为MOUNTED装载完成
        appOrParcel.status = MOUNTED;

        // 判定是否为第一次挂载
        if (!firstMountFired) {
            // 触发一个自定义创建的事件
          window.dispatchEvent(new CustomEvent('single-spa:first-mount'));
          // 将firstMountFired状态置为true
          firstMountFired = true;
        }

        // 将组件或包裹容器返回
        return appOrParcel;
      })
      // reject失败的状态执行
      .catch(err => {
        // If we fail to mount the appOrParcel, we should attempt to unmount it before putting in SKIP_BECAUSE_BROKEN
        // We temporarily put the appOrParcel into MOUNTED status so that toUnmountPromise actually attempts to unmount it
        // instead of just doing a no-op.
        //如果我们不能把分配的包裹装上去，我们应该在损坏之前把它卸下来
        //我们暂时将解析包设置为挂载状态，以便toUnmountPromise实际尝试卸载它
        //而不是什么都不做。
        // 将组件状态biang为装载完毕
        appOrParcel.status = MOUNTED
          // 执行返回卸载装载的Promise
        return toUnmountPromise(appOrParcel)
            // 已成功的状态执行setSkipBecauseBroken函数
          .then(setSkipBecauseBroken, setSkipBecauseBroken)

          // 将组件设置为损坏状态
        function setSkipBecauseBroken() {
          // 判定hardFail是否不为true
          if (!hardFail) {
            // 执行组件检测输出的函数抛出组件错误 将错误信息和组件传入
            handleAppError(err, appOrParcel);
            // 将组件状态变更为SKIP_BECAUSE_BROKEN
            appOrParcel.status = SKIP_BECAUSE_BROKEN;
            // 将处理后的组件返回
            return appOrParcel;
          } else {
            // 判断抛出组件状态
            const transformedErr = transformErr(err, appOrParcel)
              // 将组件装变更为已损坏
            appOrParcel.status = SKIP_BECAUSE_BROKEN;
            // 在控制台报错抛出错误信息
            throw transformedErr
          }
        }
      })
  })
}
