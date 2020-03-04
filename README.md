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

### vue的渲染
在上面，我们说的将模板和数据结合过程
实际vue是
- 模板转成抽象语法树
- 抽象语法树转成虚拟dom
- 虚拟dom转成真实dom
这三个操作，第一个操作是很消耗性能的

在vue中，每一个watch改变，computed的改变都会重新渲染页面，**虚拟dom和真实dom是一一对应的关系**，只要数据改变，就会生成一个新的虚拟dom，然后和未改变前的虚拟dom通过diff算法，并且将改变更新到原来的虚拟DOM，原来的虚拟dom改变，真是dom也就会改变了

那么在我们的代码中[02-index.html](./demos/02-index.html)，每一个watch改变，computed的改变都会重新渲染（render）页面，也就会重新生成虚拟dom（我们没有抽象语法树，简化成虚拟dom），所以我们需要一些优化。

既然模板是不变的，那么我们就可以用闭包缓存起来[07-index.html](./demos/07-index.html)

### 数据驱动

我们在改变data中的数据时，页面的数据会改变，我们怎么做到呢[08-index.html](./demos/08-index.html)

可以先看一个小demo
```javascript
Object.defineProperty(obj, proty, option)
```