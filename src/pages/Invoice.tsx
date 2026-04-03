import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Printer, MessageCircle, Receipt, X, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStore } from '@/context/StoreContext';
import { getUnitLabel } from '@/types/store';
import { PhoneInputWithCode } from '@/components/common/PhoneInputWithCode';

interface InvoiceItem {
  productName: string;
  quantity: number;
  unitName: string;
  pricePerUnit: number;
  totalPrice: number;
}

interface InvoiceData {
  invoiceNo: string;
  date: Date;
  customerName: string;
  customerPhone: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: 'cash' | 'mobile' | 'due';
  dueAmount: number;
  shopName: string;
  shopAddress: string;
}

export default function Invoice() {
  const navigate = useNavigate();
  const location = useLocation();
  const { storeInfo } = useStore();
  const printRef = useRef<HTMLDivElement>(null);

  const [invoiceData, setInvoiceData] = useState<InvoiceData>(() => {
    const state = location.state as any;
    if (state?.invoiceData) {
      return {
        ...state.invoiceData,
        shopName: state.invoiceData.shopName || storeInfo?.name || '',
        shopAddress: state.invoiceData.shopAddress || storeInfo?.location || '',
      };
    }

    return {
      invoiceNo: `INV-${Date.now().toString(36).toUpperCase()}`,
      date: new Date(),
      customerName: '',
      customerPhone: '',
      items: [],
      subtotal: 0,
      discount: 0,
      total: 0,
      paymentMethod: 'cash',
      dueAmount: 0,
      shopName: storeInfo?.name || '',
      shopAddress: storeInfo?.location || '',
    };
  });

  const [discount, setDiscount] = useState(invoiceData.discount.toString());
  const [showPrint, setShowPrint] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState(invoiceData.customerPhone || '');
  const [shopLocation, setShopLocation] = useState(invoiceData.shopAddress || storeInfo?.location || '');

  const subtotal = invoiceData.items.reduce((s, i) => s + i.totalPrice, 0);
  const discountAmt = parseFloat(discount) || 0;
  const total = Math.max(0, subtotal - discountAmt);
  const dueAmount = invoiceData.paymentMethod === 'due' ? total : invoiceData.dueAmount;

  const handlePrint = () => {
    setShowPrint(true);
    setTimeout(() => {
      window.print();
      setShowPrint(false);
    }, 300);
  };

  const handleWhatsApp = () => {
    const phone = whatsappPhone.replace(/[^0-9+]/g, '');
    if (!phone || phone.length < 8) {
      return;
    }
    const itemsText = invoiceData.items
      .map(i => `- ${i.productName} (${i.quantity} ${i.unitName}) = ৳${i.totalPrice}`)
      .join('\n');

    const message = `🧾 Invoice - Dukan 360°
${shopLocation ? `📍 ${shopLocation}` : ''}
${invoiceData.customerName ? `👤 ${invoiceData.customerName}` : ''}
📅 ${new Date(invoiceData.date).toLocaleDateString('bn-BD')}

পণ্যসমূহ:
${itemsText}

${discountAmt > 0 ? `ছাড়: ৳${discountAmt}\n` : ''}মোট: ৳${total}
${dueAmount > 0 ? `বাকি: ৳${dueAmount}\n` : ''}
ধন্যবাদ! আবার আসবেন 😊`;

    const url = `https://wa.me/${phone.replace('+', '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  if (invoiceData.items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
        <Receipt className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">কোন ইনভয়েস নেই</h2>
        <p className="text-muted-foreground mb-6">বিক্রি সম্পন্ন করার পর ইনভয়েস তৈরি হবে</p>
        <Button onClick={() => navigate('/sell')} className="btn-primary rounded-xl">
          বিক্রি করুন
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Print-only view */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-invoice, #print-invoice * { visibility: visible; }
          #print-invoice { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>

      <div className="space-y-6 animate-fade-in print:hidden">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Receipt className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">ইনভয়েস</h1>
          </div>
        </div>

        {/* Invoice Card */}
        <div className="card-elevated p-5 space-y-4">
          {/* Shop & Invoice Info */}
          <div className="text-center border-b border-border pb-4">
            <h2 className="text-xl font-bold text-foreground">{invoiceData.shopName || 'আমার দোকান'}</h2>
            <div className="flex items-center justify-center gap-1 mt-1">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                value={shopLocation}
                onChange={(e) => setShopLocation(e.target.value)}
                placeholder="দোকানের ঠিকানা লিখুন"
                className="text-sm text-muted-foreground bg-transparent border-b border-dashed border-border text-center focus:outline-none focus:border-primary w-full max-w-[250px]"
              />
            </div>
            <div className="flex justify-between mt-3 text-xs text-muted-foreground">
              <span>#{invoiceData.invoiceNo}</span>
              <span>{new Date(invoiceData.date).toLocaleString('bn-BD')}</span>
            </div>
          </div>

          {/* Customer */}
          {(invoiceData.customerName || invoiceData.customerPhone) && (
            <div className="p-3 bg-muted/50 rounded-xl">
              {invoiceData.customerName && <p className="font-medium text-foreground">{invoiceData.customerName}</p>}
              {invoiceData.customerPhone && <p className="text-sm text-muted-foreground">{invoiceData.customerPhone}</p>}
            </div>
          )}

          {/* Product List */}
          <div className="space-y-2">
            <div className="grid grid-cols-12 text-xs font-medium text-muted-foreground pb-2 border-b border-border">
              <span className="col-span-5">পণ্য</span>
              <span className="col-span-3 text-center">পরিমাণ</span>
              <span className="col-span-2 text-right">দাম</span>
              <span className="col-span-2 text-right">মোট</span>
            </div>
            {invoiceData.items.map((item, i) => (
              <div key={i} className="grid grid-cols-12 text-sm py-2 border-b border-border/50">
                <span className="col-span-5 font-medium text-foreground">{item.productName}</span>
                <span className="col-span-3 text-center text-muted-foreground">{item.quantity} {item.unitName}</span>
                <span className="col-span-2 text-right text-muted-foreground">৳{item.pricePerUnit}</span>
                <span className="col-span-2 text-right font-medium text-foreground">৳{item.totalPrice}</span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="space-y-2 pt-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">সাবটোটাল:</span>
              <span className="text-foreground">৳{subtotal}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">ছাড়:</span>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="০"
                className="w-24 text-right input-field py-1 px-2 text-sm"
                min="0"
              />
            </div>
            <div className="flex justify-between text-lg font-bold border-t border-border pt-2">
              <span className="text-foreground">মোট:</span>
              <span className="text-primary">৳{total}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="p-3 bg-muted/50 rounded-xl">
            <p className="text-sm text-muted-foreground mb-2">পেমেন্ট:</p>
            <div className="flex gap-2">
              {(['cash', 'mobile', 'due'] as const).map(method => (
                <button
                  key={method}
                  onClick={() => setInvoiceData(prev => ({ ...prev, paymentMethod: method }))}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    invoiceData.paymentMethod === method
                      ? method === 'due' ? 'bg-destructive/10 text-destructive border-2 border-destructive' : 'bg-primary/10 text-primary border-2 border-primary'
                      : 'bg-muted text-muted-foreground border-2 border-transparent'
                  }`}
                >
                  {method === 'cash' ? '💵 নগদ' : method === 'mobile' ? '📱 মোবাইল' : '📝 বাকি'}
                </button>
              ))}
            </div>
            {invoiceData.paymentMethod === 'due' && (
              <p className="text-sm text-destructive font-medium mt-2">বাকি: ৳{total}</p>
            )}
          </div>
        </div>

        {/* WhatsApp Phone Input */}
        <div className="card-elevated p-4 space-y-3">
          <p className="text-sm font-medium text-foreground">📲 WhatsApp এ পাঠাতে নম্বর দিন:</p>
          <PhoneInputWithCode
            value={whatsappPhone}
            onChange={setWhatsappPhone}
          />
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <Button onClick={handlePrint} className="py-6 text-base rounded-xl bg-foreground text-background hover:bg-foreground/90" size="lg">
            <Printer className="w-6 h-6 mr-2" />
            প্রিন্ট করুন
          </Button>
          <Button onClick={handleWhatsApp} disabled={!whatsappPhone || whatsappPhone.length < 8} className="py-6 text-base rounded-xl bg-[#25D366] hover:bg-[#25D366]/90 text-white disabled:opacity-50" size="lg">
            <MessageCircle className="w-6 h-6 mr-2" />
            WhatsApp
          </Button>
        </div>
      </div>

      {/* Printable Invoice */}
      <div id="print-invoice" ref={printRef} className="hidden print:block p-6 text-black bg-white max-w-[80mm] mx-auto font-mono text-xs">
        <div className="text-center mb-4">
          <h1 className="text-lg font-bold">{invoiceData.shopName || 'আমার দোকান'}</h1>
          {invoiceData.shopAddress && <p>{invoiceData.shopAddress}</p>}
          <p className="mt-1">#{invoiceData.invoiceNo}</p>
          <p>{new Date(invoiceData.date).toLocaleString('bn-BD')}</p>
        </div>
        {invoiceData.customerName && <p>গ্রাহক: {invoiceData.customerName}</p>}
        <hr className="my-2 border-dashed" />
        {invoiceData.items.map((item, i) => (
          <div key={i} className="flex justify-between py-1">
            <span>{item.productName} x{item.quantity}</span>
            <span>৳{item.totalPrice}</span>
          </div>
        ))}
        <hr className="my-2 border-dashed" />
        {discountAmt > 0 && <div className="flex justify-between"><span>ছাড়:</span><span>-৳{discountAmt}</span></div>}
        <div className="flex justify-between font-bold text-sm">
          <span>মোট:</span><span>৳{total}</span>
        </div>
        {invoiceData.paymentMethod === 'due' && <p className="mt-1">বাকি: ৳{total}</p>}
        <hr className="my-2 border-dashed" />
        <p className="text-center mt-4">ধন্যবাদ! আবার আসবেন 😊</p>
        <p className="text-center text-[8px] mt-2">Dukan 360°</p>
      </div>
    </>
  );
}
