import { UPDATING, MOUNTED, SKIP_BECAUSE_BROKEN } from '../applications/app.helpers.js';
import { transformErr } from '../applications/app-errors.js';
import { reasonableTime } from '../applications/timeouts.js';
import { getProps } from './prop.helpers.js';

// 用于更新组件的生命周期
export function toUpdatePromise(parcel) {
  // 返回一个Promise对象
    // 向下传递一个成功的状态
  return Promise.resolve().then(() => {
    // 判断传入参数容器的状态是否不为MOUNTED安装挂载状态
    if (parcel.status !== MOUNTED) {
      // '无法更新包裹'${package .name}'，因为它没有安装'
      throw new Error(`Cannot update parcel '${parcel.name}' because it is not mounted`)
    }

    // 将组件状态置为UPDATING更新中
    parcel.status = UPDATING;

    // 传入容器 对应更新生命周期 周期执行时限判断是否能在指定时间内执行完成组件生命周期执行
    return reasonableTime(parcel.update(getProps(parcel)), `Updating parcel '${parcel.name}'`, parcel.timeouts.mount)
      .then(() => {
      // 执行完成则将组件状态更新为安装
      // 返回组件
        parcel.status = MOUNTED;
        return parcel;
      })
      .catch(err => {
        // 失败将传递的失败信息处理完毕
        const transformedErr = transformErr(err, parcel)
        // 将组件状态更新为已损坏
        parcel.status = SKIP_BECAUSE_BROKEN;
        // 将错误信息在控制台报错弹出
        throw transformedErr;
      })
  })
}

