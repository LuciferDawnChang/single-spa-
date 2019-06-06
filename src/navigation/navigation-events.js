import { reroute } from './reroute.js';
import { find } from '../utils/find.js';

/* We capture navigation event listeners so that we can make sure
 * that application navigation listeners are not called until
 * single-spa has ensured that the correct applications are
 * unmounted and mounted.
 */
// 我们捕获导航事件侦听器，以便确保在single-spa
// 确保卸载和挂载正确的应用程序之前不会调用应用程序导航侦听器。
const capturedEventListeners = {
  hashchange: [],
  popstate: [],
};

export const routingEventsListeningTo = ['hashchange', 'popstate'];
// 导航到对应路由地址
export function navigateToUrl(obj, opts={}) {
  // 用于保存url的容器
  let url;
  // 判断传入第一个参数如果是string类型则将值传给url容器
  // 否则的话判断其this和this.href是否存在且不为false则将其this.href赋予url容器
  // 否则判断obj存在不为false 且obj当前组件的currentTarget存在不为false且obj组件的href存在不为false且obj默认行为存在不为fasle则将传入参数obd的currentTarget.href;赋予url容器
    // 以上条件都不满足的话 抛出一个新的错误, 并结束函数运行
    // 必须使用字符串url调用singleSpaNavigate，其中<a>标记作为上下文，或者使用currentTarget为<a>标记的事件调用
  if (typeof obj === 'string') {
    url = obj ;
  } else if (this && this.href) {
    url = this.href;
  } else if (obj && obj.currentTarget && obj.currentTarget.href && obj.preventDefault) {
    url = obj.currentTarget.href;
    obj.preventDefault();
  } else {
    throw new Error(`singleSpaNavigate must be either called with a string url, with an <a> tag as its context, or with an event whose currentTarget is an <a> tag`);
  }

  // 判断当前href地址是否符合规范,并将处理后的属性返回保存
  const current = parseUri(window.location.href);
  // 判断当前变量url是否符合规范,并将处理后的属性返回保存
  const destination = parseUri(url);

  // 判断第0项如果是# 则将浏览器路由地址设置为#和url处理后的anchor地址
    //否则判断当前地址的host和传入的url的host如果不相等且传入的值得host存在的话,判断opts对象的isTestingEnv存在且不为false则将对象{wouldHaveReloadedThePage: true}返回,否则将window.location.href地址指向为url
    // 否则判断destination.path, current.path是否是符合规范的路径,符合的话将路由地址指向url
    // 以上都不满足的话将地址指向当前地址的锚点
  if (url.indexOf('#') === 0) {
    window.location.hash = '#' + destination.anchor;
  } else if (current.host !== destination.host && destination.host) {
    if (opts.isTestingEnv) {
      return {wouldHaveReloadedThePage: true};
    } else {
      window.location.href = url;
    }
  } else if (!isSamePath(destination.path, current.path)) {
    // different path or a different host
      // different path or a different host
    window.history.pushState(null, null, url);
  } else {
    window.location.hash = '#' + destination.anchor;
  }
  // 判断是否是符合的路径
  function isSamePath(destination, current) {
    // if the destination has a path but no domain, it doesn't include the root '/'
    // 如果目标有路径但没有域，则不包含根'/'
    //   判断路由地址是否符合规范
    return current === destination || current === '/' + destination;
  }
}

// 调用捕获的事件监听器,执行第一个监听函数
export function callCapturedEventListeners(eventArguments) {
  // 判断传入的事件参数是否是存在
  if (eventArguments) {
    // 获取事件元素的第一项元素的tyoe属性,保存在eventType中保存
    const eventType = eventArguments[0].type;
    // 判断routingEventsListeningTo(路由事件监听)中舒服存在这个属性的值
    if (routingEventsListeningTo.indexOf(eventType) >= 0) {
      // 将capturedEventListeners椎间盘买个的eventType属性数组遍历,将其中保存的方法this指向绑定后传入事件参数运行
      capturedEventListeners[eventType].forEach(listener => {
        listener.apply(this, eventArguments);
      });
    }
  }
}

// 将路由指向新的目标地址
function urlReroute() {
  reroute([], arguments)
}


// We will trigger an app change for any routing events.
// 我们将触发任何路由事件的更改作用于应用程序。
window.addEventListener('hashchange', urlReroute);
window.addEventListener('popstate', urlReroute);

// Monkeypatch addEventListener so that we can ensure correct timing
// 监听应用组件运行时对已有的代码进行修改,这样我们才能确保正确的时间

// 应用常量将添加和删除事件监听的方法保存
const originalAddEventListener = window.addEventListener;
const originalRemoveEventListener = window.removeEventListener;
// 修改全局监听事件逻辑
window.addEventListener = function(eventName, fn) {
  // 如果传入参数fn类型为预期的function的话执行
  if (typeof fn === 'function') {
    // 判断路由事件监听数组保存的类型中是否含有enentName类型,
      // 且捕获事件监听方法和fn指向一致的话执行
    if (routingEventsListeningTo.indexOf(eventName) >= 0 && !find(capturedEventListeners[eventName], listener => listener === fn)) {
      // 将捕获事件对应元素数组中加入fn方法
      capturedEventListeners[eventName].push(fn);
      // 结束函数运行
      return;
    }
  }

  // 劫持监听函数将this指向绑定后传入arguments参数运行
  return originalAddEventListener.apply(this, arguments);
}

