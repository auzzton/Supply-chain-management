from flask import Flask, jsonify, request
from flask_cors import CORS
from config import Config
from models import db, Inventory, Order, OrderItem, Supplier, Warehouse, User
from datetime import datetime

app = Flask(__name__)
app.config.from_object(Config)
CORS(app)

# Initialize database
db.init_app(app)

# Create database tables
with app.app_context():
    db.create_all()

# Inventory Routes
@app.route('/api/inventory', methods=['GET'])
def get_inventory():
    items = Inventory.query.all()
    return jsonify([{
        'id': item.id,
        'name': item.name,
        'category': item.category,
        'quantity': item.quantity,
        'price': item.price,
        'reorderLevel': item.reorderLevel,
        'warehouse': item.warehouse,
        'supplier': item.supplier,
        'lastRestocked': item.lastRestocked.strftime('%Y-%m-%d') if item.lastRestocked else None,
        'barcode': item.barcode,
        'value': item.value,
        'description': item.description,
        'weight': item.weight,
        'dimensions': item.dimensions,
        'manufacturer': item.manufacturer,
        'color': item.color,
        'warrantyPeriod': item.warrantyPeriod
    } for item in items])

@app.route('/api/inventory', methods=['POST'])
def create_inventory():
    data = request.get_json()
    new_item = Inventory(
        name=data['name'],
        category=data['category'],
        quantity=data['quantity'],
        price=data['price'],
        reorderLevel=data['reorderLevel'],
        warehouse=data['warehouse'],
        supplier=data['supplier'],
        lastRestocked=datetime.strptime(data['lastRestocked'], '%Y-%m-%d') if data.get('lastRestocked') else None,
        barcode=data.get('barcode'),
        value=data.get('value'),
        description=data.get('description'),
        weight=data.get('weight'),
        dimensions=data.get('dimensions'),
        manufacturer=data.get('manufacturer'),
        color=data.get('color'),
        warrantyPeriod=data.get('warrantyPeriod')
    )
    db.session.add(new_item)
    db.session.commit()
    return jsonify({'message': 'Inventory item created successfully'}), 201

@app.route('/api/inventory/<int:id>', methods=['PUT'])
def update_inventory(id):
    item = Inventory.query.get_or_404(id)
    data = request.get_json()
    
    for key, value in data.items():
        if key == 'lastRestocked' and value:
            setattr(item, key, datetime.strptime(value, '%Y-%m-%d'))
        else:
            setattr(item, key, value)
    
    db.session.commit()
    return jsonify({'message': 'Inventory item updated successfully'})

@app.route('/api/inventory/<int:id>', methods=['DELETE'])
def delete_inventory(id):
    item = Inventory.query.get_or_404(id)
    db.session.delete(item)
    db.session.commit()
    return jsonify({'message': 'Inventory item deleted successfully'})

# Order Routes
@app.route('/api/orders', methods=['GET'])
def get_orders():
    orders = Order.query.all()
    return jsonify([{
        'id': order.id,
        'customer': order.customer,
        'contact': order.contact,
        'email': order.email,
        'phone': order.phone,
        'items': [{
            'productId': item.productId,
            'quantity': item.quantity,
            'unitPrice': item.unitPrice,
            'name': item.name
        } for item in order.items],
        'subtotal': order.subtotal,
        'tax': order.tax,
        'shipping': order.shipping,
        'total': order.total,
        'status': order.status,
        'date': order.date.strftime('%Y-%m-%d'),
        'shippingAddress': order.shippingAddress,
        'paymentMethod': order.paymentMethod,
        'notes': order.notes,
        'trackingNumber': order.trackingNumber,
        'paymentStatus': order.paymentStatus,
        'deliveryDate': order.deliveryDate.strftime('%Y-%m-%d') if order.deliveryDate else None
    } for order in orders])

@app.route('/api/orders', methods=['POST'])
def create_order():
    data = request.get_json()
    
    # Calculate order totals
    items_total = sum(item['price'] * item['quantity'] for item in data['items'])
    tax = items_total * 0.1  # 10% tax
    shipping = 100  # Fixed shipping cost
    total = items_total + tax + shipping
    
    new_order = Order(
        customer=data['customer'],
        status=data['status'],
        date=datetime.now(),
        subtotal=items_total,
        tax=tax,
        shipping=shipping,
        total=total
    )
    
    db.session.add(new_order)
    db.session.flush()  # Get the new order's ID
    
    # Add order items
    for item_data in data['items']:
        new_item = OrderItem(
            order_id=new_order.id,
            productId=item_data['itemId'],
            quantity=item_data['quantity'],
            unitPrice=item_data['price'],
            name=item_data['name']
        )
        db.session.add(new_item)
        
        # Update inventory quantity
        inventory_item = Inventory.query.get(item_data['itemId'])
        if inventory_item:
            inventory_item.quantity -= item_data['quantity']
    
    db.session.commit()
    return jsonify({'message': 'Order created successfully', 'id': new_order.id}), 201

