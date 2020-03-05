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

上面我们只做到对象和基本类型的响应化，但是如果有数组的非变异方法，比如push，pop等之类的，我们还没做到
请看[09-index.html](./demos/09-index.html)

如何拓展一个已经定义的函数的功能：
  1. 定义一个变量指向函数
  2. 重新定义原来的函数
  3. 拓展功能
  4. 调用变量指向的函数
我们就可以通过修改响应式数组原型上的push方法 [10-index.html](./demos/10-index.html)

又有问题了，如果vue直接赋值也是可以的，那要怎么实现呢？其实很简单，只需要在构造函数中对data也进行一个watch就可以了

所以，修改数据模板刷新怎么做呢？我们只需要在set中再次刷新就可以了[11-index.html](./demos/11-index.html)

### 事件模型，发布订阅模式

1. 代理方法。在[11-index.html](./demos/11-index.html)中，我们在控制台修改vm._data来实现更新页面，也可以通过来修改，如此，我们需要一个映射，将obj.xxx 映射到 vm._data.xxx， 而且这两个应该是访问的同一个数据源
2. 事件模型，node-event模块
3. 