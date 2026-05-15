import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, theme, Typography } from 'antd'
import {
  DashboardOutlined,
  SwapOutlined,
  DollarOutlined,
  AlertOutlined,
} from '@ant-design/icons'

const { Header, Content, Sider } = Layout
const { Title } = Typography

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: '利润总览' },
  { key: '/allocation', icon: <SwapOutlined />, label: '承压分配' },
  { key: '/profit', icon: <DollarOutlined />, label: '利润测算' },
  { key: '/risk', icon: <AlertOutlined />, label: '风险评估' },
]

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken()

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider breakpoint="lg" collapsedWidth="0">
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <Title level={4} style={{ color: '#fff', margin: 0 }}>
            利润测算系统
          </Title>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 24px', background: colorBgContainer }}>
          <Title level={3} style={{ margin: '16px 0' }}>
            鞋服零售利润测算系统
          </Title>
        </Header>
        <Content style={{ margin: '24px 16px 0' }}>
          <div style={{
            padding: 24,
            minHeight: 360,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}
