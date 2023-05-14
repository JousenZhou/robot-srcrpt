const init = require('./init')

// 注册模块表
const registry = [
    // 触发器
    {
        id: 9,
        moduleId: 'joujo-wechatbot',
        out: [{outType: "output_friend", targetId: 10, branch: "weChat_input"}],
        param: {}
    },
    // 插件
    {
        id: 10,
        moduleId: 'joujo-chatgpt',
        out: [],
        param: {}
    },
]
init(9,registry).then()
setInterval(function(){},9999999);