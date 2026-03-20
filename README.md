# MyEstate Backend

## Railway-ზე განთავსება

### 1. PostgreSQL დამატება
- Railway Dashboard → "New" → "Database" → "PostgreSQL"
- ავტომატურად დაემატება `DATABASE_URL` variable

### 2. Environment Variables
Railway Dashboard → შენი სერვისი → Variables:
```
JWT_SECRET=შეცვალე-ეს-გასაღები-myestate2025
NODE_ENV=production
```
DATABASE_URL ავტომატურად ემატება PostgreSQL-იდან.

### 3. Deploy
GitHub-ზე ატვირთე და Railway ავტომატურად გაუშვებს.

---

## ფოლდერების სტრუქტურა

```
backend/
├── src/
│   ├── index.js              # მთავარი სერვერი
│   ├── db.js                 # PostgreSQL
│   ├── middleware/
│   │   └── auth.js           # JWT auth
│   ├── routes/
│   │   ├── auth.js
│   │   ├── ss.js
│   │   ├── myhome.js
│   │   ├── drafts.js
│   │   ├── users.js
│   │   └── images.js
│   └── services/
│       ├── scraper_ss.js
│       └── scraper_myhome.js
├── public/
│   ├── scripts/
│   │   └── extension.js      # ← Extension კოდი აქ ჩადე
│   └── panel/
│       └── index.html        # ← პანელი
├── package.json
└── .env.example
```

## API Endpoints

| Method | Route | აღწერა |
|--------|-------|---------|
| POST | /auth/broker_login_pin | SS.GE login |
| POST | /auth/broker_registration | რეგისტრაცია |
| POST | /auth/login/access-token | ტოკენის განახლება |
| POST | /ss/save | SS.GE დრაფტის შენახვა |
| GET  | /ss/template/:id | SS შაბლონი |
| POST | /myhome/save/:phone | Myhome დრაფტის შენახვა |
| GET  | /myhome/template/:id | Myhome შაბლონი |
| GET  | /drafts | ყველა დრაფტი |
| DELETE | /drafts/:id | დრაფტის წაშლა |
| PUT  | /users/user_draft | ss_id/myhome_id განახლება |
| GET  | /images/* | სურათების proxy |
