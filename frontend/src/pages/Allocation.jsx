import { useState } from 'react'
import { Card, Row, Col, Button, InputNumber, Spin, message, Table, Tag, Descriptions } from 'antd'
import ReactECharts from 'echarts-for-react'
import { allocateTargets } from '../api'

export default function Allocation() {
  const [loading, setLoading] = useState(false)
  const [target, setTarget] = useState(10000000)
  const [result, setResult] = useState(null)

  const handleAllocate = async () => {
    setLoading(true)
    try {
      const res = await allocateTargets(target, true)
      setResult(res.data)
      message.success('分配完成')
    } catch (err) {
      message.error('分配失败: ' + (err.response?.data?.detail || err.message))
    } finally {
      setLoading(false)
    }
  }

  // 承压率分布图
  const getPressureDistOption = () => {
    if (!result) return {}
    const rates = result.allocations.map(a => parseFloat(a.pressure_ratio) / 100)
    const bins = {}
    const labels = ['<0%', '0-10%', '10-20%', '20-30%', '30-50%', '>50%']
    labels.forEach(l => bins[l] = 0)
    rates.forEach(r => {
      if (r < 0) bins['<0%']++
      else if (r < 0.1) bins['0-10%']++
      else if (r < 0.2) bins['10-20%']++
      else if (r < 0.3) bins['20-30%']++
      else if (r < 0.5) bins['30-50%']++
      else bins['>50%']++
    })
    return {
      title: { text: '承压率分布', left: 'center' },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: labels },
      yAxis: { type: 'value', name: '门店数' },
      series: [{
        type: 'bar',
        data: labels.map(l => bins[l]),
        itemStyle: {
          color: (params) => {
            const colors = ['#52c41a', '#73d13d', '#faad14', '#ff7a45', '#ff4d4f', '#cf1322']
            return colors[params.dataIndex]
          },
        },
      }],
    }
  }

  // 基线 vs 目标散点图
  const getScatterOption = () => {
    if (!result) return {}
    const data = result.allocations.map(a => [a.baseline, a.target])
    return {
      title: { text: '基线 vs 目标', left: 'center' },
      tooltip: {
        trigger: 'item',
        formatter: (p) => `${p.data[0].store_code}<br/>基线: ¥${p.value[0].toLocaleString()}<br/>目标: ¥${p.value[1].toLocaleString()}`,
      },
      xAxis: { type: 'value', name: '基线' },
      yAxis: { type: 'value', name: '目标' },
      series: [{
        type: 'scatter',
        data,
        symbolSize: 8,
      }],
      grid: { left: '15%' },
    }
  }

  // 情景对比
  const getScenarioOption = () => {
    if (!result?.scenarios) return {}
    const names = Object.keys(result.scenarios)
    const targets = names.map(n => result.scenarios[n].total_target)
    return {
      title: { text: '情景对比', left: 'center' },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: names },
      yAxis: { type: 'value', name: '总目标', axisLabel: { formatter: (v) => `${(v / 10000).toFixed(0)}万` } },
      series: [{
        type: 'bar',
        data: targets,
        itemStyle: { color: '#1890ff' },
        label: {
          show: true,
          position: 'top',
          formatter: (p) => `¥${(p.value / 10000).toFixed(0)}万`,
        },
      }],
    }
  }

  const columns = [
    { title: '门店编码', dataIndex: 'store_code', sorter: (a, b) => a.store_code.localeCompare(b.store_code) },
    { title: '基线', dataIndex: 'baseline', render: v => `¥${v.toLocaleString()}`, sorter: (a, b) => a.baseline - b.baseline },
    { title: '目标', dataIndex: 'target', render: v => `¥${v.toLocaleString()}`, sorter: (a, b) => a.target - b.target },
    { title: '承压额', dataIndex: 'pressure', render: v => `¥${v.toLocaleString()}` },
    { title: '承压率', dataIndex: 'pressure_ratio', sorter: (a, b) => parseFloat(a.pressure_ratio) - parseFloat(b.pressure_ratio) },
    { title: '增长率', dataIndex: 'growth_rate', sorter: (a, b) => parseFloat(a.growth_rate) - parseFloat(b.growth_rate) },
    {
      title: '新店',
      dataIndex: 'is_new_store',
      render: v => v ? <Tag color="blue">新店</Tag> : null,
      filters: [{ text: '新店', value: true }, { text: '老店', value: false }],
      onFilter: (value, record) => record.is_new_store === value,
    },
  ]

  return (
    <div>
      <Card title="承压分配" style={{ marginBottom: 16 }}>
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
            <Button type="primary" onClick={handleAllocate} loading={loading}>
              执行分配
            </Button>
          </Col>
        </Row>
      </Card>

      {loading && <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />}

      {result && !loading && (
        <>
          <Card style={{ marginBottom: 16 }}>
            <Descriptions bordered column={4}>
              <Descriptions.Item label="总目标">¥{result.total_target.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="总基线">¥{result.total_baseline.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="平均增长率">{result.avg_growth_rate}</Descriptions.Item>
              <Descriptions.Item label="公平性">
                <Tag color={result.fairness_grade === 'A' ? 'green' : result.fairness_grade === 'B' ? 'blue' : 'orange'}>
                  {result.fairness_grade}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Card>
                <ReactECharts option={getPressureDistOption()} style={{ height: 300 }} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <ReactECharts option={getScatterOption()} style={{ height: 300 }} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <ReactECharts option={getScenarioOption()} style={{ height: 300 }} />
              </Card>
            </Col>
          </Row>

          <Card title="分配明细">
            <Table
              dataSource={result.allocations}
              rowKey="store_code"
              size="small"
              pagination={{ pageSize: 20 }}
              columns={columns}
            />
          </Card>
        </>
      )}
    </div>
  )
}
