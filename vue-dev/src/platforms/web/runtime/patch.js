/* @flow */

import * as nodeOps from 'web/runtime/node-ops'
import { createPatchFunction } from 'core/vdom/patch'
import baseModules from 'core/vdom/modules/index'
import platformModules from 'web/runtime/modules/index'

// the directive module should be applied last, after all
// built-in modules have been applied.
const modules = platformModules.concat(baseModules)

// 这里传入一个对象，该对象包含两个参数，nodeOps是一系列操作dom的函数，moduls是一些模块钩子函数的定义
export const patch: Function = createPatchFunction({ nodeOps, modules })
