## vue源码学习

### vue的执行
  1. 拿到模板
  2. 拿到数据
  3. 将模板和数据结合，得到html元素
  4. 放到页面中
  5. 自己实现，参看[02-index.html](./demos/02-index.html)
```javascript
console.log(root)
let app = new Vue({
  el: '#root',
  data: {
    name: 'yeye',
    info: '帅哥'
  }
})
console.log(root)
```

### 数据驱动
