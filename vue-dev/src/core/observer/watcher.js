/* @flow */

import {
  warn,
  remove,
  isObject,
  parsePath,
  _Set as Set,
  handleError,
  noop
} from '../util/index'

import { traverse } from './traverse'
import { queueWatcher } from './scheduler'
import Dep, { pushTarget, popTarget } from './dep'

import type { SimpleSet } from '../util/index'

let uid = 0

/**
 * A watcher parses an expression, collects dependencies,
 * and fires callback when the expression value changes.
 * This is used for both the $watch() api and directives.
 */
// 第一件见到这个类就是在mountComponent中，其中传入的expOrFn是一个update函数
export default class Watcher {
  vm: Component;
  expression: string;
  cb: Function;
  id: number;
  deep: boolean;
  user: boolean;
  lazy: boolean;
  sync: boolean;
  dirty: boolean;
  active: boolean;
  deps: Array<Dep>;
  newDeps: Array<Dep>;
  depIds: SimpleSet;
  newDepIds: SimpleSet;
  before: ?Function;
  getter: Function;
  value: any;

  constructor (
    vm: Component,
    expOrFn: string | Function,
    cb: Function,
    options?: ?Object,
    isRenderWatcher?: boolean
  ) {
    this.vm = vm
    if (isRenderWatcher) {
      vm._watcher = this
    }
    vm._watchers.push(this)
    // options，我们可以看到watcher有多种类型
    if (options) {
      this.deep = !!options.deep // 对一个对象做深度检测
      this.user = !!options.user
      this.lazy = !!options.lazy
      this.sync = !!options.sync
      this.before = options.before
    } else {
      this.deep = this.user = this.lazy = this.sync = false
    }
    this.cb = cb
    this.id = ++uid // uid for batching
    this.active = true
    this.dirty = this.lazy // for lazy watchers
    this.deps = [] // 表示watcher拥有的dep实例的数组
    this.newDeps = []
    this.depIds = new Set() // 表示deps的id的set类型，这里为什么会有连个dep实例数组呢
    /**
     * 考虑到 Vue 是数据驱动的，所以每次数据变化都会重新 render，那么 vm._render() 方法又会再次执行，
     * 并再次触发数据的 getters，所以 Watcher 在构造函数中会初始化 2 个 Dep 实例数组，
     * newDeps 表示新添加的 Dep 实例数组，而 deps 表示上一次添加的 Dep 实例数组
     */
    this.newDepIds = new Set()
    this.expression = process.env.NODE_ENV !== 'production'
      ? expOrFn.toString()
      : ''
    // parse expression for getter
    if (typeof expOrFn === 'function') {
      this.getter = expOrFn
    } else {
      this.getter = parsePath(expOrFn)
      if (!this.getter) {
        this.getter = noop
        process.env.NODE_ENV !== 'production' && warn(
          `Failed watching path: "${expOrFn}" ` +
          'Watcher only accepts simple dot-delimited paths. ' +
          'For full control, use a function instead.',
          vm
        )
      }
    }
    // computed中的watcher传入的是lazy，这里并不会立刻求值
    this.value = this.lazy
      ? undefined
      : this.get() // 执行get函数
  }

  /**
   * Evaluate the getter, and re-collect dependencies.
   */
  // 这里会执行传入的回调updateComponent
  get () {
    // 压栈，赋值，相当于订阅这个watcher
    pushTarget(this)
    let value
    const vm = this.vm
    try {
      value = this.getter.call(vm, vm) // 执行回调，也就是vm._update(vm._render(), hydrating)，计算属性不一样哦
      // 优先执行render，此时会访问数据，触发数据对象上的getter
    } catch (e) {
      if (this.user) {
        handleError(e, vm, `getter for watcher "${this.expression}"`)
      } else {
        throw e
      }
    } finally {
      // "touch" every property so they are all tracked as
      // dependencies for deep watching
      // 深度监听
      if (this.deep) {
        traverse(value)
      }
      // 执行完后，这里要出栈，将target恢复为上一个watcher
      popTarget()
      // 最后执行
      this.cleanupDeps()
    }
    return value
  }

