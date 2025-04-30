from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Inventory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    price = db.Column(db.Float, nullable=False)
    reorderLevel = db.Column(db.Integer, nullable=False)
    warehouse = db.Column(db.String(100), nullable=False)
    supplier = db.Column(db.String(100), nullable=False)
    lastRestocked = db.Column(db.Date)
    barcode = db.Column(db.String(50), unique=True)
    value = db.Column(db.Float)
    description = db.Column(db.Text)
    weight = db.Column(db.String(20))
    dimensions = db.Column(db.String(50))
    manufacturer = db.Column(db.String(100))
    color = db.Column(db.String(50))
    warrantyPeriod = db.Column(db.String(50))

class Order(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    customer = db.Column(db.String(100), nullable=False)
    contact = db.Column(db.String(100))
    email = db.Column(db.String(120))
    phone = db.Column(db.String(20))
    subtotal = db.Column(db.Float, nullable=False)
    tax = db.Column(db.Float, nullable=False)
    shipping = db.Column(db.Float, nullable=False)
    total = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), nullable=False)
    date = db.Column(db.Date, nullable=False)
    shippingAddress = db.Column(db.Text)
    paymentMethod = db.Column(db.String(50))
    notes = db.Column(db.Text)
    trackingNumber = db.Column(db.String(50))
    paymentStatus = db.Column(db.String(20))
    deliveryDate = db.Column(db.Date)

class OrderItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('order.id'), nullable=False)
    productId = db.Column(db.Integer, nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    unitPrice = db.Column(db.Float, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    order = db.relationship('Order', backref=db.backref('items', lazy=True))

class Supplier(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    contact = db.Column(db.String(100))
    email = db.Column(db.String(120))
    phone = db.Column(db.String(20))
    address = db.Column(db.Text)
    products = db.Column(db.String(200))
    rating = db.Column(db.Float)
    contractStart = db.Column(db.Date)
    leadTime = db.Column(db.Integer)
    paymentTerms = db.Column(db.String(50))
    status = db.Column(db.String(20))
    notes = db.Column(db.Text)
    bankAccount = db.Column(db.String(50))

class Warehouse(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    location = db.Column(db.String(100))
    address = db.Column(db.Text)
    capacity = db.Column(db.Integer)
    usedCapacity = db.Column(db.Integer)
    manager = db.Column(db.String(100))
    contact = db.Column(db.String(20))
    status = db.Column(db.String(20))
    operatingHours = db.Column(db.String(50))
    description = db.Column(db.Text)
    productsStored = db.Column(db.String(200))
    staffCount = db.Column(db.Integer)
    lastInventoryCheck = db.Column(db.Date)
    recentShipment = db.Column(db.Date)
    temperatureControlled = db.Column(db.Boolean)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)

    def __repr__(self):
        return f'<User {self.username}>'

class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    price = db.Column(db.Float, nullable=False)
    stock = db.Column(db.Integer, default=0)

    def __repr__(self):
        return f'<Product {self.name}>' 