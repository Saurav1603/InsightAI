import os
import random
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from backend.app.core.database import SessionLocal, Base, engine
from backend.app.core.security import hash_password
from backend.app.models import (
    User, Business, BusinessMembership, ProductCategory, Product,
    InventoryBalance, StockMovement, Customer, Supplier, Invoice,
    InvoiceItem, Payment, Purchase, PurchaseItem, Expense, Document,
    DocumentChunk
)
from backend.app.services.inventory_service import InventoryService
from backend.app.services.billing_service import quantize_dec

def seed_database():
    print("Initializing Database tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if already seeded
        existing_user = db.query(User).filter(User.email == "demo@insightai.com").first()
        if existing_user:
            print("Demo user already exists. Database already seeded.")
            return

        print("Seeding InsightAI Demo Business Data...")

        # 1. Demo User
        demo_user = User(
            email="demo@insightai.com",
            hashed_password=hash_password("DemoPassword123!"),
            full_name="Rajesh Sharma",
            is_active=True,
            is_superuser=False
        )
        db.add(demo_user)
        db.flush()

        # 2. Demo Business
        demo_biz = Business(
            name="Apex Retail & Supermarket",
            slug="apex-retail-supermarket",
            currency="INR",
            currency_symbol="₹",
            tax_identifier="27AAAAA0000A1Z5",
            address="Shop #12-14, Commercial Plaza, MG Road, Pune, Maharashtra 411001",
            phone="+91 98765 43210",
            email="contact@apexretail.in",
            invoice_prefix="APX-",
            invoice_next_number=1055
        )
        db.add(demo_biz)
        db.flush()

        # 3. Membership
        membership = BusinessMembership(
            user_id=demo_user.id,
            business_id=demo_biz.id,
            role="owner",
            is_active=True
        )
        db.add(membership)

        # 4. Product Categories
        categories_data = [
            ("Groceries & Staples", "Flour, rice, pulses, sugar, and cooking oils"),
            ("Beverages", "Tea, coffee, packaged juices, and soft drinks"),
            ("Dairy & Bakery", "Milk, butter, paneer, and artisan breads"),
            ("Snacks & Confectionery", "Biscuits, chips, chocolates, and namkeen"),
            ("Personal Care & Hygiene", "Soaps, shampoos, detergents, and sanitizers")
        ]
        cat_map = {}
        for cat_name, desc in categories_data:
            cat = ProductCategory(
                business_id=demo_biz.id,
                name=cat_name,
                description=desc
            )
            db.add(cat)
            db.flush()
            cat_map[cat_name] = cat.id

        # 5. Products Catalogue
        products_data = [
            # (name, sku, barcode, category, unit, cost, price, tax, min_stock, initial_stock)
            ("Aashirvaad Shudh Chakki Atta 5kg", "ATT-001", "8901030381011", "Groceries & Staples", "pack", 210.0, 245.0, 0.0, 15, 45),
            ("Fortune Sunlite Sunflower Oil 1L", "OIL-002", "8906007281022", "Groceries & Staples", "litre", 125.0, 145.0, 5.0, 20, 60),
            ("India Gate Basmati Rice Feast 1kg", "RIC-003", "8901112281033", "Groceries & Staples", "kg", 95.0, 118.0, 0.0, 12, 35),
            ("Tata Salt Vacuum Evaporated 1kg", "SLT-004", "8901058851044", "Groceries & Staples", "kg", 22.0, 28.0, 0.0, 25, 80),
            ("Madhur Pure & Hygienic Sugar 1kg", "SGR-005", "8906015501055", "Groceries & Staples", "kg", 42.0, 48.0, 5.0, 20, 50),
            ("Tata Tea Premium 500g", "TEA-006", "8901052001066", "Beverages", "pack", 230.0, 275.0, 5.0, 10, 28),
            ("Nescafe Classic Instant Coffee 100g", "COF-007", "8901058851077", "Beverages", "pack", 185.0, 220.0, 18.0, 8, 22),
            ("Real Fruit Power Mixed Fruit 1L", "JUC-008", "8901207011088", "Beverages", "pack", 90.0, 115.0, 12.0, 10, 18),
            ("Coca-Cola 750ml Pet Bottle", "BEV-009", "8901764011099", "Beverages", "bottle", 32.0, 40.0, 18.0, 15, 30),
            ("Amul Taaza Homogenised Milk 1L", "MLK-010", "8901262011100", "Dairy & Bakery", "litre", 62.0, 72.0, 0.0, 20, 40),
            ("Amul Salted Butter 500g", "BTR-011", "8901262011111", "Dairy & Bakery", "pack", 235.0, 275.0, 12.0, 10, 24),
            ("Mother Dairy Fresh Malai Paneer 200g", "PNR-012", "8901262011122", "Dairy & Bakery", "pack", 82.0, 98.0, 5.0, 12, 8), # Trigger low-stock!
            ("Britannia Good Day Butter Cookies 200g", "SNK-013", "8901063011133", "Snacks & Confectionery", "pack", 38.0, 45.0, 18.0, 15, 60),
            ("Lay's India's Magic Masala 50g", "SNK-014", "8901491101144", "Snacks & Confectionery", "pack", 16.0, 20.0, 18.0, 25, 4), # Trigger critical low-stock!
            ("Haldiram's Nagpur Bhujia Sev 400g", "SNK-015", "8904063201155", "Snacks & Confectionery", "pack", 110.0, 130.0, 12.0, 12, 32),
            ("Cadbury Dairy Milk Silk 60g", "SNK-016", "8901233011166", "Snacks & Confectionery", "pack", 68.0, 85.0, 18.0, 10, 25),
            ("Dettol Original Bathing Soap 125g x 4", "PER-017", "8901396111177", "Personal Care & Hygiene", "pack", 160.0, 190.0, 18.0, 10, 18),
            ("Surf Excel Easy Wash Detergent 1kg", "PER-018", "8901030801188", "Personal Care & Hygiene", "kg", 115.0, 138.0, 18.0, 15, 28),
            ("Colgate MaxFresh Peppermint 150g", "PER-019", "8901314011199", "Personal Care & Hygiene", "pack", 95.0, 115.0, 18.0, 12, 30),
            ("Handmade Artisan Saffron Soap", "PER-020", "8909999011200", "Personal Care & Hygiene", "pcs", 145.0, 150.0, 18.0, 5, 0), # Completely out of stock & thin margin!
        ]

        products_list = []
        for name, sku, barcode, c_name, unit, cost, price, tax, reorder, init_stock in products_data:
            p = Product(
                business_id=demo_biz.id,
                category_id=cat_map[c_name],
                sku=sku,
                barcode=barcode,
                name=name,
                unit_of_measure=unit,
                purchase_cost=Decimal(str(cost)),
                selling_price=Decimal(str(price)),
                tax_rate=Decimal(str(tax)),
                reorder_threshold=reorder,
                is_active=True
            )
            db.add(p)
            db.flush()

            # Balance
            bal = InventoryBalance(
                business_id=demo_biz.id,
                product_id=p.id,
                current_stock=float(init_stock),
                last_movement_at=datetime.now(timezone.utc)
            )
            db.add(bal)

            # Opening movement
            if init_stock > 0:
                mov = StockMovement(
                    business_id=demo_biz.id,
                    product_id=p.id,
                    movement_type="opening",
                    quantity_delta=float(init_stock),
                    resulting_balance=float(init_stock),
                    unit_cost=Decimal(str(cost)),
                    notes="Opening inventory balance",
                    created_at=datetime.now(timezone.utc) - timedelta(days=60)
                )
                db.add(mov)

            products_list.append(p)

        # 6. Customers
        customers_data = [
            ("Aarav Mehta", "+91 98230 11223", "aarav.mehta@gmail.com", "Flat 402, Green Acres, Pune", Decimal("1250.00")),
            ("Pooja Kulkarni", "+91 97654 33445", "pooja.k@yahoo.com", "Plot 18, Mayur Colony, Pune", Decimal("0.00")),
            ("Rohan Deshmukh", "+91 99221 55667", "rohan.d@outlook.com", "B-12, Ganga Satellite, Pune", Decimal("840.00")),
            ("Sneha Patil", "+91 98900 77889", "sneha.patil@rediffmail.com", "Row House 7, Aundh, Pune", Decimal("0.00"))
        ]
        customers_list = []
        for c_name, phone, email, addr, out_bal in customers_data:
            cust = Customer(
                business_id=demo_biz.id,
                name=c_name,
                phone=phone,
                email=email,
                address=addr,
                outstanding_balance=out_bal
            )
            db.add(cust)
            db.flush()
            customers_list.append(cust)

        # 7. Suppliers
        suppliers_data = [
            ("Metro Cash & Carry Wholesale", "Amit Saxena", "+91 98111 22334", "orders@metrowholesale.in", "Godown #4, Marketyard, Pune", Decimal("4500.00")),
            ("Sahyadri Agro & FMCG Distributors", "Kishore Joshi", "+91 98222 33445", "supply@sahyadriagro.com", "MIDC Bhosari, Pune", Decimal("0.00")),
            ("Shivaji Dairy & Cold Chain Supplies", "Vilas Shinde", "+91 98333 44556", "sales@shivajidairy.in", "Hadapsar Industrial Estate, Pune", Decimal("1200.00"))
        ]
        suppliers_list = []
        for s_name, contact, phone, email, addr, out_bal in suppliers_data:
            sup = Supplier(
                business_id=demo_biz.id,
                name=s_name,
                contact_person=contact,
                phone=phone,
                email=email,
                address=addr,
                outstanding_balance=out_bal
            )
            db.add(sup)
            db.flush()
            suppliers_list.append(sup)

        # 8. Historical Finalized Invoices (past 45 days)
        # We generate a realistic upward sales trajectory with weekend spikes
        base_time = datetime.now(timezone.utc) - timedelta(days=45)
        invoice_counter = 1001

        random.seed(42) # Deterministic seed

        for day in range(45):
            current_day = base_time + timedelta(days=day)
            is_weekend = current_day.weekday() >= 5
            daily_tx_count = random.randint(3, 6) if is_weekend else random.randint(1, 4)

            for tx in range(daily_tx_count):
                inv_time = current_day + timedelta(hours=random.randint(9, 20), minutes=random.randint(0, 59))
                inv_num = f"APX-{invoice_counter}"
                invoice_counter += 1

                # Select 1-4 random products
                num_items = random.randint(1, 4)
                chosen_products = random.sample(products_list[:18], num_items)

                subtotal = Decimal("0.00")
                total_tax = Decimal("0.00")
                inv_items = []

                for prod in chosen_products:
                    qty = float(random.choice([1, 2, 3]))
                    cost = prod.purchase_cost
                    price = prod.selling_price
                    tax_rate = prod.tax_rate

                    line_gross = quantize_dec(price * Decimal(str(qty)))
                    tax = quantize_dec(line_gross * (tax_rate / Decimal("100.0")))
                    line_total = line_gross + tax

                    subtotal += line_gross
                    total_tax += tax

                    inv_items.append(
                        InvoiceItem(
                            product_id=prod.id,
                            product_name=prod.name,
                            sku=prod.sku,
                            unit_price=price,
                            purchase_cost_snapshot=cost,
                            quantity=qty,
                            discount_amount=Decimal("0.00"),
                            tax_rate=tax_rate,
                            tax_amount=tax,
                            line_total=line_total
                        )
                    )

                grand_total = subtotal + total_tax
                is_credit = random.random() < 0.15 # 15% credit
                cust = random.choice(customers_list) if is_credit else None
                walk_in = None if cust else f"Walk-in Customer #{random.randint(10, 99)}"

                paid = Decimal("0.00") if is_credit else grand_total
                balance = grand_total - paid
                p_status = "unpaid" if is_credit else "paid"
                p_method = "credit" if is_credit else random.choice(["upi", "cash", "card"])

                inv = Invoice(
                    business_id=demo_biz.id,
                    invoice_number=inv_num,
                    customer_id=cust.id if cust else None,
                    walk_in_customer_name=walk_in,
                    status="finalized",
                    subtotal=subtotal,
                    discount_amount=Decimal("0.00"),
                    tax_amount=total_tax,
                    total_amount=grand_total,
                    paid_amount=paid,
                    balance_amount=balance,
                    payment_status=p_status,
                    payment_method=p_method,
                    created_at=inv_time,
                    finalized_at=inv_time
                )
                db.add(inv)
                db.flush()

                for itm in inv_items:
                    itm.invoice_id = inv.id
                    db.add(itm)

                if paid > 0:
                    pmt = Payment(
                        business_id=demo_biz.id,
                        invoice_id=inv.id,
                        customer_id=cust.id if cust else None,
                        amount=paid,
                        payment_method=p_method,
                        reference_number=f"PAY-{inv.invoice_number}",
                        created_at=inv_time
                    )
                    db.add(pmt)

        # 9. Purchases
        purchases_seed = [
            (suppliers_list[0], [("Aashirvaad Shudh Chakki Atta 5kg", 30, 210.0), ("Fortune Sunlite Sunflower Oil 1L", 40, 125.0)], 25),
            (suppliers_list[1], [("Tata Tea Premium 500g", 20, 230.0), ("Britannia Good Day Butter Cookies 200g", 50, 38.0)], 14),
            (suppliers_list[2], [("Amul Taaza Homogenised Milk 1L", 35, 62.0), ("Amul Salted Butter 500g", 15, 235.0)], 5),
        ]

        for idx, (sup, items, days_ago) in enumerate(purchases_seed, start=1):
            p_time = datetime.now(timezone.utc) - timedelta(days=days_ago)
            tot = sum(Decimal(str(cost * qty)) for _, qty, cost in items)
            po = Purchase(
                business_id=demo_biz.id,
                purchase_number=f"PO-2026-{idx:03d}",
                supplier_id=sup.id,
                status="received",
                total_amount=tot,
                paid_amount=tot,
                received_at=p_time,
                created_at=p_time
            )
            db.add(po)
            db.flush()

            for p_name, qty, cost in items:
                prod = next((p for p in products_list if p.name == p_name), None)
                p_item = PurchaseItem(
                    purchase_id=po.id,
                    product_id=prod.id if prod else None,
                    product_name=p_name,
                    quantity=float(qty),
                    unit_cost=Decimal(str(cost)),
                    line_total=Decimal(str(cost * qty))
                )
                db.add(p_item)

        # 10. Operational Expenses
        expenses_seed = [
            ("Store Rent", Decimal("22000.00"), "cash", "Monthly retail shop rent for MG Road commercial premises", 30),
            ("Electricity & Utilities", Decimal("4850.00"), "upi", "MSEB commercial electricity bill for coolers and lighting", 20),
            ("Staff Wages", Decimal("18000.00"), "bank_transfer", "Bi-weekly salary for store cashier and stock assistant", 15),
            ("Logistics & Transport", Decimal("1650.00"), "cash", "Tempo delivery charges from Marketyard wholesale hub", 8),
            ("Packaging & Bags", Decimal("1200.00"), "upi", "Custom printed eco-friendly paper carrying bags", 3),
        ]
        for cat, amt, p_meth, desc, days_ago in expenses_seed:
            exp = Expense(
                business_id=demo_biz.id,
                category=cat,
                amount=amt,
                payment_method=p_meth,
                description=desc,
                expense_date=datetime.now(timezone.utc) - timedelta(days=days_ago)
            )
            db.add(exp)

        # 11. Sample Business Document (RAG)
        doc_text = """APEX RETAIL & SUPERMARKET — OPERATIONAL POLICY & SUPPLIER TERMS 2026

1. RETURN & REFUND POLICY:
Customers are entitled to exchange packaged dry goods within 7 calendar days of purchase upon presentation of the original tax invoice. Perishable items including Dairy (Milk, Paneer, Butter) and fresh bakery goods must be inspected at the billing counter and can only be returned within 24 hours if quality defects or curdling are verified.

2. CREDIT PAYMENT & RECEIVABLE TERMS:
Store credit is extended exclusively to registered neighborhood patrons with verified KYC. All outstanding account balances must be cleared within 30 calendar days. Credit accounts exceeding ₹1,000 without partial settlement within 14 days will be temporarily locked from additional credit purchases.

3. SUPPLIER DELIVERY & RESTOCKING AGREEMENT:
Wholesale suppliers must provide delivery receipts matching the issued Purchase Order (PO). Invoices from Metro Cash & Carry and Sahyadri Agro carry standard 15-day payment cycles with a 2% prompt-payment discount if settled within 5 business days. Breakages or expired lots reported within 48 hours of delivery are subject to 100% debit note reimbursement.

4. INVENTORY STOCK THRESHOLDS & DISCOUNTS:
Standard reorder threshold is pegged at a minimum of 10 units for high-velocity FMCG items and 20 units for daily dairy staples. Seasonal promotional discounts capped at 10% maximum may be applied on expiring packaged confectionery with manager authorization.
"""
        doc = Document(
            business_id=demo_biz.id,
            title="Apex Store Operational Policy & Supplier Agreement 2026",
            original_filename="Store_Policy_and_Supplier_Terms_2026.txt",
            file_path="uploads/Store_Policy_and_Supplier_Terms_2026.txt",
            file_size_bytes=len(doc_text.encode('utf-8')),
            mime_type="text/plain",
            status="processed",
            total_chunks=4,
            extracted_text_summary="Operational policies regarding customer returns, dairy exchanges, credit terms, and supplier payment cycles.",
            created_at=datetime.now(timezone.utc) - timedelta(days=20)
        )
        db.add(doc)
        db.flush()

        # Chunk the sample document
        chunks = [
            "1. RETURN & REFUND POLICY: Customers are entitled to exchange packaged dry goods within 7 calendar days of purchase upon presentation of the original tax invoice. Perishable items including Dairy (Milk, Paneer, Butter) must be inspected at billing counter and can only be returned within 24 hours if quality defects are verified.",
            "2. CREDIT PAYMENT & RECEIVABLE TERMS: Store credit is extended exclusively to registered neighborhood patrons with verified KYC. All outstanding account balances must be cleared within 30 calendar days. Accounts exceeding ₹1,000 without partial settlement within 14 days are temporarily locked.",
            "3. SUPPLIER DELIVERY & RESTOCKING AGREEMENT: Wholesale suppliers must provide delivery receipts matching Purchase Order. Invoices from Metro Cash & Carry carry standard 15-day payment cycles with 2% prompt-payment discount if settled within 5 days. Breakages reported within 48 hours receive 100% debit note.",
            "4. INVENTORY STOCK THRESHOLDS & DISCOUNTS: Standard reorder threshold is pegged at a minimum of 10 units for FMCG items and 20 units for daily dairy staples. Promotional discounts capped at 10% maximum may be applied on expiring packaged confectionery with manager authorization."
        ]
        for idx, c_text in enumerate(chunks):
            chunk = DocumentChunk(
                document_id=doc.id,
                business_id=demo_biz.id,
                chunk_index=idx,
                content=c_text,
                created_at=datetime.now(timezone.utc) - timedelta(days=20)
            )
            db.add(chunk)

        db.commit()
        print("[OK] Successfully seeded Demo Business: 'Apex Retail & Supermarket'")
        print(f"[OK] Created {len(products_data)} products, {len(customers_data)} customers, {len(suppliers_data)} suppliers")
        print(f"[OK] Generated {invoice_counter - 1001} realistic historical sales invoices over past 45 days")
        print("[OK] Created Demo User: demo@insightai.com / DemoPassword123!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