@app.route('/api/orders/<int:id>', methods=['PUT'])
def update_order(id):
    order = Order.query.get_or_404(id)
    data = request.get_json()
    
    # Update basic order information
    order.customer = data['customer']
    order.status = data['status']
    
    # Update order items
    # First, restore inventory quantities
    for item in order.items:
        inventory_item = Inventory.query.get(item.productId)
        if inventory_item:
            inventory_item.quantity += item.quantity
    
    # Delete existing items
    OrderItem.query.filter_by(order_id=id).delete()
    
    # Calculate new totals and add new items
    items_total = sum(item['price'] * item['quantity'] for item in data['items'])
    tax = items_total * 0.1  # 10% tax
    shipping = 100  # Fixed shipping cost
    total = items_total + tax + shipping
    
    order.subtotal = items_total
    order.tax = tax
    order.shipping = shipping
    order.total = total
    
    # Add new order items
    for item_data in data['items']:
        new_item = OrderItem(
            order_id=order.id,
            productId=item_data['itemId'],
            quantity=item_data['quantity'],
            unitPrice=item_data['price'],
            name=item_data['name']
        )
        db.session.add(new_item)
        
        # Update inventory quantity
        inventory_item = Inventory.query.get(item_data['itemId'])
        if inventory_item:
            inventory_item.quantity -= item_data['quantity']
    
    db.session.commit()
    return jsonify({'message': 'Order updated successfully'})

@app.route('/api/orders/<int:id>', methods=['DELETE'])
def delete_order(id):
    order = Order.query.get_or_404(id)
    
    # Restore inventory quantities
    for item in order.items:
        inventory_item = Inventory.query.get(item.productId)
        if inventory_item:
            inventory_item.quantity += item.quantity
    
    # Delete order items first (due to foreign key constraint)
    OrderItem.query.filter_by(order_id=id).delete()
    
    # Delete the order
    db.session.delete(order)
    db.session.commit()
    return jsonify({'message': 'Order deleted successfully'})

# Supplier Routes
@app.route('/api/suppliers', methods=['GET'])
def get_suppliers():
    suppliers = Supplier.query.all()
    return jsonify([{
        'id': supplier.id,
        'name': supplier.name,
        'contact': supplier.contact,
        'email': supplier.email,
        'phone': supplier.phone,
        'address': supplier.address,
        'products': supplier.products.split(',') if supplier.products else [],
        'rating': supplier.rating,
        'status': supplier.status,
        'notes': supplier.notes
    } for supplier in suppliers])

@app.route('/api/suppliers', methods=['POST'])
def create_supplier():
    data = request.get_json()
    new_supplier = Supplier(
        name=data['name'],
        contact=data['contact'],
        email=data['email'],
        phone=data['phone'],
        address=data['address'],
        products=','.join(data['products']),
        rating=data['rating'],
        status=data['status'],
        notes=data.get('notes', '')
    )
    db.session.add(new_supplier)
    db.session.commit()
    return jsonify({'message': 'Supplier created successfully', 'id': new_supplier.id}), 201

@app.route('/api/suppliers/<int:id>', methods=['PUT'])
def update_supplier(id):
    supplier = Supplier.query.get_or_404(id)
    data = request.get_json()
    
    supplier.name = data['name']
    supplier.contact = data['contact']
    supplier.email = data['email']
    supplier.phone = data['phone']
    supplier.address = data['address']
    supplier.products = ','.join(data['products'])
    supplier.rating = data['rating']
    supplier.status = data['status']
    supplier.notes = data.get('notes', '')
    
    db.session.commit()
    return jsonify({'message': 'Supplier updated successfully'})

@app.route('/api/suppliers/<int:id>', methods=['DELETE'])
def delete_supplier(id):
    supplier = Supplier.query.get_or_404(id)
    db.session.delete(supplier)
    db.session.commit()
    return jsonify({'message': 'Supplier deleted successfully'})

# Warehouse Routes
@app.route('/api/warehouses', methods=['GET'])
def get_warehouses():
    warehouses = Warehouse.query.all()
    return jsonify([{
        'id': warehouse.id,
        'name': warehouse.name,
        'location': warehouse.location,
        'address': warehouse.address,
        'capacity': warehouse.capacity,
        'usedCapacity': warehouse.usedCapacity,
        'manager': warehouse.manager,
        'contact': warehouse.contact,
        'status': warehouse.status,
        'operatingHours': warehouse.operatingHours,
        'description': warehouse.description,
        'productsStored': warehouse.productsStored.split(',') if warehouse.productsStored else [],
        'staffCount': warehouse.staffCount,
        'lastInventoryCheck': warehouse.lastInventoryCheck.strftime('%Y-%m-%d') if warehouse.lastInventoryCheck else None,
        'recentShipment': warehouse.recentShipment.strftime('%Y-%m-%d') if warehouse.recentShipment else None,
        'temperatureControlled': warehouse.temperatureControlled
    } for warehouse in warehouses])

if __name__ == '__main__':
    app.run(debug=True)
