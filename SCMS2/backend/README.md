# Flask Backend Setup

This is a Flask backend application with SQL database integration.

## Setup Instructions

1. Create a virtual environment:

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Create a `.env` file in the backend directory with the following content:

```
SECRET_KEY=5f4dcc3b5aa765d61d8327deb882cf99f4dcc3b5aa765d61d8327deb882cf99
DATABASE_URL=mysql+pymysql://root:your_password@localhost/scms_db
```

4. Make sure you have MySQL installed and create a database named `scms_db`

5. Run the application:

```bash
python app.py
```

## API Endpoints

### Users

- GET /api/users - Get all users
- POST /api/users - Create a new user

### Products

- GET /api/products - Get all products
- POST /api/products - Create a new product

## Database Models

### User

- id (Integer, Primary Key)
- username (String)
- email (String)
- password (String)

### Product

- id (Integer, Primary Key)
- name (String)
- description (Text)
- price (Float)
- stock (Integer)
