# Supabase Database Migrations

This directory contains SQL migration files for the Supabase database.

## Profile Table

The `001_create_profile_table.sql` file creates a `profiles` table that:

- Links to Supabase Auth users via UUID
- Stores user profile information (full name, email)
- Manages trading simulator balances (initial, current, total value)
- Includes Row Level Security (RLS) policies for data protection
- Automatically creates a profile when a new user signs up
- Tracks creation and update timestamps

## How to Run Migrations

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of the migration file
4. Paste and execute the SQL in the editor

### Option 2: Via Supabase CLI

If you have the Supabase CLI installed:

```bash
supabase db push
```

This will run all pending migrations.

## Table Structure

### profiles

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key, references auth.users(id) |
| full_name | TEXT | User's full name |
| email | TEXT | User's email address (unique) |
| created_at | TIMESTAMP | Account creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |
| initial_balance | DECIMAL(15,2) | Starting balance ($100,000) |
| current_balance | DECIMAL(15,2) | Current available cash |
| total_value | DECIMAL(15,2) | Total portfolio value (cash + holdings) |

## Security

- Row Level Security (RLS) is enabled
- Users can only view, update, and insert their own profiles
- All policies use `auth.uid()` to verify user identity

## Automatic Profile Creation

When a new user signs up through Supabase Auth:
1. A trigger automatically creates a profile record
2. The profile is initialized with the user's email and full name from metadata
3. Initial balance is set to $100,000
