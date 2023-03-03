# vite + vue3 + typescript + ssr

## 判断是否服务端渲染
服务端和客户端的环境注意好区分，避免多次执行，或执行报错。
```
<script setup lang="ts">
    // 在服务端、客户端都会执行
    if (import.meta.env.SSR) {
        // 在服务端渲染时执行
    } else {
        // 在客户端渲染时执行
    }
</script>
```

## 路由页面 pages
具体代码在 `src/router.ts` 内，会自动集成 `vue-router`，结合 pages 目录下的文件(夹)名来构建我们的项目。

如果把任何东西放在方括号[]中，它将被转换为一个[dynamic router](https://router.vuejs.org/zh/guide/essentials/dynamic-matching.html)参数。您可以在一个文件名或目录中混合和匹配多个参数，甚至是非动态文本。

如果需要一个通配路由，可以使用一个名为 `[…slug].vue` 的文件来创建它。这将匹配该路径下的所有路由，因此它不支持任何非动态文本。

示例 🌰
```
-| pages/
---| index.vue
---| users-[group]/
-----| [id].vue
```
在上面的例子中，可以通过 $route 对象访问组件中的参数 group/id:
```
<template>
    {{ $route.params.group }}
    {{ $route.params.id }}
</template>
```
当路由跳转到 /user-admins/123 时，将会渲染出
```
admins 123
```


## State
因为 ssr vue3 的特点，`ref` 无法实现服务端和客户端状态的同步。

因此项目内使用 [pinia](https://pinia.vuejs.org/zh/) 作为同步两端数据的状态管理，来替代 `ref`，这也是 `vue` 官方推荐的状态管理库。
```
<script setup lang="ts">  
    import { useState } from '@/utils/baseUtils';
    // 第一个传参的键值必须要有，不要重复
    // 这是用来同步用的，同时也是全局使用时所需
    const data = useState<{ title: string }>('data', { title: 'hello world' });

    const initData = async (title) => {
        data.value = { title };
    };
</script>

<template>
    <h1>{{ data.value.title }}</h1>
    <div v-html="data.value.content"></div>
</template>
```
这里只是简单作为一个可以在服务端和客户端之间正常运行的状态管理，如果你需要发挥他全部功能，可以自己上 [pinia官方](https://pinia.vuejs.org/zh/) 查阅相关文档。

## Head
前端在客户端时能自由的创建删除标签，但在服务端时却相对来说有点麻烦，因为没有 `window` 、`document` 等对象。

因此本项目内提供 `useHead` 来动态生成 `head` 内标签，仅能用在服务端渲染，重复使用会覆盖。
```
<script setup lang="ts">  
    import { useHead } from '@/utils/baseUtils';

    const setHead = ({ title, content, image }) => {
        useHead({
            title,
            meta: [
                { property: 'og:title', content: title },
                { property: 'og:description', content: content },
                { property: 'og:image', content: image },
                { itemprop: 'name', content: title },
                { itemprop: 'description', content: content },
                { itemprop: 'image', content: image },
            ],
            link: [
                { rel: 'icon', type: 'image/x-icon', href: image },
                { rel: 'shortcut icon', href: image },
            ],
        });
    };

    if (import.meta.env.SSR) {
        setHead({
            title: 'hello world!',
            content: 'fuck world!',
            image: ''
        });
    }
</script>
```

## ClientOnly
`<ClientOnly>` 组件，是专门在客户端渲染组件的组件。已全局注册，直接使用。
```
<template>
    <div>
        <Sidebar />
        <ClientOnly>
            <!-- 该组件只会在客户端渲染 -->
            <Comments />
        </ClientOnly>
    </div>
</template>
```
使用一个插槽，如： fallback ，直到 `<ClientOnly>` 组件在客户端挂载。
```
<template>
    <div>
        <Sidebar />
        <ClientOnly>
            <!-- 该组件只会在客户端渲染 -->
            <Comments />
            <template #fallback>
                <!-- 这将在服务器端渲染 -->
                <p>Loading comments...</p>
            </template>
        </ClientOnly>
    </div>
</template>
```

## PM2
`pm2.json` 配置文件已默认开启集群模式，具体的可参考[pm2文档](https://pm2.fenxianglu.cn/docs/general/cluster-mode)，或者[node cluster](https://nodejs.org/dist/latest-v18.x/docs/api/cluster.html)。

环境变量部分，自己查阅[pm2文档](https://pm2.fenxianglu.cn/docs/general/environment-variables)。
