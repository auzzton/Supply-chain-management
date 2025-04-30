from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from config import Config
import sys
sys.path.append('.')  # Add the current directory to Python path

app = Flask(__name__)
app.config.from_object(Config)
db = SQLAlchemy(app)

# Import models after db initialization
from models import Supplier, Order, Inventory, Warehouse, OrderItem

def print_separator(title):
    print(f"\n{title}")
    print("-" * len(title))

def show_tables():
    with app.app_context():
        try:
            # Get all table names and their structures
            inspector = db.inspect(db.engine)
            tables = inspector.get_table_names()

            print_separator("Database Tables Structure")
            for table in tables:
                print(f"\n- {table}")
                columns = inspector.get_columns(table)
                print("  Columns:")
                for column in columns:
                    print(f"    - {column['name']} ({column['type']})")
                print()
            
            # Show all suppliers
            print_separator("Current Suppliers")
            suppliers = db.session.query(Supplier).all()
            if not suppliers:
                print("No suppliers found.")
            else:
                for supplier in suppliers:
                    print(f"\nSupplier ID: {supplier.id}")
                    print(f"Name: {supplier.name}")
                    print(f"Contact: {supplier.contact}")
                    print(f"Email: {supplier.email}")
                    print(f"Phone: {supplier.phone}")
                    print(f"Status: {supplier.status}")
                    print("-" * 30)

            # Show all orders
            print_separator("Current Orders")
            orders = db.session.query(Order).all()
            if not orders:
                print("No orders found.")
            else:
                for order in orders:
                    print(f"\nOrder ID: {order.id}")
                    print(f"Customer: {order.customer}")
                    print(f"Date: {order.date}")
                    print(f"Status: {order.status}")
                    print(f"Total: ${order.total:.2f}")
                    
                    # Show order items
                    order_items = db.session.query(OrderItem).filter_by(order_id=order.id).all()
                    if order_items:
                        print("Items:")
                        for item in order_items:
                            print(f"  - {item.name} (Qty: {item.quantity}, Price: ${item.unitPrice:.2f})")
                    print("-" * 30)

            # Show inventory items
            print_separator("Current Inventory")
            inventory_items = db.session.query(Inventory).all()
            if not inventory_items:
                print("No inventory items found.")
            else:
                for item in inventory_items:
                    print(f"\nItem ID: {item.id}")
                    print(f"Name: {item.name}")
                    print(f"Category: {item.category}")
                    print(f"Quantity: {item.quantity}")
                    print(f"Price: ${item.price:.2f}")
                    print(f"Warehouse: {item.warehouse}")
                    print(f"Supplier: {item.supplier}")
                    print("-" * 30)

            # Show warehouses
            print_separator("Current Warehouses")
            warehouses = db.session.query(Warehouse).all()
            if not warehouses:
                print("No warehouses found.")
            else:
                for warehouse in warehouses:
                    print(f"\nWarehouse ID: {warehouse.id}")
                    print(f"Name: {warehouse.name}")
                    print(f"Location: {warehouse.location}")
                    print(f"Capacity: {warehouse.capacity}")
                    print(f"Used Capacity: {warehouse.usedCapacity}")
                    print(f"Status: {warehouse.status}")
                    print("-" * 30)

        except Exception as e:
            print(f"Error: {str(e)}")

if __name__ == "__main__":
    show_tables() 