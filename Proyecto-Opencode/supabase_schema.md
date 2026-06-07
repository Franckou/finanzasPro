# Supabase Database Schema - Finanzas Pro

To migrate this application to Supabase, create a table named `transactions` with the following structure:

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| `id` | uuid | Primary Key, Default: `gen_random_uuid()` | Unique identifier for each transaction |
| `created_at` | timestamptz | Default: `now()` | Record creation timestamp |
| `user_id` | uuid | Foreign Key -> `auth.users.id` | Links the transaction to a specific user |
| `type` | text | NOT NULL (Check: `income`, `expense`) | Type of movement |
| `category` | text | NOT NULL | Category of the transaction |
| `amount` | numeric | NOT NULL | The value of the transaction |
| `date` | date | NOT NULL | The date the transaction occurred |
| `detail` | text | NOT NULL | Description of the movement |

## Security Policies (RLS)
Enable Row Level Security (RLS) to ensure users only see their own data:

```sql
-- Allow users to view only their own transactions
CREATE POLICY "Users can view their own transactions" 
ON transactions FOR SELECT 
USING (auth.uid() = user_id);

-- Allow users to insert their own transactions
CREATE POLICY "Users can insert their own transactions" 
ON transactions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own transactions
CREATE POLICY "Users can update their own transactions" 
ON transactions FOR UPDATE 
USING (auth.uid() = user_id);

-- Allow users to delete their own transactions
CREATE POLICY "Users can delete their own transactions" 
ON transactions FOR DELETE 
USING (auth.uid() = user_id);
```