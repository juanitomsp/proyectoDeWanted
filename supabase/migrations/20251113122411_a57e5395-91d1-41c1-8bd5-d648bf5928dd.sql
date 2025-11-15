-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE user_role AS ENUM ('admin', 'employee');
CREATE TYPE location_type AS ENUM ('restaurant', 'bar', 'cafe', 'catering', 'store', 'other');
CREATE TYPE storage_type AS ENUM ('refrigerated', 'frozen', 'dry', 'ambient');
CREATE TYPE batch_status AS ENUM ('ok', 'warning', 'critical', 'expired');
CREATE TYPE transfer_status AS ENUM ('pending', 'accepted', 'rejected', 'completed');
CREATE TYPE subscription_status AS ENUM ('active', 'inactive', 'trial', 'cancelled');

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Businesses table
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  legal_name TEXT,
  tax_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Locations table
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  location_type location_type NOT NULL DEFAULT 'restaurant',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User roles table (separate from profiles for security)
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'employee',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, location_id)
);

-- Suppliers table
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Products master table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  gtin TEXT, -- GS1 code
  default_storage_type storage_type DEFAULT 'dry',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Delivery notes (albaranes)
CREATE TABLE delivery_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  delivery_date DATE NOT NULL,
  image_url TEXT,
  notes TEXT,
  processed_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Delivery note items
CREATE TABLE delivery_note_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_note_id UUID NOT NULL REFERENCES delivery_notes(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity DECIMAL(10,2) NOT NULL,
  unit TEXT DEFAULT 'units',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Batches (lotes)
CREATE TABLE batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  delivery_note_item_id UUID REFERENCES delivery_note_items(id) ON DELETE SET NULL,
  batch_number TEXT,
  quantity DECIMAL(10,2) NOT NULL,
  remaining_quantity DECIMAL(10,2) NOT NULL,
  unit TEXT DEFAULT 'units',
  expiry_date DATE,
  storage_type storage_type NOT NULL DEFAULT 'dry',
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status batch_status NOT NULL DEFAULT 'ok',
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Internal transfers (marketplace interno)
CREATE TABLE internal_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  to_location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity DECIMAL(10,2) NOT NULL,
  requested_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  processed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status transfer_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- HACCP reports
CREATE TABLE haccp_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  report_month DATE NOT NULL, -- First day of month
  pdf_url TEXT,
  generated_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  signed_by TEXT,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Subscriptions (placeholder for MVP)
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  status subscription_status NOT NULL DEFAULT 'trial',
  plan_name TEXT NOT NULL DEFAULT 'base',
  price_per_location DECIMAL(10,2) NOT NULL DEFAULT 30.00,
  active_locations_count INTEGER NOT NULL DEFAULT 0,
  billing_cycle_start DATE NOT NULL DEFAULT CURRENT_DATE,
  billing_cycle_end DATE NOT NULL DEFAULT CURRENT_DATE + INTERVAL '1 month',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_businesses_owner ON businesses(owner_id);
CREATE INDEX idx_locations_business ON locations(business_id);
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_location ON user_roles(location_id);
CREATE INDEX idx_products_business ON products(business_id);
CREATE INDEX idx_products_gtin ON products(gtin);
CREATE INDEX idx_batches_location ON batches(location_id);
CREATE INDEX idx_batches_product ON batches(product_id);
CREATE INDEX idx_batches_expiry ON batches(expiry_date);
CREATE INDEX idx_batches_status ON batches(status);
CREATE INDEX idx_transfers_from ON internal_transfers(from_location_id);
CREATE INDEX idx_transfers_to ON internal_transfers(to_location_id);
CREATE INDEX idx_transfers_status ON internal_transfers(status);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_note_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE haccp_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Function to check if user has role for location
CREATE OR REPLACE FUNCTION has_location_access(location_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND location_id = location_uuid
  ) OR EXISTS (
    SELECT 1 FROM locations l
    INNER JOIN businesses b ON l.business_id = b.id
    WHERE l.id = location_uuid
    AND b.owner_id = auth.uid()
  )
$$;

-- Function to check if user is business owner
CREATE OR REPLACE FUNCTION is_business_owner(business_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM businesses
    WHERE id = business_uuid
    AND owner_id = auth.uid()
  )
$$;

-- RLS Policies for businesses
CREATE POLICY "Owners can view their businesses"
  ON businesses FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can create businesses"
  ON businesses FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update their businesses"
  ON businesses FOR UPDATE
  USING (owner_id = auth.uid());

-- RLS Policies for locations
CREATE POLICY "Users can view locations they have access to"
  ON locations FOR SELECT
  USING (
    has_location_access(id)
  );

CREATE POLICY "Business owners can insert locations"
  ON locations FOR INSERT
  WITH CHECK (is_business_owner(business_id));

CREATE POLICY "Business owners can update locations"
  ON locations FOR UPDATE
  USING (is_business_owner(business_id));

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON user_roles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Business owners can manage roles for their locations"
  ON user_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM locations l
      INNER JOIN businesses b ON l.business_id = b.id
      WHERE l.id = user_roles.location_id
      AND b.owner_id = auth.uid()
    )
  );

