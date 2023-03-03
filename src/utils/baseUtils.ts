import { ref, onMounted, defineComponent, createElementBlock } from 'vue';
import { defineStore } from 'pinia';
import { getCurrentInstance } from 'vue';

/**
 * 只是将 pinia 作为服务端和客户端数据数据同步工具
 * 如果你想使用他的全部能力，自己参考 pinia 官网 https://pinia.vuejs.org/zh/
 *
 * @param   {string}       key    两端数据同步的标识，同时也是 pinia 全局使用的标识
 * @param   {any}          value  生成这个 store 的默认数据
 */
export const useState = <T>(key: string, value: T) => defineStore(key, () => ({ value: <T>ref(value) }))();

/**
 * 生成服务端渲染时生成 head 内标签
 * 只写了在 SSR 时工作，CSR 时自己写吧
 *
 * @param   {object}  params  需要生成的头部标签对象
 */
export function useHead(params: object): void {
    if (import.meta.env.SSR) {
        const vm = getCurrentInstance();
        if (vm && Object.prototype.toString.call(params) === '[object Object]') vm.appContext.config.globalProperties.$headParams = params;
    }
}

/**
 * 和 nuxtjs 的 <ClientOnly> 一样
 */
export const ClientOnly = defineComponent({
    name: 'ClientOnly',
    // eslint-disable-next-line vue/require-prop-types
    props: ['fallback', 'placeholder', 'placeholderTag', 'fallbackTag'],
    setup(_, { slots }) {
        const mounted = ref(false);
        onMounted(() => {
            mounted.value = true;
        });
        return (props: any) => {
            if (mounted.value) {
                return slots.default?.();
            }
            const slot = slots.fallback || slots.placeholder;
            if (slot) {
                return slot();
            }
            const fallbackStr = props.fallback || props.placeholder || '';
            const fallbackTag = props.fallbackTag || props.placeholderTag || 'span';
            return createElementBlock(fallbackTag, null, fallbackStr);
        };
    },
});