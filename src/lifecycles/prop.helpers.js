import * as singleSpa from '../single-spa.js'
import { mountParcel } from '../parcels/mount-parcel.js';
// 用于获取组件或包裹容器属性的方法
export function getProps(appOrParcel) {
  const result = {
    // 将应用的对应路由地址解析赋予result
    ...appOrParcel.customProps,
      // 获取应用的名称
    name: appOrParcel.name,
      // 将mountParcel的this挟持指向appOrParcel
    mountParcel: mountParcel.bind(appOrParcel),
      // 挂载组件相关状态值
    singleSpa
  };

  // 判断传入应用的unmountThisParcel属性是否存在且不为false
  if (appOrParcel.unmountThisParcel) {
      // 获取传入应用的unmountThisParcel属性赋予resule的unmountSelf属性
    result.unmountSelf = appOrParcel.unmountThisParcel;
  }

  // 返回处理后的result
  return result;
}
