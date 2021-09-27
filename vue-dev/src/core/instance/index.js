import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'

// 这里才是整个Vue的构造函数，我们只能通过new Vue去实例化他
function Vue (options) {
  // 只允许vue实例
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  // new Vue的时候执行
  this._init(options)
}

// 为什么Vue不通过class实现呢，下面对vue的拓展如果使用class实现会很难实现并维护，而通过原型函数的方式将VUE传入
// 对整个代码的维护和管理是很方便的

// 每一个mixin主要功能是往Vue的原型上混入一些方法属性
initMixin(Vue)
stateMixin(Vue)
eventsMixin(Vue)
lifecycleMixin(Vue)
renderMixin(Vue)

export default Vue
