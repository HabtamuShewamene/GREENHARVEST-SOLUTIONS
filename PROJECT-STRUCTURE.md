# GreenHarvest Solutions - Project Structure

## 📁 Complete Project Overview

```
GREENHARVEST-SOLUTIONS/
│
├── 📄 Documentation (Created)
│   ├── DATABASE-SETUP-COMPLETE.md          ✅ Backend setup guide
│   ├── FRONTEND-IMPLEMENTATION-PLAN.md     ✅ Complete frontend plan (90+ pages)
│   ├── DESIGN-SYSTEM-QUICK-REFERENCE.md    ✅ Developer quick reference
│   ├── FRONTEND-SUMMARY.md                 ✅ Executive summary
│   └── PROJECT-STRUCTURE.md                ✅ This file
│
├── 🎨 Design System (Persisted)
│   └── design-system/
│       └── greenharvest-solutions/
│           ├── MASTER.md                   ✅ Global design rules
│           └── pages/                      📁 Page-specific overrides
│
├── 🗄️ Backend (Completed)
│   ├── server.js                           ✅ Application entry point
│   ├── package.json                        ✅ Dependencies
│   ├── .env                                ✅ Environment config
│   ├── setup-db.sh                         ✅ Database setup script
│   │
│   └── src/
│       ├── app.js                          ✅ Express app
│       ├── config/
│       │   ├── db.js                       ✅ Database connection
│       │   └── env.js                      ✅ Environment loader
│       │
│       ├── controllers/                    ✅ 15+ controllers
│       │   ├── authController.js
│       │   ├── productController.js
│       │   ├── orderController.js
│       │   ├── cartController.js
│       │   └── ...
│       │
│       ├── models/                         ✅ Database models
│       │   ├── userModel.js
│       │   ├── productModel.js
│       │   ├── orderModel.js
│       │   └── ...
│       │
│       ├── routes/                         ✅ API routes
│       │   ├── authRoutes.js
│       │   ├── productRoutes.js
│       │   ├── orderRoutes.js
│       │   └── ...
│       │
│       ├── middleware/                     ✅ Security & validation
│       │   ├── authMiddleware.js
│       │   ├── roleMiddleware.js
│       │   └── errorMiddleware.js
│       │
│       └── database/
│           ├── migrations/                 ✅ 7 migration files
│           │   ├── 001_create_core_tables.sql
│           │   ├── 002_create_commerce_tables.sql
│           │   └── ...
│           │
│           └── seeders/                    ✅ Initial data
│               ├── seedRoles.js
│               ├── seedAdmin.js
│               └── seedCategories.js
│
└── 🎨 Frontend (To Be Built)
    └── frontend/                           📁 To be created
        ├── assets/
        │   ├── css/
        │   │   ├── main.css
        │   │   └── components/
        │   ├── js/
        │   │   ├── main.js
        │   │   ├── api.js
        │   │   └── components/
        │   ├── images/
        │   └── icons/
        │
        ├── pages/
        │   ├── index.html                  📄 Landing page
        │   ├── products.html               📄 Product listing
        │   ├── product-detail.html         📄 Product details
        │   ├── cart.html                   📄 Shopping cart
        │   ├── checkout.html               📄 Checkout
        │   │
        │   ├── auth/
        │   │   ├── login.html
        │   │   ├── register.html
        │   │   └── forgot-password.html
        │   │
        │   ├── buyer/
        │   │   ├── dashboard.html
        │   │   ├── orders.html
        │   │   ├── order-tracking.html
        │   │   └── profile.html
        │   │
        │   ├── farmer/
        │   │   ├── dashboard.html
        │   │   ├── products.html
        │   │   ├── product-form.html
        │   │   ├── inventory.html
        │   │   ├── orders.html
        │   │   └── analytics.html
        │   │
        │   ├── delivery/
        │   │   ├── dashboard.html
        │   │   └── deliveries.html
        │   │
        │   ├── agent/
        │   │   ├── dashboard.html
        │   │   └── farmers.html
        │   │
        │   └── admin/
        │       ├── dashboard.html
        │       ├── users.html
        │       ├── products.html
        │       ├── orders.html
        │       ├── categories.html
        │       └── analytics.html
        │
        └── components/
            ├── navbar.html
            ├── footer.html
            ├── sidebar.html
            ├── product-card.html
            ├── order-card.html
            └── ...
```

---

## 🗄️ Database Structure (Completed)

### 22 Tables Created

