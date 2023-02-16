import { getCurrentInstance } from 'vue';

// 生成服务端渲染时生成 head 内标签
export default function useHead(obj: object): void {
    const vm = getCurrentInstance();
    if (vm && Object.prototype.toString.call(obj) === '[object Object]') {
        vm.appContext.config.globalProperties.$headParams = obj;
    }
}