-- RLS Policies for suppliers
CREATE POLICY "Users can view suppliers from their business"
  ON suppliers FOR SELECT
  USING (is_business_owner(business_id));

CREATE POLICY "Business owners can manage suppliers"
  ON suppliers FOR ALL
  USING (is_business_owner(business_id));

-- RLS Policies for products
CREATE POLICY "Users can view products from their business"
  ON products FOR SELECT
  USING (is_business_owner(business_id));

CREATE POLICY "Business owners can manage products"
  ON products FOR ALL
  USING (is_business_owner(business_id));

-- RLS Policies for delivery_notes
CREATE POLICY "Users can view delivery notes from their locations"
  ON delivery_notes FOR SELECT
  USING (has_location_access(location_id));

CREATE POLICY "Users can create delivery notes for their locations"
  ON delivery_notes FOR INSERT
  WITH CHECK (has_location_access(location_id) AND processed_by = auth.uid());

-- RLS Policies for delivery_note_items
CREATE POLICY "Users can view delivery note items"
  ON delivery_note_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM delivery_notes
      WHERE delivery_notes.id = delivery_note_items.delivery_note_id
      AND has_location_access(delivery_notes.location_id)
    )
  );

CREATE POLICY "Users can create delivery note items"
  ON delivery_note_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM delivery_notes
      WHERE delivery_notes.id = delivery_note_items.delivery_note_id
      AND has_location_access(delivery_notes.location_id)
    )
  );

-- RLS Policies for batches
CREATE POLICY "Users can view batches from their locations"
  ON batches FOR SELECT
  USING (has_location_access(location_id));

CREATE POLICY "Users can create batches for their locations"
  ON batches FOR INSERT
  WITH CHECK (has_location_access(location_id) AND created_by = auth.uid());

CREATE POLICY "Users can update batches from their locations"
  ON batches FOR UPDATE
  USING (has_location_access(location_id));

-- RLS Policies for internal_transfers
CREATE POLICY "Users can view transfers involving their locations"
  ON internal_transfers FOR SELECT
  USING (
    has_location_access(from_location_id) OR has_location_access(to_location_id)
  );

CREATE POLICY "Users can create transfers from their locations"
  ON internal_transfers FOR INSERT
  WITH CHECK (has_location_access(to_location_id) AND requested_by = auth.uid());

CREATE POLICY "Users can update transfers involving their locations"
  ON internal_transfers FOR UPDATE
  USING (has_location_access(from_location_id));

-- RLS Policies for haccp_reports
CREATE POLICY "Users can view HACCP reports from their locations"
  ON haccp_reports FOR SELECT
  USING (has_location_access(location_id));

CREATE POLICY "Users can create HACCP reports for their locations"
  ON haccp_reports FOR INSERT
  WITH CHECK (has_location_access(location_id) AND generated_by = auth.uid());

-- RLS Policies for subscriptions
CREATE POLICY "Business owners can view their subscriptions"
  ON subscriptions FOR SELECT
  USING (is_business_owner(business_id));

CREATE POLICY "Business owners can manage subscriptions"
  ON subscriptions FOR ALL
  USING (is_business_owner(business_id));

-- Function to update batch status based on expiry date
CREATE OR REPLACE FUNCTION update_batch_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.expiry_date IS NULL THEN
    NEW.status = 'warning';
  ELSIF NEW.expiry_date < CURRENT_DATE THEN
    NEW.status = 'expired';
  ELSIF NEW.expiry_date <= CURRENT_DATE + INTERVAL '3 days' THEN
    NEW.status = 'critical';
  ELSIF NEW.expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN
    NEW.status = 'warning';
  ELSE
    NEW.status = 'ok';
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to auto-update batch status
CREATE TRIGGER set_batch_status
  BEFORE INSERT OR UPDATE OF expiry_date ON batches
  FOR EACH ROW
  EXECUTE FUNCTION update_batch_status();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delivery_notes_updated_at BEFORE UPDATE ON delivery_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON batches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();