#### Core Tables
```
users                   ✅ User accounts with authentication
roles                   ✅ User roles (5 roles seeded)
categories              ✅ Product categories (10 seeded)
products                ✅ Agricultural products
```

#### Commerce Tables
```
cart                    ✅ Shopping cart (legacy)
carts                   ✅ Shopping cart (normalized)
cart_items              ✅ Cart items
orders                  ✅ Customer orders
order_items             ✅ Order line items
payments                ✅ Payment records
transactions            ✅ Financial transactions
```

#### Delivery & Logistics
```
deliveries              ✅ Delivery tracking
delivery_profiles       ✅ Delivery partner profiles
```

#### User Profiles
```
farmer_profiles         ✅ Farmer details
buyer_profiles          ✅ Buyer details
field_agent_profiles    ✅ Field agent details
agent_farmers           ✅ Agent-farmer relationships
```

#### Inventory & Products
```
inventory               ✅ Stock management
product_images          ✅ Product images
```

#### Engagement
```
reviews                 ✅ Product reviews
notifications           ✅ User notifications
```

#### Address Management
```
addresses               ✅ User addresses
```

---

## 🎨 Frontend Pages to Build

### Phase 1: Public Pages (Week 1-2)
```
✅ Landing Page          - Hero with search, categories, featured products
✅ Product Listing       - Grid with filters, sorting, pagination
✅ Product Detail        - Gallery, info, reviews, farmer card
✅ Category Pages        - Category-specific listings
✅ Search Results        - Search with filters
```

### Phase 2: Authentication (Week 2-3)
```
✅ Registration          - Role-based signup
✅ Login                 - Email/password auth
✅ Forgot Password       - Password reset flow
✅ Email Verification    - Verification confirmation
```

### Phase 3: Buyer Interface (Week 3-5)
```
✅ Buyer Dashboard       - Orders, recommendations, quick actions
✅ Shopping Cart         - Cart items, summary, checkout CTA
✅ Checkout              - Multi-step: address, delivery, payment
✅ Order Tracking        - Status timeline, delivery info
✅ Order History         - Past orders with filters
✅ Profile Management    - Personal info, addresses
✅ Review System         - Leave reviews, view history
```

### Phase 4: Farmer Interface (Week 5-7)
```
✅ Farmer Dashboard      - Analytics, charts, recent orders
✅ Product Management    - CRUD operations, bulk actions
✅ Product Form          - Add/edit with image upload
✅ Inventory Management  - Stock tracking, alerts
✅ Order Management      - Accept, process, ship orders
✅ Sales Analytics       - Revenue charts, top products
```

### Phase 5: Delivery & Agent (Week 7-8)
```
✅ Delivery Dashboard    - Active deliveries, earnings
✅ Delivery Management   - Status updates, route tracking
✅ Agent Dashboard       - Farmer management, performance
✅ Farmer Management     - Onboard, manage farmers
```

### Phase 6: Admin Interface (Week 8-10)
```
✅ Admin Dashboard       - Platform overview, analytics
✅ User Management       - All roles, CRUD operations
✅ Product Moderation    - Approve, reject, edit
✅ Order Oversight       - Monitor all orders
✅ Category Management   - CRUD categories
✅ Analytics & Reports   - Comprehensive reports
```

---

## 🔌 API Endpoints (Available)

### Authentication
```
POST   /api/auth/register          Register new user
POST   /api/auth/login             Login user
POST   /api/auth/forgot-password   Request password reset
POST   /api/auth/reset-password    Reset password
POST   /api/auth/verify-email      Verify email
```

### Products
```
GET    /api/products               List all products
GET    /api/products/:id           Get product details
POST   /api/products               Create product (farmer)
PUT    /api/products/:id           Update product (farmer)
DELETE /api/products/:id           Delete product (farmer)
PATCH  /api/products/:id/stock     Update stock (farmer)
```

### Cart
```
GET    /api/cart                   Get user cart
POST   /api/cart                   Add to cart
PUT    /api/cart/:id               Update cart item
DELETE /api/cart/:id               Remove from cart
```

### Orders
```
GET    /api/orders                 List user orders
GET    /api/orders/:id             Get order details
POST   /api/orders                 Create order
PATCH  /api/orders/:id/status      Update order status
```

### Categories
```
GET    /api/categories             List all categories
GET    /api/categories/:id         Get category details
POST   /api/categories             Create category (admin)
PUT    /api/categories/:id         Update category (admin)
DELETE /api/categories/:id         Delete category (admin)
```

### Users
```
GET    /api/users/profile          Get user profile
PUT    /api/users/profile          Update profile
GET    /api/users                  List users (admin)
GET    /api/users/:id              Get user details (admin)
```

