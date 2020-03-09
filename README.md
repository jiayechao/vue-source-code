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

1. 代理方法。在[11-index.html](./demos/11-index.html)中，我们在控制台修改vm._data来实现更新页面，也可以通过来修改，如此，我们需要一个映射，将vm._data.xxx 映射到 vm.xxx ， 而且这两个应该是访问的同一个数据源。查看[12-index.html](./demos/12-index.html)中的`proxy`函数
2. 事件模型，node-event模块
    上面的试图更新我们都是整体更新整个页面，这是有问题的，在vue中的更新是分组件的
    1. 如果没有自定义组件，那么在比较算法时会比较所有的虚拟DOM，然后更新相应的dom
    2. 如果有自定义组件，那么在比较算法时，会去判断更新的是哪个组件，然后更新，而不会更新其他组件
  这里我们就要用到事件发布订阅模式，来达到解耦的目的
  [12-index.html](./demos/12-index.html)
  
3. VUE中observe和watch
  watch中有一些重要的方法
  - get() 用来进行计算或者执行的处理函数
  - update()公共的外部方法，会触发内部的run方法
  - run()，用来判断内部是使用异步运行还是同步运行，这个方法最终会调用内部的get方法
  - cleanupDep() 简单理解为清除队列
  所以我们页面渲染实际上是get方法触发的
  参看[14-index.html](./demos/14-index.html)

4. Watcher和Dep
    之前的渲染Watcher是放在全局上的，但是vue中的组件是**自治**的，每一个watcher用于描述一个渲染行为或者计算行为，
      - 子组件发生数据更新，页面需要重新加载，局部渲染
      - 计算属性代替复杂插值表达式，也会收集相关的依赖属性，只要被依赖的属性发生变化，就会促使计算属性重新计算
  这样我们就需要依赖收集和派发更新，我们在访问的时候就会进行收集，在修改的时候就会进行更新，那么收集什么就更新什么。

  所谓的依赖收集就是告诉当前watcher什么属性被访问了，这样，watcher在渲染的时候就会将收集到的watch属性进行更新

  在watcher调用get方法的时候，将当前Watcher放到全局，在get结束的时候，将这个watcher移除

  每个属性都有一个dep实例

  我们在访问对象属性的时候，我们的渲染watcher已经在去全局中，

  将属性与watcher关联，其实就是将当前渲染的watcher存储到属性相关的dep中，同时将dep也存储到全局watcher中

  dep中有一个notify，这个方法会调取dep的subs中的watcher，调用其update方法

5. 依赖收集和派发更新

    data和watcher一一对应，当读取时收集依赖，将wather添加进全局watch，渲染完后取出。当set设置时，触发派发更新，将全局watcher一一触发。

## vue源码解读

### 目录解读
  1. compiler 编译
    - 使用字符串作为模板
    - 存放字符串模板的解析算法，抽象语法树，优化等
  2. core
    - vue的构造函数
    - 生命周期等方法
  3. platform
    - 针对运行环境有不同的实现
    - vue的入口
  4. server服务端
    - 主要是vue服务端的部分
  5. sfc， 单文件组件
  6. share， 公共工具，方法
