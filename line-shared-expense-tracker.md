# 🤝 Line Shared Expense Tracker

A smart, semi-automated expense sharing and reimbursement assistant using **LINE LIFF** and **Messaging API**. Designed for managing shared group expenses (e.g., for housemates, friends, or events).

---

## 🚀 Features

### 1. LINE Rich Menu Integration
- Entry point to the app with:
  - "Join Group" / "Register" option
  - Display **PromptPay QR Code**, bank info, or wallet details for easy money transfer.

### 2. LINE Login (LIFF)
- Authenticates user via LINE Login
- Retrieves profile info (Name, UserID, Profile Picture)
- Used to personalize and tag transactions

### 3. Expense Input Form (via LIFF Web App)
- Users can create purchase records:
  - Item name, price
  - Paid by (auto-filled from LINE)
  - Used by (can select one or multiple people)
  - Optional receipt image

### 4. Auto Split Bill System
- Flexible split options:
  - Equal split among selected people
  - Custom amount per person
- Automatically calculates who owes whom

### 5. Debt Reminder System
- Notifies members if they haven’t paid after 24 hours
- Can notify via:
  - Personal message (1:1)
  - Group tag with message ("@User still owes for item XYZ")

### 6. Group/House Management
- Users can:
  - Create or join multiple groups (e.g., family, dorm, trip)
  - Manage members within a group
  - View history, members, and transactions scoped to group

### 7. Auto Debt Clearance System
- Intelligent logic to “cancel out” debts:
  - If A owes B, and B owes A, it nets the difference.
  - Prevents unnecessary cross-payments

### 8. Admin / Power User Tools
- QR code generator for PromptPay
- Manual record edit / delete (with logs)
- Export group transaction history (.csv, .xlsx)

---

## 🧱 Tech Stack

| Layer        | Tools/Tech                      |
|--------------|----------------------------------|
| Frontend     | LINE LIFF, React (Vite)         |
| Backend      | Node.js + Express               |
| Database     | MongoDB / PostgreSQL (flexible) |
| Auth         | LINE OAuth2 (via LIFF)          |
| Notification | LINE Messaging API              |
| Hosting      | Vercel (frontend), Render/AWS (backend) |

---

## 📦 Folder Structure (Example)
```
project-root/
├── client/                  # LINE LIFF Web App (React)
│   ├── components/
│   ├── pages/
│   └── services/
├── server/                  # Express backend
│   ├── routes/
│   ├── controllers/
│   ├── models/
│   └── utils/
├── database/                # Migrations or schema definitions
├── public/                  # PromptPay QR images, etc.
└── README.md
```

---

## ✅ Future Enhancements
- Real-time update of balances via WebSocket
- Full LINE Notify integration for event-based push
- Native mobile app (via Expo or Flutter)
- Google Sheets backup

---

## 📌 License & Contribution
MIT License. Contributions welcome.