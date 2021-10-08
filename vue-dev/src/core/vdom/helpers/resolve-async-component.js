/* @flow */

import {
  warn,
  once,
  isDef,
  isUndef,
  isTrue,
  isObject,
  hasSymbol,
  isPromise,
  remove
} from 'core/util/index'

import { createEmptyVNode } from 'core/vdom/vnode'
import { currentRenderingInstance } from 'core/instance/render'

// 这个函数的目的就是为了保证能找到异步组件js定义的组件对象，如果是一个普通对象，调用extend转化成一个构造函数
function ensureCtor (comp: any, base) {
  if (
    comp.__esModule ||
    (hasSymbol && comp[Symbol.toStringTag] === 'Module')
  ) {
    comp = comp.default
  }
  return isObject(comp)
    ? base.extend(comp)
    : comp
}

export function createAsyncPlaceholder (
  factory: Function,
  data: ?VNodeData,
  context: Component,
  children: ?Array<VNode>,
  tag: ?string
): VNode {
  const node = createEmptyVNode()
  node.asyncFactory = factory
  node.asyncMeta = { data, context, children, tag }
  return node
}

/**
 * 这个函数处理了三种异步组件的逻辑：普通工厂函数，promise，高级异步组件
 */
export function resolveAsyncComponent (
  factory: Function,
  baseCtor: Class<Component>
): Class<Component> | void {
  if (isTrue(factory.error) && isDef(factory.errorComp)) {
    return factory.errorComp
  }

  if (isDef(factory.resolved)) {
    return factory.resolved
  }

  // 对于多个地方同时初始化一个异步组件，保证实际加载只有一次
  const owner = currentRenderingInstance
  if (owner && isDef(factory.owners) && factory.owners.indexOf(owner) === -1) {
    // already pending
    factory.owners.push(owner)
  }

  if (isTrue(factory.loading) && isDef(factory.loadingComp)) {
    return factory.loadingComp
  }

  if (owner && !isDef(factory.owners)) {
    const owners = factory.owners = [owner]
    let sync = true
    let timerLoading = null
    let timerTimeout = null

    ;(owner: any).$on('hook:destroyed', () => remove(owners, owner))

    const forceRender = (renderCompleted: boolean) => {
      for (let i = 0, l = owners.length; i < l; i++) {
        // 对每一个实例强制update
        (owners[i]: any).$forceUpdate()
      }

      if (renderCompleted) {
        owners.length = 0
        if (timerLoading !== null) {
          clearTimeout(timerLoading)
          timerLoading = null
        }
        if (timerTimeout !== null) {
          clearTimeout(timerTimeout)
          timerTimeout = null
        }
      }
    }

    // 通过once的包装，保证只执行一次
    const resolve = once((res: Object | Class<Component>) => {
      // cache resolved 缓存结果，对于高级异步此时sync已经是false，所以会强制刷新
      factory.resolved = ensureCtor(res, baseCtor)
      // invoke callbacks only if this is not a synchronous resolve
      // (async resolves are shimmed as synchronous during SSR)
      if (!sync) { // 再次判断如果是异步，强制render。为什么？因为数据驱动视图，但是这里的异步组件加载并没有发生数据变动，所以强制重新渲染
        forceRender(true)
      } else {
        owners.length = 0
      }
    })

    const reject = once(reason => {
      process.env.NODE_ENV !== 'production' && warn(
        `Failed to resolve async component: ${String(factory)}` +
        (reason ? `\nReason: ${reason}` : '')
      )
      if (isDef(factory.errorComp)) {
        factory.error = true
        forceRender(true)
      }
    })

    /**
     * 这里就是执行工厂函数的逻辑，
     * 工厂函数通常先发送请求去加载异步组件，拿到组件定义的对象res后，执行reslve(res)
     * 如果是promise加载`() => import(xxx)`那这里的返回就是一个primise`import(xxx)`的返回值
     *  */ 

    /**
     * const AsyncComp = () => ({
      // 需要加载的组件。应当是一个 Promise
      component: import('./MyComp.vue'),
      // 加载中应当渲染的组件
      loading: LoadingComp,
      // 出错时渲染的组件
      error: ErrorComp,
      // 渲染加载中组件前的等待时间。默认：200ms。
      delay: 200,
      // 最长等待时间。超出此时间则渲染错误组件。默认：Infinity
      timeout: 3000
    })
    Vue.component('async-example', AsyncComp)
     */
    const res = factory(resolve, reject)

    if (isObject(res)) {
      if (isPromise(res)) {
        // () => Promise promise异步组件执行到这里，加载完后依旧是执行到了上面的resolve
        if (isUndef(factory.resolved)) {
          res.then(resolve, reject)
        }
      } else if (isPromise(res.component)) { // 高级异步组件有component属性，就会走到这里，它同样是一个promise
        res.component.then(resolve, reject)
        // 因为这是一个异步过程，所以又同步执行了一下的逻辑
        if (isDef(res.error)) {
          factory.errorComp = ensureCtor(res.error, baseCtor)
        }

        if (isDef(res.loading)) {
          factory.loadingComp = ensureCtor(res.loading, baseCtor)
          if (res.delay === 0) {
            factory.loading = true
          } else {
            timerLoading = setTimeout(() => {
              timerLoading = null
              if (isUndef(factory.resolved) && isUndef(factory.error)) {
                factory.loading = true
                forceRender(false) // 延时又会执行这里，然后又会走一次update -> createElement -> resolveAsyncComponent
              }
            }, res.delay || 200)
          }
        }
        // 超时直接reject
        if (isDef(res.timeout)) {
          timerTimeout = setTimeout(() => {
            timerTimeout = null
            if (isUndef(factory.resolved)) {
              reject(
                process.env.NODE_ENV !== 'production'
                  ? `timeout (${res.timeout}ms)`
                  : null
              )
            }
          }, res.timeout)
        }
      }
    }

    sync = false
    // return in case resolved synchronously
    /**
     * loading就为true，直接返回loading组件，否则返回缓存的结果
     */
    return factory.loading
      ? factory.loadingComp
      : factory.resolved
  }
}
