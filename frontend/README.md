# GreenHarvest Solutions - Frontend

Modern Next.js frontend for the GreenHarvest Solutions agricultural e-commerce platform.

## 🚀 Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **HTTP Client**: Axios
- **Fonts**: Lora (headings) + Raleway (body)

## 🎨 Design System

The frontend follows the **Organic Biophilic Design** system with:
- **Primary Color**: Trust Purple (#7C3AED)
- **CTA Color**: Transaction Green (#22C55E)
- **Typography**: Lora for headings, Raleway for body text
- **Border Radius**: Organic curves (16-24px)
- **Shadows**: Natural, soft shadows

## 📁 Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (public)/          # Public pages (landing, products)
│   │   ├── (auth)/            # Auth pages (login, register)
│   │   └── (dashboard)/       # Dashboard pages (buyer, farmer, admin)
│   ├── components/
│   │   ├── common/            # Reusable components (Button, Input, Card)
│   │   ├── layout/            # Layout components (Navbar, Footer)
│   │   └── features/          # Feature-specific components
│   ├── lib/                   # Utilities and configurations
│   │   └── api.ts            # API client
│   ├── types/                 # TypeScript type definitions
│   ├── hooks/                 # Custom React hooks
│   └── utils/                 # Utility functions
├── public/                    # Static assets
└── .env.local                # Environment variables
```

## 🛠️ Getting Started

### Prerequisites
- Node.js 20+ installed
- Backend API running on `http://localhost:5000`

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

The application will be available at `http://localhost:3000`

## 🔧 Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_APP_NAME=GreenHarvest Solutions
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 📦 Available Components

### Common Components
- **Button**: Primary, secondary, outline, ghost variants
- **Input**: Form input with label and error handling
- **Card**: Container with organic design
- **Badge**: Status indicators

### Layout Components
- **Navbar**: Main navigation with search
- **Footer**: Site footer with links

## 🎯 Features Implemented

### Phase 1: Foundation ✅
- [x] Project setup with Next.js + TypeScript + Tailwind
- [x] Design system configuration
- [x] Common components (Button, Input, Card, Badge)
- [x] Layout components (Navbar, Footer)
- [x] Landing page with hero section
- [x] API client setup
- [x] TypeScript types

### Phase 2: Core Pages (In Progress)
- [ ] Product listing page
- [ ] Product detail page
- [ ] Authentication pages (login, register)
- [ ] Shopping cart
- [ ] Checkout process

### Phase 3: User Dashboards (Planned)
- [ ] Buyer dashboard
- [ ] Farmer dashboard
- [ ] Delivery partner dashboard
- [ ] Admin dashboard

## 🎨 Design Guidelines

### Colors
```css
--color-primary: #7C3AED;      /* Trust Purple */
--color-cta: #22C55E;          /* Transaction Green */
--color-background: #FAF5FF;   /* Soft Purple */
```

### Typography
```css
--font-heading: 'Lora', serif;
--font-body: 'Raleway', sans-serif;
```

### Component Usage

```tsx
// Button
<Button variant="primary" size="md">Click Me</Button>

// Input
<Input label="Email" type="email" required />

// Card
<Card hover padding="md">
  <h3>Card Title</h3>
  <p>Card content</p>
</Card>

// Badge
<Badge variant="success">Active</Badge>
```

## 🔗 API Integration

The API client is configured in `src/lib/api.ts`:

```typescript
import { api } from '@/lib/api';

// Login
const response = await api.login(email, password);

// Get products
const products = await api.getProducts({ category_id: 1 });

// Add to cart
await api.addToCart(productId, quantity);
```

## ✅ Pre-Delivery Checklist

- [x] No emojis as icons (using Lucide React)
- [x] All clickable elements have cursor-pointer
- [x] Smooth transitions (150-300ms)
- [x] Proper labels for form inputs
- [x] Focus states visible
- [x] Responsive design (mobile-first)
- [x] Accessibility features (ARIA labels, semantic HTML)

## 📚 Documentation

- **Full Implementation Plan**: `../FRONTEND-IMPLEMENTATION-PLAN.md`
- **Design System**: `../design-system/greenharvest-solutions/MASTER.md`
- **Quick Reference**: `../DESIGN-SYSTEM-QUICK-REFERENCE.md`

## 🤝 Contributing

1. Follow the design system guidelines
2. Use TypeScript for type safety
3. Write accessible, semantic HTML
4. Test on multiple devices and browsers
5. Follow the component patterns

## 📄 License

This project is part of GreenHarvest Solutions.

---

*Built with ❤️ using Next.js and Tailwind CSS*
