import json
from datetime import datetime
from app import app
from models import db, Inventory, Order, OrderItem, Supplier, Warehouse

def import_data():
    with open('../frontend/data.json', 'r') as file:
        data = json.load(file)
        
    with app.app_context():
        # Import Inventory
        for item in data['inventory']:
            inventory = Inventory(
                name=item['name'],
                category=item['category'],
                quantity=item['quantity'],
                price=item['price'],
                reorderLevel=item['reorderLevel'],
                warehouse=item['warehouse'],
                supplier=item['supplier'],
                lastRestocked=datetime.strptime(item['lastRestocked'], '%Y-%m-%d'),
                barcode=item['barcode'],
                value=item['value'],
                description=item['description'],
                weight=item['weight'],
                dimensions=item['dimensions'],
                manufacturer=item['manufacturer'],
                color=item['color'],
                warrantyPeriod=item['warrantyPeriod']
            )
            db.session.add(inventory)
        
        # Import Orders
        for order_data in data['orders']:
            order = Order(
                customer=order_data['customer'],
                contact=order_data['contact'],
                email=order_data['email'],
                phone=order_data['phone'],
                subtotal=order_data['subtotal'],
                tax=order_data['tax'],
                shipping=order_data['shipping'],
                total=order_data['total'],
                status=order_data['status'],
                date=datetime.strptime(order_data['date'], '%Y-%m-%d'),
                shippingAddress=order_data['shippingAddress'],
                paymentMethod=order_data['paymentMethod'],
                notes=order_data['notes'],
                trackingNumber=order_data['trackingNumber'],
                paymentStatus=order_data['paymentStatus'],
                deliveryDate=datetime.strptime(order_data['deliveryDate'], '%Y-%m-%d')
            )
            db.session.add(order)
            db.session.flush()
            
            for item_data in order_data['items']:
                order_item = OrderItem(
                    order_id=order.id,
                    productId=item_data['productId'],
                    quantity=item_data['quantity'],
                    unitPrice=item_data['unitPrice'],
                    name=item_data['name']
                )
                db.session.add(order_item)
        
        # Import Suppliers
        for supplier_data in data['suppliers']:
            supplier = Supplier(
                name=supplier_data['name'],
                contact=supplier_data['contact'],
                email=supplier_data['email'],
                phone=supplier_data['phone'],
                address=supplier_data['address'],
                products=','.join(supplier_data['products']),
                rating=supplier_data['rating'],
                contractStart=datetime.strptime(supplier_data['contractStart'], '%Y-%m-%d'),
                leadTime=supplier_data['leadTime'],
                paymentTerms=supplier_data['paymentTerms'],
                status=supplier_data['status'],
                notes=supplier_data['notes'],
                bankAccount=supplier_data['bankAccount']
            )
            db.session.add(supplier)
        
        # Import Warehouses
        for warehouse_data in data['warehouses']:
            warehouse = Warehouse(
                name=warehouse_data['name'],
                location=warehouse_data['location'],
                address=warehouse_data['address'],
                capacity=warehouse_data['capacity'],
                usedCapacity=warehouse_data['usedCapacity'],
                manager=warehouse_data['manager'],
                contact=warehouse_data['contact'],
                status=warehouse_data['status'],
                operatingHours=warehouse_data['operatingHours'],
                description=warehouse_data['description'],
                productsStored=','.join(warehouse_data['productsStored']),
                staffCount=warehouse_data['staffCount'],
                lastInventoryCheck=datetime.strptime(warehouse_data['lastInventoryCheck'], '%Y-%m-%d'),
                recentShipment=datetime.strptime(warehouse_data['recentShipment'], '%Y-%m-%d'),
                temperatureControlled=warehouse_data['temperatureControlled']
            )
            db.session.add(warehouse)
        
        db.session.commit()
        print("Data imported successfully!")

if __name__ == '__main__':
    import_data() 