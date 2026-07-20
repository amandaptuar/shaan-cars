-- 0. PURANA DATA AUR TABLES DELETE KARNE KA CODE (CLEANUP)
DROP TABLE IF EXISTS point_transactions CASCADE;
DROP TABLE IF EXISTS service_mechanics CASCADE;
DROP TABLE IF EXISTS vehicle_services CASCADE;
DROP TABLE IF EXISTS mechanics CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS vehicle_inventory CASCADE;
DROP TABLE IF EXISTS enquiries CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS employees CASCADE;

DROP TYPE IF EXISTS division_type CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS lead_status CASCADE;
DROP TYPE IF EXISTS attendance_status CASCADE;
DROP TYPE IF EXISTS service_status CASCADE;
DROP TYPE IF EXISTS stock_status CASCADE;
DROP TYPE IF EXISTS mechanic_status CASCADE;

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS
CREATE TYPE division_type AS ENUM ('Arena', 'Nexa', 'True Value');
CREATE TYPE user_role AS ENUM ('Super_Admin', 'Employee');
CREATE TYPE lead_status AS ENUM ('New', 'Contacted', 'Test_Drive', 'Negotiation', 'Booked', 'Sold', 'Lost');
CREATE TYPE attendance_status AS ENUM ('Present', 'Absent', 'Half_Day', 'Leave');
CREATE TYPE service_status AS ENUM ('Upcoming', 'Due', 'Overdue', 'Completed', 'In_Progress');
CREATE TYPE stock_status AS ENUM ('Available', 'Booked', 'Sold');
CREATE TYPE mechanic_status AS ENUM ('Available', 'Booked', 'On_Leave');

-- 3. TABLES

-- Users/Employees Table 
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    assigned_password VARCHAR(255), 
    mobile VARCHAR(15),
    role user_role DEFAULT 'Employee',
    division division_type,
    branch_location VARCHAR(255),
    total_points INTEGER DEFAULT 0,
    monthly_target INTEGER DEFAULT 15,
    photo_url TEXT, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Mechanics Table
CREATE TABLE mechanics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    assigned_password VARCHAR(255),
    mobile VARCHAR(15),
    specialization VARCHAR(255),
    division division_type DEFAULT 'Arena',
    status mechanic_status DEFAULT 'Available',
    total_points INTEGER DEFAULT 0,
    monthly_target INTEGER DEFAULT 15,
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Attendance Table
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    mechanic_id UUID REFERENCES mechanics(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status attendance_status NOT NULL,
    check_in TIMESTAMP WITH TIME ZONE,
    check_out TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, date),
    UNIQUE(mechanic_id, date)
);

-- Customers Table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255) NOT NULL,
    mobile VARCHAR(15) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enquiries / Leads Table
CREATE TABLE enquiries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    handled_by_employee UUID REFERENCES employees(id),
    division division_type NOT NULL,
    model_interested VARCHAR(255) NOT NULL,
    status lead_status DEFAULT 'New',
    follow_up_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Vehicle Inventory (Available Cars)
CREATE TABLE vehicle_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    division division_type NOT NULL,
    model_name VARCHAR(255) NOT NULL,
    variant VARCHAR(100),
    color VARCHAR(100),
    vin_number VARCHAR(100) UNIQUE,
    status stock_status DEFAULT 'Available',
    price DECIMAL(12, 2),
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sales / Bookings Table
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enquiry_id UUID REFERENCES enquiries(id),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    sold_by_employee UUID REFERENCES employees(id) ON DELETE CASCADE,
    inventory_id UUID REFERENCES vehicle_inventory(id) ON DELETE SET NULL, 
    division division_type NOT NULL,
    vehicle_model VARCHAR(255) NOT NULL,
    sale_amount DECIMAL(12, 2) NOT NULL,
    sale_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    payment_status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Vehicle Services
CREATE TABLE vehicle_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID REFERENCES sales(id) ON DELETE CASCADE, 
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    vehicle_model VARCHAR(255),
    service_due_date DATE NOT NULL,
    status service_status DEFAULT 'Upcoming',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Service Mechanics Assignment Table
CREATE TABLE service_mechanics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID REFERENCES vehicle_services(id) ON DELETE CASCADE,
    mechanic_id UUID REFERENCES mechanics(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(service_id, mechanic_id)
);

-- Point Transactions Table (Gamification logs)
CREATE TABLE point_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    mechanic_id UUID REFERENCES mechanics(id) ON DELETE CASCADE,
    points_awarded INTEGER NOT NULL,
    reason VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable Realtime Replication for ALL tables
ALTER PUBLICATION supabase_realtime ADD TABLE employees;
ALTER PUBLICATION supabase_realtime ADD TABLE mechanics;
ALTER PUBLICATION supabase_realtime ADD TABLE attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE customers;
ALTER PUBLICATION supabase_realtime ADD TABLE enquiries;
ALTER PUBLICATION supabase_realtime ADD TABLE vehicle_inventory;
ALTER PUBLICATION supabase_realtime ADD TABLE sales;
ALTER PUBLICATION supabase_realtime ADD TABLE vehicle_services;
ALTER PUBLICATION supabase_realtime ADD TABLE service_mechanics;
ALTER PUBLICATION supabase_realtime ADD TABLE point_transactions;

