let registry = []

// 获取实例
const getInstance = (id) => {
    // 获取模块
    const moduleInfo = registry.find(e => e.id === id)
    // 返回获取实例对象
    return {
        ...moduleInfo,
        instance: require(`${moduleInfo.moduleId}`)
    }
}
// 通过当前模块出口类型获取下一节点（模块id，入口分支）
const getNextModule = (currentModule, outType) => {
    const module_ = currentModule.out.find((e) => e.outType === outType) || {}
    return {
        targetId: module_.targetId,
        branch: module_.branch,
        param: {}
    }
}

// 用户池
const userPool = new Map()

class User {
    // 当前任务节点
    currentNode = null
    // 挂起实例
    hooksInstance = null

    async runtime(msg, type, parent, callback) {

        const returnHandle = async ({output, result: res}, instance) => {
            // 如多出口值为hook 当前实例挂起
            if (["hooks"].includes(output)) {
                this.hooksInstance = instance
                callback(res)
                return
            }
            // 清空挂起hooks
            this.hooksInstance = null
            // 存在出口值但是没有连接后面节点则判定为last值
            const {targetId} = getNextModule(this.currentNode, type)

            // 如果没有出口值 则代表执行完成
            if (!output || !targetId) {
                this.currentNode = null
                callback(res)
                return
            }
            // 如果存在出口 继续循环
            await this.runtime(res, output, this.currentNode, callback)
        }

        // 如果直接挂起 hooksInstance
        if (this.hooksInstance) {
            await returnHandle(await this.hooksInstance.run("hook", msg), this.hooksInstance)
            return
        }
        // 获取下一步走向
        const {targetId, branch} = getNextModule(parent, type)
        // 获取下一节点信息
        const {instance: nextNodeInstance, ...nextModuleInfo} = getInstance(targetId)
        // 实例下一节点对象
        const nextInstance = new nextNodeInstance(nextModuleInfo.param)
        // 赋予即时节点
        this.currentNode = nextModuleInfo
        // 执行 返回节点执行结果
        const x = await nextInstance.run(branch, msg)
        // 执行处理函数
        await returnHandle(x, nextInstance)
    }
}

module.exports = async (id, registry_) => {
    registry = registry_
    // 触发器
    const {instance, ...moduleInfo} = getInstance(id)
    // 实例触发器
    const triggerInstance = new instance(moduleInfo.param)
    // 触发器启动
    triggerInstance.start(async ({output, result}, callback, id) => {
        // 如果用户池没有注册
        if (!userPool.has(id)) {
            // 注册用户池子
            const user = new User()
            await user.runtime(result, output, moduleInfo, callback)
            userPool.set(id, user)
        } else {
            const user = userPool.get(id)
            await user.runtime(result, output, moduleInfo, callback)
        }
    })
}