### Reviews
```
GET    /api/reviews/product/:id    Get product reviews
POST   /api/reviews                Create review
PUT    /api/reviews/:id            Update review
DELETE /api/reviews/:id            Delete review
```

### Notifications
```
GET    /api/notifications          Get user notifications
PATCH  /api/notifications/:id      Mark as read
DELETE /api/notifications/:id      Delete notification
```

### Delivery
```
GET    /api/deliveries             List deliveries
GET    /api/deliveries/:id         Get delivery details
PATCH  /api/deliveries/:id/status  Update delivery status
```

### Admin
```
GET    /api/admin/dashboard        Admin dashboard stats
GET    /api/admin/users            Manage users
GET    /api/admin/products         Moderate products
GET    /api/admin/orders           Oversee orders
GET    /api/admin/analytics        Platform analytics
```

---

## 🎨 Design System Components

### Navigation
```
✅ Navbar               - Logo, search, menu, cart, user
✅ Sidebar              - Dashboard navigation
✅ Footer               - Links, social, newsletter
✅ Breadcrumb           - Navigation path
```

### Forms
```
✅ Input                - Text, email, password, number
✅ Textarea             - Multi-line text
✅ Select               - Dropdown with search
✅ Checkbox             - Single and group
✅ Radio                - Radio button group
✅ Toggle               - Switch component
✅ DatePicker           - Date selection
✅ FileUpload           - Image/file upload
✅ RichTextEditor       - WYSIWYG editor
```

### Display
```
✅ Card                 - Container with shadow
✅ Badge                - Status indicators
✅ Avatar               - User profile image
✅ Tag                  - Label/category tag
✅ Alert                - Success/error/warning
✅ Toast                - Notification popup
✅ Modal                - Dialog/popup
✅ Drawer               - Side panel
✅ Tabs                 - Tab navigation
✅ Accordion            - Collapsible content
```

### Data
```
✅ Table                - Data table
✅ DataGrid             - Advanced table
✅ List                 - Ordered/unordered
✅ Timeline             - Event timeline
✅ Stats                - Metric cards
✅ Progress             - Progress bar/circle
```

### Feedback
```
✅ Spinner              - Loading indicator
✅ Skeleton             - Content placeholder
✅ EmptyState           - No data message
✅ ErrorState           - Error message
✅ SuccessState         - Success confirmation
```

### Interactive
```
✅ Button               - Primary, secondary, outline
✅ IconButton           - Icon-only button
✅ Dropdown             - Menu dropdown
✅ Tooltip              - Hover information
✅ Popover              - Click information
✅ Pagination           - Page navigation
```

---

## 📊 Implementation Status

### ✅ Completed
- [x] Backend API (100%)
- [x] Database setup (100%)
- [x] Design system (100%)
- [x] Frontend plan (100%)
- [x] Documentation (100%)

### 📋 To Do
- [ ] Frontend setup (0%)
- [ ] Component library (0%)
- [ ] Page implementation (0%)
- [ ] API integration (0%)
- [ ] Testing (0%)
- [ ] Deployment (0%)

---

## 🚀 Quick Start Commands

### Backend
```bash
# Start backend server
npm run dev

# Test database connection
node test-db-connection.js

# Seed data
npm run seed:roles
npm run seed:admin
npm run seed:categories
```

### Frontend (To Setup)
```bash
# Create frontend structure
mkdir -p frontend/{assets/{css,js,images,icons},pages,components}

# Install Tailwind CSS
npm install -D tailwindcss @tailwindcss/forms @tailwindcss/typography
npx tailwindcss init

# Install dependencies
npm install axios alpinejs swiper aos
```

---

## 📚 Documentation Index

| Document | Purpose | Status |
|----------|---------|--------|
| `DATABASE-SETUP-COMPLETE.md` | Backend setup guide | ✅ Complete |
| `FRONTEND-IMPLEMENTATION-PLAN.md` | Complete frontend plan | ✅ Complete |
| `DESIGN-SYSTEM-QUICK-REFERENCE.md` | Developer quick reference | ✅ Complete |
| `FRONTEND-SUMMARY.md` | Executive summary | ✅ Complete |
| `PROJECT-STRUCTURE.md` | This file | ✅ Complete |
| `design-system/greenharvest-solutions/MASTER.md` | Design system | ✅ Complete |

---

*Last Updated: May 14, 2026*  
*Project: GreenHarvest Solutions Agricultural E-commerce Platform*
