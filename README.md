# Gym Management System

A comprehensive full-stack gym management application built with React and Node.js.

## Features

- **Multi-role Authentication**: Admin, Trainer, and Member dashboards
- **QR Code Attendance**: Scan QR codes for gym check-ins
- **Payment Processing**: Stripe integration for membership payments
- **Class Management**: Schedule and manage fitness classes
- **Subscription Plans**: Multiple membership tiers
- **Real-time Notifications**: Stay updated with gym activities
- **Profile Management**: Upload and manage user profiles

## Tech Stack

### Frontend
- React 18
- Vite
- CSS3
- Axios for API calls

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT Authentication
- Stripe Payment Integration
- Multer for file uploads

## Project Structure

```
gym-management-system/
├── Backend/
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── middleware/      # Authentication & validation
│   ├── services/        # Business logic
│   └── server.js        # Main server file
├── Frontend/
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── services/    # API services
│   │   └── assets/      # Static assets
│   └── public/
└── README.md
```

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Haris317/Gym_Management_system.git
   cd Gym_Management_system
   ```

2. **Backend Setup**
   ```bash
   cd Backend
   npm install
   cp .env.example .env
   # Configure your .env file with database and API keys
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd Frontend
   npm install
   npm run dev
   ```

### Environment Variables

Create `.env` files in both Backend and Frontend directories using the `.env.example` templates.

**Backend .env:**
- `MONGODB_URI`: Your MongoDB connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `STRIPE_SECRET_KEY`: Stripe secret key
- `EMAIL_USER` & `EMAIL_PASS`: SMTP credentials

## Usage

1. **Admin Dashboard**: Manage members, trainers, classes, and payments
2. **Trainer Dashboard**: Create workout plans and manage assigned members
3. **Member Dashboard**: View classes, make payments, track attendance

## API Endpoints

- `/api/auth` - Authentication routes
- `/api/admin` - Admin management
- `/api/classes` - Class management
- `/api/payments` - Payment processing
- `/api/plans` - Subscription plans
- `/api/attendance` - Attendance tracking

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.

## Contact

For questions or support, please contact [Your Email].
