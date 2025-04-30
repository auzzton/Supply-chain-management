import pymysql
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Get database credentials from .env
db_url = os.getenv('DATABASE_URL')
# Parse the URL to get credentials
username = 'root'
password = 'webots123'
host = 'localhost'
port = 3306
database = 'scms_db'

try:
    # Connect to MySQL server
    connection = pymysql.connect(
        host=host,
        user=username,
        password=password,
        port=port
    )
    
    # Create cursor
    cursor = connection.cursor()
    
    # Create database
    cursor.execute(f"CREATE DATABASE IF NOT EXISTS {database}")
    print(f"Database '{database}' created successfully!")
    
    # Close cursor and connection
    cursor.close()
    connection.close()
    
except Exception as e:
    print(f"Error: {e}") 