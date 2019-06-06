/* the array.prototype.find polyfill on npmjs.com is ~20kb (not worth it)
 * and lodash is ~200kb (not worth it)
 */

// 判断func的第i项存在,且不为false,就返回arr的第i项
export function find(arr, func) {
  for (let i=0; i<arr.length; i++) {
    if (func(arr[i])) {
      return arr[i];
    }
  }

  return null;
}
