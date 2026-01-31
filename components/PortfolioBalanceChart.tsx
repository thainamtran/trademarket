'use client'

import { useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { supabaseClient } from '@/lib/supabase/client'

interface BalanceData {
  date: string
  cashBalance: number
  portfolioValue: number
}

interface PortfolioBalanceChartProps {
  height?: number
}

const periods = [
  { label: '1D', value: '1d' },
  { label: '5D', value: '5d' },
  { label: '1M', value: '1mo' },
  { label: '3M', value: '3mo' },
  { label: '6M', value: '6mo' },
  { label: '1Y', value: '1y' },
  { label: 'YTD', value: 'ytd' },
  { label: 'ALL', value: 'all' },
]

export default function PortfolioBalanceChart({ height = 400 }: PortfolioBalanceChartProps) {
  const [data, setData] = useState<BalanceData[]>([])
  const [allData, setAllData] = useState<BalanceData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState('1mo')

  useEffect(() => {
    const fetchBalanceData = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const { data: { session } } = await supabaseClient.auth.getSession()
        
        if (!session) {
          setError('Please log in to view portfolio balance')
          setLoading(false)
          return
        }

        const response = await fetch('/api/portfolio/balance', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })
        const result = await response.json()

        if (!response.ok || result.error) {
          setError(result.error || 'Failed to load balance data')
          setData([])
          setAllData([])
        } else {
          const history = result.balanceHistory || []
          setAllData(history)
          // Filter data based on selected period
          filterDataByPeriod(history, selectedPeriod)
        }
      } catch (err) {
        setError('Failed to load balance data')
        setData([])
        console.error('Balance data error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchBalanceData()
  }, [])

  const filterDataByPeriod = (history: BalanceData[], period: string) => {
    if (period === 'all' || history.length === 0) {
      setData(history)
      return
    }

    const now = new Date()
    let cutoffDate = new Date()

    switch (period) {
      case '1d':
        cutoffDate.setDate(now.getDate() - 1)
        break
      case '5d':
        cutoffDate.setDate(now.getDate() - 5)
        break
      case '1mo':
        cutoffDate.setMonth(now.getMonth() - 1)
        break
      case '3mo':
        cutoffDate.setMonth(now.getMonth() - 3)
        break
      case '6mo':
        cutoffDate.setMonth(now.getMonth() - 6)
        break
      case '1y':
        cutoffDate.setFullYear(now.getFullYear() - 1)
        break
      case 'ytd':
        cutoffDate = new Date(now.getFullYear(), 0, 1)
        break
      default:
        setData(history)
        return
    }

    const filtered = history.filter((item) => {
      const itemDate = new Date(item.date)
      return itemDate >= cutoffDate
    })

    setData(filtered.length > 0 ? filtered : history)
  }

  useEffect(() => {
    if (allData.length > 0) {
      filterDataByPeriod(allData, selectedPeriod)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod, allData])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  if (loading) {
    return (
      <div className="w-full bg-white rounded-lg shadow-md p-6" style={{ height }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading portfolio balance...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full bg-white rounded-lg shadow-md p-6" style={{ height }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-red-600">
            <p className="font-semibold">Error loading chart</p>
            <p className="text-sm mt-2">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="w-full bg-white rounded-lg shadow-md p-6" style={{ height }}>
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">No balance data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full bg-white rounded-lg shadow-md p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Portfolio Balance</h3>
        <div className="flex gap-2">
          {periods.map((period) => (
            <button
              key={period.value}
              onClick={() => setSelectedPeriod(period.value)}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                selectedPeriod === period.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            stroke="#6b7280"
            hide={true}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
            formatter={(value: number | undefined) => {
              if (value === undefined) return ''
              return formatCurrency(value)
            }}
            labelFormatter={(label) => formatDate(label)}
          />
          <Line
            type="monotone"
            dataKey="portfolioValue"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
