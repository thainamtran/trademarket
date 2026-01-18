import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-24">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-5xl md:text-6xl font-bold mb-6 text-gray-900">
          Welcome to TradeMarket
        </h1>
        <p className="text-2xl md:text-3xl font-semibold mb-4 text-gray-700">
          Trading Simulator for Beginner Traders
        </p>
        
        <div className="mt-12 space-y-8 text-left max-w-3xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-3xl font-bold mb-4 text-gray-900">Learn to Trade Risk-Free</h2>
            <p className="text-lg text-gray-700 leading-relaxed mb-4">
              TradeMarket is a comprehensive trading simulator designed specifically for beginner traders who want to learn how to trade without risking real money. Practice your trading strategies, understand market dynamics, and build confidence in a safe, simulated environment.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-3xl font-bold mb-4 text-gray-900">Real-Time USA Stock Market Prices</h2>
            <p className="text-lg text-gray-700 leading-relaxed mb-4">
              Experience the excitement of real trading with live, real-time stock market prices from the USA. Our platform integrates with live market data, giving you an authentic trading experience that mirrors the actual stock market. Track your favorite stocks, analyze trends, and make informed trading decisions using current market prices.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-3xl font-bold mb-4 text-gray-900">Perfect for Beginners</h2>
            <p className="text-lg text-gray-700 leading-relaxed">
              Whether you're completely new to trading or looking to refine your skills, TradeMarket provides the tools and environment you need to succeed. Start your trading journey today and learn the fundamentals of stock trading in a risk-free setting.
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            href="/signup" 
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-8 rounded-lg transition-colors text-lg"
          >
            Get Started
          </Link>
          <Link 
            href="/login" 
            className="inline-block bg-gray-600 hover:bg-gray-700 text-white font-semibold py-4 px-8 rounded-lg transition-colors text-lg"
          >
            Sign In
          </Link>
        </div>
      </div>
    </main>
  )
}
