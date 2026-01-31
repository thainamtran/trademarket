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

interface HistoricalData {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface StockChartProps {
  symbol: string
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
]

export default function StockChart({ symbol, height = 400 }: StockChartProps) {
  const [data, setData] = useState<HistoricalData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState('1mo')

  useEffect(() => {
    const fetchHistoricalData = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const response = await fetch(
          `/api/stocks/history?symbol=${encodeURIComponent(symbol)}&period=${selectedPeriod}`
        )
        const result = await response.json()

        if (!response.ok || result.error) {
          setError(result.error || 'Failed to load chart data')
          setData([])
        } else {
          setData(result.data || [])
        }
      } catch (err) {
        setError('Failed to load chart data')
        setData([])
        console.error('Chart data error:', err)
      } finally {
        setLoading(false)
      }
    }

    if (symbol) {
      fetchHistoricalData()
    }
  }, [symbol, selectedPeriod])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    if (selectedPeriod === '1d' || selectedPeriod === '5d') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } else if (selectedPeriod === '1mo' || selectedPeriod === '3mo') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  if (loading) {
    return (
      <div className="w-full bg-white rounded-lg shadow-md p-6" style={{ height }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading chart...</p>
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
          <p className="text-gray-500">No chart data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full bg-white rounded-lg shadow-md p-4 md:p-6 overflow-hidden">
      <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h3 className="text-lg font-semibold text-gray-900">Price Chart</h3>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 md:overflow-x-visible md:pb-0 md:mx-0 md:px-0">
          {periods.map((period) => (
            <button
              key={period.value}
              onClick={() => setSelectedPeriod(period.value)}
              className={`px-3 py-1 text-sm rounded transition-colors whitespace-nowrap flex-shrink-0 ${
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
      <div className="w-full overflow-hidden">
        <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            stroke="#6b7280"
            hide={true}
          />
          <YAxis
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
            labelFormatter={(label) => `Date: ${formatDate(label)}`}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="close"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            name="Close Price"
          />
        </LineChart>
      </ResponsiveContainer>
      </div>
    </div>
  )
}
