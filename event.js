const event = {
  eventObj: {},
  // 注册事件
  on(eventName, callback) {
    // 如果已经有这个事件\
    // if(!this.eventObj[eventName]) {
    //   this.eventObj[eventName]= []
    // }
    // this.eventObj[eventName].push(callback)
    // 分享一下vue的写法
    (this.eventObj[eventName] || (this.eventObj[eventName] = [])).push(callback)
  },
  // 触发事件
  emit(eventName, ...rest) {
    if(!this.eventObj[eventName]) {
      console.error('不存在这个执行函数')
      return
    }
    // 找到需要执行的函数
    this.eventObj[eventName].forEach(callback => {
      console.log(rest)
      callback.apply(null, rest)
    });
  },
  // 解绑函数
  off(eventName, handle) {
    // 移除所有事件
    if(!arguments.length) {
      this.eventObj = {}
    } else if( arguments.length === 1) {
      this.eventObj[eventName] = []
    } else {
      let len = this.eventObj[eventName].length
      for(let i = 0; i<len; i++) {
        if(this.eventObj[eventName][i] === handle) {
          this.eventObj[eventName].splice(i, 1)
        }
      }
    }
  }
}