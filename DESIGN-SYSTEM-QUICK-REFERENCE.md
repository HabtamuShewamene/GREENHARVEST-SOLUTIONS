# GreenHarvest Solutions - Design System Quick Reference

## 🎨 Color Palette

### Primary Colors
```css
--primary: #7C3AED;        /* Trust Purple - Main brand color */
--secondary: #A78BFA;      /* Light Purple - Accents */
--cta: #22C55E;            /* Transaction Green - Call-to-action */
--background: #FAF5FF;     /* Soft Purple - Page background */
--text: #4C1D95;           /* Deep Purple - Primary text */
```

### Semantic Colors
```css
--success: #22C55E;        /* Green - Success states */
--warning: #F59E0B;        /* Amber - Warning states */
--error: #EF4444;          /* Red - Error states */
--info: #3B82F6;           /* Blue - Info states */
```

### Usage Guidelines
- **Primary (#7C3AED)**: Buttons, links, headers, brand elements
- **CTA (#22C55E)**: Primary action buttons, "Add to Cart", "Buy Now"
- **Background (#FAF5FF)**: Page backgrounds, card backgrounds
- **Text (#4C1D95)**: Headings, important text
- **Gray-900 (#0F172A)**: Body text for maximum readability

---

## 📝 Typography

### Font Families
```css
--font-heading: 'Lora', serif;      /* Headings, titles */
--font-body: 'Raleway', sans-serif; /* Body text, UI elements */
```

### Font Sizes
```css
--text-xs: 0.75rem;    /* 12px - Small labels */
--text-sm: 0.875rem;   /* 14px - Secondary text */
--text-base: 1rem;     /* 16px - Body text */
--text-lg: 1.125rem;   /* 18px - Large body */
--text-xl: 1.25rem;    /* 20px - Small headings */
--text-2xl: 1.5rem;    /* 24px - Section headings */
--text-3xl: 1.875rem;  /* 30px - Page headings */
--text-4xl: 2.25rem;   /* 36px - Hero headings */
--text-5xl: 3rem;      /* 48px - Large hero */
```

### Tailwind Classes
```html
<!-- Headings -->
<h1 class="font-heading text-4xl font-bold text-primary">
<h2 class="font-heading text-3xl font-semibold text-gray-900">
<h3 class="font-heading text-2xl font-medium text-gray-800">

<!-- Body Text -->
<p class="font-body text-base text-gray-700">
<span class="font-body text-sm text-gray-600">
```

---

## 📐 Spacing & Layout

### Spacing Scale
```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
```

### Border Radius (Organic)
```css
--radius-sm: 8px;      /* Small elements */
--radius-md: 16px;     /* Cards, buttons */
--radius-lg: 24px;     /* Large cards */
--radius-xl: 32px;     /* Hero sections */
--radius-full: 9999px; /* Pills, avatars */
```

### Tailwind Classes
```html
<!-- Cards -->
<div class="rounded-2xl">  <!-- 16px -->
<div class="rounded-3xl">  <!-- 24px -->

<!-- Buttons -->
<button class="rounded-xl"> <!-- 12px -->
<button class="rounded-full"> <!-- Pill shape -->
```

---

## 🎯 Component Patterns

### Buttons
```html
<!-- Primary Button -->
<button class="bg-cta hover:bg-green-600 text-white font-medium px-6 py-3 rounded-xl transition-colors duration-200 cursor-pointer">
  Add to Cart
</button>

<!-- Secondary Button -->
<button class="bg-primary hover:bg-purple-700 text-white font-medium px-6 py-3 rounded-xl transition-colors duration-200 cursor-pointer">
  View Details
</button>

<!-- Outline Button -->
<button class="border-2 border-primary text-primary hover:bg-primary hover:text-white font-medium px-6 py-3 rounded-xl transition-all duration-200 cursor-pointer">
  Learn More
</button>

<!-- Ghost Button -->
<button class="text-primary hover:bg-purple-50 font-medium px-6 py-3 rounded-xl transition-colors duration-200 cursor-pointer">
  Cancel
</button>
```

### Cards
```html
<!-- Product Card -->
<div class="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden cursor-pointer">
  <img src="product.jpg" alt="Product" class="w-full h-48 object-cover">
  <div class="p-4">
    <h3 class="font-heading text-lg font-semibold text-gray-900">Product Name</h3>
    <p class="text-sm text-gray-600 mt-1">Farmer Name</p>
    <div class="flex items-center justify-between mt-4">
      <span class="text-xl font-bold text-primary">$12.99</span>
      <button class="bg-cta text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors cursor-pointer">
        Add
      </button>
    </div>
  </div>
</div>

<!-- Info Card -->
<div class="bg-white rounded-2xl shadow-sm p-6">
  <h3 class="font-heading text-xl font-semibold text-gray-900 mb-4">Card Title</h3>
  <p class="text-gray-700">Card content goes here...</p>
</div>
```

### Forms
```html
<!-- Input Field -->
<div class="mb-4">
  <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
    Email Address
  </label>
  <input 
    type="email" 
    id="email" 
    name="email"
    class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
    placeholder="you@example.com"
  >
</div>

<!-- Textarea -->
<div class="mb-4">
  <label for="description" class="block text-sm font-medium text-gray-700 mb-2">
    Description
  </label>
  <textarea 
    id="description" 
    name="description"
    rows="4"
    class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
  ></textarea>
</div>

<!-- Select Dropdown -->
<div class="mb-4">
  <label for="category" class="block text-sm font-medium text-gray-700 mb-2">
    Category
  </label>
  <select 
    id="category" 
    name="category"
    class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
  >
    <option>Select a category</option>
    <option>Vegetables</option>
    <option>Fruits</option>
  </select>
</div>
```

### Badges
```html
<!-- Status Badges -->
<span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
  Active
</span>

<span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
  Pending
</span>

<span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
  Cancelled
</span>

<span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
  Shipped
</span>
```

### Alerts
```html
<!-- Success Alert -->
<div class="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
  <div class="flex">
    <svg class="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
      <!-- Icon -->
    </svg>
    <div class="ml-3">
      <p class="text-sm text-green-800">Success message here</p>
    </div>
  </div>
</div>

<!-- Error Alert -->
<div class="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
  <div class="flex">
    <svg class="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
      <!-- Icon -->
    </svg>
    <div class="ml-3">
      <p class="text-sm text-red-800">Error message here</p>
    </div>
  </div>
</div>
```

---

## 🎭 Animation & Transitions

### Hover States
```html
<!-- Card Hover -->
<div class="transition-all duration-200 hover:shadow-lg hover:-translate-y-1">

<!-- Button Hover -->
<button class="transition-colors duration-200 hover:bg-green-600">

<!-- Image Hover -->
<img class="transition-transform duration-300 hover:scale-105">
```

### Loading States
```html
<!-- Spinner -->
<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>

<!-- Skeleton Loader -->
<div class="animate-pulse">
  <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
  <div class="h-4 bg-gray-200 rounded w-1/2"></div>
</div>

<!-- Pulse -->
<div class="animate-pulse bg-gray-200 rounded-lg h-48"></div>
```

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## ♿ Accessibility Checklist

### Forms
- ✅ All inputs have associated `<label>` with `for` attribute
- ✅ Required fields marked with `required` attribute
- ✅ Error messages linked with `aria-describedby`
- ✅ Placeholder text is NOT the only label

### Interactive Elements
- ✅ All clickable elements have `cursor-pointer`
- ✅ Focus states visible (ring-2 ring-primary)
- ✅ Touch targets minimum 44x44px
- ✅ Keyboard navigation works (Tab, Enter, Escape)

### Images & Media
- ✅ All images have descriptive `alt` text
- ✅ Decorative images have `alt=""`
- ✅ Icons have `aria-label` or `aria-hidden="true"`

### Color & Contrast
- ✅ Text contrast ratio 4.5:1 minimum
- ✅ Color is not the only indicator
- ✅ Links distinguishable from text

### Semantic HTML
- ✅ Use `<nav>`, `<main>`, `<article>`, `<section>`
- ✅ Headings in logical order (h1 → h2 → h3)
- ✅ Lists use `<ul>`, `<ol>`, `<li>`
- ✅ Buttons use `<button>`, not `<div>`

---

## 📱 Responsive Breakpoints

```css
/* Mobile First Approach */
/* Default: 375px+ (mobile) */

/* Tablet */
@media (min-width: 768px) { }

/* Desktop */
@media (min-width: 1024px) { }

/* Large Desktop */
@media (min-width: 1440px) { }
```

### Tailwind Responsive Classes
```html
<!-- Mobile: 1 column, Tablet: 2 columns, Desktop: 3 columns -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

<!-- Hide on mobile, show on desktop -->
<div class="hidden lg:block">

<!-- Show on mobile, hide on desktop -->
<div class="block lg:hidden">

<!-- Responsive text sizes -->
<h1 class="text-3xl md:text-4xl lg:text-5xl">

<!-- Responsive padding -->
<div class="px-4 md:px-8 lg:px-16">
```

---

## 🚫 Anti-Patterns to Avoid

### ❌ DON'T
- Use emojis as icons (🎨 🚀 ⚙️)
- Use generic design without personality
- Ignore accessibility requirements
- Use AI purple/pink gradients everywhere
- Scale transforms that shift layout
- Validate forms only on submit
- Leave UI frozen during loading
- Use placeholder-only inputs
- Mix different icon sets

### ✅ DO
- Use SVG icons (Heroicons, Lucide)
- Follow organic biophilic design
- Test with screen readers
- Use brand colors consistently
- Use color/opacity transitions
- Validate on blur for most fields
- Show skeleton screens or spinners
- Use proper labels with for attribute
- Use consistent icon sizing (w-6 h-6)

---

## 🎨 Icon Usage

### Recommended Icon Sets
- **Heroicons**: https://heroicons.com/
- **Lucide Icons**: https://lucide.dev/

### Icon Sizes
```html
<!-- Small (16px) -->
<svg class="w-4 h-4">

<!-- Medium (24px) - Default -->
<svg class="w-6 h-6">

<!-- Large (32px) -->
<svg class="w-8 h-8">
```

### Icon Colors
```html
<!-- Primary -->
<svg class="w-6 h-6 text-primary">

<!-- Success -->
<svg class="w-6 h-6 text-green-500">

<!-- Error -->
<svg class="w-6 h-6 text-red-500">

<!-- Muted -->
<svg class="w-6 h-6 text-gray-400">
```

---

## 📊 Chart Guidelines

### Dashboard Charts
1. **Sales Trend**: Line chart (ApexCharts)
2. **Top Products**: Horizontal bar chart
3. **Order Status**: Donut chart with legend
4. **Revenue**: Waterfall chart for cumulative changes

### Color Palette for Charts
```javascript
const chartColors = {
  primary: '#7C3AED',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  gray: '#6B7280',
};
```

---

## 🔗 Quick Links

- **Full Implementation Plan**: `FRONTEND-IMPLEMENTATION-PLAN.md`
- **Master Design System**: `design-system/greenharvest-solutions/MASTER.md`
- **Backend API Docs**: `DATABASE-SETUP-COMPLETE.md`
- **UI/UX Skill**: `.kiro/steering/ui-ux-pro-max/SKILL.md`

---

*Quick Reference Version: 1.0*  
*For detailed guidelines, see FRONTEND-IMPLEMENTATION-PLAN.md*
