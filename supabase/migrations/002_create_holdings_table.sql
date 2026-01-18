-- Create Holdings table to track user stock purchases
CREATE TABLE IF NOT EXISTS public.holdings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  quantity DECIMAL(15, 4) NOT NULL DEFAULT 0,
  purchase_price DECIMAL(15, 2) NOT NULL,
  purchase_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  CONSTRAINT holdings_positive_quantity CHECK (quantity > 0),
  CONSTRAINT holdings_positive_price CHECK (purchase_price > 0)
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS holdings_user_id_idx ON public.holdings(user_id);
CREATE INDEX IF NOT EXISTS holdings_symbol_idx ON public.holdings(symbol);

-- Enable Row Level Security (RLS)
ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view their own holdings
CREATE POLICY "Users can view own holdings"
  ON public.holdings
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own holdings
CREATE POLICY "Users can insert own holdings"
  ON public.holdings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own holdings
CREATE POLICY "Users can update own holdings"
  ON public.holdings
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create policy to allow users to delete their own holdings
CREATE POLICY "Users can delete own holdings"
  ON public.holdings
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_holdings_updated_at
  BEFORE UPDATE ON public.holdings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Add comment to table
COMMENT ON TABLE public.holdings IS 'User stock holdings/purchases in the trading simulator';
