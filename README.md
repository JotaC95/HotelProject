# HotelFlow / HotelProject

A comprehensive mobile application for hotel housekeeping and management, developed with **React Native** (Frontend) and **Django REST Framework** (Backend).

## Features

-   **Role-Based Access Control**: Tailored interfaces for Administrators, Supervisors, Receptionists, and Housekeeping staff.
-   **Room Management**: Real-time tracking of room status (Clean, Dirty, Inspect, etc.), availability, and guest status.
-   **Housekeeping Operations**:
    -   Automated and manual task assignments.
    -   Roster management.
    -   Cleaning schedules and priorities (Pre-arrival, Departure, Stay-over).
-   **Analytics Dashboard**: Visual insights into hotel performance and housekeeping efficiency.
-   **Lost & Found**: Log and track lost items.
-   **Maintenance**: Report and monitor maintenance requests.
-   **Timeline View**: Visual representation of room bookings and status changes.

## Technology Stack

-   **Frontend**: React Native, Expo, TypeScript, React Navigation, Lucide Icons, Axios.
-   **Backend**: Django, Django REST Framework (DRF), Python.
-   **Database**: SQLite (Default for development).

## Prerequisites

-   **Node.js** and **npm** installed.
-   **Python 3.x** installed.
-   **Expo CLI**: Install globally via `npm install -g expo-cli`.
-   **Expo Go** app on your mobile device (iOS/Android) or a configured emulator (Android Studio / Xcode).

## Installation & Setup

### 1. Frontend (HotelFlow)

1.  Navigate to the frontend directory:
    ```bash
    cd HotelFlow
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the development server:
    ```bash
    npx expo start
    ```
    *Note: If you need to connect from a different network or experience connection issues, use tunnel mode:*
    ```bash
    npx expo start --tunnel
    ```

4.  Run the application:
    -   Scan the QR code with the **Expo Go** app.
    -   Press `a` to run on Android Emulator or `i` for iOS Simulator.

### 2. Backend (HotelBackend)

1.  Navigate to the backend directory:
    ```bash
    cd HotelBackend
    ```

2.  Create and activate a virtual environment:
    ```bash
    # Create venv
    python -m venv venv

    # Activate venv
    # On macOS/Linux:
    source venv/bin/activate
    # On Windows:
    venv\Scripts\activate
    ```

3.  Install Python dependencies:
    ```bash
    pip install -r requirements.txt
    ```

4.  Apply database migrations:
    ```bash
    python manage.py migrate
    ```

5.  Start the server:
    ```bash
    python manage.py runserver
    ```
    The API will be available at `http://localhost:8000/`.

## Access Credentials

### Default Admin
-   **Username**: `admin`
-   **Password**: `hotel123`
    *Note: If this user does not exist, create one using:*
    ```bash
    python manage.py createsuperuser
    ```

### Sample Staff User
-   **Username**: `Ramiro`
-   **Password**: `password123`

To manage users and data directly, access the Django Admin Panel at:
[http://localhost:8000/admin](http://localhost:8000/admin)

## Development & Testing

### Populating Test Data
To generate sample data (rooms, status, cleaning types) for testing purposes, you can run the provided script:

```bash
cd HotelBackend
python populate_rooms_v2.py
```
This script clears existing rooms and creates 62 rooms with various statuses and cleaning priorities.

### Directory Structure

-   `HotelFlow/`: React Native frontend source code.
    -   `src/screens/`: Application screens (Admin, Login, RoomList, etc.).
    -   `src/components/`: Reusable UI components.
    -   `src/services/`: API integration logic.
-   `HotelBackend/`: Django backend source code.
    -   `accounts/`: User authentication and role management.
    -   `housekeeping/`: Core logic for rooms, tasks, and assignments.
    -   `hotel_backend/`: Main project settings and configuration.

## Troubleshooting

-   **Network Issues**: Ensure both your computer and mobile device are on the same WiFi network. If problems persist, use `npx expo start --tunnel`.
-   **Backend Connection**: Verify the backend is running on port 8000.
