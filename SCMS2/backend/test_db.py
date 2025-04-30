from app import app, db
from models import Inventory, Order, OrderItem, Supplier, Warehouse, User

def test_database_connection():
    try:
        # Test database connection
        with app.app_context():
            # Create all tables
            db.create_all()
            
            # Test inserting a sample record
            test_supplier = Supplier(
                name="Test Supplier",
                contact="John Doe",
                email="test@example.com",
                phone="1234567890",
                address="123 Test St",
                products="Test Product",
                rating=5,
                status="active"
            )
            db.session.add(test_supplier)
            db.session.commit()
            
            # Test querying
            suppliers = Supplier.query.all()
            print("Database connection successful!")
            print("Suppliers in database:", [s.name for s in suppliers])
            
            # Clean up test data
            db.session.delete(test_supplier)
            db.session.commit()
            
    except Exception as e:
        print("Database connection failed!")
        print("Error:", str(e))

if __name__ == "__main__":
    test_database_connection() 