## flow在vue中的应用

flow作为类型检查的工具，当然是用来检查类型的。除了常用的string，number，oboolean等基本类型，
flow可以自定义类型。

通过`.flowconfig`文件中的`[libs]`，vue指定了flow文件夹，可以看到里面有
```shell
  compiler.js
  component.js
  global-api.js
  modules.js
  options.js
  ssr.js
  vnode.js
  weex.js
```
通过自定义类型来约束对象