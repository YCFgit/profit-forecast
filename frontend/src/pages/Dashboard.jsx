import { useState } from 'react'
import { Card, Row, Col, Statistic, Button, InputNumber, Spin, message, Tag, Table } from 'antd'
import {
  DollarOutlined,
  ShopOutlined,
  TrophyOutlined,
  AlertOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { runPipeline } from '../api'

export default function Dashboard() {
  const [loading, setLoading] = useState(false)
  const [target, setTarget] = useState(10000000)
  const [result, setResult] = useState(null)

  const handleRun = async () => {
    setLoading(true)
    try {
      const res = await runPipeline(target, 'mock')
      setResult(res.data)
      message.success('测算完成')
    } catch (err) {
      message.error('测算失败: ' + (err.response?.data?.detail || err.message))
    } finally {
      setLoading(false)
    }
  }

  const getRiskColor = (level) => {
    const map = { low: 'green', medium: 'orange', high: 'red', critical: 'red' }
    return map[level] || 'default'
  }

  // 分配方案饼图
  const getAllocationPieOption = () => {
    if (!result) return {}
    const data = result.allocation_detail.slice(0, 10).map(d => ({
      name: d.store_code,
      value: d.target,
    }))
    return {
      title: { text: '门店目标分配 (Top 10)', left: 'center' },
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        data,
        label: { formatter: '{b}\n{d}%' },
      }],
    }
  }

  // 增长率柱状图
  const getGrowthBarOption = () => {
    if (!result) return {}
    const sorted = [...result.allocation_detail].sort((a, b) => {
      return parseFloat(b.growth_rate) - parseFloat(a.growth_rate)
    }).slice(0, 15)
    return {
      title: { text: '门店增长率排行 (Top 15)', left: 'center' },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: sorted.map(d => d.store_code),
        axisLabel: { rotate: 45 },
      },
      yAxis: { type: 'value', axisLabel: { formatter: '{value}%' } },
      series: [{
        type: 'bar',
        data: sorted.map(d => parseFloat(d.growth_rate)),
        itemStyle: {
          color: (params) => {
            const v = params.value
            if (v > 25) return '#ff4d4f'
            if (v > 15) return '#faad14'
            return '#52c41a'
          },
        },
      }],
    }
  }

  return (
    <div>
      <Card title="利润测算" style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col>
            <span>总利润目标: </span>
            <InputNumber
              value={target}
              onChange={setTarget}
              formatter={v => `¥ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={v => v.replace(/¥\s?|(,*)/g, '')}
              style={{ width: 200 }}
              step={1000000}
            />
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              onClick={handleRun}
              loading={loading}
              size="large"
            >
              一键测算
            </Button>
          </Col>
        </Row>
      </Card>

      {loading && <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />}

      {result && !loading && (
        <>
          {/* 关键指标卡片 */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={4}>
              <Card>
                <Statistic
                  title="总目标"
                  value={result.summary['总目标']}
                  prefix="¥"
                  precision={0}
                />
              </Card>
            </Col>
            <Col span={4}>
              <Card>
                <Statistic
                  title="净利润"
                  value={result.summary['净利润']}
                  prefix="¥"
                  precision={0}
                  valueStyle={{ color: result.summary['净利润'] > 0 ? '#3f8600' : '#cf1322' }}
                />
              </Card>
            </Col>
            <Col span={3}>
              <Card>
                <Statistic
                  title="净利率"
                  value={result.summary['净利率']}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col span={3}>
              <Card>
                <Statistic
                  title="门店数"
                  value={result.summary['门店数']}
                  prefix={<ShopOutlined />}
                />
              </Card>
            </Col>
            <Col span={3}>
              <Card>
                <Statistic
                  title="盈利门店"
                  value={result.summary['盈利门店']}
                  prefix={<TrophyOutlined />}
                  valueStyle={{ color: '#3f8600' }}
                />
              </Card>
            </Col>
            <Col span={3}>
              <Card>
                <Statistic
                  title="亏损门店"
                  value={result.summary['亏损门店']}
                  prefix={<AlertOutlined />}
                  valueStyle={{ color: result.summary['亏损门店'] > 0 ? '#cf1322' : '#3f8600' }}
                />
              </Card>
            </Col>
            <Col span={4}>
              <Card>
                <Statistic
                  title="风险等级"
                  value={result.summary['风险等级']}
                  valueStyle={{
                    color: result.summary['风险等级'] === 'low' ? '#3f8600' : '#cf1322'
                  }}
                />
                <Tag color={getRiskColor(result.summary['风险等级'])} style={{ marginTop: 8 }}>
                  风险分: {result.summary['风险分']}
                </Tag>
              </Card>
            </Col>
          </Row>

          {/* 图表 */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={12}>
              <Card>
                <ReactECharts option={getAllocationPieOption()} style={{ height: 350 }} />
              </Card>
            </Col>
            <Col span={12}>
              <Card>
                <ReactECharts option={getGrowthBarOption()} style={{ height: 350 }} />
              </Card>
            </Col>
          </Row>

          {/* 建议 */}
          {result.recommendations?.length > 0 && (
            <Card title="风险建议" style={{ marginBottom: 16 }}>
              {result.recommendations.map((rec, i) => (
                <p key={i}>{rec}</p>
              ))}
            </Card>
          )}

          {/* 分配明细表格 */}
          <Card title="门店分配明细">
            <Table
              dataSource={result.allocation_detail}
              rowKey="store_code"
              size="small"
              pagination={{ pageSize: 20 }}
              columns={[
                { title: '门店编码', dataIndex: 'store_code', sorter: (a, b) => a.store_code.localeCompare(b.store_code) },
                { title: '基线', dataIndex: 'baseline', render: v => `¥${v.toLocaleString()}`, sorter: (a, b) => a.baseline - b.baseline },
                { title: '目标', dataIndex: 'target', render: v => `¥${v.toLocaleString()}`, sorter: (a, b) => a.target - b.target },
                { title: '承压率', dataIndex: 'pressure_ratio', sorter: (a, b) => parseFloat(a.pressure_ratio) - parseFloat(b.pressure_ratio) },
                { title: '增长率', dataIndex: 'growth_rate', sorter: (a, b) => parseFloat(a.growth_rate) - parseFloat(b.growth_rate) },
              ]}
            />
          </Card>
        </>
      )}
    </div>
  )
}