  /**
   * Add a dependency to this directive.
   */
  // 访问数据触发了get，get会触发dep.depend,实际上就是这个函数
  addDep (dep: Dep) {
    const id = dep.id
    if (!this.newDepIds.has(id)) { // 保证数据不会重复
      this.newDepIds.add(id)
      this.newDeps.push(dep)
      if (!this.depIds.has(id)) {
        dep.addSub(this) // 将watcher推入到持有这个wather的dep的subs中，这个目的是为后续数据变化时候能通知到哪些 subs 做准备。
        // 这样就完成了所有依赖的收集
      }
    }
  }

  /**
   * Clean up for dependency collection.
   */
  /**
   * 为什么会有这个清楚依赖？设想一下我们通过V-if渲染A和B模板，当渲染A时访问a，
   * 但是如果我们渲染B时修改了a，此时如果没有清除订阅，就会通过A，浪费资源
   */
  cleanupDeps () {
    let i = this.deps.length
    while (i--) {
      const dep = this.deps[i]
      if (!this.newDepIds.has(dep.id)) {
        dep.removeSub(this) // 移除subs中订阅的watcher
      }
    }
    let tmp = this.depIds
    this.depIds = this.newDepIds
    this.newDepIds = tmp
    this.newDepIds.clear()
    tmp = this.deps
    this.deps = this.newDeps
    
    // 交换depIds和newDepIds，deps和newDeps

    this.newDeps = tmp
    this.newDeps.length = 0
  }

  /**
   * Subscriber interface.
   * Will be called when a dependency changes.
   */
  update () {
    /* istanbul ignore else */
    // 对于不同的watcher执行不同策略
    if (this.lazy) { // 计算属性执行，置为true，当下次访问时再重新求值
      this.dirty = true
    } else if (this.sync) { // 一旦我们设置了同步，会直接run，而不是进队列
      this.run()
    } else {
      queueWatcher(this)
    }
  }

  /**
   * Scheduler job interface.
   * Will be called by the scheduler.
   */
  /**
   * 这个是watcher更新的重点函数，实际上就是执行传入的回调
   */
  run () {
    if (this.active) {
      const value = this.get() // 执行get，重新触发getter方法，重走patch。这就是watcher原理
      // 三个条件：值变化，新值是对象，deep模式
      if (
        value !== this.value ||
        // Deep watchers and watchers on Object/Arrays should fire even
        // when the value is the same, because the value may
        // have mutated.
        isObject(value) ||
        this.deep
      ) {
        // set new value
        
        const oldValue = this.value
        this.value = value
        if (this.user) {
          try {
            // 注意，这里会把第一个和第一个参数擦换入心智value和旧值oldVlaue，这也是我们在自定义watch能拿到新旧值的原因
            this.cb.call(this.vm, value, oldValue)
          } catch (e) {
            handleError(e, this.vm, `callback for watcher "${this.expression}"`)
          }
        } else {
          this.cb.call(this.vm, value, oldValue)
        }
      }
    }
  }

  /**
   * Evaluate the value of the watcher.
   * This only gets called for lazy watchers.
   */
  evaluate () {
    this.value = this.get()
    this.dirty = false
  }

  /**
   * Depend on all deps collected by this watcher.
   */
  depend () {
    let i = this.deps.length
    while (i--) {
      this.deps[i].depend()
    }
  }

  /**
   * Remove self from all dependencies' subscriber list.
   */
  teardown () {
    if (this.active) {
      // remove self from vm's watcher list
      // this is a somewhat expensive operation so we skip it
      // if the vm is being destroyed.
      if (!this.vm._isBeingDestroyed) {
        remove(this.vm._watchers, this)
      }
      let i = this.deps.length
      while (i--) {
        this.deps[i].removeSub(this)
      }
      this.active = false
    }
  }
}
