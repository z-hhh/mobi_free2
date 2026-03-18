# Mobi Free 2 - 健身设备监控应用

本项目是一个基于 Web Bluetooth API 的健身设备监控应用，旨在连接并同步 Mobi 系列健身器材（如划船机、椭圆机）的运动数据。

## 项目概览

- **核心功能**: 通过蓝牙连接健身器材，实时展示运动指标（时间、距离、卡路里、心率、桨频/转速等），并支持阻力调节。
- **技术栈**: 
  - **前端框架**: React 19 + TypeScript + Vite
  - **状态管理**: Redux Toolkit (用于全局运动数据、设备状态和日志)
  - **UI 库**: Mantine v8, Tailwind Merge, Tabler Icons
  - **蓝牙协议**: 支持多种协议（V1, V2, FTMS, HuanTong），代码位于 `src/services/bluetooth/protocols/`。
  - **数据持久化**: 使用 `idb` (IndexedDB) 存储运动历史，`localStorage` 存储设置和最后连接的设备信息。
  - **部署**: 配置为 Cloudflare Pages。

## 核心架构

- **蓝牙管理 (`src/services/bluetooth/`)**:
  - `BluetoothManager.ts`: 核心单例，负责设备扫描、连接生命周期及协议自动协商（V2 > V1 > HuanTong > FTMS）。
  - `DeviceProtocol.ts`: 协议接口定义。
  - `protocols/`: 具体协议解析实现，处理蓝牙 Characteristic 的通知数据。
- **状态管理 (`src/store/`)**:
  - `workoutSlice.ts`: 存储当前运动指标。
  - `deviceSlice.ts`: 存储蓝牙连接状态和设备信息。
  - `timerMiddleware.ts`: 自定义中间件，用于在运动进行时驱动时长计时。
- **计算逻辑**:
  - `src/hooks/useEllipticalCalculator.ts`: 针对某些协议（如 V2）进行距离、能量和功率的派生计算。
- **页面布局**:
  - `src/layout/AppLayout.tsx`: 包含侧边栏/底部导航的整体布局。
  - `src/components/dashboard/`: 核心仪表盘 UI。

## 开发指南

### 运行与构建

- **安装依赖**: `npm install`
- **本地开发**: `npm run dev` (需在支持 Web Bluetooth 的浏览器中访问，如 Chrome, Edge 或 iOS 上的 Bluefy)
- **生产构建**: `npm run build`
- **代码校验**: `npm run lint`

### 开发规范

- **类型安全**: 严格使用 TypeScript 定义所有协议数据格式和 Redux 状态。
- **蓝牙调试**: 所有的蓝牙交互均会记录在 `logSlice` 中，可通过 UI 中的调试控制台查看。
- **样式**: 优先使用 Mantine 的组件系统和 Style Props，配合 PostCSS 变量。
- **新增协议**: 若要支持新设备，需在 `src/services/bluetooth/protocols/` 实现 `DeviceProtocol` 接口，并在 `BluetoothManager.ts` 的 `connect` 方法中添加识别逻辑。

## 部署信息

项目使用 `wrangler.jsonc` 配置，静态资源目录为 `./dist`，适合部署至 Cloudflare Pages 或 GitHub Pages。
