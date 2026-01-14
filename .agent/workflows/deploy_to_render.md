---
description: How to deploy the HotelBackend to Render (Cloud Hosting)
---

# Deploy HotelBackend to Render

This guide will help you put your "Brain" (Backend) in the cloud so it runs 24/7.

## 1. Prepare your Code
Ensure you have the latest changes committed:
```bash
git add .
git commit -m "Prepared for deployment"
git push origin main
```

## 2. Create Render Account
1.  Go to [render.com](https://render.com).
2.  Sign up (you can use GitHub/GitLab).

## 3. Create Web Service
1.  Click **New +** -> **Web Service**.
2.  Connect your GitHub repository (`HotelProject` or similar).
3.  Fill in the details:
    -   **Name**: `hotel-backend` (or similar)
    -   **Region**: Choose closest to you (e.g. Frankfurt, Ohio).
    -   **Root Directory**: `HotelBackend` (Important!)
    -   **Runtime**: `Python 3`
    -   **Build Command**: `pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate`
    -   **Start Command**: `gunicorn hotel_backend.wsgi:application --log-file -`
    -   **Plan**: Free

## 4. Environment Variables
Scroll down to "Environment Variables" and add these keys:

| Key | Value |
| :--- | :--- |
| `PYTHON_VERSION` | `3.12.0` (Required for Django 6.0) |
| `SECRET_KEY` | (Generate a random string, e.g. `django-insecure-...`) |
| `DEBUG` | `False` |

## 5. Deploy
Click **Create Web Service**. Render will start building your app.
Wait for it to show "Live".

## 6. Connect Mobile App
Once deployed, copy your new URL (e.g., `https://hotel-backend.onrender.com`).
Update your React Native `api.ts` file with this new URL.

```typescript
// src/services/api.ts
const BASE_URL = 'https://hotel-backend.onrender.com/api';
```

## 7. Create Superuser (Admin) - Automated Method
Since Render's free tier shell has limitations, we'll use Environment Variables.

1.  In Render Dashboard, go to **Environment**.
2.  Add: `ADMIN_USER` = `admin` (or your choice)
3.  Add: `ADMIN_PASS` = `your_secure_password`
4.  Commit and Push the provided `ensure_admin` command.
5.  **Build Command Update**: Change the "Build Command" in Render Settings to:
    `pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate && python manage.py ensure_admin && python manage.py populate_rooms`
    *(Added populate_rooms to generate data if empty)*
    
6.  Trigger a new Deploy. Your superuser will be created automatically.
7.  Log in at: `https://hotel-backend-ql8r.onrender.com/admin/`