// 修改全局监听清除事件逻辑
window.removeEventListener = function(eventName, listenerFn) {
    // 如果传入参数listenerFn类型为预期的function的话执行
  if (typeof listenerFn === 'function') {
      // 判断路由事件监听数组保存的类型中是否含有enentName类型,执行
    if (routingEventsListeningTo.indexOf(eventName) >= 0) {
      // 将对应事件列表中的eventName项监听清除
      capturedEventListeners[eventName] = capturedEventListeners[eventName].filter(fn => fn !== listenerFn);
      // 跳出函数运行
      return;
    }
  }

  // 劫持监听清除函数将this指向绑定后传入arguments参数运行
  return originalRemoveEventListener.apply(this, arguments);
}

// 使用常量保存全局pushState模式跳转方法(有历史记录)
const originalPushState = window.history.pushState;
// 修改window自带history.pushState跳转方法
window.history.pushState = function(state) {
  // 使用常量保存window自带的history.pushState跳转,并将this指向挟持改变为originalPushState的this 传入arguments参数
  const result = originalPushState.apply(this, arguments);
  // 将路由地址指向新创建的事件
  urlReroute(createPopStateEvent(state));
  // 返回挟持处理后的window方法
  return result;
}

// 使用常量保存全局replaceState模式跳转方法(无历史记录)
const originalReplaceState = window.history.replaceState;
// 修改window自带history.replaceState跳转方法
window.history.replaceState = function(state) {
    // 使用常量保存window自带的history.replaceState跳转,并将this指向挟持改变为originalReplaceState的this 传入arguments参数
  const result = originalReplaceState.apply(this, arguments);
    // 将路由地址指向新创建的事件
  urlReroute(createPopStateEvent(state));
    // 返回挟持处理后的window方法
  return result;
}

function createPopStateEvent(state) {
  // https://github.com/CanopyTax/single-spa/issues/224 and https://github.com/CanopyTax/single-spa-angular/issues/49
  // We need a popstate event even though the browser doesn't do one by default when you call replaceState, so that
  // all the applications can reroute.
  // 我们需要一个popstate事件，即使浏览器在你调用replaceState时默认没有这样做
  // 这样所有应用程序都可以重新路由
  try {
    // 创建一个新的PopStateEvent传入参数事件名popstate和参数{state}
    return new PopStateEvent('popstate', {state});
  } catch (err) {
    // 兼容ie11
    // IE 11 compatibility https://github.com/CanopyTax/single-spa/issues/299
    // https://docs.microsoft.com/en-us/openspecs/ie_standards/ms-html5e/bd560f47-b349-4d2c-baa8-f1560fb489dd
      // 创建一个全局事件,
      // 初始化事件 事件名popstate 非冒泡事件  不可默认取消  state传入参数
      // 将这个事件返回
    const evt = document.createEvent('PopStateEvent');
    evt.initPopStateEvent('popstate', false, false, state);
    return evt;
  }
}

/* For convenience in `onclick` attributes, we expose a global function for navigating to
 * whatever an <a> tag's href is.
 */
/*为了方便在“onclick”属性中使用，我们公开了一个全局函数，用于导航到任何<a>标记的href。*/
// 为window设置公开一个全局属性singleSpaNavigate指向自定义函数
window.singleSpaNavigate = navigateToUrl;

// 对传入的字符串进行验证,判断是否符合某个key和正则并将字符处理返回
function parseUri(str) {
  // parseUri 1.2.2
  // (c) Steven Levithan <stevenlevithan.com>
  // MIT License
  // http://blog.stevenlevithan.com/archives/parseuri

  const parseOptions = {
    strictMode: true,
    key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
    q:   {
      name:   "queryKey",
      parser: /(?:^|&)([^&=]*)=?([^&]*)/g
    },
    parser: {
      strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
      loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
    }
  };
  // 获取验证公式保存到o
  let  o = parseOptions;
  // 验证传入参数是否符合规范结果保存到m
  let m = o.parser[o.strictMode ? "strict" : "loose"].exec(str);
  // 创建
  let uri = {};
  let i = 14;
  // 判断判断m的第i项(0-13)是否为true,为true则保存到uri的对应项key属性下,不为true则将对应key的值保存为""空字符串
  while (i--) uri[o.key[i]] = m[i] || "";

  // 将url的对应o.q.name(queryKey)设置为{}空对象
  uri[o.q.name] = {};
  // 将url对应key第12项的属性值中符合replace正则,
  // 判断如果匹配到的索引存在,则将uri.queryKey的对应字符替换为o.q.parser并将途欢后的uri.queryKey返回替换匹配到的字符
  // 替换为$2第2项匹配到的值匹配的值
  uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
    if ($1) uri[o.q.name][$1] = $2;
  });
// 将处理后的uri返回
  return uri;
}
