# HotelFlow u HotelProyect

Aplicación móvil para gestión hotelera desarrollada con React Native y Django REST Framework.

## Requisitos Previos

- Node.js y npm instalados
- Python 3.x instalado
- Expo CLI
- Dispositivo móvil con Expo Go o emulador configurado

## Instalación y Configuración

### Frontend (React Native + Expo)

1. Navegar a la carpeta del frontend
   cd HotelFlow

2. Instalar dependencias
   npm install

3. Iniciar el servidor de desarrollo
   npx expo start
   
   Nota: Por defecto, Expo funciona en la misma red local. Si necesitas conectarte desde una red diferente, utiliza el modo túnel:
   npx expo start --tunnel

4. Ejecutar la aplicación
   - Escanea el código QR con la app Expo Go (iOS/Android)
   - O presiona 'a' para Android o 'i' para iOS si tienes emuladores configurados

### Backend (Django REST Framework)

El backend ya está configurado y no requiere modificaciones para el funcionamiento básico.

Si necesitas ejecutar el backend localmente:

1. Navegar a la carpeta del backend
   cd HotelBackend

2. Crear y activar entorno virtual
   python -m venv venv
   source venv/bin/activate  # En Windows: venv\Scripts\activate

3. Instalar dependencias
   pip install django djangorestframework

4. Iniciar el servidor
   python manage.py runserver

## Credenciales de Acceso

Usuario por defecto:
- Usuario: admin
- Contraseña: hotel123

Para crear usuarios adicionales, accede al panel de administración de Django en:
http://localhost:8000/admin

## Uso de la Aplicación

1. Abre la app en tu dispositivo móvil
2. Inicia sesión con las credenciales proporcionadas
3. Explora las funcionalidades de gestión hotelera

## Tecnologías

- Frontend: React Native, Expo
- Backend: Django, Django REST Framework
- Base de datos: SQLite (desarrollo)

## Notas Adicionales

- Asegúrate de que el backend esté ejecutándose antes de usar la aplicación móvil
- Verifica que ambos dispositivos (servidor y móvil) estén en la misma red WiFi
- Si experimentas problemas de conexión, intenta usar el modo túnel de Expo

