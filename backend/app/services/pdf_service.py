import io
from decimal import Decimal
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from backend.app.models import Invoice, Business

class PDFService:
    @staticmethod
    def generate_invoice_pdf(invoice: Invoice, business: Business) -> io.BytesIO:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        elements = []
        styles = getSampleStyleSheet()

        # Custom Styles
        title_style = ParagraphStyle(
            'InvoiceTitle',
            parent=styles['Heading1'],
            fontSize=22,
            leading=26,
            textColor=colors.HexColor('#4c1d95'),
            fontName='Helvetica-Bold'
        )

        biz_name_style = ParagraphStyle(
            'BizName',
            parent=styles['Heading2'],
            fontSize=15,
            leading=18,
            textColor=colors.HexColor('#0f172a'),
            fontName='Helvetica-Bold'
        )

        normal_style = ParagraphStyle(
            'NormalText',
            parent=styles['Normal'],
            fontSize=9,
            leading=13,
            textColor=colors.HexColor('#334155')
        )

        bold_style = ParagraphStyle(
            'BoldText',
            parent=styles['Normal'],
            fontSize=9,
            leading=13,
            fontName='Helvetica-Bold',
            textColor=colors.HexColor('#0f172a')
        )

        # Header: Business Details & Invoice Title
        biz_info = [
            Paragraph(f"<b>{business.name}</b>", biz_name_style),
            Paragraph(business.address or "Retail Store Address", normal_style),
            Paragraph(f"Phone: {business.phone or 'N/A'} | Email: {business.email or 'N/A'}", normal_style),
            Paragraph(f"GSTIN / Tax ID: {business.tax_identifier or 'Unregistered'}", normal_style)
        ]

        inv_info = [
            Paragraph("TAX INVOICE", title_style),
            Paragraph(f"<b>Invoice #:</b> {invoice.invoice_number}", bold_style),
            Paragraph(f"<b>Date:</b> {invoice.created_at.strftime('%d-%b-%Y %I:%M %p')}", normal_style),
            Paragraph(f"<b>Status:</b> {invoice.status.upper()}", bold_style),
            Paragraph(f"<b>Payment:</b> {invoice.payment_status.upper()} ({invoice.payment_method.upper()})", normal_style)
        ]

        header_table = Table([[biz_info, inv_info]], colWidths=[320, 220])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ]))
        elements.append(header_table)
        elements.append(Spacer(1, 15))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e2e8f0'), spaceAfter=15))

        # Bill To (Customer Details)
        cust_name = invoice.customer.name if invoice.customer else (invoice.walk_in_customer_name or "Walk-in Customer")
        cust_phone = invoice.customer.phone if invoice.customer else "N/A"
        cust_addr = invoice.customer.address if invoice.customer else "N/A"

        bill_to_content = [
            Paragraph("<b>BILLED TO:</b>", bold_style),
            Paragraph(f"<b>Name:</b> {cust_name}", normal_style),
            Paragraph(f"<b>Contact:</b> {cust_phone}", normal_style),
            Paragraph(f"<b>Address:</b> {cust_addr}", normal_style)
        ]
        elements.append(Table([[bill_to_content]], colWidths=[540]))
        elements.append(Spacer(1, 15))

        # Items Table
        table_data = [
            [
                Paragraph("<b>#</b>", bold_style),
                Paragraph("<b>Item Description</b>", bold_style),
                Paragraph("<b>SKU</b>", bold_style),
                Paragraph("<b>Qty</b>", bold_style),
                Paragraph("<b>Rate (₹)</b>", bold_style),
                Paragraph("<b>Tax %</b>", bold_style),
                Paragraph("<b>Total (₹)</b>", bold_style)
            ]
        ]

        for i, item in enumerate(invoice.items, start=1):
            table_data.append([
                Paragraph(str(i), normal_style),
                Paragraph(item.product_name, normal_style),
                Paragraph(item.sku or "-", normal_style),
                Paragraph(str(item.quantity), normal_style),
                Paragraph(f"{item.unit_price:.2f}", normal_style),
                Paragraph(f"{item.tax_rate:.1f}%", normal_style),
                Paragraph(f"{item.line_total:.2f}", normal_style)
            ])

        items_table = Table(table_data, colWidths=[25, 200, 75, 45, 65, 55, 75])
        items_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f8fafc')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(items_table)
        elements.append(Spacer(1, 15))

        # Totals Summary Table
        totals_data = [
            [Paragraph("<b>Subtotal:</b>", normal_style), Paragraph(f"₹{invoice.subtotal:.2f}", bold_style)],
            [Paragraph("<b>Discount:</b>", normal_style), Paragraph(f"₹{invoice.discount_amount:.2f}", normal_style)],
            [Paragraph("<b>Total Tax:</b>", normal_style), Paragraph(f"₹{invoice.tax_amount:.2f}", normal_style)],
            [Paragraph("<b>Grand Total:</b>", bold_style), Paragraph(f"₹{invoice.total_amount:.2f}", bold_style)],
            [Paragraph("<b>Amount Paid:</b>", normal_style), Paragraph(f"₹{invoice.paid_amount:.2f}", normal_style)],
            [Paragraph("<b>Balance Due:</b>", bold_style), Paragraph(f"₹{invoice.balance_amount:.2f}", bold_style)]
        ]

        totals_table = Table(totals_data, colWidths=[120, 100], hAlign='RIGHT')
        totals_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
            ('LINEBELOW', (0, 3), (1, 3), 1, colors.HexColor('#7c3aed')),
            ('BACKGROUND', (0, 3), (1, 3), colors.HexColor('#f5f3ff')),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(totals_table)

        # Footer Terms
        elements.append(Spacer(1, 25))
        elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#cbd5e1'), spaceAfter=10))
        footer_text = "Thank you for your business! Goods once sold can be exchanged within 7 days with original invoice. Computer generated invoice."
        elements.append(Paragraph(footer_text, ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=colors.HexColor('#64748b'), alignment=1)))

        doc.build(elements)
        buffer.seek(0)
        return buffer
