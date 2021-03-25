/*@flow*/

function split(str) {
  return str.split(',')
}

split(11)

function add(x, y: number){
  return x + y
}

add('Hello', 11)

var arr: Array<number> = [1,2,3]

arr.push('a')

var obj: {a: String, b: number} = {
  a: 1,
  b: 'c'
}