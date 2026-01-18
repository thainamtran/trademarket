-- Create Transactions table to track all buy and sell actions
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('buy', 'sell')),
  quantity DECIMAL(15, 4) NOT NULL,
  price DECIMAL(15, 2) NOT NULL,
  total_amount DECIMAL(15, 2) NOT NULL,
  transaction_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  CONSTRAINT transactions_positive_quantity CHECK (quantity > 0),
  CONSTRAINT transactions_positive_price CHECK (price > 0),
  CONSTRAINT transactions_positive_amount CHECK (total_amount > 0)
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS transactions_user_id_idx ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS transactions_symbol_idx ON public.transactions(symbol);
CREATE INDEX IF NOT EXISTS transactions_date_idx ON public.transactions(transaction_date);
CREATE INDEX IF NOT EXISTS transactions_type_idx ON public.transactions(transaction_type);

-- Enable Row Level Security (RLS)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view their own transactions
CREATE POLICY "Users can view own transactions"
  ON public.transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own transactions
CREATE POLICY "Users can insert own transactions"
  ON public.transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add comment to table
COMMENT ON TABLE public.transactions IS 'Transaction history for all buy and sell actions in the trading simulator';
