::: info[==快去点个 star:star:！==]{open}

emoji: :-) :100: :satellite:

采用 GNU通用公共许可证 (GPL) 第3版 授权。详见 [LICENSE.md](https://github.com/wbw121124/wbw121124blog/blob/master/LICENSE.md) 文件。

~~light mode 让我眼睛瞎了~~

这是一个基于 Vue 3 和 Vite 构建的博客网站，使用作者自己编写的博客框架。

:::

::: info
hi
:::

::: success
hi
:::

::: warning
hi
:::

::: error
hi
:::

::: danger
hi
:::

::: details
hi
:::

[![Optimized Blog CI/CD](https://github.com/wbw121124/wbw121124blog/actions/workflows/pages.yml/badge.svg)](https://github.com/wbw121124/wbw121124blog/actions/workflows/pages.yml)[![pages-build-deployment](https://github.com/wbw121124/wbw121124blog/actions/workflows/pages/pages-build-deployment/badge.svg)](https://github.com/wbw121124/wbw121124blog/actions/workflows/pages/pages-build-deployment)

```ts
// [!code word:console:1]
console.log('No errors or warnings')
console.error('Error') // [!code error] [!code --]
console.warn('Warning') // [!code warning] [!code ++]
```

```ts
console.log('hewwo') // [!code --]
console.log('hello') // [!code ++]
console.log('goodbye')
```

```ts
console.log('Not highlighted')
console.log('Highlighted') // [!code highlight]
console.log('Not highlighted')
```

```ts
// [!code highlight:2]
console.log('Highlighted')
console.log('Highlighted')
console.log('Not highlighted')
```

```ts
console.log('Not highlighted')
// [!code highlight:1]
console.log('Highlighted')
console.log('Not highlighted')
```

```ts
// [!code word:Hello]
const message = 'Hello World'
console.log(message) // prints Hello World
```

```ts
// [!code word:Hello:1]
const message = 'Hello World'
console.log(message) // prints Hello World
```

```ts
console.log('Not focused');
console.log('Focused') // [!code focus]
console.log('Not focused');
```

```ts
// [!code focus:2]
console.log('Focused')
console.log('Focused')
console.log('Not focused')
```

```ts
console.log('No errors or warnings')
console.error('Error') // [!code error]
console.warn('Warning') // [!code warning]
```

```js {1,3-4}
console.log('1')
console.log('2')
console.log('3')
console.log('4')
```

```js /Hello/
const msg = 'Hello World'
console.log(msg)
console.log(msg) // 打印 Hello World
```

```ts
console.log('normal typescript')
```

```ts
const unused = 1

type Foo = {
  bar: string
}
```

```ts
// @errors: 2339
let x: [string, number]
x = ['hello', 10] // OK
// ---cut---
console.log(x[0].substring(1))
console.log(x[1].substring(1))
```

| ${\Huge\color{red}\text{\textcircled{}}{\huge\hspace{-.71cm}\not}\footnotesize\overset{\small\hspace{-.1cm}\resetcolor{Fake}}{\color{transparent}.}} \newline\resetcolor{\footnotesize\text{Fake has been forbidden.}}$ |
| :---: |
