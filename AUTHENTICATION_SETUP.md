# Authentication Setup Guide

## Overview
The Friends Vending Machine now includes optional user authentication. Users can choose to create an account to save their game history and preferences, or play anonymously.

## Features
- **Optional Login**: Users can play without creating an account
- **User Registration**: Create account with email, password, and nickname
- **Secure Authentication**: JWT tokens with bcrypt password hashing
- **User Profile**: Display user information and account details
- **Session Management**: Automatic login persistence

## Installation

### 1. Install Dependencies
```bash
# Install frontend dependencies
npm install

# Install server dependencies
cd server
npm install
cd ..
```

### 2. Environment Configuration
Create a `.env` file in the server directory:
```bash
# JWT Secret for authentication (change this in production!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Server configuration
PORT=3000
HOST=0.0.0.0
```

### 3. Start the Application
```bash
# Start both frontend and backend
npm run dev
# or
./start-local.sh
```

## How It Works

### User Flow
1. **Landing Page**: Users see a "เข้าสู่ระบบ" (Login) button in the top-right corner
2. **Optional Login**: Users can click to open the login modal
3. **Registration/Login**: Users can either:
   - Sign up with email, password, and nickname
   - Login with existing credentials
4. **Game Access**: Whether logged in or not, users can access the pairing game
5. **Profile Management**: Logged-in users see their profile in the top-right corner

### Technical Implementation

#### Frontend Components
- `AuthContext.tsx`: Manages authentication state and provides auth functions
- `LoginModal.tsx`: Modal for login/signup with form validation
- `UserProfile.tsx`: User profile dropdown with logout functionality

#### Backend API
- `POST /api/auth/signup`: User registration
- `POST /api/auth/login`: User login
- `GET /api/auth/verify`: Token verification
- JWT middleware for protected routes

#### Security Features
- Password hashing with bcrypt
- JWT tokens with 7-day expiration
- Input validation and sanitization
- Secure token storage in localStorage

## Usage

### For Users
1. Visit the application
2. Click "เข้าสู่ระบบ" to open login modal (optional)
3. Choose to sign up or login
4. Play the game with or without an account
5. Logged-in users can access their profile and logout

### For Developers
```typescript
// Use authentication in components
import { useAuth } from './contexts/AuthContext'

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth()
  
  if (isAuthenticated) {
    return <div>Welcome, {user.nickname}!</div>
  }
  
  return <div>Please login</div>
}
```

## Future Enhancements
- User game history tracking
- Friend connections and messaging
- User preferences and settings
- Social features and achievements
- Database integration for persistent storage

## Security Notes
- Change the JWT_SECRET in production
- Consider implementing rate limiting
- Add email verification for registration
- Implement password reset functionality
- Use HTTPS in production
- Consider implementing refresh tokens for better security
