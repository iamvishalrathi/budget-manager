# Bank Transaction Manager

A production-ready financial management application built with Next.js 14, featuring account management, transaction tracking, and secure authentication.

## 🚀 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Authentication**: Clerk
- **Database**: MongoDB with Mongoose
- **UI Library**: Material-UI (MUI) v5
- **Forms**: React Hook Form with Zod validation
- **Data Fetching**: SWR
- **Styling**: Tailwind CSS

## 📋 Features

- **Secure Authentication**: Complete sign-in/sign-up flow with Clerk
- **Account Management**: Create and manage multiple accounts (bank, wallet, card, metro, cash)
- **Transaction Tracking**: Record income, expenses, transfers, and adjustments
- **Real-time Balance Updates**: Automatic balance calculations with atomic database operations
- **Currency Support**: Multi-currency support with proper formatting
- **Responsive Design**: Mobile-first responsive design with Material-UI
- **Type Safety**: Full TypeScript implementation with Zod validation

## 🛠️ Setup Instructions

### Prerequisites

- Node.js 18+ and npm/yarn
- MongoDB database (local or Atlas)
- Clerk account for authentication

### 1. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/budget-manager
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/budget-manager

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_key_here

# Optional: Customize Clerk URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

### 2. Get Clerk Keys

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Create a new application or select existing one
3. Go to **API Keys** section
4. Copy the **Publishable Key** and **Secret Key**
5. Add them to your `.env.local` file

### 3. MongoDB Setup

#### Option A: Local MongoDB
```bash
# Install and start MongoDB locally
mongod --dbpath /path/to/your/data/directory
```

#### Option B: MongoDB Atlas
1. Create account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster
3. Get the connection string
4. Add it to your `.env.local` file

### 4. Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd budget-manager

# Install dependencies
npm install

# Run the development server
npm run dev
```

The application will be available at `http://localhost:3000`

## 🏗️ Project Structure

```
src/
├── app/
│   ├── (auth)/              # Authentication pages
│   │   ├── sign-in/
│   │   └── sign-up/
│   ├── (dashboard)/         # Protected dashboard pages
│   │   └── dashboard/
│   ├── api/                 # API routes
│   │   ├── accounts/        # Account CRUD operations
│   │   └── transactions/    # Transaction CRUD operations
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── providers/           # Context providers
│   └── ui/                  # Reusable UI components
├── hooks/
│   └── useApi.ts           # SWR data fetching hooks
├── lib/
│   ├── db.ts               # MongoDB connection
│   ├── money.ts            # Currency utilities
│   └── validations.ts      # Zod schemas
├── models/
│   ├── Account.ts          # Account Mongoose model
│   └── Transaction.ts      # Transaction Mongoose model
└── middleware.ts           # Clerk authentication middleware
```

## 📊 Database Schema

### Account Model
```typescript
{
  _id: ObjectId,
  userId: string,          // Clerk user ID
  name: string,            // Account name
  type: 'bank' | 'wallet' | 'card' | 'metro' | 'cash',
  currency: string,        // Currency code (INR, USD, EUR)
  currentBalanceCents: number, // Balance in cents for precision
  color?: string,          // UI color
  icon?: string,           // UI icon
  createdAt: Date,
  updatedAt: Date
}
```

### Transaction Model
```typescript
{
  _id: ObjectId,
  userId: string,          // Clerk user ID
  accountId: string,       // Reference to Account
  type: 'income' | 'expense' | 'transfer' | 'refund' | 'adjustment',
  category: string,        // Transaction category
  amountCents: number,     // Amount in cents
  currency: string,        // Currency code
  date: Date,              // Transaction date
  merchant?: string,       // Merchant name
  note?: string,           // Additional notes
  tags?: string[],         // Tags for categorization
  transferId?: string,     // Link related transfers
  createdAt: Date,
  updatedAt: Date
}
```

## 🔌 API Endpoints

### Accounts
- `GET /api/accounts` - List user accounts
- `POST /api/accounts` - Create new account
- `GET /api/accounts/[id]` - Get account details
- `PUT /api/accounts/[id]` - Update account
- `DELETE /api/accounts/[id]` - Delete account

### Transactions
- `GET /api/transactions` - List transactions with filters
- `POST /api/transactions` - Create new transaction
- `GET /api/transactions/[id]` - Get transaction details
- `PUT /api/transactions/[id]` - Update transaction
- `DELETE /api/transactions/[id]` - Delete transaction

## 💰 Money Handling

The application uses **integer cents** for all monetary calculations to avoid floating-point precision issues:

```typescript
// Store: 1000 cents = $10.00
const balanceCents = 1000;

// Display: Convert to dollars for UI
const displayAmount = balanceCents / 100; // 10.00

// Format: Use utility function
const formatted = formatCurrency(balanceCents); // "$10.00"
```

## 🔐 Authentication Flow

1. **Middleware Protection**: All routes except public ones require authentication
2. **Clerk Integration**: Seamless sign-in/sign-up with email/password
3. **User Context**: User ID automatically attached to all database operations
4. **Protected API**: All API routes verify user authentication

## 🧪 Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Type checking
npm run type-check
```

## 📱 Usage

1. **Sign Up/Sign In**: Create account or log in using Clerk
2. **Create Accounts**: Add bank accounts, wallets, cards, etc.
3. **Add Transactions**: Record income, expenses, and transfers
4. **View Dashboard**: Monitor total balance across all accounts
5. **Manage Data**: Edit or delete accounts and transactions

## 🔧 Configuration

### Customizing Currency

Add new currencies in `src/lib/validations.ts`:

```typescript
export const currencySchema = z.enum(['INR', 'USD', 'EUR', 'GBP']);
```

### Adding Account Types

Extend account types in the validation schema:

```typescript
export const accountTypeSchema = z.enum([
  'bank', 'wallet', 'card', 'metro', 'cash', 'investment'
]);
```

## 🚀 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the [Issues](https://github.com/your-repo/issues) page
- Create a new issue with detailed description
- Review the documentation above

---

**Built with ❤️ using Next.js and modern web technologies**
