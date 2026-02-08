# 验证进程列表 (D2R 多开环境)

**最后更新**: 2026-02-07
**环境**: Windows (3开 D2R, 使用 create_process_with_logon 沙盒隔离)

## 需强制终止的进程 (Process Killer Targets)

以下进程在启动新实例前必须清理，否则会导致 Battle.net 拒绝启动或 D2R 多开失败。

| 进程名称 (Image Name) | 描述 | 验证状态 | 备注 |
| :--- | :--- | :--- | :--- |
| **Battle.net.exe** | 战网客户端主程序 | ✅ 已验证 | 多开核心冲突点，必须杀。PID 41488 (示例) |
| **Agent.exe** | 战网更新代理 | ✅ 已验证 | 负责游戏更新，常驻后台。需清理以免占用文件锁 |
| **crashpad_handler.exe** | 错误报告捕获器 | ✅ 已验证 | 战网崩溃后的残留进程，会阻止新实例启动 |
| **Blizzard Error.exe** | 暴雪错误报告工具 | ✅ 已验证 | 游戏崩溃后弹出，若不关闭会阻止重启 |
| **Uninstaller.exe** | 卸载程序 (误报?) | ⚠️ 观察中 | 偶发性出现，建议加入查杀列表 |

## 忽略的进程 (Safe to Ignore)

以下进程与 D2R 运行无关，不需要查杀。

| 进程名称 | 描述 | 备注 |
| :--- | :--- | :--- |
| **ArmourySwAgent.exe** | ASUS Armoury Crate | 华硕奥创中心组件，PID 20512。**不要杀** |

## 3开环境行为特征

1. **Mutex 互斥锁**:
   - 每个 D2R 实例都会创建名为 `DiabloII Check For Other Instances` 的互斥锁。
   - 必须通过 `DuplicateHandle` + `CloseHandle` 远程关闭该句柄，否则只能运行一个实例。
   - 需要 `SeDebugPrivilege` 权限才能操作其他用户(沙盒账号)的进程句柄。

2. **权限要求**:
   - 跨用户杀进程和关句柄需要管理员权限 + 调试权限 (`SeDebugPrivilege`)。
   - 否则会报 `Access Denied (0x80070005)`。
