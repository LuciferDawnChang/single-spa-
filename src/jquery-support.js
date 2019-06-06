// window.$ && window.$.fn指向的是rollup插件的方法
// window.$.fn.jquery指向eslint中的
/*jquery: {
    globals: globals.jquery
},*/
import { routingEventsListeningTo } from './navigation/navigation-events.js';
// 申明变量hasInitialized为false状态
let hasInitialized = false;
// 定义函数将参数jQuery默认等于window.jQuery
export function ensureJQuerySupport(jQuery = window.jQuery) {
  // 如果jQuery为空或不存在则进入(window.jQuery为空或不存在时)
    // 如果window.$  window.$.fn   window.$.fn.jquery存在
    // 将window.$赋值给为空的jQuery
  if (!jQuery) {
    if (window.$ && window.$.fn && window.$.fn.jquery) {
      jQuery = window.$;
    }
  }

  // jQuery存在hasInitialized为false进入
  if (jQuery && !hasInitialized) {
    // 定义常量originalJQueryOn获取jQuery.fn.on;(window.$.fn.on或window.jQuery.fn.on)本来的值保存
    // originalJQueryOff获取jQuery.fn.off;(window.$.fn.off或window.jQuery.fn.off)本来的值保存
    const originalJQueryOn = jQuery.fn.on;
    const originalJQueryOff = jQuery.fn.off;

    // 变更jQuery.fn.on指向函数
      // 此函数返回值为一个函数captureRoutingEvents,这个函数指向呗绑定为当前this.传入参数
      // 并将jQuery.fn.on原函数originalJQueryOn作为第一个参数传入
      // originalJQueryOn, window.addEventListener, eventString, fn, arguments
      // window.addEventListener,windows的监听作为第二个参数传入
      // eventString, fn,为执行jQuery.fn.off函数传入的参数
      // arguments是一个对应于传递给函数的参数的类数组对象。
    jQuery.fn.on = function(eventString, fn) {
      return captureRoutingEvents.call(this, originalJQueryOn, window.addEventListener, eventString, fn, arguments);
    }

      // 变更jQuery.fn.off指向函数
      // 此函数返回值为一个函数captureRoutingEvents,这个函数指向呗绑定为当前this.传入参数
      // 并将jQuery.fn.off原函数originalJQueryOff作为第一个参数参数传入
      // window.addEventListener,windows的监听作为第二个参数传入
      // eventString, fn,为执行jQuery.fn.off函数传入的参数eventString是访问的类型'hashchange', 'popstate'
      // arguments是一个对应于传递给函数的参数的类数组对象。
    jQuery.fn.off = function(eventString, fn) {
      return captureRoutingEvents.call(this, originalJQueryOff, window.removeEventListener, eventString, fn, arguments);
    }

    // 将hasInitialized状态置为true,跳出if判断
    hasInitialized = true;
  }
}

// ensureJQuerySupport中jQuery.fn所引用的函数
function captureRoutingEvents(originalJQueryFunction, nativeFunctionToCall, eventString, fn, originalArgs) {
  // 判断eventString是不为string类型时执行,调用传入的低于个参数方法,经this指向变更为此时的this,传入arguments参数
  if (typeof eventString !== 'string') {
    return originalJQueryFunction.apply(this, originalArgs);
  }

  // 匹配eventString内的空格,回车,换行等空白符以此为分隔符将其分割为数组富裕一个常量
  const eventNames = eventString.split(/\s+/);
  // 遍历此数组
    // 判断eventNames中的元素是否在routingEventsListeningTo('hashchange', 'popstate'路由模式)数组中存在,
    // 存在的话执行window.removeEventListener(eventName, fn)
    // 并将参数中的对应字符串替换为''空(将对应字符删除)
  eventNames.forEach(eventName => {
    if (routingEventsListeningTo.indexOf(eventName) >= 0) {
      nativeFunctionToCall(eventName, fn);
      eventString = eventString.replace(eventName, '');
    }
  });

  // 如果去除字符两端的空格后值为''空则返回this
  // 如果不为空则运行传入的jQuery.fn.on方法将this指向劫持后传入arguments参数
  if (eventString.trim() === '') {
    return this;
  } else {
    return originalJQueryFunction.apply(this, originalArgs);
  }
}
