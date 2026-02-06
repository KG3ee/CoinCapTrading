# Quick Reference - CoinCapTrading App

## ✅ App Status: FULLY WORKING

**URL:** http://localhost:3000  
**MongoDB:** Running on port 27017  
**Database:** coincap-trading

---

## 🚀 Quick Start

```bash
# Start MongoDB (if not running)
brew services start mongodb-community

# Start your app
cd /Users/kyawlaymyint/Desktop/CoinCapTrading
npm run dev

# Open browser
open http://localhost:3000
```

---

## 📝 Test Registration

**URL:** http://localhost:3000/register

**Test Account:**
- Full Name: Test User
- Email: test@example.com
- Password: test123 (min 6 chars)

**Result:** ✅ Account created successfully!

---

## 🔍 Check Logs

```bash
# View MongoDB logs
tail -f /opt/homebrew/var/log/mongodb/output.log

# Check if MongoDB is running
mongosh --eval "db.version()"

# Check app health
curl http://localhost:3000/api/health | python3 -m json.tool
```

---

## 🛠️ Common Commands

### MongoDB:
```bash
# Start
brew services start mongodb-community

# Stop
brew services stop mongodb-community

# Status
brew services list | grep mongodb

# Connect
mongosh coincap-trading
```

### App:
```bash
# Start dev server
npm run dev

# Build production
npm run build

# Start production
npm start

# Clear cache
rm -rf .next node_modules/.cache
```

---

## 🐛 Known Issues (Non-Critical)

### Worker Thread Errors
```
Error: Cannot find module '.../vendor-chunks/lib/worker.js'
```
**Impact:** Non-fatal, doesn't affect functionality  
**Status:** Can be ignored in development

---

## 📧 Email Configuration

**Service:** Resend  
**API Key:** ✅ Configured in `.env.local`  
**From:** onboarding@resend.dev  
**Dashboard:** https://resend.com/emails

---

## 🔐 Environment Variables

Located in: `.env.local`

**Required:**
- ✅ MONGODB_URI
- ✅ RESEND_API_KEY
- ✅ JWT_SECRET
- ✅ NEXTAUTH_SECRET
- ✅ NEXT_PUBLIC_API_URL

---

## ✅ What's Working

- ✅ Home page (/)
- ✅ Markets page (/markets)
- ✅ Trade page (/trade)
- ✅ Login page (/login)
- ✅ Registration (/register)
- ✅ MongoDB connection
- ✅ Email sending (Resend)
- ✅ Health API (/api/health)
- ✅ Crypto selector
- ✅ Gainers/Losers filtering
- ✅ Swap function (buy/sell toggle)

---

## 📚 Documentation Files

- **MONGODB_SETUP.md** - MongoDB installation
- **EMAIL_SETUP_GUIDE.md** - Email setup
- **BUGS_FIXED.md** - All bugs fixed
- **QUICK_REFERENCE.md** - This file

---

## 🎉 You're All Set!

Your app is fully functional. Start building! 🚀
