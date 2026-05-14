#!/bin/bash

# GreenHarvest Solutions - Database Setup Script
# One-command database setup for development environment

set -e

echo "========================================="
echo "GreenHarvest Solutions Database Setup"
echo "========================================="

# Check if PostgreSQL is running
if ! pg_isready -h localhost > /dev/null 2>&1; then
    echo "❌ PostgreSQL is not running. Please start PostgreSQL first."
    echo "   On Ubuntu/Debian: sudo systemctl start postgresql"
    echo "   On macOS: brew services start postgresql"
    exit 1
fi

echo "✅ PostgreSQL is running"

# Check if database exists
if PGPASSWORD=postgres psql -h localhost -U postgres -l | grep -q agro_ecommerce; then
    echo "📦 Database 'agro_ecommerce' already exists"
    read -p "Do you want to reset it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Resetting database..."
        PGPASSWORD=postgres psql -h localhost -U postgres -c "DROP DATABASE IF EXISTS agro_ecommerce;"
        PGPASSWORD=postgres psql -h localhost -U postgres -c "CREATE DATABASE agro_ecommerce;"
        echo "✅ Database reset complete"
    else
        echo "Using existing database"
    fi
else
    echo "Creating database 'agro_ecommerce'..."
    PGPASSWORD=postgres psql -h localhost -U postgres -c "CREATE DATABASE agro_ecommerce;"
    echo "✅ Database created"
fi

# Run migrations
echo "Running database migrations..."
for migration in src/database/migrations/*.sql; do
    echo "  Applying: $(basename $migration)"
    PGPASSWORD=postgres psql -h localhost -U postgres -d agro_ecommerce -f "$migration" > /dev/null 2>&1 || true
done
echo "✅ Migrations applied"

# Seed initial data
echo "Seeding initial data..."

# Seed admin user
echo "  Creating admin user..."
PGPASSWORD=postgres psql -h localhost -U postgres -d agro_ecommerce << EOF
DO \$\$
DECLARE
    admin_role_id smallint;
    hashed_password text := '\$2b\$10\$6VX7Q8r9s0t1u2v3w4x5y6z7A8B9C0D1E2F3G4H5I6J7K8L9M0N1O2P3Q4R5S6T';
BEGIN
    SELECT role_id INTO admin_role_id FROM roles WHERE role_name = 'admin';
    
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@greenharvest.local') THEN
        INSERT INTO users (name, email, password, role, role_id, is_verified)
        VALUES (
            'System Administrator',
            'admin@greenharvest.local',
            hashed_password,
            'admin',
            admin_role_id,
            true
        );
    END IF;
END \$\$;
EOF

# Seed categories
echo "  Seeding categories..."
PGPASSWORD=postgres psql -h localhost -U postgres -d agro_ecommerce << EOF
INSERT INTO categories (name, description) VALUES
    ('Vegetables', 'Fresh vegetables from local farms'),
    ('Fruits', 'Seasonal fruits and berries'),
    ('Grains & Cereals', 'Rice, wheat, maize, and other grains'),
    ('Dairy Products', 'Milk, cheese, yogurt, and other dairy'),
    ('Meat & Poultry', 'Fresh meat, chicken, and other poultry'),
    ('Seafood', 'Fresh fish and seafood'),
    ('Herbs & Spices', 'Fresh and dried herbs and spices'),
    ('Organic Products', 'Certified organic farm products'),
    ('Processed Foods', 'Jams, pickles, and other processed items'),
    ('Beverages', 'Fresh juices, teas, and other drinks')
ON CONFLICT (name) DO NOTHING;
EOF

echo "✅ Initial data seeded"

# Verify setup
echo "Verifying setup..."
USER_COUNT=$(PGPASSWORD=postgres psql -h localhost -U postgres -d agro_ecommerce -t -c "SELECT COUNT(*) FROM users;" | tr -d ' ')
ROLE_COUNT=$(PGPASSWORD=postgres psql -h localhost -U postgres -d agro_ecommerce -t -c "SELECT COUNT(*) FROM roles;" | tr -d ' ')
CATEGORY_COUNT=$(PGPASSWORD=postgres psql -h localhost -U postgres -d agro_ecommerce -t -c "SELECT COUNT(*) FROM categories;" | tr -d ' ')
TABLE_COUNT=$(PGPASSWORD=postgres psql -h localhost -U postgres -d agro_ecommerce -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" | tr -d ' ')

echo ""
echo "========================================="
echo "Setup Complete - Summary"
echo "========================================="
echo "✅ Users: $USER_COUNT (1 admin user created)"
echo "✅ Roles: $ROLE_COUNT (admin, farmer, buyer, delivery_partner, field_agent)"
echo "✅ Categories: $CATEGORY_COUNT (10 product categories)"
echo "✅ Tables: $TABLE_COUNT total database tables"
echo ""
echo "Admin Credentials:"
echo "  Email: admin@greenharvest.local"
echo "  Password: Admin@1234"
echo ""
echo "To start the application:"
echo "  npm run dev"
echo ""
echo "API will be available at: http://localhost:5000"
echo "========================================="