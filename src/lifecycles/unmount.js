import { UNMOUNTING, NOT_MOUNTED, MOUNTED, SKIP_BECAUSE_BROKEN } from '../applications/app.helpers.js';
import { handleAppError, transformErr } from '../applications/app-errors.js';
import { reasonableTime } from '../applications/timeouts.js';
import { getProps } from './prop.helpers.js';
// 卸载生命周期的函数
export function toUnmountPromise(appOrParcel, hardFail = false) {
    // 返回一个
  return Promise.resolve().then(() => {
      // 如果组件(应用程序或包裹器)状态不是安装
    if (appOrParcel.status !== MOUNTED) {
        // 返回这个组件并结束函数
      return appOrParcel;
    }
    // 将组件状态变更为卸载
    appOrParcel.status = UNMOUNTING;

    // (卸载子包裹器)遍历组件容器的标识,调用unmountThisParcel方法将其卸载
    const unmountChildrenParcels = Object.keys(appOrParcel.parcels)
      .map(parcelId => appOrParcel.parcels[parcelId].unmountThisParcel());

    // 容器错误信息的存储器
    let parcelError;

    //
      // 将一个卸载子容器的方法使用Promise包装执行等待其执行完毕后向下传递
    return Promise.all(unmountChildrenParcels)
        // 执行unmountAppOrParcel函数
      .then(
        unmountAppOrParcel,
        parcelError => {
          // There is a parcel unmount error
          return unmountAppOrParcel()
            .then(() => {
              // Unmounting the app/parcel succeeded, but unmounting its children parcels did not
                // 卸载app/parcel成功，但卸载其子包失败
                // 创建一个新的报错信息报错
              const parentError = new Error(parcelError.message)
                // 判断如果传入的hardFail为true时执行
              if (hardFail) {
                  // 将组件和错误信息传入函数,判断返回组件错误信息
                const transformedErr = transformErr(parentError, appOrParcel)
                  // 将组件状态设置为损坏
                appOrParcel.status = SKIP_BECAUSE_BROKEN;
                // 阻止程序运行,输出错误
                throw transformedErr
              } else {
                  // 如果传入的hardFail为false时执行
                  // 处理错误信息,在控制台报错
                handleAppError(parentError, appOrParcel);
                // 将状态更改为已损坏
                appOrParcel.status = SKIP_BECAUSE_BROKEN;
              }
            })
        }
      )
      .then(() => appOrParcel)

      //
    function unmountAppOrParcel() {
        // 我们总是试图卸载分配的包裹容器，即使孩子们的包裹容器未能卸载
      // We always try to unmount the appOrParcel, even if the children parcels failed to unmount.
      //   执行appOrParcel.unmount将卸载组件的方法和组件属性, 和卸载信息, 定时回调被执行时间
      return reasonableTime(appOrParcel.unmount(getProps(appOrParcel)), `Unmounting application ${appOrParcel.name}'`, appOrParcel.timeouts.unmount)
        .then(() => {
          // The appOrParcel needs to stay in a broken status if its children parcels fail to unmount
            // 如果它如果它的子元素容器无法卸载,则让它分配的容器保持损坏的状态
            // 如果应用容器错误信息为空(未报错)
          if (!parcelError) {
              // 将其状态制为未加载
            appOrParcel.status = NOT_MOUNTED;
          }
        })
        .catch(err => {
            //
          if (hardFail) {
              // 将组件和错误信息传入函数,判断返回组件错误信息
            const transformedErr = transformErr(err, appOrParcel);
              // 将组件状态设置为损坏
            appOrParcel.status = SKIP_BECAUSE_BROKEN;
              // 终止程序运行在控制台报错
            throw transformedErr;
          } else {
              // 处理错误信息,在控制台报错
            handleAppError(err, appOrParcel);
              // 将组件状态设置为损坏
            appOrParcel.status = SKIP_BECAUSE_BROKEN;
          }
        })
    }
  })
}
